"""MODIS MOD13Q1 v061 (NDVI, 250 m, compuesto de 16 dias) por el catalogo STAC de Microsoft Planetary Computer (A4.11, fuente PRINCIPAL).

Es el mismo producto de NASA LP DAAC que sirve ORNL DAAC, pero sin cuenta ni token y mucho mas rapido (probado el 14/11: unos 3.5 s por
compuesto con las dos bandas, contra 8 a 13 s por fecha en ORNL, que ademas devolvia 502 y 504). El catalogo y la firma de URLs
(/api/sas/v1/sign) son publicos; cada banda es un COG y GDAL lee solo el bloque del pixel pedido.
La coleccion mezcla MOD13Q1 (Terra, el que pide el contrato) y MYD13Q1 (Aqua): solo se usa Terra.
El pixel se calcula con la formula de la rejilla sinusoidal de MODIS y no abriendo el archivo, para que la clave de cache no dependa de la red.
"""
import asyncio
import math
import re
import time
from datetime import date, datetime, timezone
from urllib.parse import parse_qs, urlsplit

import certifi
import httpx

from .. import http
from . import ornl

STAC_BUSCAR = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
FIRMAR = "https://planetarycomputer.microsoft.com/api/sas/v1/sign"
COLECCION = "modis-13Q1-061"
PRODUCTO = "MOD13Q1"
VERSION = "061"
BANDA_NDVI = "250m_16_days_NDVI"
BANDA_CALIDAD = "250m_16_days_pixel_reliability"
ESCALA = 0.0001  # el mismo factor de la banda en ORNL (/MOD13Q1/bands: scale_factor 0.0001)
NOMBRE = "NASA MODIS MOD13Q1 v061 (LP DAAC), servido por Microsoft Planetary Computer"
URL = "https://planetarycomputer.microsoft.com/dataset/modis-13Q1-061"
CITA = ("Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061 [Data set]. "
        "NASA EOSDIS Land Processes DAAC. doi:10.5067/MODIS/MOD13Q1.061")
RESOLUCION = "250 m nominal (231.66 m reales en la rejilla sinusoidal), compuesto de 16 dias"
TIMEOUT_GDAL_S = "25"
CONCURRENCIA = 4

# Rejilla sinusoidal de MODIS: 36 x 18 tiles de 4800 x 4800 pixeles. Esfera de 6371007.181 m, origen en la esquina noroeste.
RADIO_M = 6371007.181
ORIGEN_X = -20015109.354
ORIGEN_Y = 10007554.677
TILE_M = -2 * ORIGEN_X / 36
PIXEL_M = TILE_M / 4800


def celda(lon: float, lat: float) -> tuple[int, int, int, int] | None:
    """(tile horizontal, tile vertical, fila, columna) del pixel de 250 m que contiene el punto; None si cae fuera de la rejilla."""
    x = RADIO_M * math.radians(lon) * math.cos(math.radians(lat))
    y = RADIO_M * math.radians(lat)
    h, v = math.floor((x - ORIGEN_X) / TILE_M), math.floor((ORIGEN_Y - y) / TILE_M)
    if not (0 <= h < 36 and 0 <= v < 18):
        return None
    return h, v, math.floor((ORIGEN_Y - y - v * TILE_M) / PIXEL_M), math.floor((x - ORIGEN_X - h * TILE_M) / PIXEL_M)


def centro(sitio: tuple[int, int, int, int]) -> tuple[float, float]:
    """(lon, lat) del centro del pixel, a 4 decimales (inversa de la sinusoidal)."""
    h, v, fila, col = sitio
    x = ORIGEN_X + h * TILE_M + (col + 0.5) * PIXEL_M
    y = ORIGEN_Y - v * TILE_M - (fila + 0.5) * PIXEL_M
    lat = math.degrees(y / RADIO_M)
    return round(math.degrees(x / (RADIO_M * math.cos(math.radians(lat)))), 4), round(lat, 4)


async def compuestos(cliente: httpx.AsyncClient, lon: float, lat: float, desde: date, hasta: date, sitio: tuple[int, int, int, int]) -> list[dict]:
    """Compuestos de Terra del tile del punto cuyo inicio cae en [desde, hasta], ordenados por fecha: {fecha, id, urlNdvi, urlCalidad}."""
    cuerpo = {"collections": [COLECCION], "intersects": {"type": "Point", "coordinates": [lon, lat]},
              "datetime": f"{desde.isoformat()}T00:00:00Z/{hasta.isoformat()}T23:59:59Z", "limit": 100}
    r = await http.post_json(cliente, STAC_BUSCAR, cuerpo)
    try:
        salida = []
        for f in r.json()["features"]:
            p = f["properties"]
            if not f["id"].startswith(PRODUCTO) or (p["modis:horizontal-tile"], p["modis:vertical-tile"]) != sitio[:2]:
                continue
            inicio = date.fromisoformat(p["start_datetime"][:10])
            if desde <= inicio <= hasta:
                salida.append({"fecha": inicio, "id": f["id"], "urlNdvi": f["assets"][BANDA_NDVI]["href"].split("?")[0],
                               "urlCalidad": f["assets"][BANDA_CALIDAD]["href"].split("?")[0]})
    except (KeyError, ValueError, TypeError) as e:
        raise http.ErrorFuente(f"respuesta de Planetary Computer inesperada: {e!r}") from e
    return sorted(salida, key=lambda c: c["fecha"])


# El token SAS que entrega /api/sas/v1/sign tiene alcance de CONTENEDOR (sr=c): una sola firma sirve para todos los COG del mismo contenedor
# hasta que vence. Pedir una firma por banda y compuesto da HTTP 429 (probado el 14/11). Condiciones de uso (CON CONDICIONES): el token vive SOLO en
# memoria de este proceso; nunca se escribe en cache, paquete de demo, logs, mensajes de error ni docs, y se renueva al vencer.
MARGEN_VENCIMIENTO_S = 300
_tokens: dict[str, tuple[str, float]] = {}  # contenedor -> (query de la firma, vencimiento en epoch)
_candado_token: asyncio.Lock | None = None
_URL_FIRMADA = re.compile(r"https?://\S+")


def _contenedor(url: str) -> str:
    p = urlsplit(url)
    return f"{p.netloc}/{p.path.lstrip('/').split('/')[0]}"


def sin_firma(texto: str) -> str:
    """Quita de un texto toda URL (la firmada lleva el token SAS) para que ningun mensaje de error lo filtre."""
    return _URL_FIRMADA.sub("<url>", texto)


async def _firmada(cliente: httpx.AsyncClient, url: str) -> str:
    """URL del COG con un token SAS vigente del contenedor (en memoria)."""
    global _candado_token
    if _candado_token is None:
        _candado_token = asyncio.Lock()
    clave = _contenedor(url)
    async with _candado_token:
        guardado = _tokens.get(clave)
        if guardado is None or guardado[1] - time.time() < MARGEN_VENCIMIENTO_S:
            r = await http.get(cliente, FIRMAR, {"href": url})
            try:
                query = urlsplit(r.json()["href"]).query
                vence = parse_qs(query).get("se", [None])[0]
                limite = datetime.fromisoformat(vence.replace("Z", "+00:00")).timestamp() if vence else time.time() + 600
            except (KeyError, ValueError, TypeError, AttributeError) as e:
                raise http.ErrorFuente(f"firma de Planetary Computer inesperada: {type(e).__name__}") from e
            guardado = _tokens[clave] = (query, limite)
    return f"{url}?{guardado[0]}"


def _leer_sync(url_ndvi: str, url_calidad: str, fila: int, columna: int) -> dict:
    """Lectura bloqueante de un pixel de cada banda (se corre en un hilo). El relleno del archivo queda como None, nunca como numero."""
    import rasterio
    from rasterio.windows import Window

    def un_valor(url):
        with rasterio.open(url) as src:
            v = int(src.read(1, window=Window(columna, fila, 1, 1), boundless=False)[0, 0])
            return None if src.nodata is not None and v == int(src.nodata) else v

    with rasterio.Env(CURL_CA_BUNDLE=certifi.where(), GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT=TIMEOUT_GDAL_S,
                      GDAL_HTTP_MAX_RETRY="2", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        return {"ndviCrudo": un_valor(url_ndvi), "calidad": un_valor(url_calidad)}


async def leer_pixel(cliente: httpx.AsyncClient, compuesto: dict, fila: int, columna: int) -> dict:
    """{'ndviCrudo': int|None, 'calidad': int|None} del compuesto. Lanza ErrorFuente si no se pudo leer."""
    try:
        url_ndvi, url_calidad = await asyncio.gather(_firmada(cliente, compuesto["urlNdvi"]), _firmada(cliente, compuesto["urlCalidad"]))
        return await asyncio.to_thread(_leer_sync, url_ndvi, url_calidad, fila, columna)
    except http.ErrorFuente:
        raise
    except Exception as e:  # GDAL lanza RasterioIOError y errores de red o de formato
        raise http.ErrorFuente(f"MODIS {compuesto['id']}: {type(e).__name__}: {sin_firma(str(e))[:120]}") from e


def dato(fecha: date, crudo: int | None, calidad: int | None) -> dict:
    """Un compuesto con la misma forma que ornl.parsear: sin dato es NO_EVALUABLE con motivo (nunca 0); la calidad va sin interpretar."""
    d = {"fecha": fecha.isoformat(), "calidad": None if calidad is None or calidad == ornl.RELLENO_CALIDAD or not 0 <= calidad <= 3 else int(calidad)}
    if crudo is None or crudo == ornl.RELLENO_NDVI:
        return d | {"ndvi": None, "estado": "NO_EVALUABLE", "motivo": "El producto no tiene valor ese dia (relleno -3000: nubes, agua o sin cobertura)."}
    if not ornl.RANGO_NDVI[0] <= crudo <= ornl.RANGO_NDVI[1]:
        return d | {"ndvi": None, "estado": "NO_EVALUABLE", "motivo": f"Valor {crudo} fuera del rango valido del producto ({ornl.RANGO_NDVI[0]} a {ornl.RANGO_NDVI[1]})."}
    return d | {"ndvi": round(crudo * ESCALA, 4), "estado": "EXPLORATORIO"}


async def serie(cliente: httpx.AsyncClient, lat: float, lon: float, desde: date, hasta: date) -> tuple[list[dict], tuple[float, float]]:
    """(datos, centro del pixel) del rango. Un compuesto que falla sale como ERROR_DATOS con su motivo y no tumba la serie.
    Lanza ErrorFuente si el punto esta fuera de la rejilla o el catalogo no responde."""
    sitio = celda(lon, lat)
    if sitio is None:
        raise http.ErrorFuente("el punto cae fuera de la rejilla sinusoidal de MODIS")
    lista = await compuestos(cliente, lon, lat, desde, hasta, sitio)
    sem = asyncio.Semaphore(CONCURRENCIA)

    async def uno(c: dict) -> dict:
        async with sem:
            try:
                px = await leer_pixel(cliente, c, sitio[2], sitio[3])
            except http.ErrorFuente as e:
                return {"fecha": c["fecha"].isoformat(), "ndvi": None, "estado": "ERROR_DATOS", "motivo": str(e)[:160], "calidad": None}
            return dato(c["fecha"], px["ndviCrudo"], px["calidad"])

    return list(await asyncio.gather(*[uno(c) for c in lista])), centro(sitio)
