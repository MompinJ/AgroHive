"""Cada respuesta de la API se valida contra los schemas de contratos/ (fuente de verdad de los datos, decision del 14/11)."""
import json

import httpx
from fastapi.testclient import TestClient

from app import config
from app.main import app
from tests.conftest import RAIZ, real
from tests.test_clima import PARAMS, responder
from tests.test_terreno import malla

cliente = TestClient(app)


def test_clima_completo_cumple_serie_clima(simular, validar):
    simular(responder())
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    validar(cuerpo, "serie-clima#")
    assert cuerpo["diario"][0]["humedadRaizFraccionSat"] == 0.76  # GWETROOT real, sin convertir
    hs = cuerpo["humedadSuelo"]
    assert hs["variable"] == "GWETROOT" and set(hs["uso"]) == {"condicion_inicial", "comparacion"}
    assert "No es fraccion de TAW" in hs["definicion"]


def test_clima_de_respaldo_cumple_serie_clima_y_no_trae_humedad_de_raiz(simular, validar):
    simular(responder(power_ok=False))
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    validar(cuerpo, "serie-clima#")
    assert cuerpo["estado"] == "RESPALDO_HISTORICO"
    assert "humedadSuelo" not in cuerpo  # Open-Meteo no entrega GWETROOT: no se inventa
    assert all(d["humedadRaizFraccionSat"] is None for d in cuerpo["diario"])


def test_elevacion_cumple_parcela(simular, validar):
    simular(lambda r: httpx.Response(200, content=real("terrarium.png")) if "elevation-tiles" in r.url.host else httpx.Response(404))
    entrada = {"tamanoCeldaM": 30, "celdas": malla(3)}
    cuerpo = cliente.post("/api/elevacion", json=entrada).json()
    validar(cuerpo["meta"], "comun#/$defs/meta")
    validar(cuerpo["terreno"], "parcela#/properties/terreno")
    for dada, calculada in zip(entrada["celdas"], cuerpo["celdas"]):
        assert dada["id"] == calculada["id"]
        validar({**dada, "elevacionM": calculada["elevacionM"], "pendientePct": calculada["pendientePct"]}, "parcela#/$defs/celda")
    for a in cuerpo["advertencias"]:
        validar(a, "comun#/$defs/advertencia")


def test_cultivos_del_catalogo_real_cumplen_el_contrato(validar):
    config.CATALOGOS_DIR.mkdir(parents=True)
    (config.CATALOGOS_DIR / "cultivos.json").write_bytes((RAIZ / "datos" / "catalogos" / "cultivos.json").read_bytes())
    cuerpo = cliente.get("/api/cultivos").json()
    assert [c["id"] for c in cuerpo["cultivos"]] == ["maiz", "frijol", "calabaza"]
    validar(cuerpo, "cultivo#")  # el schema describe el catalogo completo (meta, versionCatalogo y cultivos)


def test_cultivos_sin_catalogo_sigue_siendo_no_evaluable():
    assert cliente.get("/api/cultivos").json() == {"estado": "NO_EVALUABLE", "motivo": "El catalogo de cultivos aun no existe (A1.5).", "cultivos": []}


def test_errores_503_tienen_la_forma_que_declara_openapi():
    declarado = cliente.get("/openapi.json").json()["components"]["schemas"]["ErrorDatos"]
    assert set(declarado["properties"]) == {"estado", "motivo"}
    for ruta in ("/api/clima", "/api/suelo", "/api/proxima-temporada"):
        assert "503" in cliente.get("/openapi.json").json()["paths"][ruta]["get"]["responses"]


def test_el_paquete_de_demo_committeado_cumple_los_contratos(validar):
    """datos/demo/respuestas/ es lo que consume el motor: si un contrato cambia y el paquete no se regenera, esto falla."""
    carpeta = RAIZ / "datos" / "demo" / "respuestas"
    cargar = lambda n: json.loads((carpeta / f"{n}.json").read_text(encoding="utf-8"))  # noqa: E731
    serie = cargar("serie-clima")
    validar(serie, "serie-clima#")
    assert serie["estado"] == "EVALUABLE" and serie["diario"][0]["fecha"] == "2005-10-01" and serie["diario"][-1]["fecha"] == "2025-12-31"
    validar(cargar("suelo"), "suelo#")
    validar(cargar("proxima-temporada"), "proxima-temporada#")
    terreno = cargar("terreno")
    validar(terreno["terreno"], "parcela#/properties/terreno")
    assert len(terreno["celdas"]) == 4
