from datetime import date, timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app import cache, servicios
from app.clientes import power
from app.main import app
from tests.conftest import real, real_json

cliente = TestClient(app)
PARAMS = "lat=18.03&lon=-95.53&desde=2024-01-01&hasta=2024-01-10"


def es_imerg(request: httpx.Request) -> bool:
    return request.url.params.get("parameters") == "IMERG_PRECTOT"


def responder(power_ok=True, om_ok=True, imerg="2024_01"):
    """POWER simulado con respuestas reales. `imerg`: nombre de la respuesta real de IMERG, o None para que IMERG falle (503)."""
    def handler(request: httpx.Request):
        if "power.larc" in request.url.host:
            if es_imerg(request):
                return httpx.Response(200, content=real(f"power_imerg_{imerg}.json")) if imerg else httpx.Response(503)
            return httpx.Response(200, content=real("power_ag.json")) if power_ok else httpx.Response(503)
        if "archive-api" in request.url.host:
            return httpx.Response(200, content=real("om_archive.json")) if om_ok else httpx.Response(503)
        return httpx.Response(404)
    return handler


def test_celda_de_power():
    assert power.centro_celda(18.03, -95.53) == (18.0, -95.625)
    assert power.centro_celda(18.2, -95.4) == (18.0, -95.625)
    assert power.centro_celda(18.3, -95.0) == (18.5, -95.0)


def test_parsea_respuesta_real_de_power(validar):
    dias = power.parsear(real_json("power_ag.json"))
    assert len(dias) == 10
    tercer = dias[2]
    assert tercer["fecha"] == "2024-01-03" and tercer["lluviaMm"] == 1.62
    for d in dias:
        validar(d, "clima-escenario#/$defs/dia")


def test_relleno_999_es_null_y_no_cero():
    cuerpo = real_json("power_ag.json")
    cuerpo["properties"]["parameter"]["PRECTOTCORR"]["20240103"] = -999.0
    assert power.parsear(cuerpo)[2]["lluviaMm"] is None


def test_serie_de_power_usa_cache(simular, validar):
    llamadas = simular(responder())
    r1 = cliente.get(f"/api/clima?{PARAMS}")
    assert r1.status_code == 200
    cuerpo = r1.json()
    assert cuerpo["estado"] == "EVALUABLE" and cuerpo["respaldo"] is False
    assert cuerpo["fuente"]["coordenada"] == [-95.625, 18.0]
    validar(cuerpo["meta"], "comun#/$defs/meta")
    validar(cuerpo["fuente"], "comun#/$defs/fuente")
    for d in cuerpo["diario"]:
        validar(d, "clima-escenario#/$defs/dia")
    n = len(llamadas)
    assert cliente.get(f"/api/clima?{PARAMS}").json()["diario"] == cuerpo["diario"]
    assert len(llamadas) == n, "la segunda consulta debe salir de la cache (POWER e IMERG)"


def test_misma_celda_comparte_cache(simular):
    """Clima: dos puntos de la misma celda de MERRA-2 comparten cache. IMERG: la celda es de 0.1 grados, asi que (18.2, -95.4) pide la suya."""
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    n_power = sum("IMERG" not in u for u in llamadas)
    cliente.get("/api/clima?lat=18.2&lon=-95.4&desde=2024-01-01&hasta=2024-01-10")
    assert sum("IMERG" not in u for u in llamadas) == n_power, "POWER (MERRA-2) no debe repetirse"
    assert sum("IMERG" in u for u in llamadas) == 2, "IMERG si: otra celda de 0.1 grados"
    cliente.get("/api/clima?lat=18.04&lon=-95.54&desde=2024-01-01&hasta=2024-01-10")  # misma celda de IMERG que la primera consulta
    assert sum("IMERG" in u for u in llamadas) == 2


def test_respaldo_open_meteo_se_ve(simular, validar):
    simular(responder(power_ok=False))
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["estado"] == "RESPALDO_HISTORICO" and cuerpo["respaldo"] is True
    assert {a["codigo"] for a in cuerpo["advertencias"]} >= {"POWER_NO_DISPONIBLE", "CLIMA_RESPALDO_OPEN_METEO"}
    assert "Open-Meteo" in cuerpo["fuente"]["nombre"]
    for a in cuerpo["advertencias"]:
        validar(a, "comun#/$defs/advertencia")
    for d in cuerpo["diario"]:
        validar(d, "clima-escenario#/$defs/dia")
    assert cuerpo["diario"][0]["et0Mm"] is not None


def test_sin_fuentes_ni_cache_es_error_datos(simular):
    simular(responder(power_ok=False, om_ok=False))
    r = cliente.get(f"/api/clima?{PARAMS}")
    assert r.status_code == 503
    assert r.json()["estado"] == "ERROR_DATOS"


def test_cache_vencida_si_todo_falla(simular, monkeypatch):
    simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    simular(responder(power_ok=False, om_ok=False))
    monkeypatch.setattr(servicios, "_vigente", lambda edad, hasta: False)
    cuerpo = cliente.get(f"/api/clima?{PARAMS}").json()
    assert cuerpo["estado"] == "RESPALDO_HISTORICO"
    assert "CACHE_VENCIDA" in {a["codigo"] for a in cuerpo["advertencias"]}


def test_periodos_invalidos():
    manana = date.today() + timedelta(days=1)
    for q in (f"desde=1980-12-31&hasta=1981-02-01", f"desde=2024-02-01&hasta=2024-01-01", f"desde=2024-01-01&hasta={manana}"):
        assert cliente.get(f"/api/clima?lat=18&lon=-95&{q}").status_code == 422
    assert cliente.get("/api/clima?lat=99&lon=-95&desde=2024-01-01&hasta=2024-01-02").status_code == 422


def test_cache_atomica_y_dañada(tmp_path):
    cache.escribir("x/y", {"a": 1})
    assert cache.leer("x/y")[0] == {"a": 1}
    cache._ruta("x/y").write_text("{roto", encoding="utf-8")
    assert cache.leer("x/y") is None


# ------------------------------------------------------------------ A4.10: lluvia satelital GPM IMERG via POWER

def test_imerg_centro_de_celda_de_0_1_grados():
    assert power.centro_celda_imerg(18.03, -95.53) == (18.05, -95.55)
    assert power.centro_celda_imerg(18.099, -95.501) == (18.05, -95.55)
    assert power.centro_celda_imerg(-33.87, 151.21) == (-33.85, 151.25)  # hemisferio sur y este: el suelo (floor) no se corre


def test_imerg_se_pide_en_utc_y_en_el_centro_de_la_celda(simular):
    llamadas = simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    u = next(x for x in llamadas if "IMERG" in x)
    assert "time-standard=utc" in u and "parameters=IMERG_PRECTOT" in u and "latitude=18.05" in u and "longitude=-95.55" in u


def test_imerg_bloque_cumple_el_contrato_y_es_evidencia(simular, validar):
    simular(responder())
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    validar(c, "serie-clima#")
    ls = c["lluviaSatelital"]
    assert ls["variable"] == "IMERG_PRECTOT" and ls["estandarHora"] == "UTC" and len(ls["dias"]) == 10
    assert ls["dias"][6] == {"fecha": "2024-01-07", "lluviaMm": 0.03}
    assert ls["fuente"]["coordenada"] == [-95.55, 18.05] and ls["fuente"]["unidades"] == "mm/dia" and "UTC" in ls["fuente"]["nota"]
    assert "LLUVIA_SATELITAL_EVIDENCIA" in {a["codigo"] for a in c["advertencias"]}
    assert [d["lluviaMm"] for d in c["diario"]] == [d["lluviaMm"] for d in cliente.get(f"/api/clima?{PARAMS}").json()["diario"]]  # la lluvia del motor no cambia


def test_imerg_menos_999_es_null_y_no_cero(simular, validar):
    simular(responder(imerg="recientes"))
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    validar(c, "serie-clima#")
    dias = c["lluviaSatelital"]["dias"]
    assert [d["lluviaMm"] for d in dias[:7]] == [0.0, 3.94, 1.76, 0.1, 0.0, 20.51, 13.06]  # un cero real sigue siendo 0
    assert all(d["lluviaMm"] is None for d in dias[7:]) and len(dias[7:]) == 8
    aviso = next(a for a in c["advertencias"] if a["codigo"] == "IMERG_DIAS_SIN_DATO")
    assert "8 de 15" in aviso["mensaje"] and "2026-09-14" in aviso["mensaje"]


def test_imerg_cuerpo_con_faltantes_no_se_rellena():
    cuerpo = {"properties": {"parameter": {"IMERG_PRECTOT": {"20260914": 13.06, "20260915": -999.0}}}, "header": {"fill_value": -999.0}}
    assert power.parsear_imerg(cuerpo) == [{"fecha": "2026-09-14", "lluviaMm": 13.06}, {"fecha": "2026-09-15", "lluviaMm": None}]


def test_si_imerg_falla_el_clima_sale_igual_sin_inventar(simular, validar):
    simular(responder(imerg=None))
    r = cliente.get(f"/api/clima?{PARAMS}")
    assert r.status_code == 200
    c = r.json()
    validar(c, "serie-clima#")
    assert c["estado"] == "EVALUABLE" and "lluviaSatelital" not in c and len(c["diario"]) == 10
    assert "IMERG_NO_DISPONIBLE" in {a["codigo"] for a in c["advertencias"]}


def test_imerg_vencido_se_reusa_si_falla_y_lo_dice(simular, monkeypatch):
    simular(responder())
    cliente.get(f"/api/clima?{PARAMS}")
    simular(responder(imerg=None))
    monkeypatch.setattr(servicios, "_vigente", lambda edad, hasta: False)
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    assert len(c["lluviaSatelital"]["dias"]) == 10 and "IMERG_EN_CACHE" in {a["codigo"] for a in c["advertencias"]}


def test_imerg_no_se_pide_si_el_clima_cae_al_respaldo(simular):
    llamadas = simular(responder(power_ok=False))
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    assert c["estado"] == "RESPALDO_HISTORICO" and "lluviaSatelital" not in c
    assert not any("IMERG" in u for u in llamadas), "con POWER caido no se insiste con una segunda llamada a POWER"


def test_imerg_anterior_a_su_inicio_se_recorta_a_1998_01_01(simular):
    """Llamada real a POWER (time-standard=utc, parcela demo, 14/11/2026): ultimo -999 el 1997-12-31, primer dato el 1998-01-01.
    Igual que el catalogo CMR. No se usa el 1998-06-01 de la metodologia ni el 2000-06-01 del espejo de UCAR."""
    llamadas = simular(responder())
    cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=1990-01-01&hasta=1998-07-10")
    u = next(x for x in llamadas if "IMERG" in x)
    assert "start=19980101" in u
    assert "start=19980601" not in u and "start=20000601" not in u


def test_imerg_de_mayo_1998_no_se_recorta(simular):
    """POWER devolvio 0.0 (no -999) del 25 al 31 de mayo de 1998. Esos dias van en la serie: 0 es lluvia cero, no relleno."""
    llamadas = simular(responder())
    cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=1998-05-25&hasta=1998-06-05")
    u = next(x for x in llamadas if "IMERG" in x)
    assert "start=19980525" in u


def test_imerg_conserva_cero_real_y_el_relleno_sigue_en_null():
    """0.0 se conserva. Solo el fill_value (-999) pasa a null. Cubre el caso de finales de mayo de 1998."""
    cuerpo = {"properties": {"parameter": {"IMERG_PRECTOT": {
        "19971231": -999.0, "19980101": 0.0, "19980525": 0.0, "19980531": 0.0, "19980601": 4.2,
    }}}, "header": {"fill_value": -999.0}}
    assert power.parsear_imerg(cuerpo) == [
        {"fecha": "1997-12-31", "lluviaMm": None},
        {"fecha": "1998-01-01", "lluviaMm": 0.0},
        {"fecha": "1998-05-25", "lluviaMm": 0.0},
        {"fecha": "1998-05-31", "lluviaMm": 0.0},
        {"fecha": "1998-06-01", "lluviaMm": 4.2},
    ]


def test_imerg_de_1999_no_se_recorta(simular):
    """Antes se recortaba a 2000-06-01 y luego a 1998-06-01. 1999 queda entero."""
    llamadas = simular(responder())
    cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=1999-01-01&hasta=1999-01-10")
    u = next(x for x in llamadas if "IMERG" in x)
    assert "start=19990101" in u
