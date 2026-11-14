"""A4.11: NDVI de MODIS MOD13Q1 por el servicio REST de ORNL. Sin red: el servicio se simula con una respuesta real guardada."""
import copy
import re
from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.clientes import modis
from app.main import app
from tests.conftest import real_json

cliente = TestClient(app)
URL = "/api/ndvi?lat=18.03&lon=-95.53&desde=2023-05-01&hasta=2023-07-31"


def doy_a_fecha(texto: str) -> date:
    m = re.fullmatch(r"A(\d{4})(\d{3})", texto)
    return date(int(m[1]), 1, 1) + timedelta(days=int(m[2]) - 1)


def servicio(crudo=3000, falla=None, calidad=0, falla_calidad=False):
    """Simula el servicio: arma el subset de las fechas pedidas con el mismo formato de la respuesta real (banda NDVI y banda de calidad)."""
    base = real_json("modis_ndvi.json")
    peticiones = []

    def handler(request: httpx.Request):
        p = request.url.params
        peticiones.append(dict(p))
        assert request.headers["accept"] == "application/json"
        es_calidad = p["band"] == modis.BANDA_CALIDAD
        if (es_calidad and falla_calidad) or (not es_calidad and falla and falla(p)):
            return httpx.Response(502)
        ini, fin = doy_a_fecha(p["startDate"]), doy_a_fecha(p["endDate"])
        fechas = modis.compuestos(ini, fin)
        assert len(fechas) <= 10, "el servicio rechaza mas de 10 fechas"
        cuerpo = {k: v for k, v in base.items() if k not in ("subset", "_consulta")}
        cuerpo["subset"] = [{"modis_date": modis.fecha_modis(f), "calendar_date": f.isoformat(), "band": modis.BANDA, "tile": "h08v07",
                             "proc_date": "x", "data": [(calidad(f) if callable(calidad) else calidad) if es_calidad else (crudo(f) if callable(crudo) else crudo)]} for f in fechas]
        return httpx.Response(200, json=cuerpo)
    return handler, peticiones


def test_parsea_la_respuesta_real_y_escala():
    dias, pixel = modis.parsear(real_json("modis_ndvi.json"))
    assert [(d["fecha"], d["ndvi"]) for d in dias] == [("2023-05-09", 0.315), ("2023-05-25", 0.3279), ("2023-06-10", 0.3378), ("2023-06-26", 0.4053), ("2023-07-12", 0.3921)]
    assert pixel["escala"] == 0.0001
    assert modis.centro_pixel(pixel) == (-95.5297, 18.0302)  # el pixel que responde el servicio es el del punto pedido


def test_parsea_la_calidad_real_y_el_relleno():
    assert modis.parsear_calidad({"subset": [{"calendar_date": "2023-05-25", "data": [1]}, {"calendar_date": "2023-06-10", "data": [0]},
                                             {"calendar_date": "2023-06-26", "data": [3]}, {"calendar_date": "2023-07-12", "data": [-1]}, {"calendar_date": "2023-07-28", "data": [9]}]}) == {
        "2023-05-25": 1, "2023-06-10": 0, "2023-06-26": 3, "2023-07-12": None, "2023-07-28": None}
    real = modis.parsear_calidad(real_json("modis_calidad.json"))
    assert real and all(v is None or 0 <= v <= 3 for v in real.values())


def test_respuesta_cumple_el_contrato_ndvi(simular, validar):
    handler, _ = servicio(lambda f: 3000 + f.month * 100, calidad=lambda f: f.month % 4)
    simular(handler)
    r = cliente.get(URL)
    assert r.status_code == 200
    j = r.json()
    validar(j, "ndvi")
    assert j["estado"] == "EVALUABLE" and j["producto"]["escala"] == 0.0001 and j["producto"]["pixelM"] == 250 and j["producto"]["compuestoDias"] == 16
    assert j["fuente"]["cita"] == "doi:10.3334/ORNLDAAC/1600" and j["fuente"]["resolucion"].startswith("250 m")
    assert set(j["limites"]) == {"PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"}
    assert [d["fecha"] for d in j["serie"]] == [f.isoformat() for f in modis.compuestos(date(2023, 5, 1), date(2023, 7, 31))]
    assert j["serie"][0]["ndvi"] == 0.35 and all(d["estado"] == "EVALUABLE" for d in j["serie"])
    assert [d["calidad"] for d in j["serie"]] == [f.month % 4 for f in modis.compuestos(date(2023, 5, 1), date(2023, 7, 31))]
    assert "sin interpretarla" in j["fuente"]["nota"]


def test_si_falla_la_banda_de_calidad_el_ndvi_sigue_sin_calidad(simular, validar):
    handler, _ = servicio(falla_calidad=True)
    simular(handler)
    j = cliente.get(URL).json()
    validar(j, "ndvi")
    assert j["estado"] == "EVALUABLE" and all(d["estado"] == "EVALUABLE" and "calidad" not in d for d in j["serie"])


def test_un_anio_agricola_se_pide_en_tandas_de_cinco_fechas_por_banda(simular, validar):
    handler, peticiones = servicio()
    simular(handler)
    j = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2022-10-01&hasta=2023-09-30").json()
    validar(j, "ndvi")
    esperadas = modis.tandas(modis.compuestos(date(2022, 10, 1), date(2023, 9, 30)))
    ndvi = [p for p in peticiones if p["band"] == modis.BANDA]
    assert len(j["serie"]) == 23 and len(esperadas) == 5 and len(ndvi) == 5 and len(peticiones) == 10 and all(len(t) <= 5 for t in esperadas)
    assert sorted(p["startDate"] for p in ndvi) == sorted(modis.fecha_modis(t[0]) for t in esperadas)
    assert sorted(p["endDate"] for p in ndvi) == sorted(modis.fecha_modis(t[-1]) for t in esperadas)


def test_relleno_del_producto_es_null_y_no_cero(simular, validar):
    handler, _ = servicio(lambda f: -3000 if f.month == 6 else 4000)
    simular(handler)
    j = cliente.get(URL).json()
    validar(j, "ndvi")
    sin_dato = [d for d in j["serie"] if d["ndvi"] is None]
    assert sin_dato and all(d["estado"] == "NO_EVALUABLE" and d["motivo"] for d in sin_dato)
    assert not any(d["ndvi"] == 0 for d in j["serie"] if d["estado"] != "EVALUABLE")
    assert j["estado"] == "EVALUABLE"


def test_entero_fuera_de_rango_no_se_acepta(simular, validar):
    handler, _ = servicio(12000)  # fuera del rango valido -2000 a 10000 del producto
    simular(handler)
    j = cliente.get(URL).json()
    validar(j, "ndvi")
    assert j["estado"] == "NO_EVALUABLE" and j["motivo"] and all(d["ndvi"] is None for d in j["serie"])


def test_una_tanda_que_falla_deja_sus_fechas_en_error_y_no_se_guarda(simular, validar):
    segunda = modis.fecha_modis(modis.tandas(modis.compuestos(date(2022, 10, 1), date(2023, 9, 30)))[1][0])
    handler, peticiones = servicio(falla=lambda p: p["startDate"] == segunda)
    simular(handler)
    ruta = "/api/ndvi?lat=18.03&lon=-95.53&desde=2022-10-01&hasta=2023-09-30"
    j = cliente.get(ruta).json()
    validar(j, "ndvi")
    errores = [d for d in j["serie"] if d["estado"] == "ERROR_DATOS"]
    assert errores and all(d["ndvi"] is None and d["motivo"] for d in errores) and len(errores) < len(j["serie"])
    assert "DIAS_SIN_LEER" in {a["codigo"] for a in j["advertencias"]}
    n = len(peticiones)
    cliente.get(ruta)
    assert len(peticiones) > n, "una serie con huecos de red no se cachea"


def test_si_el_servicio_cae_del_todo_es_503_visible(simular):
    simular(lambda r: httpx.Response(504))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS" and "MODIS" in r.json()["motivo"]


def test_respuesta_inesperada_no_da_500(simular):
    simular(lambda r: httpx.Response(200, json={"algo": "distinto"}))
    r = cliente.get(URL)
    assert r.status_code == 503


def test_la_cache_evita_volver_a_pedir_un_rango_antiguo(simular):
    handler, peticiones = servicio()
    simular(handler)
    a = cliente.get(URL).json()
    n = len(peticiones)
    b = cliente.get(URL).json()
    assert len(peticiones) == n and a["serie"] == b["serie"]


@pytest.mark.parametrize("consulta", [
    "desde=2023-07-31&hasta=2023-05-01",
    "desde=2020-01-01&hasta=2023-01-01",  # mas de 732 dias
    f"desde=2023-05-01&hasta={date.today() + timedelta(days=5)}",
])
def test_parametros_invalidos_son_422(simular, consulta):
    handler, _ = servicio()
    simular(handler)
    assert cliente.get(f"/api/ndvi?lat=18.03&lon=-95.53&{consulta}").status_code == 422


def test_compuestos_cruzan_el_cambio_de_anio():
    assert [f.isoformat() for f in modis.compuestos(date(2022, 12, 1), date(2023, 1, 31))] == ["2022-12-03", "2022-12-19", "2023-01-01", "2023-01-17"]
    assert modis.fecha_modis(date(2024, 2, 29)) == "A2024060" and modis.compuestos(date(2023, 1, 2), date(2023, 1, 10)) == []
