"""A4.8: SMAP (36 km). Sin red ni token: earthaccess y h5py se simulan o se prueban con archivos sinteticos."""
import io
from datetime import date, timedelta

import h5py
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import http
from app.clientes import earthdata
from app.main import app

cliente = TestClient(app)
LON, LAT = -95.53, 18.03
FECHA = date.today() - timedelta(days=20)
URL = f"/api/smap?lon={LON}&lat={LAT}&desde={FECHA}&hasta={FECHA}"


def datos(am=None, pm=0.1754):
    return {"granulo": "SMAP_L3_SM_P_X.h5", "celda": [140, 226], "centro": [-95.415, 17.937],
            "pases": [{"pase": "AM", "humedadM3M3": am, "banderaCalidad": 7}, {"pase": "PM", "humedadM3M3": pm, "banderaCalidad": 8}]}


def simular(monkeypatch, resultado):
    llamadas = []

    async def falso(lon, lat, dia):
        llamadas.append(dia)
        if isinstance(resultado, Exception):
            raise resultado
        return resultado
    monkeypatch.setattr(earthdata, "humedad_dia", falso)
    return llamadas


def test_celda_de_isla_coincide_con_la_verificada_contra_el_archivo():
    assert earthdata.celda(LON, LAT) == (140, 226)  # latitude_pm y EASE_row_index del granulo de 2025-06-15
    assert earthdata.centro(140, 226) == (-95.415, 17.937)
    assert earthdata.celda(0, 89.9) is None or earthdata.celda(0, 89.9)[0] >= 0  # el polo queda en la rejilla o fuera, sin error


def test_respuesta_cumple_el_contrato_smap(monkeypatch, validar):
    simular(monkeypatch, datos(am=None, pm=0.1754))
    j = cliente.get(URL).json()
    validar(j, "smap")
    assert j["producto"] == {"nombre": "SPL3SMP", "resolucionKm": 36, "profundidadCm": {"desde": 0, "hasta": 5}, "unidad": "m3/m3"}


def test_dias_sin_dato_cumplen_el_contrato_y_no_llevan_humedad(monkeypatch, validar):
    simular(monkeypatch, None)
    j = cliente.get(URL).json()
    validar(j, "smap")
    assert j["dias"][0]["motivo"] and "humedadM3M3" not in j["dias"][0]


def test_dia_con_error_de_fuente_cumple_el_contrato(monkeypatch, validar):
    async def falso(lon, lat, dia):
        if dia == FECHA:
            raise http.ErrorFuente("rango rechazado")
        return datos()
    monkeypatch.setattr(earthdata, "humedad_dia", falso)
    validar(cliente.get(f"/api/smap?lon={LON}&lat={LAT}&desde={FECHA}&hasta={FECHA + timedelta(days=1)}").json(), "smap")


def test_dia_evaluable_promedia_solo_los_pases_con_dato(monkeypatch):
    simular(monkeypatch, datos(am=None, pm=0.1754))
    r = cliente.get(URL)
    assert r.status_code == 200
    j = r.json()
    assert j["estado"] == "EVALUABLE" and j["etiqueta"] == "SUPUESTO"
    assert j["dias"][0]["humedadM3M3"] == 0.1754 and j["dias"][0]["pases"][0].get("humedadM3M3") is None  # el pase sin dato no se rellena
    assert j["fuente"]["resolucion"].startswith("36 km") and j["fuente"]["periodo"]["desde"] == str(FECHA)
    assert {a["codigo"] for a in j["advertencias"]} >= {"RESOLUCION_GRUESA", "SMAP_CONTRASTE"}
    assert "banderaCalidad" in j["dias"][0]["pases"][1]


def test_sin_granulo_es_no_evaluable_con_motivo_y_sin_cifra(monkeypatch):
    simular(monkeypatch, None)
    j = cliente.get(URL).json()
    assert j["estado"] == "NO_EVALUABLE" and j["dias"][0]["estado"] == "NO_EVALUABLE" and "humedadM3M3" not in j["dias"][0]
    assert j["dias"][0]["motivo"]


def test_ningun_pase_valido_no_inventa_humedad(monkeypatch):
    simular(monkeypatch, datos(am=None, pm=None))
    d = cliente.get(URL).json()["dias"][0]
    assert d["estado"] == "NO_EVALUABLE" and "humedadM3M3" not in d


def test_sin_token_es_503_visible_nunca_500(monkeypatch):
    monkeypatch.delenv("EARTHDATA_TOKEN", raising=False)
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS" and "EARTHDATA_TOKEN" in r.json()["motivo"]


def test_fallo_de_la_fuente_en_todos_los_dias_es_503(monkeypatch):
    simular(monkeypatch, http.ErrorFuente("SMAP caido"))
    r = cliente.get(URL)
    assert r.status_code == 503 and "SMAP caido" in r.json()["motivo"]


def test_un_dia_que_falla_no_tumba_a_los_demas(monkeypatch):
    async def falso(lon, lat, dia):
        if dia == FECHA:
            raise http.ErrorFuente("rango rechazado")
        return datos()
    monkeypatch.setattr(earthdata, "humedad_dia", falso)
    j = cliente.get(f"/api/smap?lon={LON}&lat={LAT}&desde={FECHA}&hasta={FECHA + timedelta(days=1)}").json()
    assert [d["estado"] for d in j["dias"]] == ["ERROR_DATOS", "EVALUABLE"]
    assert any(a["codigo"] == "DIAS_SIN_LEER" for a in j["advertencias"])


def test_la_cache_evita_volver_a_leer_un_dia_antiguo(monkeypatch):
    llamadas = simular(monkeypatch, datos())
    cliente.get(URL)
    cliente.get(URL)
    assert llamadas == [FECHA]


@pytest.mark.parametrize("consulta", [
    f"desde={FECHA}&hasta={FECHA - timedelta(days=1)}",  # hasta antes que desde
    f"desde={FECHA - timedelta(days=11)}&hasta={FECHA}",  # mas de 10 dias
    f"desde={date.today()}&hasta={date.today()}",  # aun sin publicar
])
def test_parametros_invalidos_son_422(monkeypatch, consulta):
    simular(monkeypatch, datos())
    assert cliente.get(f"/api/smap?lon={LON}&lat={LAT}&{consulta}").status_code == 422


def test_leer_pases_respeta_el_rango_valido_y_el_relleno():
    buf = io.BytesIO()
    with h5py.File(buf, "w") as h:
        for grupo, suf, v, bandera in [("AM", "", -9999.0, 7), ("PM", "_pm", 0.2, 8)]:
            g = h.create_group(f"Soil_Moisture_Retrieval_Data_{grupo}")
            ds = g.create_dataset("soil_moisture" + suf, data=np.full((3, 3), v, dtype="f4"))
            ds.attrs["valid_min"], ds.attrs["valid_max"] = np.float32(0.02), np.float32(0.5)
            g.create_dataset("retrieval_qual_flag" + suf, data=np.full((3, 3), bandera, dtype="u2"))
    buf.seek(0)
    am, pm = earthdata.leer_pases(buf, 1, 1)
    assert am["humedadM3M3"] is None and pm["humedadM3M3"] == 0.2 and pm["banderaCalidad"] == 8


def test_archivo_por_rangos_lee_bloques_alineados(monkeypatch):
    contenido = bytes(range(256)) * 100
    monkeypatch.setattr(earthdata, "BLOQUE", 1000)
    pedidos = []

    class Respuesta:
        def __init__(self, rango):
            a, b = (int(x) for x in rango.split("=")[1].split("-"))
            self.status_code, self.content = 206, contenido[a:b + 1]
            self.headers = {"Content-Range": f"bytes {a}-{b}/{len(contenido)}"}

    class Sesion:
        def get(self, url, headers, timeout):
            pedidos.append(headers["Range"])
            return Respuesta(headers["Range"])

    f = earthdata.ArchivoPorRangos(Sesion(), "https://ejemplo/x.h5")
    f.seek(950)
    assert f.read(100) == contenido[950:1050]  # cruza el limite entre dos bloques
    f.seek(960)
    assert f.read(10) == contenido[960:970]  # ya esta en cache
    assert pedidos == ["bytes=0-0", "bytes=0-999", "bytes=1000-1999"]
