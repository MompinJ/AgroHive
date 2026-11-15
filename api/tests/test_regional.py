"""A4.12: fuentes regionales de EE. UU. (CDL de USDA NASS y SSURGO de USDA NRCS).
Respuestas reales guardadas el 14/11 en datos/pruebas-apis/respuestas/: 18 anios de CDL en un campo de Iowa y SSURGO del mismo punto."""
import json
import re

import httpx
from fastapi.testclient import TestClient

from app import regional
from app.clientes import cropscape, sda
from app.main import app
from tests.conftest import real_json

# Las pruebas validan contra contratos/ee-uu.schema.json (contratos 0.13.0).

cliente = TestClient(app)
LON, LAT = -93.4, 42.05
CDL = real_json("cropscape_iowa_2008_2025.json")
SDA = real_json("sda_ssurgo_iowa.json")


def cdl_simulado(fallar=lambda anio: False):
    def handler(request: httpx.Request):
        if "GetCDLValue" in str(request.url):
            anio = request.url.params["year"]
            assert (float(request.url.params["x"]), float(request.url.params["y"])) == (CDL["x"], CDL["y"]), "CropScape pide x,y en EPSG:5070"
            if fallar(int(anio)):
                return httpx.Response(503)
            return httpx.Response(200, text=CDL["anios"][anio])
        return httpx.Response(404)
    return handler


def sda_simulado(cuerpo=None, estado=200):
    def handler(request: httpx.Request):
        if "post.rest" in str(request.url):
            consulta = json.loads(request.content)["query"]
            assert "SDA_Get_Mukey_from_intersection_with_WktWgs84" in consulta
            return httpx.Response(estado, text=cuerpo if cuerpo is not None else json.dumps(SDA["respuesta"]))
        return httpx.Response(404)
    return handler


def test_cdl_rotacion_real_de_iowa_cumple_la_propuesta_de_contrato(simular, validar):
    llamadas = simular(cdl_simulado())
    r = cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}")
    assert r.status_code == 200
    d = r.json()
    validar(d, "ee-uu#/$defs/cdl")
    assert d["estado"] == "EVALUABLE" and (d["anioDesde"], d["anioHasta"]) == (2008, 2025)
    serie = {a["anio"]: a["categoria"] for a in d["anios"]}
    assert len(serie) == 18 and len(llamadas) == 18
    # Lo que CDL dice de verdad en ese pixel: maiz y soya alternados desde 2014 (y maiz tres anios seguidos 2011-2013).
    assert [serie[a] for a in range(2014, 2026)] == ["Soybeans", "Corn"] * 6
    assert [serie[a] for a in (2011, 2012, 2013)] == ["Corn"] * 3
    por_anio = {a["anio"]: a for a in d["anios"]}
    assert por_anio[2025]["cultivoCatalogo"] == "maiz" and por_anio[2025]["codigo"] == 1
    assert por_anio[2024]["cultivoCatalogo"] is None, "la soya no esta en el catalogo: no se asimila a otro cultivo"
    assert "SOLO_EE_UU" in d["limites"] and "NO_ENTRA_AL_RANKING" in d["limites"]
    assert "2008-2025" in d["fuente"]["cita"] and "USDA" in d["fuente"]["cita"]


def test_cdl_se_guarda_en_cache_por_anio(simular):
    llamadas = simular(cdl_simulado())
    cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2020&hasta=2022")
    assert len(llamadas) == 3
    cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2020&hasta=2023")
    assert len(llamadas) == 4  # solo 2023 era nuevo


def test_cdl_fuera_de_ee_uu_no_es_un_error_y_no_llama_a_la_fuente(simular, validar):
    llamadas = simular(cdl_simulado())
    r = cliente.get("/api/ee-uu/cdl?lat=18.03&lon=-95.53")  # Isla, Veracruz
    assert r.status_code == 200 and llamadas == []
    d = r.json()
    validar(d, "ee-uu#/$defs/cdl")
    assert d["estado"] == "NO_EVALUABLE" and "EE. UU." in d["motivo"] and d["anios"] == []


def test_cdl_sin_clasificar_es_no_evaluable_sin_inventar_cultivo():
    r = cropscape.interpretar(CDL["sin_dato_2023"])
    assert r["codigo"] is None and r["categoria"] is None and "No Data" in r["motivo"]


def test_cdl_anios_que_fallan_salen_como_error_y_no_se_rellenan(simular, validar):
    simular(cdl_simulado(fallar=lambda a: a == 2020))
    d = cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2019&hasta=2021").json()
    validar(d, "ee-uu#/$defs/cdl")
    por_anio = {a["anio"]: a for a in d["anios"]}
    assert por_anio[2020]["estado"] == "ERROR_DATOS" and por_anio[2020]["categoria"] is None
    assert por_anio[2019]["categoria"] == "Corn"
    assert any(x["codigo"] == "CDL_ANIOS_SIN_LEER" for x in d["advertencias"])


def test_cdl_sin_ningun_anio_es_503(simular):
    simular(cdl_simulado(fallar=lambda a: True))
    r = cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2019&hasta=2020")
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"


def test_cdl_valida_anios():
    assert cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2007").status_code == 422
    assert cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&hasta=2026").status_code == 422
    assert cliente.get(f"/api/ee-uu/cdl?lat={LAT}&lon={LON}&desde=2020&hasta=2019").status_code == 422


def test_ssurgo_real_de_iowa_cumple_la_propuesta_de_contrato(simular, validar):
    simular(sda_simulado())
    r = cliente.get(f"/api/ee-uu/ssurgo?lat={LAT}&lon={LON}")
    assert r.status_code == 200
    d = r.json()
    validar(d, "ee-uu#/$defs/ssurgo")
    assert d["estado"] == "EVALUABLE"
    assert d["componente"] == {"nombre": "Webster", "porcentaje": 90.0, "grupoHidrologico": "C/D"}
    assert d["unidad"]["nombre"].startswith("Webster clay loam")
    h0 = d["horizontes"][0]
    assert h0["profundidadCm"] == {"desde": 0, "hasta": 20} and (h0["arenaPct"], h0["limoPct"], h0["arcillaPct"]) == (21.0, 47.0, 32.0)
    # Agua disponible a 100 cm con los awc_r reales: se recalcula aqui a mano desde la respuesta guardada.
    filas = [dict(zip(SDA["respuesta"]["Table"][0], f)) for f in SDA["respuesta"]["Table"][1:]]
    esperado = sum(float(f["awc_r"]) * (min(float(f["hzdepb_r"]), 100) - float(f["hzdept_r"])) * 10 for f in filas if float(f["hzdept_r"]) < 100)
    assert d["agua"]["tawMm"] == round(esperado, 1) and d["agua"]["estado"] == "EVALUABLE" and d["agua"]["profundidadCubiertaCm"] == 100


def test_ssurgo_punto_sin_suelo_cartografiado(simular, validar):
    simular(sda_simulado(cuerpo=SDA["punto_sin_dato"]))
    d = cliente.get("/api/ee-uu/ssurgo?lat=43.0&lon=-87.0").json()
    validar(d, "ee-uu#/$defs/ssurgo")
    assert d["estado"] == "NO_EVALUABLE" and d["horizontes"] == [] and "agua" not in d


def test_ssurgo_fuera_de_ee_uu_no_llama(simular):
    llamadas = simular(sda_simulado())
    d = cliente.get("/api/ee-uu/ssurgo?lat=18.03&lon=-95.53").json()
    assert d["estado"] == "NO_EVALUABLE" and llamadas == []


def test_ssurgo_caido_es_503(simular):
    simular(sda_simulado(estado=503))
    r = cliente.get(f"/api/ee-uu/ssurgo?lat={LAT}&lon={LON}")
    assert r.status_code == 503 and "Soil Data Access" in r.json()["motivo"]


def test_agua_disponible_no_extrapola_un_perfil_somero():
    h = [{"profundidadCm": {"desde": 0, "hasta": 30}, "awcCmCm": 0.2}, {"profundidadCm": {"desde": 30, "hasta": 60}, "awcCmCm": None}]
    assert regional.agua_disponible(h) == (60.0, 30)
    assert regional.agua_disponible([{"profundidadCm": {"desde": 0, "hasta": 50}, "awcCmCm": None}]) == (None, 0)


def test_la_consulta_sql_solo_lleva_numeros():
    q = sda.consulta(-93.4, 42.05)
    assert re.search(r"point\(-93\.4 42\.05\)", q)
