"""OpenLandMap-soildb (30 m, 2020-2022) por rangos HTTP sobre COG, con rasterio (A2.15, V-23, probado el 14/11).

Cada capa es un GeoTIFF de decenas de GB: no se descarga, GDAL lee solo los bloques de la ventana pedida (3 a 5 s por capa).
Las URLs salen del catalogo STAC (cambian con la version de los datos) y se guardan en cache 7 dias. Capa 0 a 30 cm.
Unidades segun el STAC: arcilla, arena y limo en % (escala 1), pH en agua con factor 0.1 y carbono organico en g/kg con factor 0.1.
"""
import asyncio
import statistics

import certifi
import httpx

from .. import cache, http

STAC = "https://s3.eu-central-1.wasabisys.com/stac/openlandmap/"
NOMBRE = "OpenLandMap-soildb (30 m, 2020-2022)"
# DOI de cada capa 2020-2022 de 0 a 30 cm, verificados en Zenodo el 14/11 (titulo y periodo de cada registro). OJO: el campo `doi` de la
# coleccion STAC apunta al registro 2000-2005 (el primer periodo), no al de las capas que se leen aqui: no usarlo.
DOIS = {
    "arcilla": ("10.5281/zenodo.15528401",),
    "arena": ("10.5281/zenodo.15528413",),
    "limo": ("10.5281/zenodo.15528425",),
    "pH": ("10.5281/zenodo.15471105",),
    "carbono organico": ("10.5281/zenodo.15535759", "10.5281/zenodo.15535761"),  # el conjunto esta partido en dos mitades en Zenodo
}
CITA = ("OpenLandMap-soildb 2020-2022, 0 a 30 cm, CC-BY-4.0: "
        + "; ".join(f"{capa} " + " y ".join(f"doi:{d}" for d in dois) for capa, dois in DOIS.items()))
SUFIJO = "_m_30m_b0cm..30cm"
CAPAS = {  # propiedad -> (coleccion, item)
    "clay": ("clay.tot_iso.11277.2020.wpct", "clay.tot_iso.11277.2020.wpct_20200101_20221231"),
    "sand": ("sand.tot_iso.11277.2020.wpct", "sand.tot_iso.11277.2020.wpct_20200101_20221231"),
    "silt": ("silt.tot_iso.11277.2020.wpct", "silt.tot_iso.11277.2020.wpct_20200101_20221231"),
    "ph": ("ph.h2o_iso.10390.2021.index", "ph.h2o_iso.10390.2021.index_20200101_20221231"),
    "oc": ("oc_iso.10694.1995.wpml", "oc_iso.10694.1995.wpml_20200101_20221231"),
}
SEMILADO_PX = 2  # ventana de 5 x 5 pixeles (unos 140 m)
TTL_URLS_S = 7 * 24 * 3600
TIMEOUT_GDAL_S = "25"


async def urls(cliente: httpx.AsyncClient) -> dict[str, str]:
    """URL del COG de cada propiedad, leidas del catalogo STAC."""
    guardadas = cache.leer("olm_urls_v1")
    if guardadas and guardadas[1] < TTL_URLS_S:
        return guardadas[0]

    async def una(prop, col, item):
        r = await http.get(cliente, f"{STAC}{col}/{item}/{item}.json")
        try:
            return prop, next(a["href"] for k, a in r.json()["assets"].items() if k.endswith(SUFIJO) and "preview" not in k)
        except (KeyError, ValueError, StopIteration) as e:
            raise http.ErrorFuente(f"STAC de OpenLandMap inesperado ({item}): {e!r}") from e

    salida = dict(await asyncio.gather(*[una(p, c, i) for p, (c, i) in CAPAS.items()]))
    cache.escribir("olm_urls_v1", salida)
    return salida


def resumir(ventana, nodata, escala: float, desplazamiento: float = 0.0):
    """(mediana ya convertida, pixeles validos, pixeles totales) de una ventana cruda; None si no hay ningun dato."""
    valores = [float(v) for v in ventana.flatten() if v != nodata]
    if not valores:
        return None
    return statistics.median(valores) * escala + desplazamiento, len(valores), int(ventana.size)


def _leer_sync(url: str, lon: float, lat: float):
    """Lectura bloqueante de la ventana alrededor del punto (se corre en un hilo)."""
    import rasterio
    from rasterio.windows import Window

    with rasterio.Env(CURL_CA_BUNDLE=certifi.where(), GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT=TIMEOUT_GDAL_S,
                      GDAL_HTTP_MAX_RETRY="2", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        with rasterio.open(url) as src:
            fila, col = src.index(lon, lat)
            lado = 2 * SEMILADO_PX + 1
            ventana = src.read(1, window=Window(col - SEMILADO_PX, fila - SEMILADO_PX, lado, lado), boundless=False)
            return resumir(ventana, src.nodata, src.scales[0], src.offsets[0])


async def estimar(cliente: httpx.AsyncClient, lon: float, lat: float) -> dict[str, tuple | None]:
    """{'clay': (valor, validos, total) o None, ...}. Lanza ErrorFuente si el catalogo o los archivos no responden."""
    direcciones = await urls(cliente)

    async def una(prop):
        try:
            return prop, await asyncio.to_thread(_leer_sync, direcciones[prop], lon, lat)
        except Exception as e:  # GDAL lanza RasterioIOError, errores de red y de formato
            raise http.ErrorFuente(f"OpenLandMap {prop}: {type(e).__name__}: {str(e)[:120]}") from e

    return dict(await asyncio.gather(*[una(p) for p in CAPAS]))
