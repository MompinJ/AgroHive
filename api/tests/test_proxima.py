import statistics
from datetime import date, timedelta

import httpx
from fastapi.testclient import TestClient

from app import proxima
from app.main import app
from tests.conftest import real

cliente = TestClient(app)
URL = "/api/proxima-temporada?lat=18.03&lon=-95.53"


def power_sintetico(request: httpx.Request):
    """POWER falso y determinista: lluvia diaria 1.0 + 0.1 por anio desde 2006, temperatura 24 + 0.05 por anio."""
    q = request.url.params
    ini = date(int(q["start"][:4]), int(q["start"][4:6]), int(q["start"][6:]))
    fin = date(int(q["end"][:4]), int(q["end"][4:6]), int(q["end"][6:]))
    llu, tmed, tmax, tmin, rad, rh, ws = ({} for _ in range(7))
    d = ini
    while d <= fin:
        k = d.strftime("%Y%m%d")
        llu[k], tmed[k], tmax[k], tmin[k], rad[k], rh[k], ws[k] = 1.0 + 0.1 * (d.year - 2006), 24 + 0.05 * (d.year - 2006), 30.0, 18.0, 17.0, 80.0, 2.0
        d += timedelta(days=1)
    return httpx.Response(200, json={"properties": {"parameter": {"PRECTOTCORR": llu, "T2M": tmed, "T2M_MAX": tmax, "T2M_MIN": tmin,
                                                                    "ALLSKY_SFC_SW_DWN": rad, "RH2M": rh, "WS2M": ws}}, "header": {"fill_value": -999.0}})


def responder(estacional=True, power=True, om=False):
    def handler(request: httpx.Request):
        host = request.url.host
        if "power.larc" in host:
            return power_sintetico(request) if power else httpx.Response(503)
        if "seasonal-api" in host:
            return httpx.Response(200, content=real("om_seasonal_210d.json")) if estacional else httpx.Response(503)
        if "archive-api" in host:
            return httpx.Response(200, content=real("om_archive.json")) if om else httpx.Response(503)
        return httpx.Response(404)
    return handler


def totales_diciembre():
    return [31 * (1.0 + 0.1 * a) for a in range(-1, 20)]  # diciembres de 2005 a 2025 (ventana estandar desde el 2005-10-01)


def test_percentil_coincide_con_cuantiles_estandar():
    datos = [3.0, 1.0, 9.0, 4.0, 7.0, 2.0, 8.0]
    q = statistics.quantiles(datos, n=10, method="inclusive")
    assert abs(proxima.percentil(datos, 10) - q[0]) < 1e-9 and abs(proxima.percentil(datos, 90) - q[8]) < 1e-9
    assert proxima.percentil([1, 2, 3, 4, 5], 50) == 3


def test_climatologia_descarta_meses_incompletos_o_con_faltantes():
    dias = [{"fecha": f"2024-01-{d:02d}", "lluviaMm": 1.0, "tMediaC": 20.0} for d in range(1, 32)]
    assert proxima.climatologia_mensual(dias)[1]["lluvia"] == [31.0]
    assert proxima.climatologia_mensual(dias[:-1])[1]["lluvia"] == []  # falta un dia
    dias[3]["lluviaMm"] = None
    assert proxima.climatologia_mensual(dias)[1]["lluvia"] == []  # un faltante invalida el mes, no se rellena


def test_banda_con_anomalia_valida_el_contrato(simular, validar):
    simular(responder())
    r = cliente.get(URL)
    assert r.status_code == 200
    c = r.json()
    validar(c, "proxima-temporada#")
    assert c["esPrediccion"] is False and c["estado"] == "EXPLORATORIO" and c["metodo"] == "anomalia_estacional"
    assert [m["mes"] for m in c["meses"]] == ["2026-11", "2026-12", "2027-01", "2027-02", "2027-03", "2027-04"]  # V-21: 6 meses aunque SEAS5 de 7
    dic = next(m for m in c["meses"] if m["mes"] == "2026-12")
    q = statistics.quantiles([t - 8.4 for t in totales_diciembre()], n=10, method="inclusive")  # anomalia de diciembre: -8.4 mm
    assert abs(dic["lluviaMm"]["inferior"] - q[0]) < 0.06 and abs(dic["lluviaMm"]["superior"] - q[8]) < 0.06
    assert dic["lluviaMm"]["inferior"] < dic["lluviaMm"]["superior"]
    assert dic["climatologiaLluviaMm"] is not None
    codigos = {a["codigo"] for a in c["advertencias"]}
    assert {"SIN_TENDENCIA", "ANCHO_DE_BANDA_HISTORICO", "ANOMALIA_SOBRE_OTRA_CLIMATOLOGIA"} <= codigos
    assert len(c["fuentes"]) == 2 and "ECMWF" in c["fuentes"][1]["nota"]


def test_la_lluvia_nunca_es_negativa():
    clim = {m: {"lluvia": [5.0] * 12, "temp": [24.0] * 12} for m in range(1, 13)}
    meses = proxima.construir_meses(clim, {"2026-12": {"lluviaMm": -50.0, "tMediaC": 0.5}}, ["2026-12"])
    assert meses[0]["lluviaMm"] == {"inferior": 0.0, "superior": 0.0}
    assert meses[0]["tMediaC"] == {"inferior": 24.5, "superior": 24.5}


def test_sin_pronostico_cae_al_respaldo_estadistico(simular, validar):
    simular(responder(estacional=False))
    c = cliente.get(URL).json()
    validar(c, "proxima-temporada#")
    assert c["metodo"] == "respaldo_estadistico" and c["horizonteMeses"] == 6
    assert "ESTACIONAL_NO_DISPONIBLE" in {a["codigo"] for a in c["advertencias"]}
    dic = next(m for m in c["meses"] if m["mes"].endswith("-12"))
    q = statistics.quantiles(totales_diciembre(), n=10, method="inclusive")
    assert abs(dic["lluviaMm"]["inferior"] - q[0]) < 0.06  # sin desplazamiento


def test_historia_insuficiente_no_inventa_bandas(simular, validar):
    simular(responder(power=False, om=True))  # solo hay 10 dias de respaldo
    c = cliente.get(URL).json()
    validar(c, "proxima-temporada#")
    assert all(m["lluviaMm"] == {"inferior": None, "superior": None} for m in c["meses"])
    assert "CLIMATOLOGIA_DE_RESPALDO" in {a["codigo"] for a in c["advertencias"]}


def test_sin_clima_no_hay_capa(simular):
    simular(responder(power=False, om=False))
    r = cliente.get(URL)
    assert r.status_code == 503 and r.json()["estado"] == "ERROR_DATOS"
