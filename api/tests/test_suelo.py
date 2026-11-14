import httpx
import pytest
from fastapi.testclient import TestClient

from app.clientes import isric
from app.main import app
from app.textura import GRUPO, clasificar
from tests.conftest import real

cliente = TestClient(app)
URL = "/api/suelo?lat=18.03&lon=-95.53"


def isric_real(request: httpx.Request):
    """Devuelve el GeoTIFF real guardado en A0.7/A2.14 segun la propiedad pedida (la misma ventana para las 3 capas)."""
    if "maps.isric.org" not in request.url.host:
        return httpx.Response(404)
    prop = request.url.params["map"].split("/")[-1].removesuffix(".map")
    return httpx.Response(200, content=real(f"isric_{prop}_0-5cm_nativo.tif"))


def test_clasifica_casos_conocidos():
    casos = {(60, 25, 15): "franco_arenoso", (90, 5, 5): "arena", (85, 10, 5): "arena_franca", (40, 40, 20): "franco",
             (20, 50, 30): "franco_arcillo_limoso", (20, 20, 60): "arcilla", (10, 85, 5): "limo", (10, 70, 20): "franco_limoso",
             (30, 40, 30): "franco_arcilloso", (55, 20, 25): "franco_arcillo_arenoso", (50, 5, 45): "arcillo_arenoso", (5, 50, 45): "arcillo_limoso"}
    for (arena, limo, arcilla), esperado in casos.items():
        assert clasificar(arena, limo, arcilla) == esperado, (arena, limo, arcilla)


def test_todas_las_combinaciones_tienen_clase_y_grupo():
    for arena in range(101):
        for arcilla in range(101 - arena):
            clase = clasificar(arena, 100 - arena - arcilla, arcilla)
            assert clase is not None and clase in GRUPO


def test_estimar_usa_la_mediana_cercana_y_amplia_el_radio():
    pix = [(100, 0, 200), (0, 200, 220), (0, 0, 400), (900, 0, 210)]
    assert isric.estimar(pix, 0, 0, 10) == (21.5, 4, 1000)  # mediana de 200, 210, 220 y 400
    lejos = [(2000, 0, 300), (0, 2500, 310)]
    assert isric.estimar(lejos, 0, 0, 10) == (30.5, 2, 3000)  # sin pixeles a 1 km, amplia a 3 km
    assert isric.estimar([(5000, 0, 300)], 0, 0, 10) is None  # nada cerca: no se inventa


def test_suelo_con_geotiff_reales(simular, validar):
    llamadas = simular(isric_real)
    r = cliente.get(URL)
    assert r.status_code == 200
    s = r.json()
    validar(s, "suelo#")
    assert s["etiqueta"] == "SUPUESTO" and s["textura"]["etiqueta"] == "SUPUESTO" and s["ph"]["etiqueta"] == "SUPUESTO"
    f = s["textura"]["fraccionesPct"]
    assert abs(f["arena"] + f["limo"] + f["arcilla"] - 100) < 0.5
    assert abs(f["arena"] - 50.4) < 0.3 and abs(f["limo"] - 27.1) < 0.3 and abs(f["arcilla"] - 22.5) < 0.3
    assert s["textura"]["clase"] == "franco_arcillo_arenoso" and s["textura"]["grupo"] == "franco"
    assert 5.0 <= s["ph"]["valor"] <= 5.8
    assert s["profundidad"] == {"desdeCm": 0, "hastaCm": 30}
    assert s["agua"]["tawMmPorM"]["estado"] == "NO_EVALUABLE"  # la tabla FAO-56 es de A1.6
    assert "SUELO_SUPUESTO" in {a["codigo"] for a in s["advertencias"]}
    assert len(llamadas) == 12  # 4 propiedades x 3 capas
    cliente.get(URL)
    assert len(llamadas) == 12, "la segunda consulta sale de la cache"


def test_suelo_sin_servicio_es_error_datos_para_usar_el_selector(simular):
    simular(lambda r: httpx.Response(503))
    r = cliente.get(URL)
    assert r.status_code == 503
    d = r.json()["detail"]
    assert d["estado"] == "ERROR_DATOS" and "selector manual" in d["motivo"]


def test_suelo_sin_dato_en_la_zona_no_se_inventa(simular, monkeypatch):
    simular(isric_real)
    monkeypatch.setattr(isric, "pixeles_validos", lambda tiff: [])
    r = cliente.get(URL)
    assert r.status_code == 503
    assert "no tiene dato de textura" in r.json()["detail"]["motivo"]


def test_geotiff_ilegible_es_error_de_fuente(simular):
    simular(lambda r: httpx.Response(200, content=b"no es un tiff"))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["detail"]["estado"] == "ERROR_DATOS"


def test_suelo_valida_coordenadas():
    assert cliente.get("/api/suelo?lat=95&lon=0").status_code == 422
