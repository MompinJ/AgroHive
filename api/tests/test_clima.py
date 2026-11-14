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


def responder(power_ok=True, om_ok=True):
    def handler(request: httpx.Request):
        if "power.larc" in request.url.host:
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
    n = len(llamadas)
    assert cliente.get(f"/api/clima?{PARAMS}").json()["diario"] == cuerpo["diario"]
    assert len(llamadas) == n, "la segunda consulta debe salir de la cache"


def test_misma_celda_comparte_cache(simular):
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    n = len(llamadas)
    cliente.get("/api/clima?lat=18.2&lon=-95.4&desde=2024-01-01&hasta=2024-01-10")
    assert len(llamadas) == n


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
