"""NASA POWER, endpoint diario puntual, comunidad AG (probado en A0.7, datos/pruebas-apis/)."""
from datetime import date

import httpx

from .. import http

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETROS = "PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M,GWETROOT"
INICIO_MINIMO = date(1981, 1, 1)
NOMBRE = "NASA POWER (diario, comunidad AG)"
RESOLUCION = "MERRA-2, celda de 0.5 x 0.625 grados"
UNIDADES = "mm/dia, C, MJ/m2/dia, %, m/s, fraccion 0 a 1 (GWETROOT)"
HUMEDAD_SUELO = {  # metadato que acompana a humedadRaizFraccionSat (contrato clima-escenario, humedadSuelo)
    "variable": "GWETROOT",
    "definicion": "Humedad de la zona de raices de NASA POWER (MERRA-2): fraccion de saturacion de 0 a 1, regional (0.5 x 0.625 grados). No es fraccion de TAW: para usarla en la cubeta hay que convertirla con la retencion del suelo.",
    "profundidadCm": 100,
    "uso": ["condicion_inicial", "comparacion"],
}


def centro_celda(lat: float, lon: float) -> tuple[float, float]:
    """Centro de la celda MERRA-2 que contiene el punto (verificado el 14/11: puntos de la misma celda dan serie identica)."""
    return round(lat / 0.5) * 0.5, round(lon / 0.625) * 0.625


def _valor(serie: dict, fecha: str, relleno: float):
    v = serie.get(fecha)
    return None if v is None or v == relleno else v


def parsear(cuerpo: dict) -> list[dict]:
    """Convierte la respuesta de POWER al dia del contrato clima-escenario. Los faltantes (-999) quedan en null."""
    parametros = cuerpo["properties"]["parameter"]
    relleno = float(cuerpo.get("header", {}).get("fill_value", -999.0))
    fechas = sorted(parametros["PRECTOTCORR"])
    dias = []
    for f in fechas:
        dias.append({
            "fecha": f"{f[:4]}-{f[4:6]}-{f[6:]}",
            "lluviaMm": _valor(parametros["PRECTOTCORR"], f, relleno),
            "tMaxC": _valor(parametros["T2M_MAX"], f, relleno),
            "tMinC": _valor(parametros["T2M_MIN"], f, relleno),
            "tMediaC": _valor(parametros["T2M"], f, relleno),
            "radiacionMjM2Dia": _valor(parametros["ALLSKY_SFC_SW_DWN"], f, relleno),
            "humedadRelativaPct": _valor(parametros["RH2M"], f, relleno),
            "vientoMS": _valor(parametros["WS2M"], f, relleno),
            "et0Mm": None,
            # GWETROOT: fraccion de SATURACION (0 a 1) de la zona de raices, sin convertir (V-06, decidido el 14/11)
            "humedadRaizFraccionSat": _valor(parametros.get("GWETROOT", {}), f, relleno),
        })
    return dias


async def serie_diaria(cliente: httpx.AsyncClient, lat: float, lon: float, desde: date, hasta: date) -> list[dict]:
    if desde < INICIO_MINIMO:
        raise http.ErrorFuente("POWER diario empieza el 1981-01-01")
    params = {
        "start": desde.strftime("%Y%m%d"), "end": hasta.strftime("%Y%m%d"),
        "latitude": lat, "longitude": lon,
        "community": "AG", "parameters": PARAMETROS, "format": "json",
    }
    r = await http.get(cliente, URL, params)
    try:
        return parsear(r.json())
    except (KeyError, ValueError) as e:
        raise http.ErrorFuente(f"respuesta de POWER inesperada: {e!r}") from e
