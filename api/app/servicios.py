"""Orquestacion: fuente principal, respaldo, cache y estados visibles (doc 04). El backend no calcula indicadores."""
import asyncio
import math
from datetime import date, datetime, timedelta, timezone

from . import cache, config, http
from . import pedotransferencia
from . import textura as clasificacion
from .clientes import isric, openlandmap, openmeteo, power, terrarium
from .modelos import CeldaEntrada

_candados: dict[str, asyncio.Lock] = {}
VENTANA_ESTANDAR = (date(2005, 10, 1), date(2025, 12, 31))  # 20 anios agricolas completos (el ciclo OI cruza el anio); la pide el motor y el paquete de demo
DIAS_SERIE_ESTABLE = 90  # POWER sustituye valores casi en tiempo real por consolidados cada varios meses
TTL_RECIENTE_S = 24 * 3600


class SinDatos(Exception):
    """Ni la fuente principal, ni el respaldo, ni la cache pudieron responder."""


def _candado(clave: str) -> asyncio.Lock:
    return _candados.setdefault(clave, asyncio.Lock())


def _vigente(edad_s: float, hasta: date) -> bool:
    return hasta <= config.hoy() - timedelta(days=DIAS_SERIE_ESTABLE) or edad_s < TTL_RECIENTE_S


def _meta() -> dict:
    return {"versionContrato": config.VERSION_CONTRATO, "esEjemplo": False, "generado": datetime.now(timezone.utc).isoformat()}


def _fuente_clima(nombre, url, resolucion, unidades, coord, desde, hasta, consultado, nota=None) -> dict:
    return {"nombre": nombre, "url": url, "coordenada": coord, "periodo": {"desde": desde, "hasta": hasta},
            "unidades": unidades, "consultado": consultado, "resolucion": resolucion, "nota": nota}


async def serie_clima(lat: float, lon: float, desde: date, hasta: date) -> dict:
    """Serie diaria: POWER con cache; si falla, Open-Meteo (RESPALDO_HISTORICO); si falla, cache vencida; si no, SinDatos."""
    clat, clon = power.centro_celda(lat, lon)
    clave = f"power_v2_{clat:.3f}_{clon:.3f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"  # v2: incluye GWETROOT
    coord = (lon, lat)
    async with _candado(clave):
        en_cache = cache.leer(clave)
        if en_cache and _vigente(en_cache[1], hasta):
            return await _con_lluvia_satelital(_respuesta_power(en_cache[0], coord, desde, hasta, []), lat, lon, desde, hasta)
        try:
            async with http.crear_cliente() as c:
                dias = await power.serie_diaria(c, clat, clon, desde, hasta)
            registro = {"consultado": config.hoy().isoformat(), "celda": [clon, clat], "diario": dias}
            cache.escribir(clave, registro)
            return await _con_lluvia_satelital(_respuesta_power(registro, coord, desde, hasta, []), lat, lon, desde, hasta)
        except http.ErrorFuente as e:
            motivo_power = str(e)
    return await _respaldo_clima(lat, lon, desde, hasta, clave, en_cache, motivo_power)


async def _con_lluvia_satelital(respuesta: dict, lat: float, lon: float, desde: date, hasta: date) -> dict:
    """Agrega `lluviaSatelital` (IMERG via POWER, A4.10) a una respuesta de POWER. Es evidencia opcional: si falla, la respuesta del
    clima sale igual, sin el bloque y con una advertencia (nunca se inventa ni se rellena con ceros). No la usa el balance ni los escenarios."""
    if hasta < power.INICIO_IMERG:  # sin un solo dia de IMERG: no se arma un bloque vacio con un periodo invertido (desde 1998 > hasta)
        aviso = {"codigo": "IMERG_FUERA_DE_COBERTURA", "mensaje": f"La lluvia satelital (IMERG) empieza el {power.INICIO_IMERG.isoformat()}; el periodo pedido es anterior.", "severidad": "info"}
        respuesta["advertencias"] = [*respuesta["advertencias"], aviso]
        return respuesta
    clat, clon = power.centro_celda_imerg(lat, lon)
    clave = f"imerg_v1_{clat:.2f}_{clon:.2f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"
    async with _candado(clave):
        en_cache = cache.leer(clave)
        registro, aviso = None, None
        if en_cache and _vigente(en_cache[1], hasta):
            registro = en_cache[0]
        else:
            try:
                async with http.crear_cliente() as c:
                    dias = await power.serie_imerg(c, clat, clon, desde, hasta)
                registro = {"consultado": config.hoy().isoformat(), "dias": dias}
                cache.escribir(clave, registro)
            except http.ErrorFuente as e:
                if en_cache:
                    registro = en_cache[0]
                    aviso = {"codigo": "IMERG_EN_CACHE", "mensaje": f"La lluvia satelital (IMERG) no respondio ({e}); se usa la guardada el {registro['consultado']}.", "severidad": "info"}
                else:
                    aviso = {"codigo": "IMERG_NO_DISPONIBLE", "mensaje": f"La lluvia satelital (IMERG) no respondio ({e}); el clima sale sin ella.", "severidad": "info"}
    if registro is None:
        respuesta["advertencias"] = [*respuesta["advertencias"], aviso]
        return respuesta
    dias = registro["dias"]
    con_dato = [d["fecha"] for d in dias if d["lluviaMm"] is not None]
    adv = [{"codigo": "LLUVIA_SATELITAL_EVIDENCIA", "mensaje": "La lluvia satelital (GPM IMERG) es evidencia para contrastar con la lluvia de MERRA-2: no entra al balance de agua ni cambia los escenarios.", "severidad": "info"}]
    if aviso:
        adv.append(aviso)
    faltan = len(dias) - len(con_dato)
    if faltan:
        ultimo = f"; el ultimo dia con dato es {max(con_dato)}" if con_dato else ""
        adv.append({"codigo": "IMERG_DIAS_SIN_DATO", "mensaje": f"IMERG no tiene dato en {faltan} de {len(dias)} dias (los ultimos meses aun no se publican){ultimo}. Quedan en null, nunca en 0.", "severidad": "info"})
    respuesta["lluviaSatelital"] = {
        "variable": power.IMERG_VARIABLE, "estandarHora": "UTC", "dias": dias,
        "fuente": _fuente_clima(power.NOMBRE_IMERG, power.URL, power.RESOLUCION_IMERG, "mm/dia", (clon, clat), max(desde, power.INICIO_IMERG), hasta,
                                registro["consultado"], "Pedida con time-standard=UTC (en hora solar local POWER no la entrega). Valor por celda de 0.1 grados, no por parcela. Referencia: https://power.larc.nasa.gov/docs/referencing/"),
    }
    respuesta["advertencias"] = [*respuesta["advertencias"], *adv]
    return respuesta


def _respuesta_power(registro: dict, coord, desde, hasta, advertencias, estado="EVALUABLE") -> dict:
    return {
        "meta": _meta(), "estado": estado, "respaldo": False, "coordenada": coord,
        "fuente": _fuente_clima(power.NOMBRE, power.URL, power.RESOLUCION, power.UNIDADES, tuple(registro["celda"]),
                                desde, hasta, registro["consultado"], "Todas las celdas de la parcela comparten esta serie."),
        "humedadSuelo": {**power.HUMEDAD_SUELO, "fuente": {"nombre": power.NOMBRE, "url": power.URL, "unidades": "fraccion de saturacion (0 a 1)",
                                                         "consultado": registro["consultado"], "resolucion": power.RESOLUCION,
                                                         "nota": "GWETROOT; la profundidad (~100 cm) es la que describe el contrato y no esta verificada en la documentacion de POWER (VERIFICAR)."}},
        "diario": registro["diario"], "advertencias": advertencias,
    }


async def _respaldo_clima(lat, lon, desde, hasta, clave_power, cache_power, motivo_power) -> dict:
    coord = (lon, lat)
    clave = f"openmeteo_{lat:.2f}_{lon:.2f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"
    aviso_power = {"codigo": "POWER_NO_DISPONIBLE", "mensaje": f"NASA POWER no respondio ({motivo_power}).", "severidad": "aviso"}
    aviso_cache = None
    try:
        async with http.crear_cliente() as c:
            dias = await openmeteo.serie_diaria(c, lat, lon, desde, hasta)
        registro = {"consultado": config.hoy().isoformat(), "diario": dias}
        cache.escribir(clave, registro)
    except http.ErrorFuente as e:
        en_cache = cache.leer(clave)
        if en_cache:
            registro = en_cache[0]
            aviso_cache = {"codigo": "CLIMA_RESPALDO_EN_CACHE", "mensaje": f"Open-Meteo tampoco respondio ({e}); se usa su serie guardada el {registro['consultado']}.", "severidad": "aviso"}
        elif cache_power:
            adv = [aviso_power, {"codigo": "CACHE_VENCIDA", "mensaje": "Se usan datos de NASA POWER guardados antes; pueden estar desactualizados.", "severidad": "aviso"}]
            return _respuesta_power(cache_power[0], coord, desde, hasta, adv, estado="RESPALDO_HISTORICO")
        else:
            raise SinDatos(f"POWER y Open-Meteo no respondieron ({motivo_power}; {e})") from e
    adv = [aviso_power, {"codigo": "CLIMA_RESPALDO_OPEN_METEO", "mensaje": "Serie de respaldo (ERA5 via Open-Meteo). No es identica a NASA POWER: no mezclar con series de POWER.", "severidad": "aviso"}]
    if aviso_cache:
        adv.append(aviso_cache)
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
                                                  "consultado": config.hoy().isoformat(), "nota": nota}},
        "celdas": [{"id": c.id, "elevacionM": elev[(c.i, c.j)], "pendientePct": None if pend[c.id] is None else round(pend[c.id], 2)} for c in celdas],
        "advertencias": advertencias,
    }


# ---------------------------------------------------------------- suelo

async def _propiedad(cliente, sem, prop: str, lon: float, lat: float) -> dict | None:
    """Media ponderada por espesor de las capas 0-5, 5-15 y 15-30 cm (0 a 30 cm). None si ninguna capa tiene dato."""
    async def una(capa, espesor):
        async with sem:
            return espesor, await isric.valor(cliente, prop, capa, lon, lat)
    partes = [(e, r) for e, r in await asyncio.gather(*[una(c, e) for c, e in isric.PROFUNDIDADES]) if r is not None]
    if not partes:
        return None
    peso = sum(e for e, _ in partes)
    return {"valor": sum(e * r[0] for e, r in partes) / peso, "capas": len(partes), "radioM": max(r[2] for _, r in partes)}


def _id_suelo(lat: float, lon: float) -> str:
    return f"suelo-{round(abs(lat) * 1000)}{'n' if lat >= 0 else 's'}-{round(abs(lon) * 1000)}{'e' if lon >= 0 else 'w'}"


ID_ISRIC = "isric-soilgrids-wcs"


async def _suelo_isric(lat: float, lon: float) -> dict:
    clave = f"suelo_isric_v2_{round(lat / 0.0025)}_{round(lon / 0.0025)}"  # v2: incluye carbono organico
    async with _candado(clave):
        en_cache = cache.leer(clave)
        if en_cache:
            registro = en_cache[0]
        else:
            try:
                sem = asyncio.Semaphore(4)
                async with http.crear_cliente() as c:
                    nombres = ("clay", "sand", "silt", "phh2o", "soc")
                    props = dict(zip(nombres, await asyncio.gather(*[_propiedad(c, sem, p, lon, lat) for p in nombres])))
            except http.ErrorFuente as e:
                raise SinDatos(f"SoilGrids no respondio ({e}); use el selector manual de suelo") from e
            registro = {"consultado": config.hoy().isoformat(), "props": props}
            if all(props[k] for k in ("clay", "sand", "silt")):
                cache.escribir(clave, registro)  # solo se guarda lo completo: un hueco no debe quedar fijo
    props = registro["props"]
    if not all(props.get(k) for k in ("clay", "sand", "silt")):
        raise SinDatos("SoilGrids no tiene dato de textura en esta zona; use el selector manual de suelo")
    arena, limo, arcilla = props["sand"]["valor"], props["silt"]["valor"], props["clay"]["valor"]
    total = arena + limo + arcilla
    arena, limo, arcilla = (100 * v / total for v in (arena, limo, arcilla))
    clase = clasificacion.clasificar(arena, limo, arcilla)
    radio = max(p["radioM"] for p in props.values() if p)
    radio_textura = max(props[k]["radioM"] for k in ("clay", "sand", "silt"))
    # Con pixeles a mas de 1 km el valor es una extrapolacion: EXPLORATORIO, no EVALUABLE (doc 04, revision de Mompin 14/11)
    estado_textura = "EXPLORATORIO" if radio_textura > 1000 else "EVALUABLE"
    fuente = {"nombre": isric.NOMBRE, "url": "https://maps.isric.org", "coordenada": (lon, lat), "unidades": "% (arena, limo, arcilla), pH en agua",
              "consultado": registro["consultado"], "resolucion": "250 m",
              "nota": f"Media de 0 a 30 cm ponderada por espesor de capa; mediana de los pixeles con dato a menos de {radio} m del punto. "
                      "Fracciones normalizadas a 100. El grupo y el TAW vienen de la tabla de suelos de A1.6."}
    advertencias = [{"codigo": "SUELO_SUPUESTO", "mensaje": "pH y textura estimados por un modelo global de 250 m; no son una medicion de su parcela.", "severidad": "aviso"}]
    if radio > 1000:
        advertencias.append({"codigo": "SUELO_SIN_DATO_CERCANO", "mensaje": "El mapa no tiene dato cerca del punto; el valor viene de pixeles a mas de 1 km.", "severidad": "aviso"})
    if any(p and p["capas"] < len(isric.PROFUNDIDADES) for p in props.values()):
        advertencias.append({"codigo": "SUELO_CAPAS_INCOMPLETAS", "mensaje": "Alguna capa de profundidad no tiene dato; la media usa las capas disponibles.", "severidad": "info"})
    ph = props.get("phh2o")
    soc = props.get("soc")
    estado_ph = "EXPLORATORIO" if ph and ph["radioM"] > 1000 else "EVALUABLE"
    grupo = _grupo(clase)
    fracciones = {"arena": round(arena, 1), "limo": round(limo, 1), "arcilla": round(arcilla, 1)}
    estimacion = {
        "id": ID_ISRIC, "servicio": "isric_soilgrids_wcs", "estado": estado_textura, "fuente": fuente,
        "profundidad": {"desdeCm": 0, "hastaCm": 30},
        "textura": {"clase": clase, "fraccionesPct": fracciones},
        "ph": round(ph["valor"], 1) if ph else None,
        "carbonoOrganicoGKg": round(soc["valor"], 1) if soc else None,
    }
    fuente_ph = {**fuente, "unidades": "pH en agua (adimensional)",
                 "nota": f"Media de 0 a 30 cm ponderada por espesor de capa; mediana de los pixeles con dato a menos de {radio} m del punto."}
    return {
        "meta": _meta(), "id": _id_suelo(lat, lon), "etiqueta": "SUPUESTO", "origen": "mapa_global",
        "aviso": "pH y textura estimados por un modelo global (SoilGrids, 250 m); no son una medicion de la parcela.",
        "coordenada": (lon, lat), "profundidad": {"desdeCm": 0, "hastaCm": 30},
        "textura": {"estado": estado_textura, "etiqueta": "SUPUESTO", "clase": clase, "grupo": grupo,
                    "fraccionesPct": fracciones, "fuente": fuente},
        "ph": ({"estado": estado_ph, "etiqueta": "SUPUESTO", "valor": round(ph["valor"], 1), "fuente": fuente_ph} if ph
               else {"estado": "NO_EVALUABLE", "motivo": "SoilGrids no tiene dato de pH en esta zona."}),
        "estimaciones": [estimacion],
        "estimacionUsada": ID_ISRIC,
        "agua": _agua(clase, estimacion),
        "advertencias": advertencias,
    }


# ---------------------------------------------------------------- suelo: OpenLandMap y composicion (A2.15)

ID_OLM = "openlandmap-soildb"


def _grupo(clase: str) -> str:
    """Grupo del selector manual para una clase USDA, segun la tabla de suelos de A1.6 (copia de respaldo si falta el archivo)."""
    tabla = clasificacion.cargar_catalogo_suelos().get(clase)
    return tabla["grupo"] if tabla else clasificacion.GRUPO[clase]


def _agua(clase: str, estimacion: dict) -> dict:
    """Agua del suelo: Saxton y Rawls (2006) primero, porque da el TAW **y** la retencion (thetaSat, thetaFC, thetaWP) que el motor
    necesita para convertir GWETROOT (fraccion de saturacion) a fraccion de TAW; la tabla FAO-56 queda de respaldo (solo TAW);
    sin ninguna de las dos, NO_EVALUABLE con motivo. Nunca se toma el valor de una clase vecina."""
    ped = pedotransferencia.agua(estimacion)
    if ped is not None and ped["tawMmPorM"].get("estado") == "EVALUABLE":
        return ped
    tabla = clasificacion.cargar_catalogo_suelos().get(clase)
    if tabla and tabla["tawMmPorM"].get("estado") == "EVALUABLE":
        taw = tabla["tawMmPorM"]
        return {"tawMmPorM": taw, "metodoTaw": {"metodo": "tabla_fao56", "fuente": taw["fuente"]}}
    if ped is not None:
        return ped  # NO_EVALUABLE con el motivo de Saxton y Rawls
    if tabla:
        return {"tawMmPorM": tabla["tawMmPorM"]}
    return {"tawMmPorM": {"estado": "NO_EVALUABLE", "motivo": "No hay tabla de suelos ni pedotransferencia disponibles en este servidor."}}


async def _estimacion_openlandmap(lat: float, lon: float) -> tuple[dict | None, dict | None]:
    """(estimacion de OpenLandMap o None, advertencia si no se pudo). Nunca lanza: es una segunda opinion, no un requisito."""
    clave = f"suelo_olm_v1_{round(lat / 0.001)}_{round(lon / 0.001)}"
    en_cache = cache.leer(clave)
    if en_cache:
        registro = en_cache[0]
    else:
        try:
            async with http.crear_cliente() as c:
                props = await openlandmap.estimar(c, lon, lat)
        except http.ErrorFuente as e:
            return None, {"codigo": "OPENLANDMAP_NO_DISPONIBLE", "mensaje": f"OpenLandMap no respondio ({e}); solo hay estimacion de ISRIC.", "severidad": "info"}
        registro = {"consultado": config.hoy().isoformat(), "props": props}
        if all(props.get(k) for k in ("clay", "sand", "silt")):
            cache.escribir(clave, registro)
    props = registro["props"]
    if not all(props.get(k) for k in ("clay", "sand", "silt")):
        return None, {"codigo": "OPENLANDMAP_SIN_DATO", "mensaje": "OpenLandMap no tiene dato de textura en este punto.", "severidad": "info"}
    arcilla, arena, limo = props["clay"][0], props["sand"][0], props["silt"][0]
    total = arcilla + arena + limo
    arcilla, arena, limo = (100 * v / total for v in (arcilla, arena, limo))
    clase = clasificacion.clasificar(arena, limo, arcilla)
    validos = min(props[k][1] / props[k][2] for k in ("clay", "sand", "silt"))
    ph, oc = props.get("ph"), props.get("oc")
    return {
        "id": ID_OLM, "servicio": "openlandmap", "estado": "EVALUABLE" if validos >= 0.5 else "EXPLORATORIO",
        "fuente": {"nombre": openlandmap.NOMBRE, "url": "https://openlandmap.org", "cita": openlandmap.CITA, "coordenada": (lon, lat),
                   "periodo": {"desde": date(2020, 1, 1), "hasta": date(2022, 12, 31)}, "unidades": "% (arena, limo, arcilla), pH en agua, g/kg (carbono organico)",
                   "consultado": registro["consultado"], "resolucion": "30 m",
                   "nota": "Capa de 0 a 30 cm; mediana de una ventana de 5 x 5 pixeles. Licencia CC-BY-4.0. Fracciones normalizadas a 100."},
        "profundidad": {"desdeCm": 0, "hastaCm": 30},
        "textura": {"clase": clase, "fraccionesPct": {"arena": round(arena, 1), "limo": round(limo, 1), "arcilla": round(arcilla, 1)}},
        "ph": round(ph[0], 1) if ph else None,
        "carbonoOrganicoGKg": round(oc[0], 1) if oc else None,
    }, None


def _respuesta_desde_estimacion(est: dict, lat: float, lon: float, advertencias: list[dict]) -> dict:
    """Respuesta de /api/suelo cuando la estimacion usada es la de OpenLandMap (ISRIC no respondio)."""
    clase = est["textura"]["clase"]
    grupo = _grupo(clase)
    fuente_ph = {**est["fuente"], "unidades": "pH en agua (adimensional)"}
    return {
        "meta": _meta(), "id": _id_suelo(lat, lon), "etiqueta": "SUPUESTO", "origen": "mapa_global",
        "aviso": "pH y textura estimados por un modelo global (OpenLandMap, 30 m); no son una medicion de la parcela.",
        "coordenada": (lon, lat), "profundidad": est["profundidad"],
        "textura": {"estado": est["estado"], "etiqueta": "SUPUESTO", "clase": clase, "grupo": grupo, "fraccionesPct": est["textura"]["fraccionesPct"], "fuente": est["fuente"]},
        "ph": ({"estado": est["estado"], "etiqueta": "SUPUESTO", "valor": est["ph"], "fuente": fuente_ph} if est["ph"] is not None
               else {"estado": "NO_EVALUABLE", "motivo": "OpenLandMap no tiene dato de pH en este punto."}),
        "estimaciones": [est], "estimacionUsada": est["id"], "agua": _agua(clase, est),
        "advertencias": [{"codigo": "SUELO_SUPUESTO", "mensaje": "pH y textura estimados por un modelo global; no son una medicion de su parcela.", "severidad": "aviso"}, *advertencias],
    }


async def suelo(lat: float, lon: float) -> dict:
    """Textura y pH de la zona. ISRIC es la estimacion usada; OpenLandMap se suma para compararlas (V-23) y la sustituye si ISRIC falla."""
    tarea_olm = asyncio.create_task(_estimacion_openlandmap(lat, lon))
    error = None
    try:
        resp = await _suelo_isric(lat, lon)
    except SinDatos as e:
        resp, error = None, e
    olm, aviso = await tarea_olm
    if resp is None:
        if olm is None:
            raise error
        extra = [{"codigo": "SUELO_ISRIC_NO_DISPONIBLE", "mensaje": f"ISRIC no respondio ({error}); se usa OpenLandMap.", "severidad": "aviso"}]
        return _respuesta_desde_estimacion(olm, lat, lon, extra)
    if olm is not None:
        resp["estimaciones"].append(olm)
    elif aviso is not None:
        resp["advertencias"].append(aviso)
    return resp
