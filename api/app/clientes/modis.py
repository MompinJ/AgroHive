"""NDVI de MODIS Terra MOD13Q1 (250 m, compuesto de 16 dias) por punto, con el servicio REST de ORNL DAAC (A4.11, probado el 14/11).

Sin cuenta. Doc: https://modis.ornl.gov/data/modis_webservice.html. Cita: doi:10.3334/ORNLDAAC/1600.
El servicio admite como maximo 10 fechas por peticion (responde 400 si se pasa), es inestable (502 y 504) y LENTO: tarda unos 8 a 13 s por
fecha (probado el 14/11: 5 fechas en 38 s; 10 fechas superan 60 s). Se pide en tandas de 5 compuestos, con timeout de 150 s y 2 intentos. Las fechas son A<anio><dia juliano>; los compuestos caen en los dias
1, 17, 33, ... 353 de cada anio y el siguiente anio vuelve a empezar en el dia 1.
"""
import asyncio
import math
from datetime import date, timedelta

import httpx

from .. import http

URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
DOCUMENTACION = "https://modis.ornl.gov/data/modis_webservice.html"
CITA = "doi:10.3334/ORNLDAAC/1600"
PRODUCTO = "MOD13Q1"
BANDA = "250m_16_days_NDVI"
BANDA_CALIDAD = "250m_16_days_pixel_reliability"  # rango 0 a 3, relleno -1 (metadatos de ORNL); la lectura de cada rango: guia de usuario de MOD13, VERIFICAR
PIXEL_M = 250
COMPUESTO_DIAS = 16
MAX_FECHAS = 10  # limite del servicio
TANDA = 5  # fechas por peticion que caben en el timeout
TIMEOUT_S = 150
INTENTOS = 2
NDVI_MIN_ENTERO, NDVI_MAX_ENTERO = -2000, 10000  # rango valido del entero del producto; el relleno es -3000 (guia de usuario de MOD13)
NOMBRE = "ORNL DAAC MODIS Web Service (MOD13Q1, Terra, 250 m)"
UNIDADES = "NDVI adimensional (entero x escala 0.0001)"
RESOLUCION = "250 m, compuesto de 16 dias"
SINUSOIDAL = "+proj=sinu +lon_0=0 +x_0=0 +y_0=0 +R=6371007.181 +units=m +no_defs"  # rejilla MODIS


def compuestos(desde: date, hasta: date) -> list[date]:
    """Fechas de inicio de los compuestos de 16 dias (dia juliano 1, 17, ... 353) dentro de [desde, hasta]."""
    salida = []
    for anio in range(desde.year, hasta.year + 1):
        for doy in range(1, 366, COMPUESTO_DIAS):
            fecha = date(anio, 1, 1) + timedelta(days=doy - 1)
            if desde <= fecha <= hasta:
                salida.append(fecha)
    return salida


def fecha_modis(fecha: date) -> str:
    return f"A{fecha.year}{fecha.timetuple().tm_yday:03d}"


def tandas(fechas: list[date]) -> list[list[date]]:
    return [fechas[i:i + TANDA] for i in range(0, len(fechas), TANDA)]


def parsear(cuerpo: dict) -> tuple[list[dict], dict]:
    """(dias, pixel). Cada dia es {fecha, ndvi|None, motivo|None}: el relleno o un entero fuera de rango queda en null, nunca en 0."""
    escala = float(cuerpo["scale"])
    dias = []
    for fila in cuerpo["subset"]:
        valores = fila.get("data") or []
        crudo = valores[0] if valores else None
        if crudo is None or not (NDVI_MIN_ENTERO <= crudo <= NDVI_MAX_ENTERO):
            dias.append({"fecha": fila["calendar_date"], "ndvi": None,
                         "motivo": "el producto no trae un NDVI valido en ese compuesto (relleno: nube, agua o sin cobertura)"})
        else:
            dias.append({"fecha": fila["calendar_date"], "ndvi": round(crudo * escala, 4), "motivo": None})
    return dias, {"xll": float(cuerpo["xllcorner"]), "yll": float(cuerpo["yllcorner"]), "celda_m": float(cuerpo["cellsize"]), "escala": escala}


def centro_pixel(pixel: dict) -> tuple[float, float]:
    """(lon, lat) del centro del pixel MODIS que respondio el servicio (sinusoidal), a 4 decimales."""
    from pyproj import Transformer

    x, y = pixel["xll"] + pixel["celda_m"] / 2, pixel["yll"] + pixel["celda_m"] / 2
    lon, lat = Transformer.from_proj(SINUSOIDAL, "EPSG:4326", always_xy=True).transform(x, y)
    return round(lon, 4), round(lat, 4)


def parsear_calidad(cuerpo: dict) -> dict[str, int | None]:
    """{fecha: rango de confiabilidad del pixel o None}. El relleno (-1) y lo que no sea un entero de 0 a 3 quedan en None."""
    salida = {}
    for fila in cuerpo["subset"]:
        valores = fila.get("data") or []
        v = valores[0] if valores else None
        salida[fila["calendar_date"]] = v if isinstance(v, int) and 0 <= v <= 3 else None
    return salida


async def _tanda(cliente: httpx.AsyncClient, sem: asyncio.Semaphore, lat: float, lon: float, fechas: list[date], banda: str = BANDA) -> dict:
    params = {"latitude": lat, "longitude": lon, "band": banda, "startDate": fecha_modis(fechas[0]), "endDate": fecha_modis(fechas[-1]),
              "kmAboveBelow": 0, "kmLeftRight": 0}
    async with sem:
        r = await http.get(cliente, URL, params, reintentos=INTENTOS)
    try:
        return r.json()
    except ValueError as e:
        raise http.ErrorFuente(f"respuesta de ORNL MODIS inesperada: {e!r}") from e


async def serie(lat: float, lon: float, desde: date, hasta: date) -> tuple[list[dict], dict | None]:
    """(dias, pixel) de todos los compuestos del rango. Una tanda de NDVI que falla deja sus fechas con motivo y 'error'; si falla la
    banda de calidad, solo faltan los 'calidad' de esa tanda (nunca se inventan)."""
    fechas = compuestos(desde, hasta)
    if not fechas:
        return [], None
    grupos = tandas(fechas)
    sem = asyncio.Semaphore(3)  # el servicio es fragil: pocas peticiones a la vez
    async with http.crear_cliente() as cliente:
        cliente.headers["Accept"] = "application/json"
        cliente.timeout = httpx.Timeout(TIMEOUT_S)
        ndvi = asyncio.gather(*[_tanda(cliente, sem, lat, lon, t) for t in grupos], return_exceptions=True)
        calidad = asyncio.gather(*[_tanda(cliente, sem, lat, lon, t, BANDA_CALIDAD) for t in grupos], return_exceptions=True)
        resultados, calidades = await asyncio.gather(ndvi, calidad)
    dias, pixel = [], None
    for tanda, resultado, cal in zip(grupos, resultados, calidades):
        if isinstance(resultado, http.ErrorFuente):
            dias += [{"fecha": f.isoformat(), "ndvi": None, "motivo": str(resultado)[:200], "error": True, "calidad": None} for f in tanda]
            continue
        if isinstance(resultado, BaseException):
            raise resultado
        try:
            parseados, px = parsear(resultado)
        except (KeyError, ValueError, TypeError) as e:
            dias += [{"fecha": f.isoformat(), "ndvi": None, "motivo": f"respuesta de ORNL MODIS inesperada: {e!r}"[:200], "error": True, "calidad": None} for f in tanda]
            continue
        try:
            rangos = parsear_calidad(cal) if not isinstance(cal, BaseException) else {}
        except (KeyError, ValueError, TypeError):
            rangos = {}
        dias += [{**d, "calidad": rangos.get(d["fecha"])} for d in parseados]
        pixel = pixel or px
    return dias, pixel
