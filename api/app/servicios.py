"""Orquestacion: fuente principal, respaldo, cache y estados visibles (doc 04). El backend no calcula indicadores."""
import asyncio
import math
from datetime import date, datetime, timedelta, timezone

from . import cache, config, http
from .clientes import openmeteo, power, terrarium
from .modelos import CeldaEntrada

_candados: dict[str, asyncio.Lock] = {}
DIAS_SERIE_ESTABLE = 90  # POWER sustituye valores casi en tiempo real por consolidados cada varios meses
TTL_RECIENTE_S = 24 * 3600


class SinDatos(Exception):
    """Ni la fuente principal, ni el respaldo, ni la cache pudieron responder."""


def _candado(clave: str) -> asyncio.Lock:
    return _candados.setdefault(clave, asyncio.Lock())


def _vigente(edad_s: float, hasta: date) -> bool:
    return hasta <= date.today() - timedelta(days=DIAS_SERIE_ESTABLE) or edad_s < TTL_RECIENTE_S


def _meta() -> dict:
    return {"versionContrato": config.VERSION_CONTRATO, "esEjemplo": False, "generado": datetime.now(timezone.utc).isoformat()}


def _fuente_clima(nombre, url, resolucion, unidades, coord, desde, hasta, consultado, nota=None) -> dict:
    return {"nombre": nombre, "url": url, "coordenada": coord, "periodo": {"desde": desde, "hasta": hasta},
            "unidades": unidades, "consultado": consultado, "resolucion": resolucion, "nota": nota}


async def serie_clima(lat: float, lon: float, desde: date, hasta: date) -> dict:
    """Serie diaria: POWER con cache; si falla, Open-Meteo (RESPALDO_HISTORICO); si falla, cache vencida; si no, SinDatos."""
    clat, clon = power.centro_celda(lat, lon)
    clave = f"power_{clat:.3f}_{clon:.3f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"
    coord = (lon, lat)
    async with _candado(clave):
        en_cache = cache.leer(clave)
        if en_cache and _vigente(en_cache[1], hasta):
            return _respuesta_power(en_cache[0], coord, desde, hasta, [])
        try:
            async with http.crear_cliente() as c:
                dias = await power.serie_diaria(c, clat, clon, desde, hasta)
            registro = {"consultado": date.today().isoformat(), "celda": [clon, clat], "diario": dias}
            cache.escribir(clave, registro)
            return _respuesta_power(registro, coord, desde, hasta, [])
        except http.ErrorFuente as e:
            motivo_power = str(e)
    return await _respaldo_clima(lat, lon, desde, hasta, clave, en_cache, motivo_power)


def _respuesta_power(registro: dict, coord, desde, hasta, advertencias, estado="EVALUABLE") -> dict:
    return {
        "meta": _meta(), "estado": estado, "respaldo": False, "coordenada": coord,
        "fuente": _fuente_clima(power.NOMBRE, power.URL, power.RESOLUCION, power.UNIDADES, tuple(registro["celda"]),
                                desde, hasta, registro["consultado"], "Todas las celdas de la parcela comparten esta serie."),
        "diario": registro["diario"], "advertencias": advertencias,
    }


async def _respaldo_clima(lat, lon, desde, hasta, clave_power, cache_power, motivo_power) -> dict:
    coord = (lon, lat)
    clave = f"openmeteo_{lat:.2f}_{lon:.2f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"
    aviso_power = {"codigo": "POWER_NO_DISPONIBLE", "mensaje": f"NASA POWER no respondio ({motivo_power}).", "severidad": "aviso"}
    try:
        async with http.crear_cliente() as c:
            dias = await openmeteo.serie_diaria(c, lat, lon, desde, hasta)
        registro = {"consultado": date.today().isoformat(), "diario": dias}
        cache.escribir(clave, registro)
    except http.ErrorFuente as e:
        en_cache = cache.leer(clave)
        if en_cache:
            registro = en_cache[0]
        elif cache_power:
            adv = [aviso_power, {"codigo": "CACHE_VENCIDA", "mensaje": "Se usan datos de NASA POWER guardados antes; pueden estar desactualizados.", "severidad": "aviso"}]
            return _respuesta_power(cache_power[0], coord, desde, hasta, adv, estado="RESPALDO_HISTORICO")
        else:
            raise SinDatos(f"POWER y Open-Meteo no respondieron ({motivo_power}; {e})") from e
    adv = [aviso_power, {"codigo": "CLIMA_RESPALDO_OPEN_METEO", "mensaje": "Serie de respaldo (ERA5 via Open-Meteo). No es identica a NASA POWER: no mezclar con series de POWER.", "severidad": "aviso"}]
    return {
        "meta": _meta(), "estado": "RESPALDO_HISTORICO", "respaldo": True, "coordenada": coord,
        "fuente": _fuente_clima(openmeteo.NOMBRE_CLIMA, openmeteo.URL_ARCHIVO, openmeteo.RESOLUCION_CLIMA, "mm, C, MJ/m2",
                                coord, desde, hasta, registro["consultado"]),
        "diario": registro["diario"], "advertencias": adv,
    }


# ---------------------------------------------------------------- terreno

def pendientes(celdas: list[CeldaEntrada], elev: dict[tuple[int, int], float | None], lado_m: float) -> dict[str, float | None]:
    """Pendiente en % por diferencias finitas centrales; en el borde, diferencia a un lado.

    Si una celda no tiene vecinos en un eje (borde del poligono) usa solo el otro eje; sin vecinos en ninguno, None.
    """
    def dz(i, j, di, dj):
        a, b = elev.get((i - di, j - dj)), elev.get((i + di, j + dj))
        z = elev.get((i, j))
        if z is None:
            return None
        if a is not None and b is not None:
            return (b - a) / (2 * lado_m)
        if b is not None:
            return (b - z) / lado_m
        if a is not None:
            return (z - a) / lado_m
        return None

    salida: dict[str, float | None] = {}
    for c in celdas:
        gx, gy = dz(c.i, c.j, 0, 1), dz(c.i, c.j, 1, 0)
        ejes = [g for g in (gx, gy) if g is not None]
        salida[c.id] = None if not ejes else 100.0 * math.sqrt(sum(g * g for g in ejes))
    return salida


async def terreno(celdas: list[CeldaEntrada], lado_m: float) -> dict:
    puntos = [c.centro for c in celdas]
    advertencias = []
    estado, nombre, resolucion, nota = "EVALUABLE", terrarium.NOMBRE, "tile z14, unos 9 m por pixel interpolado", (
        "La resolucion nativa del DEM de origen no esta verificada (VERIFICAR; Mapzen lo compone de SRTM y otras fuentes, unos 30 m).")
    try:
        async with http.crear_cliente() as c:
            valores = await terrarium.elevaciones(c, puntos)
        if all(v is None for v in valores):
            raise http.ErrorFuente("Terrarium sin cobertura en la zona")
        gruesa = 30.0
    except http.ErrorFuente as e_terr:
        try:
            async with http.crear_cliente() as c:
                valores = await openmeteo.elevaciones(c, puntos)
        except http.ErrorFuente as e_om:
            raise SinDatos(f"Terrarium y Open-Meteo no respondieron ({e_terr}; {e_om})") from e_om
        estado, nombre, resolucion, nota, gruesa = "RESPALDO_HISTORICO", "Open-Meteo Elevation (Copernicus GLO-90)", "90 m", None, 90.0
        advertencias.append({"codigo": "ELEVACION_RESPALDO", "mensaje": "Elevacion de respaldo (90 m); el relieve es mas grueso.", "severidad": "aviso"})
    if lado_m < gruesa:
        advertencias.append({"codigo": "RESOLUCION_DEM_GRUESA",
                             "mensaje": f"El modelo de elevacion tiene unos {gruesa:.0f} m y las celdas miden {lado_m:.0f} m: el relieve entre celdas es interpolado, no medido.",
                             "severidad": "info"})
    elev = {(c.i, c.j): (None if v is None else round(v, 1)) for c, v in zip(celdas, valores)}
    pend = pendientes(celdas, elev, lado_m)
    return {
        "meta": _meta(),
        "terreno": {"estado": estado, "fuente": {"nombre": nombre, "resolucion": resolucion, "unidades": "m (elevacion), % (pendiente)",
                                                  "consultado": date.today().isoformat(), "nota": nota}},
        "celdas": [{"id": c.id, "elevacionM": elev[(c.i, c.j)], "pendientePct": None if pend[c.id] is None else round(pend[c.id], 2)} for c in celdas],
        "advertencias": advertencias,
    }
