"""Plagas en la region (0.15.0): para la lista de datos/plagas/plagas.json, si GBIF tiene registros de presencia alrededor del punto.

Es evidencia de presencia en la region, no un pronostico de dano: GBIF junta observaciones de museos, ciencia ciudadana y estudios, con
muestreo desigual. Cero registros no prueba ausencia. Los cultivos hospederos salen de la tabla con su fuente (EPPO, clase "Major host");
si no hay fuente verificada la lista va vacia y no se asocia a ningun cultivo. No entra al motor ni al ranking.
"""
import asyncio
import json
from datetime import date

from . import cache, config, http, servicios
from .clientes import gbif

# Medio lado de la caja de busqueda (grados). Medido el 15/11 alrededor de Isla, Veracruz: con 0.5 grados ninguna de las seis plagas
# tiene registros en GBIF; con 1.5 grados aparecen cuatro. GBIF tiene pocos registros de plagas agricolas: es una escala regional.
RADIO_GRADOS = 1.5
ANIO_DESDE = 2000
CONCURRENCIA = 3
CACHE_DIAS = 30  # GBIF agrega registros con el tiempo: la cache se renueva cada mes
AVISO = ("Registros de presencia de GBIF en una caja de unos 165 km alrededor del punto: dicen que la plaga se ha visto en la region, "
         "no que vaya a danar la parcela ni cuanto. Cero registros no prueba que no haya. No entra al motor ni al ranking.")


def tabla() -> list[dict]:
    """Plagas que se buscan, con sus cultivos hospederos citados. Sin la tabla no se inventa una lista: 503."""
    try:
        return json.loads(config.PLAGAS_TABLA.read_text(encoding="utf-8"))["plagas"]
    except (OSError, ValueError, KeyError) as e:
        raise servicios.SinDatos(f"No se pudo leer la tabla de plagas ({config.PLAGAS_TABLA.name}): {e}") from e


async def _consultar(sem, p: dict, lon: float, lat: float, hasta: int):
    clave = f"plagas_v1_{p['taxonKey']}_{lat:.2f}_{lon:.2f}_{RADIO_GRADOS}_{ANIO_DESDE}_{hasta}"
    guardado = cache.leer(clave)
    if guardado and guardado[1] < CACHE_DIAS * 86400:
        return guardado[0]
    async with sem:
        try:
            async with http.crear_cliente(20) as c:
                r = await gbif.conteo(c, p["taxonKey"], lon, lat, RADIO_GRADOS, ANIO_DESDE, hasta)
        except http.ErrorFuente as e:
            if guardado:  # una cache vieja es mejor que nada, y su edad no se oculta: se avisa abajo
                return {**guardado[0], "vieja": True}
            return str(e)[:160]
    cache.escribir(clave, r)
    return r


def _plaga(p: dict, r) -> dict:
    base = {k: p[k] for k in ("id", "nombreComun", "nombreCientifico", "tipoVisual", "taxonKey", "cultivos", "fuenteHospederos")}
    if isinstance(r, str):
        return {**base, "estado": "NO_EVALUABLE", "motivo": f"GBIF no respondio: {r}", "registros": None, "ultimoAnio": None}
    if r["registros"] == 0:
        return {**base, "estado": "sin_registros", "registros": 0, "ultimoAnio": None}
    return {**base, "estado": "presente", "registros": r["registros"], "ultimoAnio": r["ultimoAnio"]}


async def plagas(lon: float, lat: float) -> dict:
    hoy = config.hoy()
    lista = tabla()
    sem = asyncio.Semaphore(CONCURRENCIA)
    res = await asyncio.gather(*[_consultar(sem, p, lon, lat, hoy.year) for p in lista])
    if lista and all(isinstance(r, str) for r in res):
        raise servicios.SinDatos(f"GBIF no respondio para ninguna plaga: {res[0]}")
    adv = [{"codigo": "PLAGAS_EVIDENCIA", "mensaje": "Presencia en la region segun registros de GBIF (muestreo desigual); no es un pronostico de dano ni mide la parcela.", "severidad": "info"}]
    sin_hospederos = [p["nombreComun"] for p in lista if not p["cultivos"]]
    if sin_hospederos:
        adv.append({"codigo": "PLAGAS_SIN_HOSPEDEROS", "mensaje": f"Sin lista de hospederos verificada para: {', '.join(sin_hospederos)}. Se informa su presencia, pero no se asocia a cultivos.", "severidad": "aviso"})
    fallidas = [p["nombreComun"] for p, r in zip(lista, res) if isinstance(r, str)]
    if fallidas:
        adv.append({"codigo": "PLAGAS_SIN_CONSULTA", "mensaje": f"GBIF no respondio para: {', '.join(fallidas)}. Salen como NO_EVALUABLE, sin conteo.", "severidad": "aviso"})
    if any(isinstance(r, dict) and r.get("vieja") for r in res):
        adv.append({"codigo": "PLAGAS_CACHE_VIEJA", "mensaje": f"GBIF no respondio y se usaron conteos guardados de hace mas de {CACHE_DIAS} dias.", "severidad": "aviso"})
    salida = {
        "meta": servicios._meta(), "estado": "EVALUABLE" if lista else "NO_EVALUABLE", "aviso": AVISO, "coordenada": (lon, lat),
        "radioGrados": RADIO_GRADOS, "periodo": {"desde": date(ANIO_DESDE, 1, 1), "hasta": hoy},
        "fuente": {"nombre": gbif.NOMBRE, "url": gbif.URL, "coordenada": (lon, lat), "consultado": hoy,
                   "cita": f"GBIF.org ({hoy.isoformat()}) GBIF Occurrence Search, {gbif.URL_PORTAL}",
                   "resolucion": f"caja de {RADIO_GRADOS} grados alrededor del punto", "unidades": "registros de presencia (conteo)",
                   "periodo": {"desde": date(ANIO_DESDE, 1, 1), "hasta": hoy},
                   "nota": "Filtros: occurrenceStatus=PRESENT, hasCoordinate=true, anio del evento en el periodo. Taxones del GBIF Backbone Taxonomy."},
        "plagas": [_plaga(p, r) for p, r in zip(lista, res)], "advertencias": adv,
    }
    if not lista:
        salida["motivo"] = "La tabla de plagas esta vacia."
    return salida
