import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app import config, servicios
from app.clientes import isric, openlandmap
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
    assert s["textura"]["clase"] == "franco_arcillo_arenoso" and s["textura"]["grupo"] == "arcilloso"  # grupo segun la tabla de A1.6
    assert 5.0 <= s["ph"]["valor"] <= 5.8
    assert s["profundidad"] == {"desdeCm": 0, "hastaCm": 30}
    assert s["agua"]["tawMmPorM"]["estado"] == "NO_EVALUABLE"  # sin tabla de suelos en este checkout: no se inventa
    assert "SUELO_SUPUESTO" in {a["codigo"] for a in s["advertencias"]}
    isric_llamadas = [u for u in llamadas if "maps.isric.org" in u]
    assert len(isric_llamadas) == 15  # 5 propiedades (arcilla, arena, limo, pH, carbono) x 3 capas
    cliente.get(URL)
    assert len([u for u in llamadas if "maps.isric.org" in u]) == 15, "la segunda consulta sale de la cache"


def test_suelo_sin_servicio_es_error_datos_para_usar_el_selector(simular):
    simular(lambda r: httpx.Response(503))
    r = cliente.get(URL)
    assert r.status_code == 503
    d = r.json()
    assert d["estado"] == "ERROR_DATOS" and "selector manual" in d["motivo"]


def test_suelo_sin_dato_en_la_zona_no_se_inventa(simular, monkeypatch):
    simular(isric_real)
    monkeypatch.setattr(isric, "pixeles_validos", lambda tiff: [])
    r = cliente.get(URL)
    assert r.status_code == 503
    assert "no tiene dato de textura" in r.json()["motivo"]


def test_geotiff_ilegible_es_error_de_fuente(simular):
    simular(lambda r: httpx.Response(200, content=b"no es un tiff"))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"


def test_suelo_valida_coordenadas():
    assert cliente.get("/api/suelo?lat=95&lon=0").status_code == 422


def escribir_tabla(texturas):
    """Escribe una tabla de suelos con la misma forma que datos/catalogos/suelos.json (A1.6, de Mafer)."""
    import json
    config.CATALOGOS_DIR.mkdir(parents=True, exist_ok=True)
    (config.CATALOGOS_DIR / "suelos.json").write_text(json.dumps({"meta": {"versionContrato": "0.2.0", "esEjemplo": False}, "versionCatalogo": "0.1.0",
                                                                  "representanteGrupo": {}, "texturas": texturas}), encoding="utf-8")


HUECO = "FAO-56 Tabla 19 no tiene fila para esta clase USDA; falta otra fuente citada."
FUENTE_TAW = {"nombre": "FAO-56 (Allen et al., 1998), Tabla 19 y ecuacion 82", "url": "https://www.fao.org/4/x0490e/x0490e0c.htm", "cita": "Tabla 19, fila 'Loamy sand'",
              "consultado": "2026-11-14", "unidades": "mm por metro de suelo"}


def test_la_clase_de_isla_no_tiene_taw_en_fao56_y_se_dice(simular, validar):
    simular(isric_real)
    escribir_tabla([{"clase": "franco_arcillo_arenoso", "grupo": "arcilloso", "tawMmPorM": {"estado": "NO_EVALUABLE", "motivo": HUECO}}])
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    assert s["textura"]["clase"] == "franco_arcillo_arenoso"
    assert s["agua"]["tawMmPorM"] == {"estado": "NO_EVALUABLE", "motivo": HUECO}  # nunca se sustituye por el de un grupo vecino


def test_taw_de_la_tabla_de_suelos_se_copia_con_su_fuente(simular, validar, monkeypatch):
    simular(isric_real)
    monkeypatch.setattr(servicios.clasificacion, "clasificar", lambda *a: "arena_franca")
    escribir_tabla([{"clase": "arena_franca", "grupo": "arenoso", "tawMmPorM": {"estado": "EVALUABLE", "valor": 90.0, "unidad": "mm/m", "fuente": FUENTE_TAW, "etiqueta": "FUENTE"}}])
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    taw = s["agua"]["tawMmPorM"]
    assert taw["estado"] == "EVALUABLE" and taw["valor"] == 90.0 and taw["fuente"]["cita"].startswith("Tabla 19")
    assert s["textura"]["grupo"] == "arenoso"  # el grupo sale de la tabla


def test_catalogo_de_suelos_roto_no_tumba_la_api(simular):
    simular(isric_real)
    config.CATALOGOS_DIR.mkdir(parents=True, exist_ok=True)
    (config.CATALOGOS_DIR / "suelos.json").write_text("{roto", encoding="utf-8")
    assert cliente.get(URL).status_code == 200


def test_estimaciones_y_carbono_organico_cumplen_el_contrato(simular, validar):
    simular(isric_real)
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    (e,) = s["estimaciones"]
    assert s["estimacionUsada"] == e["id"] == "isric-soilgrids-wcs" and e["servicio"] == "isric_soilgrids_wcs"
    assert e["textura"]["clase"] == s["textura"]["clase"] and e["ph"] == s["ph"]["valor"]
    assert 20 <= e["carbonoOrganicoGKg"] <= 32  # SoilGrids soc 0-30 cm, dg/kg / 10 (FAQ de ISRIC)
    assert s["textura"]["estado"] == "EVALUABLE"  # pixeles a menos de 1 km


def test_pixeles_lejanos_son_exploratorios_y_se_dice(simular, validar, monkeypatch):
    simular(isric_real)
    original = isric.estimar
    monkeypatch.setattr(isric, "estimar", lambda pix, x, y, f: (lambda r: None if r is None else (r[0], r[1], 3000))(original(pix, x, y, f)))
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    assert s["textura"]["estado"] == "EXPLORATORIO" and s["ph"]["estado"] == "EXPLORATORIO"
    assert s["estimaciones"][0]["estado"] == "EXPLORATORIO"
    assert "SUELO_SIN_DATO_CERCANO" in {a["codigo"] for a in s["advertencias"]}


def olm_real(monkeypatch):
    """OpenLandMap simulado con la medicion real guardada (el catalogo STAC y GDAL no se tocan en las pruebas)."""
    medicion = {k: tuple(v) for k, v in json.loads(real("openlandmap_estimacion.json")).items() if k != "nota"}

    async def estimar(cliente, lon, lat):
        return medicion
    monkeypatch.setattr(openlandmap, "estimar", estimar)


def test_openlandmap_se_suma_a_isric_para_compararlas(simular, validar, monkeypatch):
    simular(isric_real)
    olm_real(monkeypatch)
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    isric_e, olm_e = s["estimaciones"]
    assert (isric_e["servicio"], olm_e["servicio"]) == ("isric_soilgrids_wcs", "openlandmap")
    assert s["estimacionUsada"] == isric_e["id"]  # ISRIC sigue siendo la usada por defecto
    assert olm_e["textura"]["clase"] == "franco_arcillo_arenoso" == isric_e["textura"]["clase"]  # las dos coinciden en la clase
    assert olm_e["ph"] == 5.9 and olm_e["carbonoOrganicoGKg"] == 8.2 and olm_e["profundidad"] == {"desdeCm": 0, "hastaCm": 30}
    assert olm_e["fuente"]["resolucion"] == "30 m" and "zenodo" in olm_e["fuente"]["cita"]
    assert olm_e["estado"] == "EVALUABLE"


def test_si_isric_falla_se_usa_openlandmap_y_se_dice(simular, validar, monkeypatch):
    simular(lambda r: httpx.Response(503))
    olm_real(monkeypatch)
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    assert s["estimacionUsada"] == "openlandmap-soildb" and [e["servicio"] for e in s["estimaciones"]] == ["openlandmap"]
    assert s["textura"]["clase"] == "franco_arcillo_arenoso" and s["ph"]["valor"] == 5.9
    assert "SUELO_ISRIC_NO_DISPONIBLE" in {a["codigo"] for a in s["advertencias"]}


def test_si_openlandmap_falla_solo_queda_isric_con_aviso(simular, validar):
    simular(isric_real)  # el catalogo STAC responde 404: OpenLandMap no esta disponible
    s = cliente.get(URL).json()
    validar(s, "suelo#")
    assert [e["servicio"] for e in s["estimaciones"]] == ["isric_soilgrids_wcs"]
    assert "OPENLANDMAP_NO_DISPONIBLE" in {a["codigo"] for a in s["advertencias"]}


def test_pixeles_sin_dato_de_openlandmap_son_exploratorios(monkeypatch):
    import numpy as np
    assert openlandmap.resumir(np.array([[255, 255], [255, 255]]), 255, 1.0) is None  # nada que mediar
    v, validos, total = openlandmap.resumir(np.array([[59, 255], [61, 255]]), 255, 0.1)
    assert (round(v, 1), validos, total) == (6.0, 2, 4)  # mediana de 59 y 61 con factor 0.1: 6.0
