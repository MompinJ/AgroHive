"""NDVI de MODIS (MOD13Q1 V061, 250 m, compuesto de 16 dias) por punto, desde Microsoft Planetary Computer (A4.11, sustituye a ORNL DAAC).

ORNL DAAC no respondio de forma usable el 14/11 (502, 503 y llamadas de 40 s sin un byte). Planetary Computer aloja el MISMO producto de NASA LP DAAC
como COG, sin cuenta: el catalogo STAC es publico y los archivos se leen con un token anonimo de lectura. Validado contra ORNL: las cuatro fechas
comparadas (A2023145, A2023161, A2023177, A2023193) dieron el mismo NDVI y la misma calidad en Isla (3279/1, 3378/0, 4053/3, 3921/3).

Verificado el 14/11: la coleccion `modis-13Q1-061` mezcla Terra (MOD13Q1) y Aqua (MYD13Q1) intercalados cada 8 dias; el contrato pide MOD13Q1, asi que
se descarta Aqua. El archivo declara su relleno (NDVI -3000, calidad 255). OJO: rasterio reporta scale=10000 (convencion de HDF): la escala es la del
STAC (`raster:bands.scale`, 0.0001), no la de rasterio.
"""
import asyncio
import time
from datetime import date, datetime, timedelta

import certifi
import httpx
from pyproj import Transformer

from .. import http

API = "https://planetarycomputer.microsoft.com/api"
BUSCAR = f"{API}/stac/v1/search"
TOKEN = f"{API}/sas/v1/token/modiseuwest/modis-061-cogs"  # token anonimo de lectura del contenedor (caduca en ~1 h)
COLECCION = "modis-13Q1-061"
URL_SERVICIO = f"{API}/stac/v1/collections/{COLECCION}"
PRODUCTO = "MOD13Q1"
VERSION = "061"
BANDA_NDVI = "250m_16_days_NDVI"
BANDA_CALIDAD = "250m_16_days_pixel_reliability"
NOMBRE = "NASA LP DAAC MOD13Q1 V061 (NDVI de MODIS/Terra) via Microsoft Planetary Computer"
CITA = ("Didan, K. (2021). MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061. "
        "NASA EOSDIS Land Processes DAAC. doi:10.5067/MODIS/MOD13Q1.061. Datos servidos por Microsoft Planetary Computer.")
RESOLUCION = "250 m (rejilla sinusoidal), compuesto de 16 dias"
ESCALA = 0.0001
RANGO_NDVI = (-2000, 10000)  # rango valido del producto (verificado en /MOD13Q1/bands de ORNL el 14/11)
RELLENO_NDVI = -3000  # tambien declarado como nodata en el propio COG
RELLENO_CALIDAD = (255, -1)  # uint8 255 = int8 -1 (declarado en el COG y en ORNL)
TIEMPO_LIMITE_S = 25
LECTURAS_A_LA_VEZ = 6
TOKEN_MARGEN_S = 300  # se pide uno nuevo cuando faltan menos de 5 minutos para que caduque
# El token de lectura es del contenedor, no de la consulta, y dura cerca de una hora: se pide UNO y se comparte. Pedirlo por ventana (51 para
# 20 anios) hizo que el servicio de tokens respondiera HTTP 429 el 14/11. Vive solo en memoria: jamas se escribe en cache, logs ni respuestas.
_TOKEN: dict = {"valor": None, "expira": 0.0}
_CANDADOS: dict[int, asyncio.Lock] = {}
VENTANA_DIAS = 144  # ventanas alineadas desde 2000-01-01: mismo cache para cualquier consulta
EPOCA = date(2000, 1, 1)


async def token(cliente: httpx.AsyncClient) -> str:
    """Token anonimo de lectura del contenedor, reutilizado mientras no este por caducar (un solo pedido aunque haya muchas ventanas a la vez)."""
    def vigente() -> bool:
        return bool(_TOKEN["valor"]) and _TOKEN["expira"] - time.time() > TOKEN_MARGEN_S

    if vigente():
        return _TOKEN["valor"]
    async with _CANDADOS.setdefault(id(asyncio.get_running_loop()), asyncio.Lock()):
        if vigente():  # otra ventana lo pidio mientras esperabamos el candado
            return _TOKEN["valor"]
        try:
            j = (await http.solicitar(cliente, "GET", TOKEN, reintentos=5)).json()
            valor = j["token"]
        except (ValueError, KeyError) as e:
            raise http.ErrorFuente(f"Planetary Computer no entrego el token de lectura: {e!r}") from e
        try:
            expira = datetime.fromisoformat(j["msft:expiry"].replace("Z", "+00:00")).timestamp()
        except (KeyError, ValueError):
            expira = time.time() + 1800  # sin fecha de caducidad: se asume media hora, menos de lo que dura
        _TOKEN.update(valor=valor, expira=expira)
        return valor


def ventanas(desde: date, hasta: date) -> list[tuple[date, date]]:
    """Ventanas alineadas de 144 dias que cubren [desde, hasta] (las puntas pueden salirse; luego se recorta la serie)."""
    primera, ultima = (desde - EPOCA).days // VENTANA_DIAS, (hasta - EPOCA).days // VENTANA_DIAS
    return [(EPOCA + timedelta(days=k * VENTANA_DIAS), EPOCA + timedelta(days=(k + 1) * VENTANA_DIAS - 1)) for k in range(primera, ultima + 1)]


def compuestos(busqueda: dict, ini: date, fin: date) -> list[dict]:
    """Compuestos de Terra (MOD13Q1) de la respuesta de busqueda dentro de [ini, fin], uno por fecha. Descarta Aqua (MYD13Q1)."""
    por_fecha: dict[str, dict] = {}
    for f in busqueda.get("features", []):
        if not f["id"].startswith(f"{PRODUCTO}."):
            continue
        fecha = (f["properties"].get("start_datetime") or "")[:10]
        if not fecha or not ini.isoformat() <= fecha <= fin.isoformat():
            continue
        try:
            por_fecha.setdefault(fecha, {"fecha": fecha, "id": f["id"], "ndvi": f["assets"][BANDA_NDVI]["href"], "calidad": f["assets"][BANDA_CALIDAD]["href"]})
        except KeyError as e:
            raise http.ErrorFuente(f"el item {f['id']} no trae la banda {e}") from e
    return [por_fecha[k] for k in sorted(por_fecha)]


def convertir(crudo_ndvi: int, crudo_calidad: int | None) -> dict:
    """Un compuesto del contrato: NDVI escalado o null con motivo. El relleno y lo fuera de rango son NO_EVALUABLE, nunca 0 ni un NDVI de -0.3."""
    calidad = None if crudo_calidad is None or crudo_calidad in RELLENO_CALIDAD else int(crudo_calidad)
    if crudo_ndvi == RELLENO_NDVI:
        return {"ndvi": None, "estado": "NO_EVALUABLE", "calidad": calidad, "motivo": "El producto no tiene valor ese dia (relleno -3000: nubes, agua o sin cobertura)."}
    if not RANGO_NDVI[0] <= crudo_ndvi <= RANGO_NDVI[1]:
        return {"ndvi": None, "estado": "NO_EVALUABLE", "calidad": calidad, "motivo": f"Valor {crudo_ndvi} fuera del rango valido del producto ({RANGO_NDVI[0]} a {RANGO_NDVI[1]})."}
    return {"ndvi": round(crudo_ndvi * ESCALA, 4), "estado": "EXPLORATORIO", "calidad": calidad}


def _leer_sync(url_ndvi: str, url_calidad: str, lon: float, lat: float) -> tuple[int, int | None]:
    """Lee el pixel del punto (bloqueante; se corre en un hilo). Devuelve (NDVI crudo, calidad cruda o None si la calidad no se pudo leer)."""
    import rasterio

    def pixel(url: str) -> int:
        with rasterio.open(url) as src:
            x, y = Transformer.from_crs(4326, src.crs, always_xy=True).transform(lon, lat)
            return int(next(src.sample([(x, y)]))[0])

    with rasterio.Env(CURL_CA_BUNDLE=certifi.where(), GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_TIMEOUT=str(TIEMPO_LIMITE_S), GDAL_HTTP_MAX_RETRY="2"):
        crudo = pixel(url_ndvi)
        try:
            return crudo, pixel(url_calidad)
        except Exception:  # la calidad es secundaria: el NDVI sale sin ella y la ventana no se fija en cache
            return crudo, None


async def ventana(cliente: httpx.AsyncClient, lat: float, lon: float, ini: date, fin: date) -> tuple[list[dict], float, bool]:
    """Una ventana: (datos, escala, completa). `completa` es False si falto la calidad o algun compuesto dio error (no se fija en cache).

    Lanza ErrorFuente si el catalogo no responde o si ningun compuesto se pudo leer.
    """
    cuerpo = {"collections": [COLECCION], "intersects": {"type": "Point", "coordinates": [lon, lat]},
              "datetime": f"{ini.isoformat()}T00:00:00Z/{fin.isoformat()}T23:59:59Z", "limit": 50}
    r = await http.solicitar(cliente, "POST", BUSCAR, json=cuerpo)
    try:
        lista = compuestos(r.json(), ini, fin)
    except (ValueError, KeyError, TypeError) as e:
        raise http.ErrorFuente(f"respuesta del catalogo de Planetary Computer inesperada: {e!r}") from e
    if not lista:
        return [], ESCALA, True
    t = await token(cliente)
    sem = asyncio.Semaphore(LECTURAS_A_LA_VEZ)

    async def leer(c: dict):
        async with sem:
            try:
                return await asyncio.to_thread(_leer_sync, f"{c['ndvi']}?{t}", f"{c['calidad']}?{t}", lon, lat)
            except Exception as e:  # GDAL lanza RasterioIOError y errores de red; el mensaje puede traer la URL con el token: no se propaga
                return type(e).__name__

    lecturas = await asyncio.gather(*[leer(c) for c in lista])
    datos, completa = [], True
    for c, lec in zip(lista, lecturas):
        if isinstance(lec, str):
            datos.append({"fecha": c["fecha"], "ndvi": None, "estado": "ERROR_DATOS", "calidad": None, "motivo": f"No se pudo leer el pixel de este compuesto ({lec})."})
            completa = False
            continue
        crudo, calidad = lec
        if calidad is None:
            completa = False
        datos.append({"fecha": c["fecha"], **convertir(crudo, calidad)})
    if all(d["estado"] == "ERROR_DATOS" for d in datos):
        raise http.ErrorFuente("no se pudo leer ningun compuesto de MODIS en Planetary Computer")
    return datos, ESCALA, completa
