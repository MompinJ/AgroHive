import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app import config
from app.main import app

cliente = TestClient(app)
RAIZ = Path(__file__).resolve().parents[2]


def test_health():
    r = cliente.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    cuerpo = r.json()
    paquete = json.loads((RAIZ / "contratos" / "package.json").read_text(encoding="utf-8"))
    assert cuerpo["versionContrato"] == paquete["version"] == config.VERSION_CONTRATO
    assert cuerpo["commit"] is None or len(cuerpo["commit"]) >= 7  # el commit sirve para verificar despliegues


def test_version_contrato_sigue_al_paquete():
    paquete = json.loads((RAIZ / "contratos" / "package.json").read_text(encoding="utf-8"))
    assert config.VERSION_CONTRATO == paquete["version"]
    assert cliente.get("/health").json()["versionContrato"] == paquete["version"]


def test_version_contrato_falla_si_falta_el_paquete(tmp_path):
    with pytest.raises(RuntimeError, match="No se encontro la version de contratos"):
        config.leer_version_contrato(tmp_path / "package.json")


def test_version_contrato_falla_sin_version(tmp_path):
    ruta = tmp_path / "package.json"
    ruta.write_text("{}", encoding="utf-8")
    with pytest.raises(RuntimeError, match="no trae version"):
        config.leer_version_contrato(ruta)


def test_version_contrato_falla_si_no_es_json(tmp_path):
    ruta = tmp_path / "package.json"
    ruta.write_text("{", encoding="utf-8")
    with pytest.raises(RuntimeError, match="no es JSON valido"):
        config.leer_version_contrato(ruta)


def test_cultivos_sin_catalogo_no_inventa():
    cuerpo = cliente.get("/api/cultivos").json()
    assert cuerpo["estado"] == "NO_EVALUABLE" and cuerpo["cultivos"] == []


def test_cultivos_lee_el_catalogo(tmp_path):
    config.CATALOGOS_DIR.mkdir(parents=True)
    (config.CATALOGOS_DIR / "cultivos.json").write_text('{"cultivos": [{"id": "maiz"}]}', encoding="utf-8")
    assert cliente.get("/api/cultivos").json()["cultivos"][0]["id"] == "maiz"


def test_openapi_publica_las_rutas():
    rutas = cliente.get("/openapi.json").json()["paths"]
    assert {"/health", "/api/clima", "/api/elevacion", "/api/cultivos", "/api/calendario"} <= set(rutas)
