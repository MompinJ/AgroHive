"""Plagas en la region (contratos 0.15.0): conteos de GBIF por plaga de datos/plagas/plagas.json, con hospederos citados.
GBIF se simula (sin red): las respuestas tienen la forma real de /v1/occurrence/search con limit=0 y facet=year."""
import json

import httpx
from fastapi.testclient import TestClient

from app import config
from app.clientes import gbif
from app.main import app

cliente = TestClient(app)
URL = "/api/plagas?lat=18.03&lon=-95.53"
TABLA = json.loads(config.PLAGAS_TABLA.read_text(encoding="utf-8"))["plagas"]


def gbif_simulado(conteos: dict[int, int], fallan: set[int] = frozenset()):
    def handler(request: httpx.Request):
        if "api.gbif.org" not in request.url.host:
            return httpx.Response(404)
        clave = int(request.url.params["taxonKey"])
        if clave in fallan:
            return httpx.Response(503)
        n = conteos.get(clave, 0)
        facetas = [{"field": "YEAR", "counts": [{"name": "2019", "count": max(0, n - 1)}, {"name": "2023", "count": 1}] if n else []}]
        return httpx.Response(200, json={"offset": 0, "limit": 0, "endOfRecords": True, "count": n, "results": [], "facets": facetas})
    return handler


def test_cumple_el_contrato_y_marca_presentes(simular, validar):
    primera = TABLA[0]["taxonKey"]
    simular(gbif_simulado({primera: 12}))
    r = cliente.get(URL)
    assert r.status_code == 200
    cuerpo = r.json()
    validar(cuerpo, "plagas#")
    p = {x["taxonKey"]: x for x in cuerpo["plagas"]}
    assert p[primera]["estado"] == "presente" and p[primera]["registros"] == 12 and p[primera]["ultimoAnio"] == 2023
    otra = TABLA[1]["taxonKey"]
    assert p[otra]["estado"] == "sin_registros" and p[otra]["registros"] == 0 and p[otra]["ultimoAnio"] is None
    assert "no que vaya a danar" in cuerpo["aviso"]


def test_la_consulta_va_a_la_caja_del_punto_con_filtros(simular):
    llamadas = simular(gbif_simulado({}))
    cliente.get(URL)
    assert len(llamadas) == len(TABLA)
    u = httpx.URL(llamadas[0])
    assert u.params["occurrenceStatus"] == "PRESENT" and u.params["hasCoordinate"] == "true" and u.params["limit"] == "0"
    assert u.params["decimalLatitude"] == "16.5300,19.5300" and u.params["decimalLongitude"] == "-97.0300,-94.0300"


def test_si_una_plaga_falla_va_no_evaluable_sin_conteo_inventado(simular, validar):
    falla = TABLA[2]["taxonKey"]
    simular(gbif_simulado({TABLA[0]["taxonKey"]: 3}, fallan={falla}))
    cuerpo = cliente.get(URL).json()
    validar(cuerpo, "plagas#")
    p = {x["taxonKey"]: x for x in cuerpo["plagas"]}
    assert p[falla]["estado"] == "NO_EVALUABLE" and p[falla]["registros"] is None and p[falla]["motivo"]
    assert any(a["codigo"] == "PLAGAS_SIN_CONSULTA" for a in cuerpo["advertencias"])


def test_si_gbif_no_responde_para_ninguna_es_503(simular):
    simular(lambda r: httpx.Response(503))
    r = cliente.get(URL)
    assert r.status_code == 503


def test_los_hospederos_son_ids_del_catalogo_y_llevan_fuente():
    catalogo = {c["id"] for c in json.loads((config.RAIZ / "datos" / "catalogos" / "cultivos.json").read_text(encoding="utf-8"))["cultivos"]}
    for p in TABLA:
        assert set(p["cultivos"]) <= catalogo, p["id"]
        assert p["fuenteHospederos"]["nombre"]


def test_interpretar_rechaza_cuerpos_sin_conteo():
    import pytest
    from app import http
    with pytest.raises(http.ErrorFuente):
        gbif.interpretar({"results": []})
    assert gbif.interpretar({"count": 0, "facets": []}) == {"registros": 0, "ultimoAnio": None}


def test_paquete_de_demo_cumple_el_contrato_y_coincide_con_la_tabla(validar):
    demo = json.loads((config.RAIZ / "datos" / "demo" / "respuestas" / "plagas.json").read_text(encoding="utf-8"))
    validar(demo, "plagas#")
    tabla = {p["id"]: p for p in TABLA}
    for p in demo["plagas"]:
        assert p["cultivos"] == tabla[p["id"]]["cultivos"], p["id"]
