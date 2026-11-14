"""NDVI de MODIS (MOD13Q1, 250 m, compuesto de 16 dias) por punto, con el servicio REST de ORNL DAAC (A4.11). Sin cuenta ni llave.

Verificado el 14/11 contra el propio servicio: una llamada admite como maximo 10 fechas (la 11.a da 400, "exceeds maximum subset tiles
support of 10"); NDVI valido de -2000 a 10000, relleno -3000 y escala 0.0001; calidad (pixel reliability) valida de 0 a 3 y relleno -1
(ambos salen de `/MOD13Q1/bands`); el servicio devuelve 502 y 503 de forma intermitente, por eso se reintenta (app/http.py).
Cita obligatoria: doi:10.3334/ORNLDAAC/1600.
"""
from datetime import date, timedelta

import httpx

from .. import http

URL = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/subset"
URL_SERVICIO = "https://modis.ornl.gov/rst/api/v1/"
PRODUCTO = "MOD13Q1"
BANDA_NDVI = "250m_16_days_NDVI"
BANDA_CALIDAD = "250m_16_days_pixel_reliability"
NOMBRE = "ORNL DAAC MODIS (servicio REST), MOD13Q1 NDVI"
CITA = "ORNL DAAC. MODIS and VIIRS Land Products Global Subsetting and Visualization Tool. doi:10.3334/ORNLDAAC/1600"
RESOLUCION = "250 m, compuesto de 16 dias"
RELLENO_NDVI = -3000
RANGO_NDVI = (-2000, 10000)
RELLENO_CALIDAD = -1
# Ventanas de 144 dias (9 compuestos, hasta 10 con el cambio de anio): debajo del limite de 10 fechas por llamada. Estan alineadas a una
# rejilla fija desde 2000-01-01 para que cualquier consulta reutilice las mismas ventanas en cache.
VENTANA_DIAS = 144
EPOCA = date(2000, 1, 1)


def fecha_modis(d: date) -> str:
    """Fecha en el formato de MODIS: A<anio><dia juliano de 3 cifras>."""
    return f"A{d.year}{d.timetuple().tm_yday:03d}"


def ventanas(desde: date, hasta: date) -> list[tuple[date, date]]:
    """Ventanas alineadas de 144 dias que cubren [desde, hasta] (las puntas pueden salirse; luego se recorta la serie)."""
    primera = (desde - EPOCA).days // VENTANA_DIAS
    ultima = (hasta - EPOCA).days // VENTANA_DIAS
    return [(EPOCA + timedelta(days=k * VENTANA_DIAS), EPOCA + timedelta(days=(k + 1) * VENTANA_DIAS - 1)) for k in range(primera, ultima + 1)]


def _parametros(lat: float, lon: float, banda: str, ini: date, fin: date) -> dict:
    return {"latitude": lat, "longitude": lon, "band": banda, "startDate": fecha_modis(ini), "endDate": fecha_modis(fin), "kmAboveBelow": 0, "kmLeftRight": 0}


def _escala(cuerpo: dict) -> float:
    try:
        escala = float(cuerpo["scale"])
    except (KeyError, TypeError, ValueError) as e:
        raise http.ErrorFuente("la respuesta de ORNL no trae la escala del producto") from e
    if escala <= 0:
        raise http.ErrorFuente("la escala de ORNL no es valida")
    return escala


def parsear(ndvi: dict, calidad: dict | None) -> tuple[list[dict], float]:
    """(datos, escala). Cada dato: fecha, ndvi (ya escalado) o None, estado, motivo y calidad. Sin dato es NO_EVALUABLE con motivo: nunca 0."""
    escala = _escala(ndvi)
    por_fecha = {}
    for x in (calidad or {}).get("subset", []):
        crudo = x["data"][0]
        por_fecha[x["calendar_date"]] = None if crudo == RELLENO_CALIDAD else int(crudo)
    datos = []
    for x in ndvi["subset"]:
        crudo, fecha = x["data"][0], x["calendar_date"]
        d = {"fecha": fecha, "calidad": por_fecha.get(fecha)}
        if crudo == RELLENO_NDVI:
            d |= {"ndvi": None, "estado": "NO_EVALUABLE", "motivo": "El producto no tiene valor ese dia (relleno -3000: nubes, agua o sin cobertura)."}
        elif not RANGO_NDVI[0] <= crudo <= RANGO_NDVI[1]:
            d |= {"ndvi": None, "estado": "NO_EVALUABLE", "motivo": f"Valor {crudo} fuera del rango valido del producto ({RANGO_NDVI[0]} a {RANGO_NDVI[1]})."}
        else:
            d |= {"ndvi": round(crudo * escala, 4), "estado": "EXPLORATORIO"}
        datos.append(d)
    return datos, escala


async def ventana(cliente: httpx.AsyncClient, lat: float, lon: float, ini: date, fin: date) -> tuple[list[dict], float, bool]:
    """Una ventana: NDVI (obligatorio) y calidad (si falla, los datos salen con calidad None). Devuelve (datos, escala, calidad_ok)."""
    r = await http.get(cliente, URL, _parametros(lat, lon, BANDA_NDVI, ini, fin))
    try:
        cuerpo_ndvi = r.json()
        _ = cuerpo_ndvi["subset"]
    except (ValueError, KeyError, TypeError) as e:
        raise http.ErrorFuente(f"respuesta de ORNL inesperada: {e!r}") from e
    cuerpo_calidad, calidad_ok = None, True
    try:
        cuerpo_calidad = (await http.get(cliente, URL, _parametros(lat, lon, BANDA_CALIDAD, ini, fin))).json()
    except (http.ErrorFuente, ValueError):
        calidad_ok = False
    try:
        datos, escala = parsear(cuerpo_ndvi, cuerpo_calidad)
    except (KeyError, IndexError, TypeError) as e:
        raise http.ErrorFuente(f"respuesta de ORNL inesperada: {e!r}") from e
    return datos, escala, calidad_ok
