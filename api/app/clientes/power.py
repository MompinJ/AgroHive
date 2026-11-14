"""NASA POWER, endpoint diario puntual, comunidad AG (probado en A0.7, datos/pruebas-apis/)."""
from datetime import date

import httpx

from .. import http

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETROS = "PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M,GWETROOT"
INICIO_MINIMO = date(1981, 1, 1)
# Lluvia por satelite GPM IMERG dentro de POWER (A4.10, probado el 14/11): sin cuenta Earthdata. Solo la entrega en UTC; en hora
# solar local (el valor por defecto) POWER responde -999 en todo. Celda de 0.1 grados, distinta de la de MERRA-2 (0.5 x 0.625).
IMERG_VARIABLE = "IMERG_PRECTOT"
INICIO_IMERG = date(2000, 6, 1)
NOMBRE_IMERG = "NASA POWER (GPM IMERG, IMERG_PRECTOT, hora UTC)"
RESOLUCION_IMERG = "GPM IMERG, celda de 0.1 grados"
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


def centro_celda_imerg(lat: float, lon: float) -> tuple[float, float]:
    """Centro de la celda de 0.1 grados de IMERG que contiene el punto. Se pide el centro y no el punto: asi la clave de cache es la
    celda y un punto en el borde no depende de como POWER redondee (verificado el 14/11: el centro da lo mismo que un punto interior)."""
    import math
    return round(math.floor(lat * 10) / 10 + 0.05, 2), round(math.floor(lon * 10) / 10 + 0.05, 2)


def parsear_imerg(cuerpo: dict) -> list[dict]:
    """Dias de lluvia satelital del contrato (`lluviaSatelital.dias`). El relleno (-999, header.fill_value) es null, nunca 0."""
    serie = cuerpo["properties"]["parameter"][IMERG_VARIABLE]
    relleno = float(cuerpo.get("header", {}).get("fill_value", -999.0))
    return [{"fecha": f"{f[:4]}-{f[4:6]}-{f[6:]}", "lluviaMm": _valor(serie, f, relleno)} for f in sorted(serie)]


async def serie_imerg(cliente: httpx.AsyncClient, lat: float, lon: float, desde: date, hasta: date) -> list[dict]:
    """Segunda llamada a la API diaria de POWER, con time-standard=UTC. `lat` y `lon` deben ser el centro de la celda de IMERG."""
    desde = max(desde, INICIO_IMERG)
    if hasta < desde:
        return []
    params = {
        "start": desde.strftime("%Y%m%d"), "end": hasta.strftime("%Y%m%d"), "latitude": lat, "longitude": lon,
        "community": "AG", "parameters": IMERG_VARIABLE, "format": "json", "time-standard": "utc",
    }
    r = await http.get(cliente, URL, params)
    try:
        return parsear_imerg(r.json())
    except (KeyError, ValueError) as e:
        raise http.ErrorFuente(f"respuesta de IMERG (POWER) inesperada: {e!r}") from e
