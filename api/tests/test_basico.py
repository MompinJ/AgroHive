from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_health():
    r = cliente.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
    cuerpo = r.json()
    assert cuerpo["versionContrato"] == "0.12.2" and (cuerpo["commit"] is None or len(cuerpo["commit"]) >= 7)  # el commit sirve para verificar despliegues


def test_version_contrato_sigue_al_paquete():
    import json
    from pathlib import Path
    paquete = json.loads((Path(__file__).resolve().parents[2] / "contratos" / "package.json").read_text(encoding="utf-8"))
    assert cliente.get("/health").json()["versionContrato"] == paquete["version"]


def test_cultivos_sin_catalogo_no_inventa():
    cuerpo = cliente.get("/api/cultivos").json()
    assert cuerpo["estado"] == "NO_EVALUABLE" and cuerpo["cultivos"] == []


def test_cultivos_lee_el_catalogo(tmp_path):
    from app import config
    config.CATALOGOS_DIR.mkdir(parents=True)
    (config.CATALOGOS_DIR / "cultivos.json").write_text('{"cultivos": [{"id": "maiz"}]}', encoding="utf-8")
    assert cliente.get("/api/cultivos").json()["cultivos"][0]["id"] == "maiz"


def test_openapi_publica_las_rutas():
    rutas = cliente.get("/openapi.json").json()["paths"]
    assert {"/health", "/api/clima", "/api/elevacion", "/api/cultivos", "/api/calendario"} <= set(rutas)
