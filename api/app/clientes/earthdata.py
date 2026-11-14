"""NASA SMAP L3 (SPL3SMP, 36 km) humedad del suelo superficial por rangos HTTP con earthaccess (A4.8).

Un granulo diario pesa unos 30 MB: no se descarga entero. Con la sesion autenticada de earthaccess se piden por rangos
HTTP solo los bloques que h5py necesita (una fila de 964 celdas por variable). La celda se calcula con la rejilla
EASE-Grid 2.0 global de 36 km (EPSG:6933, 406 filas x 964 columnas, verificada contra latitude y EASE_row_index del
archivo). El token de Earthdata sale SOLO de la variable de entorno EARTHDATA_TOKEN: nunca se escribe en cache ni en logs.
"""
import asyncio
import io
import os
import threading
import time
from datetime import date

from .. import http

PRODUCTO = "SPL3SMP"
NOMBRE = "NASA SMAP L3 (SPL3SMP) humedad del suelo, 36 km"
URL = "https://nsidc.org/data/spl3smp"
RESOLUCION = "36 km (EASE-Grid 2.0)"
UNIDADES = "m3/m3 (cm3/cm3), capa superficial de unos 5 cm"
PASES = (("AM", "Soil_Moisture_Retrieval_Data_AM", ""), ("PM", "Soil_Moisture_Retrieval_Data_PM", "_pm"))
FILAS, COLUMNAS = 406, 964
PIXEL_M = 36032.220840584
X0, Y0 = -17367530.445161499, 7314540.830638599  # esquina superior izquierda de la rejilla
BLOQUE = 4 << 20  # bloques alineados de 4 MiB: la latencia (1 a 2 s por peticion) pesa mas que los bytes


VIGENCIA_SESION_S = 1800
_candado_sesion = threading.Lock()
_sesion = {"cuando": 0.0, "objeto": None}


def _sesion_autenticada():
    """Sesion HTTP autenticada de earthaccess. earthaccess guarda el login en estado global, asi que se hace una sola vez, bajo candado, y se reutiliza."""
    import earthaccess

    with _candado_sesion:
        if _sesion["objeto"] is None or time.time() - _sesion["cuando"] > VIGENCIA_SESION_S:
            if not earthaccess.login(strategy="environment").authenticated:
                raise http.ErrorFuente("Earthdata rechazo el token")
            _sesion["objeto"], _sesion["cuando"] = earthaccess.get_requests_https_session(), time.time()
        return _sesion["objeto"]


class SinToken(http.ErrorFuente):
    """Falta la variable de entorno EARTHDATA_TOKEN."""


def celda(lon: float, lat: float) -> tuple[int, int] | None:
    """(fila, columna) de la rejilla SMAP de 36 km que contiene el punto; None si cae fuera de la rejilla."""
    from pyproj import Transformer

    x, y = Transformer.from_crs(4326, 6933, always_xy=True).transform(lon, lat)
    fila, col = int((Y0 - y) // PIXEL_M), int((x - X0) // PIXEL_M)
    return (fila, col) if 0 <= fila < FILAS and 0 <= col < COLUMNAS else None


def centro(fila: int, col: int) -> tuple[float, float]:
    """(lon, lat) del centro de la celda, redondeado a 3 decimales."""
    from pyproj import Transformer

    lon, lat = Transformer.from_crs(6933, 4326, always_xy=True).transform(X0 + (col + 0.5) * PIXEL_M, Y0 - (fila + 0.5) * PIXEL_M)
    return round(lon, 3), round(lat, 3)


class ArchivoPorRangos(io.RawIOBase):
    """Archivo de solo lectura sobre una URL: pide bloques alineados por rango HTTP y los guarda. Lo abre h5py."""

    def __init__(self, sesion, url: str):
        self.sesion, self.url, self.pos, self.bloques = sesion, url, 0, {}
        r = sesion.get(url, headers={"Range": "bytes=0-0"}, timeout=30)
        if r.status_code != 206 or "/" not in r.headers.get("Content-Range", ""):
            raise http.ErrorFuente(f"el servidor no admite rangos ({r.status_code})")
        self.tamano = int(r.headers["Content-Range"].rsplit("/", 1)[1])

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, desplazamiento, desde=io.SEEK_SET):
        self.pos = {io.SEEK_SET: 0, io.SEEK_CUR: self.pos, io.SEEK_END: self.tamano}[desde] + desplazamiento
        return self.pos

    def _bloque(self, i: int) -> bytes:
        if i not in self.bloques:
            inicio = i * BLOQUE
            r = self.sesion.get(self.url, headers={"Range": f"bytes={inicio}-{min(self.tamano, inicio + BLOQUE) - 1}"}, timeout=60)
            if r.status_code != 206:
                raise http.ErrorFuente(f"rango rechazado ({r.status_code})")
            self.bloques[i] = r.content
        return self.bloques[i]

    def readinto(self, destino):
        n = min(len(destino), self.tamano - self.pos)
        if n <= 0:
            return 0
        hecho = 0
        while hecho < n:
            i, dentro = divmod(self.pos + hecho, BLOQUE)
            trozo = self._bloque(i)[dentro:dentro + n - hecho]
            destino[hecho:hecho + len(trozo)] = trozo
            hecho += len(trozo)
        self.pos += n
        return n


def leer_pases(archivo, fila: int, col: int) -> list[dict]:
    """Humedad y bandera de calidad de los pases AM y PM en una celda. Valor None si esta fuera de rango o es relleno."""
    import h5py

    salida = []
    with h5py.File(archivo, "r") as h:
        for pase, grupo, sufijo in PASES:
            g = h[grupo]
            ds = g["soil_moisture" + sufijo]
            v = float(ds[fila, col])
            minimo, maximo = float(ds.attrs["valid_min"]), float(ds.attrs["valid_max"])
            bandera = int(g["retrieval_qual_flag" + sufijo][fila, col])
            salida.append({"pase": pase, "humedadM3M3": round(v, 4) if minimo <= v <= maximo else None,
                           "banderaCalidad": bandera if bandera != 65534 else None})
    return salida


def _leer_sync(lon: float, lat: float, dia: date) -> dict | None:
    """Busca el granulo del dia y lee la celda del punto (bloqueante: se corre en un hilo). None si no hay granulo ese dia."""
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        raise SinToken("falta la variable de entorno EARTHDATA_TOKEN (cuenta Earthdata)")
    import earthaccess

    sitio = celda(lon, lat)
    if sitio is None:
        return None
    sesion = _sesion_autenticada()
    resultados = earthaccess.search_data(short_name=PRODUCTO, point=(lon, lat), temporal=(dia.isoformat(), dia.isoformat()), count=1)
    if not resultados:
        return None
    enlaces = [e for e in resultados[0].data_links(access="external") if e.endswith(".h5")]
    if not enlaces:
        return None
    pases = leer_pases(ArchivoPorRangos(sesion, enlaces[0]), *sitio)
    return {"granulo": resultados[0]["umm"]["GranuleUR"], "celda": list(sitio), "centro": list(centro(*sitio)), "pases": pases}


async def humedad_dia(lon: float, lat: float, dia: date) -> dict | None:
    """Datos SMAP del dia o None si ese dia no hay granulo o el punto queda fuera de la rejilla. Lanza ErrorFuente si falla."""
    try:
        return await asyncio.to_thread(_leer_sync, lon, lat, dia)
    except http.ErrorFuente:
        raise
    except Exception as e:  # earthaccess, requests y h5py lanzan tipos propios
        raise http.ErrorFuente(f"SMAP {dia}: {type(e).__name__}: {str(e)[:120]}") from e
