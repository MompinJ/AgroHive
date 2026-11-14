"""A4.11: NDVI de MODIS (MOD13Q1 V061) desde Microsoft Planetary Computer, que sustituye a ORNL DAAC (caido el 14/11).
Datos reales guardados en datos/pruebas-apis/respuestas/: busqueda del catalogo y pixeles de Isla leidos el 14/11; los de ORNL sirven de validacion cruzada."""
import copy
import re
from datetime import date, timedelta

import httpx
from fastapi.testclient import TestClient

from app.clientes import planetary
from app.main import app
from tests.conftest import real_json

cliente = TestClient(app)
URL = "/api/ndvi?lat=18.03&lon=-95.53&desde=2023-05-01&hasta=2023-08-31"
BUSQUEDA = real_json("pc_modis_busqueda_2023.json")
PIXELES = {k: tuple(v) for k, v in real_json("pc_modis_pixeles_2023.json").items() if k != "nota"}
TOKEN_FALSO = "sv=2024-01-01&sig=FIRMA-SECRETA-FALSA"


def pc_simulado(busqueda=BUSQUEDA, token_ok=True, busqueda_ok=True):
    def handler(request: httpx.Request):
        u = str(request.url)
        if "stac/v1/search" in u:
            return httpx.Response(200, json=busqueda) if busqueda_ok else httpx.Response(503)
        if "sas/v1/token" in u:
            return httpx.Response(200, json={"token": TOKEN_FALSO, "msft:expiry": "2099-01-01T00:00:00Z"}) if token_ok else httpx.Response(503)
        return httpx.Response(404)
    return handler


def leer_real(monkeypatch, fallar=lambda clave: False, sin_calidad=lambda clave: False, lecturas=None):
    """Reemplaza la lectura del pixel (GDAL) por las lecturas reales guardadas; anota que archivos se leyeron."""
    leidos = lecturas if lecturas is not None else []

    def _leer(url_ndvi, url_calidad, lon, lat):
        assert TOKEN_FALSO in url_ndvi and TOKEN_FALSO in url_calidad, "los archivos deben ir firmados con el token de lectura"
        assert "MYD13Q1" not in url_ndvi, "Aqua (MYD13Q1) no debe leerse: el contrato pide MOD13Q1"
        clave = re.search(r"\.(A\d{7})\.", url_ndvi).group(1)
        leidos.append(clave)
        if fallar(clave):
            raise OSError(f"fallo simulado {url_ndvi}")  # el mensaje trae la URL con el token: no debe llegar a la respuesta
        crudo, calidad = PIXELES[clave]
        return crudo, None if sin_calidad(clave) else calidad
    monkeypatch.setattr(planetary, "_leer_sync", _leer)
    return leidos


def test_validacion_cruzada_con_ornl_el_mismo_producto_da_los_mismos_pixeles():
    """ORNL DAAC (caido hoy) y Planetary Computer sirven el mismo MOD13Q1 V061: en Isla coinciden las cuatro fechas comparadas."""
    ornl_n, ornl_c = real_json("ornl_ndvi_2023.json"), real_json("ornl_calidad_2023.json")
    ornl_doy = {x["modis_date"]: (x["data"][0], c["data"][0]) for x, c in zip(ornl_n["subset"], ornl_c["subset"])}
    assert set(ornl_doy) == {"A2023145", "A2023161", "A2023177", "A2023193"}
    for fecha_modis, valores in ornl_doy.items():
        assert PIXELES[fecha_modis] == valores, fecha_modis


def test_escala_rango_y_relleno_del_producto():
    assert planetary.convertir(3279, 1) == {"ndvi": 0.3279, "estado": "EXPLORATORIO", "calidad": 1}
    r = planetary.convertir(-3000, 0)  # relleno: ni 0 ni -0.3
    assert r["ndvi"] is None and r["estado"] == "NO_EVALUABLE" and "relleno" in r["motivo"]
    for fuera in (10001, -2001, 15000):
        assert planetary.convertir(fuera, 0)["ndvi"] is None, fuera
    assert planetary.convertir(-2000, 0)["ndvi"] == -0.2  # el limite inferior valido si cuenta
    assert planetary.convertir(10000, 0)["ndvi"] == 1.0


def test_calidad_de_relleno_o_no_leida_es_none_sin_interpretarla():
    for relleno in (255, -1, None):
        assert planetary.convertir(3279, relleno)["calidad"] is None
    assert planetary.convertir(3279, 3)["calidad"] == 3


def test_solo_terra_se_usa_y_aqua_se_descarta():
    c = planetary.compuestos(BUSQUEDA, date(2023, 4, 1), date(2023, 9, 30))
    assert len(c) == 8 and all(x["id"].startswith("MOD13Q1.") for x in c)
    assert [x["fecha"] for x in c] == sorted(x["fecha"] for x in c) and c[1]["fecha"] == "2023-05-25"
    assert len(BUSQUEDA["features"]) == 16, "el catalogo trae 8 de Terra y 8 de Aqua"


def test_compuestos_se_recortan_a_la_ventana_y_no_se_repiten():
    c = planetary.compuestos(BUSQUEDA, date(2023, 6, 1), date(2023, 6, 30))
    assert [x["fecha"] for x in c] == ["2023-06-10", "2023-06-26"]
    duplicada = copy.deepcopy(BUSQUEDA)
    duplicada["features"] = duplicada["features"] + [f for f in duplicada["features"] if f["id"].startswith("MOD13Q1.")][:2]
    assert len(planetary.compuestos(duplicada, date(2023, 4, 1), date(2023, 9, 30))) == 8


def test_ventanas_alineadas_contiguas_y_cubren_el_periodo():
    v = planetary.ventanas(date(2005, 10, 1), date(2025, 12, 31))
    assert v[0][0] <= date(2005, 10, 1) and v[-1][1] >= date(2025, 12, 31)
    for (_, b), (c, _) in zip(v, v[1:]):
        assert c == b + timedelta(days=1)


def test_ruta_cumple_el_contrato_y_es_evidencia(simular, validar, monkeypatch):
    simular(pc_simulado())
    leer_real(monkeypatch)
    r = cliente.get(URL)
    assert r.status_code == 200
    n = r.json()
    validar(n, "ndvi#")
    assert n["estado"] == "EXPLORATORIO"
    assert n["producto"] == {"nombre": "MOD13Q1", "version": "061", "banda": "250m_16_days_NDVI", "pixelM": 250, "compuestoDias": 16, "escala": 0.0001}
    assert set(n["limites"]) == {"PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"}
    assert n["fuente"]["cita"] == planetary.CITA and "Planetary Computer" in n["fuente"]["nombre"]
    assert [(d["fecha"], d["ndvi"], d["calidad"]) for d in n["serie"][:3]] == [("2023-05-09", 0.315, 1), ("2023-05-25", 0.3279, 1), ("2023-06-10", 0.3378, 0)]
    assert len(n["serie"]) == 8 and "NDVI_EVIDENCIA" in {a["codigo"] for a in n["advertencias"]}


def test_el_token_de_lectura_nunca_llega_a_la_respuesta_ni_a_la_cache(simular, monkeypatch, tmp_path):
    simular(pc_simulado())
    leer_real(monkeypatch, fallar=lambda c: c == "A2023161")  # el mensaje del error simulado trae la URL con el token
    texto = cliente.get(URL).text
    assert TOKEN_FALSO not in texto and "FIRMA-SECRETA" not in texto and "blob.core.windows" not in texto
    from app import config
    for f in config.CACHE_DIR.rglob("*"):
        if f.is_file():
            assert TOKEN_FALSO not in f.read_text(encoding="utf-8", errors="ignore"), f.name


def test_la_serie_se_recorta_al_periodo_pedido(simular, validar, monkeypatch):
    simular(pc_simulado())
    leer_real(monkeypatch)
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-06-01&hasta=2023-06-30").json()
    validar(n, "ndvi#")
    assert [d["fecha"] for d in n["serie"]] == ["2023-06-10", "2023-06-26"]


def test_segunda_consulta_sale_de_la_cache_sin_red_ni_lecturas(simular, monkeypatch):
    llamadas = simular(pc_simulado())
    leidos = leer_real(monkeypatch)
    cliente.get(URL)
    antes_red, antes_lecturas = len(llamadas), len(leidos)
    assert antes_red > 0 and antes_lecturas > 0
    assert cliente.get(URL).status_code == 200
    assert (len(llamadas), len(leidos)) == (antes_red, antes_lecturas)


def test_aqua_nunca_se_lee(simular, monkeypatch):
    simular(pc_simulado())
    leidos = leer_real(monkeypatch)  # la propia lectura simulada falla si le llega un MYD13Q1
    assert cliente.get(URL).status_code == 200 and leidos


def test_si_falla_la_calidad_el_dato_sale_sin_ella_y_no_se_fija_en_cache(simular, validar, monkeypatch):
    llamadas = simular(pc_simulado())
    leidos = leer_real(monkeypatch, sin_calidad=lambda c: True)
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert n["estado"] == "EXPLORATORIO" and all("calidad" not in d for d in n["serie"]) and len(n["serie"]) == 8
    assert "NDVI_CALIDAD_NO_DISPONIBLE" in {a["codigo"] for a in n["advertencias"]}
    antes = len(leidos)
    cliente.get(URL)
    assert len(leidos) > antes, "una ventana incompleta se vuelve a pedir"


def test_un_compuesto_que_no_se_puede_leer_es_error_datos_y_no_se_rellena(simular, validar, monkeypatch):
    simular(pc_simulado())
    leer_real(monkeypatch, fallar=lambda c: c == "A2023161")
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    malo = next(d for d in n["serie"] if d["fecha"] == "2023-06-10")
    assert malo["estado"] == "ERROR_DATOS" and malo["ndvi"] is None and malo["motivo"]
    assert "NDVI_COMPUESTOS_CON_ERROR" in {a["codigo"] for a in n["advertencias"]}
    assert sum(d["ndvi"] is not None for d in n["serie"]) == 7  # los demas salen


def test_si_el_catalogo_no_responde_es_error_datos(simular):
    simular(pc_simulado(busqueda_ok=False))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS" and "Planetary Computer" in r.json()["motivo"]


def test_si_no_se_puede_leer_ningun_pixel_es_error_datos(simular, monkeypatch):
    simular(pc_simulado())
    leer_real(monkeypatch, fallar=lambda c: True)
    assert cliente.get(URL).status_code == 503


def test_sin_token_de_lectura_no_se_inventa_nada(simular, monkeypatch):
    simular(pc_simulado(token_ok=False))
    leer_real(monkeypatch)
    assert cliente.get(URL).status_code == 503


def test_todo_relleno_es_no_evaluable_con_motivo(simular, validar, monkeypatch):
    simular(pc_simulado())
    monkeypatch.setattr(planetary, "_leer_sync", lambda *a, **k: (-3000, 0))
    n = cliente.get(URL).json()
    validar(n, "ndvi#")
    assert n["estado"] == "NO_EVALUABLE" and n["motivo"] and all(d["ndvi"] is None and d["motivo"] for d in n["serie"])


def test_periodos_invalidos():
    manana = date.today() + timedelta(days=1)
    for q in ("desde=2023-06-01&hasta=2023-05-01", f"desde=2023-01-01&hasta={manana}", "desde=2020-01-01&hasta=2023-01-01"):
        assert cliente.get(f"/api/ndvi?lat=18&lon=-95&{q}").status_code == 422, q
    assert cliente.get("/api/ndvi?lat=99&lon=-95&desde=2023-01-01&hasta=2023-02-01").status_code == 422


# ------------------------------------------------------------------ token de lectura compartido (el 429 del 14/11)

def contar_tokens(llamadas):
    return sum("sas/v1/token" in u for u in llamadas)


def test_un_solo_token_para_todas_las_ventanas(simular, monkeypatch):
    """Antes se pedia un token por ventana (51 en 20 anios) y el servicio respondio HTTP 429. Ahora es uno para toda la consulta."""
    llamadas = simular(pc_simulado())
    leer_real(monkeypatch)
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-01-01&hasta=2023-12-31")  # 3 ventanas
    assert n.status_code == 200
    assert sum("stac/v1/search" in u for u in llamadas) >= 3, "varias ventanas"
    assert contar_tokens(llamadas) == 1


def test_el_token_se_reutiliza_entre_consultas_y_se_renueva_al_caducar(simular, monkeypatch):
    llamadas = simular(pc_simulado())
    leer_real(monkeypatch)
    cliente.get(URL)
    cliente.get("/api/ndvi?lat=18.04&lon=-95.54&desde=2023-05-01&hasta=2023-08-31")  # otro punto: otras ventanas en cache, mismo token
    assert contar_tokens(llamadas) == 1
    planetary._TOKEN["expira"] = 0  # caduco
    cliente.get("/api/ndvi?lat=18.05&lon=-95.55&desde=2023-05-01&hasta=2023-08-31")
    assert contar_tokens(llamadas) == 2


def test_pedidos_simultaneos_comparten_un_unico_pedido_de_token(simular):
    import asyncio

    llamadas = simular(pc_simulado())

    async def varios():
        async with httpx.AsyncClient(transport=httpx.MockTransport(pc_simulado())) as c:
            return await asyncio.gather(*[planetary.token(c) for _ in range(20)])
    tokens = asyncio.run(varios())
    assert set(tokens) == {TOKEN_FALSO}
    assert llamadas == [] or contar_tokens(llamadas) <= 1


def test_el_429_del_servicio_de_tokens_se_reintenta(simular, monkeypatch):
    intentos = {"n": 0}
    base = pc_simulado()

    def con_429(request):
        if "sas/v1/token" in str(request.url):
            intentos["n"] += 1
            if intentos["n"] < 3:
                return httpx.Response(429)
        return base(request)
    simular(con_429)
    leer_real(monkeypatch)
    assert cliente.get(URL).status_code == 200 and intentos["n"] == 3


def test_si_el_token_sigue_en_429_se_dice_la_causa_y_no_se_rellena(simular, monkeypatch):
    base = pc_simulado()
    simular(lambda r: httpx.Response(429) if "sas/v1/token" in str(r.url) else base(r))
    leer_real(monkeypatch)
    r = cliente.get(URL)
    assert r.status_code == 503 and "429" in r.json()["motivo"]


def test_un_tramo_caido_dice_su_causa_en_el_aviso(simular, validar, monkeypatch):
    import json

    base = pc_simulado()
    primera = planetary.ventanas(date(2023, 1, 1), date(2023, 12, 31))[0][0].isoformat()  # solo esa ventana falla, con todos sus reintentos

    def cae_la_primera(request):
        if "stac/v1/search" in str(request.url) and json.loads(request.content)["datetime"].startswith(primera):
            return httpx.Response(503)
        return base(request)
    simular(cae_la_primera)
    leer_real(monkeypatch)
    n = cliente.get("/api/ndvi?lat=18.03&lon=-95.53&desde=2023-01-01&hasta=2023-12-31").json()
    validar(n, "ndvi#")
    aviso = next(a for a in n["advertencias"] if a["codigo"] == "NDVI_TRAMOS_SIN_LEER")
    assert "1 tramo" in aviso["mensaje"] and primera in aviso["mensaje"] and "Causa:" in aviso["mensaje"] and "503" in aviso["mensaje"], aviso["mensaje"]
    assert n["serie"], "las ventanas que si respondieron salen"


def test_el_token_nunca_se_guarda_en_disco(simular, monkeypatch, tmp_path):
    from app import config

    simular(pc_simulado())
    leer_real(monkeypatch)
    cliente.get(URL)
    for f in list(config.CACHE_DIR.rglob("*")) + list(tmp_path.rglob("*")):
        if f.is_file():
            texto = f.read_text(encoding="utf-8", errors="ignore")
            assert "FIRMA-SECRETA" not in texto and "blob.core.windows.net" not in texto, f


def test_la_ventana_del_paquete_no_pide_catalogo_ni_token(simular, monkeypatch, tmp_path):
    """Respaldo de la demo: si la ventana historica esta en el paquete, no se llama a Planetary Computer."""
    import json
    import time

    from app import config

    llamadas = simular(pc_simulado(busqueda_ok=False, token_ok=False))
    monkeypatch.setattr(config, "DEMO_DIR", tmp_path)
    for ini, fin in planetary.ventanas(date(2023, 5, 1), date(2023, 8, 31)):
        nombre = f"ndvi_v1_18.03000_-95.53000_{ini:%Y%m%d}_{fin:%Y%m%d}.json"
        (tmp_path / nombre).write_text(json.dumps({
            "guardado": time.time(),
            "valor": {"consultado": "2026-11-14", "escala": 0.0001, "calidadOk": True,
                      "datos": [{"fecha": "2023-05-25", "ndvi": 0.3279, "estado": "EXPLORATORIO", "calidad": 1}]},
        }), encoding="utf-8")
    n = cliente.get(URL).json()
    assert n["estado"] == "EXPLORATORIO" and n["fuente"]["cita"] == planetary.CITA
    assert n["serie"] == [{"fecha": "2023-05-25", "ndvi": 0.3279, "estado": "EXPLORATORIO", "calidad": 1}]
    assert llamadas == []
