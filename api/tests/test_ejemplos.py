"""Parcelas de ejemplo mundiales (datos/demo/ejemplos/, herramientas/ejemplos/grabar.py): lo grabado cumple contratos/ y,
sin red y con la cache local vacia, la API responde la coordenada de cada ejemplo desde su cache grabada."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import config, servicios
from app.main import app
from tests.conftest import RAIZ

EJEMPLOS = RAIZ / "datos" / "demo" / "ejemplos"
INDICE = json.loads((EJEMPLOS / "indice.json").read_text(encoding="utf-8"))
IDS = [e["id"] for e in INDICE["ejemplos"]]
cliente = TestClient(app)


def leer(id_, ruta):
    return json.loads((EJEMPLOS / id_ / ruta).read_text(encoding="utf-8"))


def test_hay_de_5_a_6_ejemplos_en_varios_continentes():
    assert 5 <= len(IDS) <= 6
    assert len({e["continente"] for e in INDICE["ejemplos"]}) >= 5
    assert "no son levantamientos" in INDICE["aviso"]


@pytest.mark.parametrize("id_", IDS)
def test_lo_grabado_cumple_los_contratos(id_, validar):
    man = leer(id_, "manifiesto.json")
    assert man["versionContrato"] == config.VERSION_CONTRATO, "el ejemplo se grabo con otra version del contrato: regrabarlo"
    parcela = leer(id_, "parcela.json")
    validar(parcela, "parcela#")
    assert parcela["coordenadasIlustrativas"] is True and parcela["meta"]["esEjemplo"] is True
    assert "no es un levantamiento" in parcela["meta"]["aviso"]
    assert man["datos"]["clima"]["estado"] == "EVALUABLE", "el clima de un ejemplo sale de NASA POWER"
    for dato, d in man["datos"].items():
        if "archivo" in d:
            cuerpo = leer(id_, d["archivo"])
            if dato == "terreno":  # respuesta de POST /api/elevacion: meta, terreno y celdas
                validar(cuerpo["meta"], "comun#/$defs/meta")
                cuerpo = cuerpo["terreno"]
            validar(cuerpo, d["contrato"])
        else:
            assert d["estado"] == "NO_EVALUABLE" and d.get("motivo") or dato == "worldcover", f"{dato} sin archivo ni motivo"
    serie = leer(id_, "respuestas/serie-clima.json")
    desde, hasta = servicios.VENTANA_ESTANDAR
    assert serie["diario"][0]["fecha"] == desde.isoformat() and serie["diario"][-1]["fecha"] == hasta.isoformat()


@pytest.mark.parametrize("id_", IDS)
def test_sin_red_la_api_responde_el_ejemplo_desde_su_cache(id_, simular, monkeypatch):
    monkeypatch.setattr(config, "DEMO_DIR", EJEMPLOS / id_ / "cache")
    llamadas = simular(lambda r: httpx.Response(503))  # sin red
    parcela = leer(id_, "parcela.json")
    lon, lat = parcela["centroide"]
    desde, hasta = servicios.VENTANA_ESTANDAR
    r = cliente.get("/api/clima", params={"lat": lat, "lon": lon, "desde": desde.isoformat(), "hasta": hasta.isoformat()})
    assert r.status_code == 200 and r.json()["estado"] == "EVALUABLE"
    assert r.json()["diario"] == leer(id_, "respuestas/serie-clima.json")["diario"]
    p = cliente.get("/api/proxima-temporada", params={"lat": lat, "lon": lon})
    assert p.status_code == 200 and p.json()["metodo"] == "anomalia_estacional"
    celdas = [{k: c[k] for k in ("id", "i", "j", "centro")} for c in parcela["celdas"]]
    e = cliente.post("/api/elevacion", json={"tamanoCeldaM": parcela["tamanoCeldaM"], "celdas": celdas})
    assert e.status_code == 200
    assert {c["id"]: c["elevacionM"] for c in e.json()["celdas"]} == {c["id"]: c["elevacionM"] for c in parcela["celdas"]}
    assert llamadas == [], "con la cache del ejemplo no debe tocar la red"
