from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def test_health():
    r = cliente.get("/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


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
    assert {"/health", "/api/clima", "/api/elevacion", "/api/cultivos"} <= set(rutas)
