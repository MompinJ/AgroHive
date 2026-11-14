"""A4.11: NDVI de MODIS por ORNL DAAC. Respuestas reales guardadas en datos/pruebas-apis/respuestas/ (14/11/2026)."""
import copy
import json
from datetime import date, timedelta

import httpx
from fastapi.testclient import TestClient

from app.clientes import ornl
from app.main import app
from tests.conftest import real_json

cliente = TestClient(app)
URL = "/api/ndvi?lat=18.03&lon=-95.53&desde=2023-05-01&hasta=2023-08-31"
NDVI, CALIDAD = real_json("ornl_ndvi_2023.json"), real_json("ornl_calidad_2023.json")


def ornl_simulado(ndvi=NDVI, calidad=CALIDAD, falla_calidad=False, falla_ndvi=lambda params: False):
    def handler(request: httpx.Request):
        if "modis.ornl.gov" not in request.url.host:
            return httpx.Response(404)
        banda = request.url.params["band"]
        if banda == ornl.BANDA_NDVI:
            return httpx.Response(503) if falla_ndvi(request.url.params) else httpx.Response(200, json=ndvi)
        return httpx.Response(503) if falla_calidad else httpx.Response(200, json=calidad)
    return handler


def test_parsea_la_respuesta_real_con_escala_y_calidad():
    datos, escala = ornl.parsear(NDVI, CALIDAD)
    assert escala == 0.0001
    assert [(d["fecha"], d["ndvi"], d["calidad"], d["estado"]) for d in datos] == [
        ("2023-05-25", 0.3279, 1, "EXPLORATORIO"), ("2023-06-10", 0.3378, 0, "EXPLORATORIO"),
        ("2023-06-26", 0.4053, 3, "EXPLORATORIO"), ("2023-07-12", 0.3921, 3, "EXPLORATORIO")]


def test_el_relleno_menos_3000_es_null_con_motivo_y_nunca_cero_ni_un_ndvi_negativo():
    sintetico = copy.deepcopy(NDVI)  # sintetico: no se consiguio un relleno real; el valor -3000 sale de /MOD13Q1/bands
    sintetico["subset"][0]["data"] = [-3000]
    d = ornl.parsear(sintetico, CALIDAD)[0][0]
    assert d["ndvi"] is None and d["estado"] == "NO_EVALUABLE" and "relleno" in d["motivo"]  # no -0.3, no 0


def test_valor_fuera_del_rango_valido_no_se_acepta():
    for crudo in (10001, -2001, 15000):
        sintetico = copy.deepcopy(NDVI)
        sintetico["subset"][0]["data"] = [crudo]
        d = ornl.parsear(sintetico, None)[0][0]
        assert d["ndvi"] is None and d["estado"] == "NO_EVALUABLE", crudo
    sintetico = copy.deepcopy(NDVI)
    sintetico["subset"][0]["data"] = [-2000]  # el limite inferior valido (-0.2) si cuenta
    assert ornl.parsear(sintetico, None)[0][0]["ndvi"] == -0.2


def test_calidad_de_relleno_o_ausente_es_none_sin_interpretarla():
    c = copy.deepcopy(CALIDAD)
    c["subset"][0]["data"] = [-1]
    datos = ornl.parsear(NDVI, c)[0]
    assert datos[0]["calidad"] is None and datos[2]["calidad"] == 3
    assert all(d["calidad"] is None for d in ornl.parsear(NDVI, None)[0])


def test_escala_ausente_es_error_de_la_fuente_no_un_valor_por_defecto():
    sin = {k: v for k, v in NDVI.items() if k != "scale"}
    try:
        ornl.parsear(sin, None)
        assert False, "debio fallar"
    except Exception as e:
        assert "escala" in str(e)


def test_fecha_modis_y_ventanas_alineadas_que_no_superan_el_limite_de_diez_fechas():
    assert ornl.fecha_modis(date(2023, 5, 25)) == "A2023145" and ornl.fecha_modis(date(2024, 12, 31)) == "A2024366"
    v = ornl.ventanas(date(2005, 10, 1), date(2025, 12, 31))
    assert v[0][0] <= date(2005, 10, 1) and v[-1][1] >= date(2025, 12, 31)
    for (a, b), (c, _) in zip(v, v[1:]):
        assert c == b + timedelta(days=1), "las ventanas deben ser contiguas, sin huecos ni solapes"
    # el compuesto es cada 16 dias y se reinicia el 1 de enero (hueco de 13 a 5 dias): cuenta el peor caso real de cada ventana
    def compuestos(a, b):
        n, d = 0, a
        while d <= b:
            if (d.timetuple().tm_yday - 1) % 16 == 0 and d.timetuple().tm_yday <= 353 or d.timetuple().tm_yday == 1:
                n += 1
            d += timedelta(days=1)
        return n
    assert max(compuestos(a, b) for a, b in v) <= 10, "ninguna ventana debe superar las 10 fechas por llamada que admite ORNL"


def test_ruta_cumple_el_contrato_y_es_evidencia(simular, validar):
    simular(ornl_simulado())
    r = cliente.get(URL)
    assert r.status_code == 200
    n = r.json()
    validar(n, "ndvi#")
    assert n["estado"] == "EXPLORATORIO" and n["producto"] == {"nombre": "MOD13Q1", "banda": "250m_16_days_NDVI", "pixelM": 250, "compuestoDias": 16, "escala": 0.0001}
    assert set(n["limites"]) == {"PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"}
    assert "doi:10.3334/ORNLDAAC/1600" in n["fuente"]["cita"]
    assert [d["fecha"] for d in n["serie"]] == ["2023-05-25", "2023-06-10", "2023-06-26", "2023-07-12"]  # sin repetidos pese a varias ventanas
    assert "NDVI_EVIDENCIA" in {a["codigo"] for a in n["advertencias"]}


def test_la_serie_se_recorta_al_periodo_pedido(simular, validar):
    simular(ornl_simulado())
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-06-01&hasta=2023-06-30").json()
    validar(n, "ndvi#")
    assert [d["fecha"] for d in n["serie"]] == ["2023-06-10", "2023-06-26"]


def test_segunda_consulta_sale_de_la_cache(simular):
    llamadas = simular(ornl_simulado())
    cliente.get(URL)
    n = len(llamadas)
    assert n > 0 and cliente.get(URL).status_code == 200
    assert len(llamadas) == n


def test_si_falla_la_calidad_los_datos_salen_sin_ella_y_no_se_fijan_en_cache(simular, validar):
    llamadas = simular(ornl_simulado(falla_calidad=True))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert n["estado"] == "EXPLORATORIO" and all("calidad" not in d for d in n["serie"])
    assert "NDVI_CALIDAD_NO_DISPONIBLE" in {a["codigo"] for a in n["advertencias"]}
    antes = len(llamadas)
    cliente.get(URL)
    assert len(llamadas) > antes, "una ventana sin calidad se vuelve a pedir"


def test_un_tramo_caido_se_dice_y_no_se_rellena(simular, validar):
    ventanas = ornl.ventanas(date(2023, 5, 1), date(2023, 8, 31))
    primera = ornl.fecha_modis(ventanas[0][0])
    simular(ornl_simulado(falla_ndvi=lambda p: p["startDate"] == primera))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert "NDVI_TRAMOS_SIN_LEER" in {a["codigo"] for a in n["advertencias"]}
    assert n["serie"], "los tramos que si respondieron salen"


def test_si_ornl_no_responde_en_nada_es_error_datos(simular):
    simular(lambda r: httpx.Response(503))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS" and "ORNL" in r.json()["motivo"]


def test_ornl_400_por_mas_de_diez_fechas_no_se_reintenta(simular):
    llamadas = simular(lambda r: httpx.Response(400, json="Subset time period exceeds maximum subset tiles support of 10."))
    assert cliente.get(URL).status_code == 503
    assert len(llamadas) == len(ornl.ventanas(date(2023, 5, 1), date(2023, 8, 31)))  # una por ventana, sin reintentos


def test_todo_en_null_es_no_evaluable_con_motivo(simular, validar):
    relleno = copy.deepcopy(NDVI)
    for x in relleno["subset"]:
        x["data"] = [-3000]
    simular(ornl_simulado(ndvi=relleno))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert n["estado"] == "NO_EVALUABLE" and n["motivo"] and all(d["ndvi"] is None and d["motivo"] for d in n["serie"])


def test_periodos_invalidos():
    manana = date.today() + timedelta(days=1)
    for q in ("desde=2023-06-01&hasta=2023-05-01", f"desde=2023-01-01&hasta={manana}", "desde=2020-01-01&hasta=2023-01-01"):
        assert cliente.get(f"/api/ndvi?lat=18&lon=-95&{q}").status_code == 422, q
    assert cliente.get("/api/ndvi?lat=99&lon=-95&desde=2023-01-01&hasta=2023-02-01").status_code == 422
