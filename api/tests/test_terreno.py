import httpx
import pytest
from fastapi.testclient import TestClient

from app import servicios
from app.clientes import terrarium
from app.main import app
from app.modelos import CeldaEntrada
from tests.conftest import real

cliente = TestClient(app)


def malla(n, lado_deg=0.0003, lon0=-95.53, lat0=18.03):
    return [{"id": f"c-{i}-{j}", "i": i, "j": j, "centro": [lon0 + j * lado_deg, lat0 - i * lado_deg]} for i in range(n) for j in range(n)]


def test_decodifica_terrarium():
    assert terrarium.decodificar((128, 0, 0)) == 0
    assert terrarium.decodificar((128, 100, 128)) == 100.5


def test_pendiente_de_un_plano_inclinado():
    celdas = [CeldaEntrada(id=f"c-{i}-{j}", i=i, j=j, centro=(0, 0)) for i in range(4) for j in range(4)]
    elev = {(i, j): 10.0 * j for i in range(4) for j in range(4)}  # 10 m por celda de 100 m en x => 10 %
    pend = servicios.pendientes(celdas, elev, 100.0)
    assert all(abs(v - 10.0) < 1e-9 for v in pend.values())


def test_pendiente_sin_vecinos_o_sin_elevacion_es_null():
    c = [CeldaEntrada(id="c-0-0", i=0, j=0, centro=(0, 0))]
    assert servicios.pendientes(c, {(0, 0): 5.0}, 50.0)["c-0-0"] is None
    assert servicios.pendientes(c, {(0, 0): None}, 50.0)["c-0-0"] is None


def test_terreno_con_tiles_reales(simular):
    def handler(request: httpx.Request):
        return httpx.Response(200, content=real("terrarium.png")) if "elevation-tiles" in request.url.host else httpx.Response(404)
    simular(handler)
    r = cliente.post("/api/elevacion", json={"tamanoCeldaM": 30, "celdas": malla(3)})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["terreno"]["estado"] == "EVALUABLE"
    assert len(cuerpo["celdas"]) == 9
    for c in cuerpo["celdas"]:
        assert 33 <= c["elevacionM"] <= 129


def test_respaldo_de_elevacion_open_meteo(simular):
    def handler(request: httpx.Request):
        if "elevation-tiles" in request.url.host:
            return httpx.Response(500)
        n = len(request.url.params["latitude"].split(","))
        return httpx.Response(200, json={"elevation": [59.0] * n})
    simular(handler)
    cuerpo = cliente.post("/api/elevacion", json={"tamanoCeldaM": 30, "celdas": malla(2)}).json()
    assert cuerpo["terreno"]["estado"] == "RESPALDO_HISTORICO"
    codigos = {a["codigo"] for a in cuerpo["advertencias"]}
    assert {"ELEVACION_RESPALDO", "RESOLUCION_DEM_GRUESA"} <= codigos
    assert all(c["elevacionM"] == 59.0 and c["pendientePct"] == 0.0 for c in cuerpo["celdas"])


def test_sin_fuentes_de_elevacion_es_error_datos(simular):
    simular(lambda r: httpx.Response(500))
    r = cliente.post("/api/elevacion", json={"tamanoCeldaM": 30, "celdas": malla(2)})
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"


def test_tope_de_celdas_y_forma():
    assert cliente.post("/api/elevacion", json={"tamanoCeldaM": 30, "celdas": malla(41)}).status_code == 422
    assert cliente.post("/api/elevacion", json={"tamanoCeldaM": 0, "celdas": malla(2)}).status_code == 422
