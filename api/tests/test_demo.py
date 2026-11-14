"""Paquete de demo (A2.4): sin red y con la cache local vacia, la API responde desde config.DEMO_DIR."""
import shutil
from datetime import date, timedelta

import httpx
from fastapi.testclient import TestClient

from app import cache, config, proxima
from app.main import app
from tests.test_proxima import power_sintetico, real

cliente = TestClient(app)


def generar_paquete(simular, monkeypatch, tmp_path, dias_de_antiguedad=0):
    """Llena una cache con respuestas simuladas y la deja como paquete de demo; luego vacia la cache local."""
    def con_red(request: httpx.Request):
        if "power.larc" in request.url.host:
            return power_sintetico(request)
        if "seasonal-api" in request.url.host:
            return httpx.Response(200, content=real("om_seasonal_210d.json"))
        return httpx.Response(404)
    simular(con_red)
    assert cliente.get("/api/proxima-temporada?lat=18.03&lon=-95.53").status_code == 200
    demo = tmp_path / "paquete"
    shutil.copytree(config.CACHE_DIR, demo)
    if dias_de_antiguedad:
        import json
        for f in demo.glob("estacional_*.json"):
            c = json.loads(f.read_text(encoding="utf-8"))
            c["guardado"] -= dias_de_antiguedad * 86400
            c["valor"]["consultado"] = (date.today() - timedelta(days=dias_de_antiguedad)).isoformat()
            f.write_text(json.dumps(c), encoding="utf-8")
    shutil.rmtree(config.CACHE_DIR)
    monkeypatch.setattr(config, "DEMO_DIR", demo)
    return demo


def test_sin_red_y_sin_cache_responde_el_paquete(simular, monkeypatch, tmp_path):
    generar_paquete(simular, monkeypatch, tmp_path)
    llamadas = simular(lambda r: httpx.Response(503))  # sin red
    llamadas.clear()  # la lista del fixture es la misma de la fase de generacion
    r = cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=2006-01-01&hasta=2025-12-31")
    assert r.status_code == 200 and r.json()["estado"] == "EVALUABLE" and len(r.json()["diario"]) == 7305
    p = cliente.get("/api/proxima-temporada?lat=18.03&lon=-95.53")
    assert p.status_code == 200 and p.json()["metodo"] == "anomalia_estacional"
    assert llamadas == [], "con el paquete no debe tocar la red"


def test_otra_zona_sin_paquete_sigue_fallando_con_503(simular, monkeypatch, tmp_path):
    generar_paquete(simular, monkeypatch, tmp_path)
    simular(lambda r: httpx.Response(503))
    r = cliente.get("/api/clima?lat=42.0&lon=-93.6&desde=2006-01-01&hasta=2025-12-31")
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"


def test_pronostico_viejo_del_paquete_dice_su_fecha(simular, monkeypatch, tmp_path):
    generar_paquete(simular, monkeypatch, tmp_path, dias_de_antiguedad=5)
    simular(lambda r: httpx.Response(503))
    p = cliente.get("/api/proxima-temporada?lat=18.03&lon=-95.53").json()
    antes = (date.today() - timedelta(days=5)).isoformat()
    assert p["emitido"] == antes  # no se hace pasar por reciente
    aviso = next(a for a in p["advertencias"] if a["codigo"] == "ESTACIONAL_EN_CACHE")
    assert antes in aviso["mensaje"]
    assert next(f for f in p["fuentes"] if "ECMWF" in f["nombre"])["consultado"] == antes


def test_cache_local_manda_sobre_el_paquete(tmp_path, monkeypatch):
    demo = tmp_path / "paquete"
    demo.mkdir()
    monkeypatch.setattr(config, "DEMO_DIR", demo)
    monkeypatch.setattr(config, "CACHE_DIR", demo)
    cache.escribir("k", {"v": "demo"})
    monkeypatch.setattr(config, "CACHE_DIR", tmp_path / "local")
    assert cache.leer("k")[0] == {"v": "demo"}
    cache.escribir("k", {"v": "local"})
    assert cache.leer("k")[0] == {"v": "local"}
