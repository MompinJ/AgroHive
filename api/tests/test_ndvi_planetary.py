"""A4.11: NDVI de MODIS por Microsoft Planetary Computer (fuente principal) con ORNL DAAC de respaldo.
Sin red: el catalogo STAC y los pixeles son respuestas reales guardadas el 14/11/2026 (Isla, h08v07, fila 945, columna 4397)."""
import re
from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

from app.clientes import ornl, planetary
from app.main import app
from tests.conftest import real_json

cliente = TestClient(app)
URL = "/api/ndvi?lat=18.03&lon=-95.53&desde=2023-05-01&hasta=2023-08-31"
STAC = real_json("planetary_stac_isla_2023.json")
PIXELES = real_json("planetary_pixeles_isla_2023.json")["compuestos"]  # {"2023129": {"ndviCrudo": 3150, "calidad": 1}, ...}
NDVI_ORNL, CALIDAD_ORNL = real_json("ornl_ndvi_2023.json"), real_json("ornl_calidad_2023.json")


def red(stac=STAC, stac_ok=True, ornl_ok=True):
    """Simula el catalogo STAC, la firma de URLs y (para el respaldo) ORNL DAAC."""
    def handler(request: httpx.Request):
        host = request.url.host
        if "planetarycomputer" in host:
            if request.url.path.endswith("/search"):
                return httpx.Response(200, json=stac) if stac_ok else httpx.Response(503)
            if request.url.path.endswith("/sign"):
                return httpx.Response(200, json={"href": request.url.params["href"] + "?firmada=1"})
        if "modis.ornl.gov" in host:
            if not ornl_ok:
                return httpx.Response(503)
            return httpx.Response(200, json=NDVI_ORNL if request.url.params["band"] == ornl.BANDA_NDVI else CALIDAD_ORNL)
        return httpx.Response(404)
    return handler


def pixeles(monkeypatch, resultado=None):
    """Simula la lectura del pixel con GDAL: resultado(codigo_modis) -> dict o lanza; por defecto, los valores reales."""
    leidas = []

    def falso(url_ndvi, url_calidad, fila, columna):
        assert (fila, columna) == (945, 4397)
        codigo = re.search(r"\.A(\d{7})\.", url_ndvi).group(1)
        leidas.append(codigo)
        return resultado(codigo) if resultado else PIXELES[codigo]
    monkeypatch.setattr(planetary, "_leer_sync", falso)
    return leidas


def test_el_pixel_de_isla_coincide_con_el_leido_del_archivo():
    assert planetary.celda(-95.53, 18.03) == (8, 7, 945, 4397)
    assert planetary.centro((8, 7, 945, 4397)) == (-95.5297, 18.0302)
    assert planetary.celda(0, 89.9999) is not None and planetary.celda(-95.53, -89.99)[1] == 17


def test_serie_real_usa_solo_terra_declara_la_fuente_y_cumple_el_contrato(simular, monkeypatch, validar):
    simular(red())
    pixeles(monkeypatch)
    r = cliente.get(URL)
    assert r.status_code == 200
    n = r.json()
    validar(n, "ndvi#")
    assert [(d["fecha"], d["ndvi"], d["calidad"]) for d in n["serie"]] == [
        ("2023-05-09", 0.315, 1), ("2023-05-25", 0.3279, 1), ("2023-06-10", 0.3378, 0), ("2023-06-26", 0.4053, 3), ("2023-07-12", 0.3921, 3)]  # sin Aqua (MYD13Q1)
    assert n["estado"] == "EXPLORATORIO" and n["producto"] == {"nombre": "MOD13Q1", "version": "061", "banda": "250m_16_days_NDVI", "pixelM": 250, "compuestoDias": 16, "escala": 0.0001}
    f = n["fuente"]
    assert "MOD13Q1 v061" in f["nombre"] and "LP DAAC" in f["nombre"] and "Planetary Computer" in f["nombre"]
    assert "Didan" in f["cita"] and "doi:10.5067/MODIS/MOD13Q1.061" in f["cita"] and f["coordenada"] == [-95.5297, 18.0302]
    assert set(n["limites"]) == {"PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"}
    assert {"NDVI_EVIDENCIA", "NDVI_FUENTE_PLANETARY"} <= {a["codigo"] for a in n["advertencias"]}


def test_la_serie_se_recorta_al_periodo_pedido(simular, monkeypatch, validar):
    simular(red())
    pixeles(monkeypatch)
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-06-01&hasta=2023-06-30").json()
    validar(n, "ndvi#")
    assert [d["fecha"] for d in n["serie"]] == ["2023-06-10", "2023-06-26"]


def test_relleno_es_null_con_motivo_nunca_cero(simular, monkeypatch, validar):  # sintetico: no hay un relleno real guardado
    simular(red())
    pixeles(monkeypatch, lambda c: {"ndviCrudo": None if c == "2023145" else -3000 if c == "2023161" else 3000, "calidad": -1})
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    sin = {d["fecha"]: d for d in n["serie"] if d["ndvi"] is None}
    assert set(sin) == {"2023-05-25", "2023-06-10"} and all(d["estado"] == "NO_EVALUABLE" and d["motivo"] for d in sin.values())
    assert all("calidad" not in d for d in n["serie"]), "calidad -1 es relleno: no se entrega"


def test_valor_fuera_de_rango_no_se_escala_a_ndvi(simular, monkeypatch, validar):  # sintetico
    simular(red())
    pixeles(monkeypatch, lambda c: {"ndviCrudo": -15000, "calidad": 0})
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert n["estado"] == "NO_EVALUABLE" and n["motivo"] and all(d["ndvi"] is None for d in n["serie"])


def test_un_compuesto_que_falla_no_tumba_a_los_demas_ni_se_cachea(simular, monkeypatch, validar):  # sintetico: el fallo
    llamadas = simular(red())

    def parcial(c):
        if c == "2023161":
            raise RuntimeError("tiempo agotado")
        return PIXELES[c]
    monkeypatch.setattr(planetary, "_leer_sync", lambda u, q, f, c: parcial(re.search(r"\.A(\d{7})\.", u).group(1)))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert [d["estado"] for d in n["serie"]] == ["EXPLORATORIO", "EXPLORATORIO", "ERROR_DATOS", "EXPLORATORIO", "EXPLORATORIO"]
    assert n["serie"][2]["ndvi"] is None and n["serie"][2]["motivo"]
    assert "NDVI_COMPUESTOS_SIN_LEER" in {a["codigo"] for a in n["advertencias"]}
    busquedas = sum(1 for u in llamadas if u.endswith("/search"))
    pixeles(monkeypatch)
    n2 = cliente.get(URL).json()
    assert sum(1 for u in llamadas if u.endswith("/search")) == busquedas + 1, "una serie con huecos no se fija en cache"
    assert all(d["estado"] == "EXPLORATORIO" for d in n2["serie"])


def test_periodo_completo_se_cachea_y_se_sirve_sin_red(simular, monkeypatch, validar):
    simular(red())
    pixeles(monkeypatch)
    a = cliente.get(URL).json()
    simular(lambda r: httpx.Response(503))
    monkeypatch.setattr(planetary, "_leer_sync", lambda *x: (_ for _ in ()).throw(AssertionError("no debe leer GDAL")))
    b = cliente.get(URL)
    assert b.status_code == 200 and b.json()["serie"] == a["serie"]
    validar(b.json(), "ndvi#")


def test_si_planetary_cae_se_usa_ornl_y_se_dice(simular, monkeypatch, validar):
    simular(red(stac_ok=False))
    pixeles(monkeypatch)
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    codigos = {a["codigo"] for a in n["advertencias"]}
    assert "NDVI_FUENTE_RESPALDO" in codigos and "NDVI_FUENTE_PLANETARY" not in codigos
    assert "ORNL" in n["fuente"]["nombre"] and "doi:10.3334/ORNLDAAC/1600" in n["fuente"]["cita"]
    assert [d["fecha"] for d in n["serie"]] == ["2023-05-25", "2023-06-10", "2023-06-26", "2023-07-12"]


def test_si_todos_los_compuestos_de_planetary_fallan_se_usa_ornl(simular, monkeypatch, validar):
    simular(red())
    pixeles(monkeypatch, lambda c: (_ for _ in ()).throw(RuntimeError("sin red")))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert "NDVI_FUENTE_RESPALDO" in {a["codigo"] for a in n["advertencias"]} and "ORNL" in n["fuente"]["nombre"]


def test_si_ninguna_fuente_responde_es_503_visible_con_las_dos(simular, monkeypatch):
    simular(red(stac_ok=False, ornl_ok=False))
    pixeles(monkeypatch)
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"
    assert "Planetary Computer" in r.json()["motivo"] and "ORNL" in r.json()["motivo"]


def test_respuesta_inesperada_del_catalogo_no_da_500(simular, monkeypatch):
    simular(red(stac={"algo": "distinto"}, ornl_ok=False))
    pixeles(monkeypatch)
    assert cliente.get(URL).status_code == 503


def test_periodo_sin_compuestos_de_terra_es_no_evaluable_con_motivo(simular, monkeypatch, validar):
    simular(red())
    pixeles(monkeypatch)
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-05-10&hasta=2023-05-20").json()  # solo cae un compuesto de Aqua (2023-05-17)
    validar(n, "ndvi#")
    assert n["estado"] == "NO_EVALUABLE" and n["serie"] == [] and n["motivo"]


def test_dato_calidad_sin_interpretar_y_fuera_de_rango_es_none():
    assert planetary.dato(date(2023, 5, 9), 3150, 1) == {"fecha": "2023-05-09", "calidad": 1, "ndvi": 0.315, "estado": "EXPLORATORIO"}
    assert planetary.dato(date(2023, 5, 9), 3150, 7)["calidad"] is None and planetary.dato(date(2023, 5, 9), 3150, -1)["calidad"] is None
    assert planetary.dato(date(2023, 5, 9), -2000, 0)["ndvi"] == -0.2


def test_una_sola_firma_por_contenedor_y_el_token_no_sale_en_errores(simular, monkeypatch):
    from app.clientes import planetary as p
    firmas = []

    def handler(request: httpx.Request):
        if request.url.path.endswith("/search"):
            return httpx.Response(200, json=STAC)
        firmas.append(1)
        return httpx.Response(200, json={"href": request.url.params["href"] + "?sv=2024&se=2999-01-01T00%3A00%3A00Z&sr=c&sig=SECRETO"})
    simular(handler)
    monkeypatch.setattr(p, "_tokens", {})
    pixeles(monkeypatch)
    n = cliente.get(URL).json()
    assert len(n["serie"]) == 5 and len(firmas) == 1, "10 COG del mismo contenedor, una sola peticion de firma"
    assert "SECRETO" not in str(n) and "sig=" not in str(n)
    msg = p.sin_firma("fallo https://x.blob.core.windows.net/c/a.tif?sv=1&sig=SECRETO fin")
    assert "SECRETO" not in msg and "<url>" in msg


def test_la_firma_vencida_se_renueva(simular, monkeypatch):
    from app.clientes import planetary as p
    firmas = []

    def handler(request: httpx.Request):
        if request.url.path.endswith("/search"):
            return httpx.Response(200, json=STAC)
        firmas.append(1)
        return httpx.Response(200, json={"href": request.url.params["href"] + "?se=2000-01-01T00%3A00%3A00Z&sig=X"})  # ya vencida
    simular(handler)
    monkeypatch.setattr(p, "_tokens", {})
    pixeles(monkeypatch)
    cliente.get(URL)
    assert len(firmas) > 1, "una firma vencida no se reutiliza"
