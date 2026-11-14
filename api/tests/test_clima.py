from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app import cache, servicios
from app.clientes import power
from app.main import app
from tests.conftest import real, real_json

cliente = TestClient(app)
PARAMS = "lat=18.03&lon=-95.53&desde=2024-01-01&hasta=2024-01-10"


def responder(power_ok=True, om_ok=True, imerg_ok=True, imerg="power_imerg.json"):
    def handler(request: httpx.Request):
        if "power.larc" in request.url.host:
            if request.url.params.get("parameters") == "IMERG_PRECTOT":  # A4.10: segunda llamada, en UTC
                return httpx.Response(200, content=real(imerg)) if imerg_ok else httpx.Response(503)
            return httpx.Response(200, content=real("power_ag.json")) if power_ok else httpx.Response(503)
        if "archive-api" in request.url.host:
            return httpx.Response(200, content=real("om_archive.json")) if om_ok else httpx.Response(503)
        return httpx.Response(404)
    return handler


def test_celda_de_power():
    assert power.centro_celda(18.03, -95.53) == (18.0, -95.625)
    assert power.centro_celda(18.2, -95.4) == (18.0, -95.625)
    assert power.centro_celda(18.3, -95.0) == (18.5, -95.0)


def test_parsea_respuesta_real_de_power(validar):
    dias = power.parsear(real_json("power_ag.json"))
    assert len(dias) == 10
    tercer = dias[2]
    assert tercer["fecha"] == "2024-01-03" and tercer["lluviaMm"] == 1.62
    for d in dias:
        validar(d, "clima-escenario#/$defs/dia")


def test_relleno_999_es_null_y_no_cero():
    cuerpo = real_json("power_ag.json")
    cuerpo["properties"]["parameter"]["PRECTOTCORR"]["20240103"] = -999.0
    assert power.parsear(cuerpo)[2]["lluviaMm"] is None


def test_serie_de_power_usa_cache(simular, validar):
    llamadas = simular(responder())
    r1 = cliente.get(f"/api/clima?{PARAMS}")
    assert r1.status_code == 200
    cuerpo = r1.json()
    assert cuerpo["estado"] == "EVALUABLE" and cuerpo["respaldo"] is False
    assert cuerpo["fuente"]["coordenada"] == [-95.625, 18.0]
    validar(cuerpo["meta"], "comun#/$defs/meta")
    validar(cuerpo["fuente"], "comun#/$defs/fuente")
    for d in cuerpo["diario"]:
        validar(d, "clima-escenario#/$defs/dia")
    validar(cuerpo, "serie-clima")  # la respuesta completa, con lluviaSatelital, cumple el contrato
    n = len(llamadas)
    assert cliente.get(f"/api/clima?{PARAMS}").json()["diario"] == cuerpo["diario"]
    assert len(llamadas) == n, "la segunda consulta debe salir de la cache"


def test_misma_celda_comparte_cache(simular):
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    n = len(llamadas)
    cliente.get("/api/clima?lat=18.07&lon=-95.57&desde=2024-01-01&hasta=2024-01-10")  # misma celda de POWER (0.5 x 0.625) y de IMERG (0.1)
    assert len(llamadas) == n


def test_otra_celda_imerg_dentro_de_la_celda_de_power_solo_repite_imerg(simular):
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    n = len(llamadas)
    cliente.get("/api/clima?lat=18.2&lon=-95.4&desde=2024-01-01&hasta=2024-01-10")  # misma celda de POWER, otra de IMERG
    nuevas = llamadas[n:]
    assert len(nuevas) == 1 and "IMERG_PRECTOT" in nuevas[0]


# ---------------------------------------------------------------- A4.10: lluvia IMERG como evidencia

def test_imerg_se_pide_aparte_y_en_utc(simular):
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    imerg = [u for u in llamadas if "IMERG_PRECTOT" in u]
    principal = [u for u in llamadas if "power.larc" in u and "IMERG_PRECTOT" not in u]
    assert len(imerg) == 1 and "time-standard=UTC" in imerg[0] and "latitude=18.05" in imerg[0] and "longitude=-95.55" in imerg[0]
    assert len(principal) == 1 and "time-standard" not in principal[0], "la serie principal sigue en hora local"


def test_clima_trae_lluvia_satelital_con_fuente_y_sin_tocar_la_serie_principal(simular, validar):
    simular(responder())
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    ll = cuerpo["lluviaSatelital"]
    assert ll["variable"] == "IMERG_PRECTOT" and ll["estandarHora"] == "UTC" and len(ll["dias"]) == 10
    assert ll["fuente"]["resolucion"].startswith("0.1") and ll["fuente"]["consultado"] and ll["fuente"]["coordenada"] == [-95.55, 18.05]
    assert "no entra al balance" in ll["fuente"]["nota"].lower()
    assert cuerpo["diario"][2]["lluviaMm"] == 1.62, "PRECTOTCORR sigue siendo la lluvia del motor"
    validar(cuerpo, "serie-clima")


def test_parsear_imerg_relleno_999_es_null_y_no_cero():
    cuerpo = real_json("power_imerg_reciente.json")
    dias = power.parsear_imerg(cuerpo)
    nulos = [d for d in dias if d["lluviaMm"] is None]
    assert len(dias) == 21 and len(nulos) == 11 and dias[0]["lluviaMm"] == 10.95
    assert all(d["fecha"] >= "2026-09-15" for d in nulos), "los ultimos dias aun sin publicar quedan en null"
    assert not any(d["lluviaMm"] == -999 for d in dias)


def test_parsear_imerg_descarta_fechas_anteriores_al_inicio_de_imerg_y_negativos():
    cuerpo = {"header": {"fill_value": -999.0}, "properties": {"parameter": {"IMERG_PRECTOT": {
        "19990101": 3.2, "20000531": 13.54, "20000601": 7.03, "20240101": -4.0, "20240102": 0.0}}}}
    por_fecha = {d["fecha"]: d["lluviaMm"] for d in power.parsear_imerg(cuerpo)}
    assert por_fecha == {"1999-01-01": None, "2000-05-31": None, "2000-06-01": 7.03, "2024-01-01": None, "2024-01-02": 0.0}


def test_clima_con_dias_imerg_sin_publicar_cumple_el_contrato(simular, validar):
    simular(responder(imerg="power_imerg_reciente.json"))
    cuerpo = cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=2026-09-05&hasta=2026-09-25").json()
    assert sum(1 for d in cuerpo["lluviaSatelital"]["dias"] if d["lluviaMm"] is None) == 11
    validar(cuerpo, "serie-clima")


def test_si_imerg_falla_el_clima_sigue_y_avisa(simular, validar):
    simular(responder(imerg_ok=False))
    r = cliente.get(f"/api/clima?{PARAMS}")
    cuerpo = r.json()
    assert r.status_code == 200 and cuerpo["estado"] == "EVALUABLE" and "lluviaSatelital" not in cuerpo
    assert "LLUVIA_SATELITAL_NO_DISPONIBLE" in {a["codigo"] for a in cuerpo["advertencias"]}
    validar(cuerpo, "serie-clima")


def test_imerg_con_cache_vencida_avisa_y_conserva_los_datos(simular, monkeypatch, validar):
    simular(responder())
    primero = cliente.get(f"/api/clima?{PARAMS}").json()
    simular(responder(imerg_ok=False))
    monkeypatch.setattr(servicios, "_vigente", lambda edad, hasta: False)
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["lluviaSatelital"]["dias"] == primero["lluviaSatelital"]["dias"]
    assert "CACHE_VENCIDA" in {a["codigo"] for a in cuerpo["advertencias"]}
    validar(cuerpo, "serie-clima")


def test_respuesta_inesperada_de_imerg_no_tumba_el_clima(simular):
    def handler(request: httpx.Request):
        if request.url.params.get("parameters") == "IMERG_PRECTOT":
            return httpx.Response(200, json={"properties": {"parameter": {}}})
        return httpx.Response(200, content=real("power_ag.json"))
    simular(handler)
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["estado"] == "EVALUABLE" and "lluviaSatelital" not in cuerpo and cuerpo["advertencias"]


def test_respaldo_open_meteo_se_ve(simular, validar):
    simular(responder(power_ok=False))
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["estado"] == "RESPALDO_HISTORICO" and cuerpo["respaldo"] is True
    assert {a["codigo"] for a in cuerpo["advertencias"]} >= {"POWER_NO_DISPONIBLE", "CLIMA_RESPALDO_OPEN_METEO"}
    assert "Open-Meteo" in cuerpo["fuente"]["nombre"]
    for a in cuerpo["advertencias"]:
        validar(a, "comun#/$defs/advertencia")
    for d in cuerpo["diario"]:
        validar(d, "clima-escenario#/$defs/dia")
    assert cuerpo["diario"][0]["et0Mm"] is not None


def test_sin_fuentes_ni_cache_es_error_datos(simular):
    simular(responder(power_ok=False, om_ok=False))
    r = cliente.get(f"/api/clima?{PARAMS}")
    assert r.status_code == 503
    assert r.json()["estado"] == "ERROR_DATOS"


def test_cache_vencida_si_todo_falla(simular, monkeypatch):
    simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    simular(responder(power_ok=False, om_ok=False))
    monkeypatch.setattr(servicios, "_vigente", lambda edad, hasta: False)
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["estado"] == "RESPALDO_HISTORICO"
    assert "CACHE_VENCIDA" in {a["codigo"] for a in cuerpo["advertencias"]}


def test_periodos_invalidos():
    manana = date.today() + timedelta(days=1)
    for q in (f"desde=1980-12-31&hasta=1981-02-01", f"desde=2024-02-01&hasta=2024-01-01", f"desde=2024-01-01&hasta={manana}"):
        assert cliente.get(f"/api/clima?lat=18&lon=-95&{q}").status_code == 422
    assert cliente.get("/api/clima?lat=99&lon=-95&desde=2024-01-01&hasta=2024-01-02").status_code == 422


def test_cache_atomica_y_dañada(tmp_path):
    cache.escribir("x/y", {"a": 1})
    assert cache.leer("x/y")[0] == {"a": 1}
    cache._ruta("x/y").write_text("{roto", encoding="utf-8")
    assert cache.leer("x/y") is None
