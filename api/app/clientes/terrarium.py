"""Tiles Terrarium de AWS (elevacion), con interpolacion bilineal y cache de tiles en disco. Probado en A0.7."""
import asyncio
import io
import math

import httpx
from PIL import Image

from .. import config, http

URL = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png"
ZOOM = 14
TAM = 256
NOMBRE = "AWS Terrain Tiles (Terrarium)"


def pixel_global(lon: float, lat: float, z: int = ZOOM) -> tuple[float, float]:
    n = (2**z) * TAM
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n
    return x, y


def decodificar(rgb: tuple[int, int, int]) -> float:
    r, g, b = rgb[:3]
    return r * 256 + g + b / 256 - 32768


async def _tile(cliente: httpx.AsyncClient, z: int, x: int, y: int, sem: asyncio.Semaphore) -> Image.Image | None:
    ruta = config.CACHE_DIR / "terrarium" / str(z) / str(x) / f"{y}.png"
    en_demo = config.DEMO_DIR / "terrarium" / str(z) / str(x) / f"{y}.png"  # paquete de demo (A2.4)
    if ruta.exists() or en_demo.exists():
        datos = (ruta if ruta.exists() else en_demo).read_bytes()
    else:
        async with sem:
            try:
                datos = (await http.get(cliente, URL.format(z=z, x=x, y=y))).content
            except http.ErrorFuente as e:
                if str(e).endswith("respondio 404"):  # no `"404" in`: la URL del tile puede traer 404 en x o y (p. ej. .../14/4040/...)
                    return None
                raise
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_bytes(datos)
    return Image.open(io.BytesIO(datos)).convert("RGB")


async def elevaciones(cliente: httpx.AsyncClient, puntos: list[tuple[float, float]], z: int = ZOOM) -> list[float | None]:
    """Elevacion en metros para cada (lon, lat). None si el tile no existe."""
    n = 2**z
    muestras = []
    necesarios: set[tuple[int, int]] = set()
    for lon, lat in puntos:
        px, py = pixel_global(lon, lat, z)
        x0, y0 = math.floor(px - 0.5), math.floor(py - 0.5)
        fx, fy = (px - 0.5) - x0, (py - 0.5) - y0
        esquinas = [(x0, y0), (x0 + 1, y0), (x0, y0 + 1), (x0 + 1, y0 + 1)]
        for cx, cy in esquinas:
            necesarios.add((cx // TAM, cy // TAM))
        muestras.append((esquinas, fx, fy))
    sem = asyncio.Semaphore(8)
    claves = [k for k in necesarios if 0 <= k[0] < n and 0 <= k[1] < n]
    tiles = dict(zip(claves, await asyncio.gather(*[_tile(cliente, z, tx, ty, sem) for tx, ty in claves])))
    salida: list[float | None] = []
    for esquinas, fx, fy in muestras:
        vals = []
        for cx, cy in esquinas:
            t = tiles.get((cx // TAM, cy // TAM))
            vals.append(None if t is None else decodificar(t.getpixel((cx % TAM, cy % TAM))))
        if any(v is None for v in vals):
            salida.append(None)
            continue
        a, b, c, d = vals
        salida.append((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy)
    return salida
