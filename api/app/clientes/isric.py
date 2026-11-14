"""ISRIC SoilGrids 2.0 por WCS (V-23, probado el 14/11). La REST de SoilGrids sigue anunciada como pausada.

Se pide en el CRS nativo (Homolosine, EPSG:152160): la reproyeccion a 4326 del servidor deja ceros en ventanas chicas.
En la zona de prueba hay una franja de unos 500 m sin dato (el servicio la rellena con 0), asi que se usa la
mediana de los pixeles validos mas cercanos. 0 se trata como sin dato (VERIFICAR: el nodata oficial no esta documentado).
"""
import io
import math
import statistics

import httpx
from PIL import Image
from pyproj import Transformer

from .. import http

URL = "https://maps.isric.org/mapserv"
HOMOLOSINE = "+proj=igh +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs"
CRS_NATIVO = "http://www.opengis.net/def/crs/EPSG/0/152160"
FACTOR_CONVERSION = {"clay": 10, "sand": 10, "silt": 10, "phh2o": 10, "soc": 10}  # FAQ de ISRIC: g/kg a %, pH x 10 a pH, dg/kg a g/kg
PROFUNDIDADES = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]  # (capa, espesor cm); 0 a 30 cm
SEMILADO_M = 3000
RADIOS_M = (1000, 3000)  # primero pixeles a menos de 1 km; si no hay, a menos de 3 km
NOMBRE = "ISRIC SoilGrids 2.0 (WCS)"
_a_homolosine = Transformer.from_crs("EPSG:4326", HOMOLOSINE, always_xy=True)


def pixeles_validos(tiff: bytes) -> list[tuple[float, float, int]]:
    """Lista de (x, y, valor) en metros Homolosine de los pixeles con dato (valor distinto de 0)."""
    im = Image.open(io.BytesIO(tiff))
    x0, y0 = im.tag_v2[33922][3], im.tag_v2[33922][4]
    sx, sy = im.tag_v2[33550][0], im.tag_v2[33550][1]
    ancho = im.size[0]
    salida = []
    for k, v in enumerate(im.get_flattened_data() if hasattr(im, "get_flattened_data") else im.getdata()):
        if v:
            c, r = k % ancho, k // ancho
            salida.append((x0 + (c + 0.5) * sx, y0 - (r + 0.5) * sy, int(v)))
    return salida


def estimar(pixeles: list[tuple[float, float, int]], x: float, y: float, factor: float) -> tuple[float, int, float] | None:
    """Mediana convertida de los pixeles validos cercanos: (valor, pixeles usados, radio en m)."""
    for radio in RADIOS_M:
        cerca = [v for px, py, v in pixeles if math.hypot(px - x, py - y) <= radio]
        if cerca:
            return statistics.median(cerca) / factor, len(cerca), radio
    return None


async def valor(cliente: httpx.AsyncClient, prop: str, capa: str, lon: float, lat: float):
    x, y = _a_homolosine.transform(lon, lat)
    params = [
        ("map", f"/map/{prop}.map"), ("SERVICE", "WCS"), ("VERSION", "2.0.1"), ("REQUEST", "GetCoverage"),
        ("COVERAGEID", f"{prop}_{capa}_mean"), ("FORMAT", "GEOTIFF_INT16"),
        ("SUBSET", f"X({x - SEMILADO_M:.0f},{x + SEMILADO_M:.0f})"), ("SUBSET", f"Y({y - SEMILADO_M:.0f},{y + SEMILADO_M:.0f})"),
        ("SUBSETTINGCRS", CRS_NATIVO), ("OUTPUTCRS", CRS_NATIVO),
    ]
    r = await http.get(cliente, URL, params)
    try:
        return estimar(pixeles_validos(r.content), x, y, FACTOR_CONVERSION[prop])
    except (OSError, KeyError, IndexError, ValueError) as e:
        raise http.ErrorFuente(f"GeoTIFF de ISRIC ilegible ({prop} {capa}): {e!r}") from e
