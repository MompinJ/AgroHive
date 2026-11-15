"""A4.12: fuentes regionales de EE. UU. cuando la coordenada cae ahi. CDL (rotacion real por anio, F8) y SSURGO (suelo de campo).

Son contraste regional: no sustituyen a las fuentes globales del motor (POWER, SoilGrids) ni entran al ranking. Fuera de EE. UU. contiguos
responden 200 con NO_EVALUABLE y el motivo: no es un error, es que la fuente no cubre el lugar.
"""
import asyncio
from datetime import date

from . import cache, http, servicios
from .clientes import cropscape, sda

CONCURRENCIA_CDL = 4
PROFUNDIDAD_TAW_CM = 100
AVISO_CDL = ("Cultivo clasificado por satelite (USDA NASS CDL) en un pixel de 30 m del punto, anio por anio: muestra la rotacion que hubo ahi, "
             "no la que el usuario declara, y no entra al ranking.")
AVISO_SSURGO = ("Suelo del levantamiento de campo de USDA (SSURGO), componente dominante de la unidad cartografica del punto: contraste regional "
                "del suelo global (SoilGrids) que usa el motor; no lo reemplaza ni entra al ranking.")
LIMITES_CDL = ["PIXEL_NO_ES_LA_PARCELA", "CLASIFICACION_CON_ERROR", "SOLO_EE_UU", "NO_ENTRA_AL_RANKING"]
LIMITES_SSURGO = ["COMPONENTE_DOMINANTE", "SOLO_EE_UU", "NO_ENTRA_AL_RANKING"]
CITA_CDL = ("USDA National Agricultural Statistics Service Cropland Data Layer. {anios}. Published crop-specific data layer [Online]. "
            "Available at https://nassgeodata.nass.usda.gov/CropScape/ (accessed {hoy}). USDA-NASS, Washington, DC.")


def _fuera(que: str) -> str:
    return f"{que} solo cubre EE. UU. contiguos (lon {cropscape.CONUS['lon'][0]} a {cropscape.CONUS['lon'][1]}, lat {cropscape.CONUS['lat'][0]} a {cropscape.CONUS['lat'][1]}); este punto queda fuera."


async def _anio(sem, x, y, anio):
    clave = f"cdl_v1_{x:.1f}_{y:.1f}_{anio}"
    guardado = cache.leer(clave)
    if guardado:  # un anio publicado de CDL no cambia
        return guardado[0]
    async with sem:
        try:
            async with http.crear_cliente(30) as c:
                r = await cropscape.valor(c, x, y, anio)
        except http.ErrorFuente as e:
            return str(e)[:160]
    cache.escribir(clave, r)
    return r


async def cdl(lon: float, lat: float, desde: int, hasta: int) -> dict:
    hoy = date.today().isoformat()
    base = {"meta": servicios._meta(), "aviso": AVISO_CDL, "coordenada": (lon, lat), "anioDesde": desde, "anioHasta": hasta, "limites": LIMITES_CDL,
            "fuente": {"nombre": cropscape.NOMBRE, "url": cropscape.URL_PORTAL, "cita": CITA_CDL.format(anios=f"{desde}-{hasta}", hoy=hoy),
                       "coordenada": (lon, lat), "periodo": {"desde": date(desde, 1, 1), "hasta": date(hasta, 12, 31)}, "consultado": hoy,
                       "resolucion": cropscape.RESOLUCION, "unidades": "categoria de cultivo de CDL (codigo y nombre de la leyenda de USDA NASS)",
                       "nota": "Servicio GetCDLValue en EPSG:5070. La categoria y su codigo se entregan tal cual; solo se enlaza al catalogo de AgroHive cuando el nombre coincide exacto (Corn, Dry Beans, Squash, Peppers)."}}
    if not cropscape.en_cobertura(lon, lat):
        return {**base, "estado": "NO_EVALUABLE", "motivo": _fuera("CDL"), "anios": [], "advertencias": []}
    x, y = cropscape.a_albers(lon, lat)
    sem = asyncio.Semaphore(CONCURRENCIA_CDL)
    anios = list(range(desde, hasta + 1))
    res = await asyncio.gather(*[_anio(sem, x, y, a) for a in anios])
    fallidos = [a for a, r in zip(anios, res) if isinstance(r, str)]
    if len(fallidos) == len(anios):
        raise servicios.SinDatos(f"CropScape (USDA NASS) no respondio: {res[0]}")
    serie = []
    for a, r in zip(anios, res):
        if isinstance(r, str):
            serie.append({"anio": a, "codigo": None, "categoria": None, "cultivoCatalogo": None, "estado": "ERROR_DATOS", "motivo": "CropScape no respondio para este anio"})
        elif r["codigo"] is None:
            serie.append({"anio": a, "codigo": None, "categoria": None, "cultivoCatalogo": None, "estado": "NO_EVALUABLE", "motivo": r["motivo"]})
        else:
            serie.append({"anio": a, "codigo": r["codigo"], "categoria": r["categoria"], "cultivoCatalogo": cropscape.CATALOGO.get(r["categoria"]), "estado": "EVALUABLE", "motivo": None})
    adv = [{"codigo": "CDL_CLASIFICACION", "mensaje": "CDL es una clasificacion supervisada de imagenes de satelite: cada anio puede tener pixeles mal clasificados. USDA NASS publica su exactitud por estado y cultivo; aqui no se incluye.", "severidad": "info"}]
    if fallidos:
        adv.append({"codigo": "CDL_ANIOS_SIN_LEER", "mensaje": f"No se pudieron leer {len(fallidos)} anio(s) ({', '.join(map(str, fallidos[:6]))}); salen con ERROR_DATOS y no se rellenan.", "severidad": "aviso"})
    con_dato = [s for s in serie if s["estado"] == "EVALUABLE"]
    out = {**base, "estado": "EVALUABLE" if con_dato else "NO_EVALUABLE", "anios": serie, "advertencias": adv}
    if not con_dato:
        out["motivo"] = "CDL no clasifica este punto en ningun anio del periodo."
    return out


def _num(v):
    return None if v in (None, "") else float(v)


def agua_disponible(horizontes: list[dict], hasta_cm: int = PROFUNDIDAD_TAW_CM) -> tuple[float | None, int]:
    """Agua disponible total en mm hasta `hasta_cm`: suma de awc (cm/cm) x espesor (cm) x 10 de los horizontes que la traen.
    Devuelve (mm, cm cubiertos con dato). Un horizonte sin awc no se rellena: baja la profundidad cubierta."""
    mm, cubierto = 0.0, 0
    for h in horizontes:
        a, b, awc = h["profundidadCm"]["desde"], min(h["profundidadCm"]["hasta"], hasta_cm), h["awcCmCm"]
        if awc is None or b <= a:
            continue
        mm += awc * (b - a) * 10
        cubierto += b - a
    return (round(mm, 1) if cubierto else None), cubierto


async def ssurgo(lon: float, lat: float) -> dict:
    hoy = date.today().isoformat()
    base = {"meta": servicios._meta(), "aviso": AVISO_SSURGO, "coordenada": (lon, lat), "limites": LIMITES_SSURGO,
            "fuente": {"nombre": sda.NOMBRE, "url": sda.URL_PORTAL, "cita": sda.CITA, "coordenada": (lon, lat), "consultado": hoy,
                       "resolucion": "poligono de la unidad cartografica (escala del levantamiento, por lo comun 1:12 000 a 1:24 000)",
                       "unidades": "arena, limo, arcilla y materia organica en %; awc en cm/cm; agua disponible en mm",
                       "nota": "Valores representativos (_r) del componente con mayor porcentaje de la unidad. Agua disponible = suma de awc_r x espesor hasta 100 cm."}}
    if not cropscape.en_cobertura(lon, lat):
        return {**base, "estado": "NO_EVALUABLE", "motivo": _fuera("SSURGO (en esta API)"), "horizontes": [], "advertencias": []}
    clave = f"ssurgo_v1_{lat:.5f}_{lon:.5f}"
    guardado = cache.leer(clave)
    if guardado:
        filas = guardado[0]
    else:
        try:
            async with http.crear_cliente(40) as c:
                filas = await sda.componente_dominante(c, lon, lat)
        except http.ErrorFuente as e:
            raise servicios.SinDatos(f"Soil Data Access (USDA NRCS) no respondio: {str(e)[:160]}") from e
        cache.escribir(clave, filas)
    if not filas:
        return {**base, "estado": "NO_EVALUABLE", "motivo": "SSURGO no tiene suelo cartografiado en este punto (agua, zona sin levantamiento o fuera de cobertura).", "horizontes": [], "advertencias": []}
    f0 = filas[0]
    horizontes = [{"nombre": f["hzname"] or None, "profundidadCm": {"desde": int(float(f["hzdept_r"])), "hasta": int(float(f["hzdepb_r"]))},
                   "arenaPct": _num(f["sandtotal_r"]), "limoPct": _num(f["silttotal_r"]), "arcillaPct": _num(f["claytotal_r"]),
                   "materiaOrganicaPct": _num(f["om_r"]), "awcCmCm": _num(f["awc_r"])} for f in filas]
    mm, cubierto = agua_disponible(horizontes)
    adv = []
    estado_agua = "EVALUABLE" if cubierto >= PROFUNDIDAD_TAW_CM else ("EXPLORATORIO" if mm is not None else "NO_EVALUABLE")
    agua = {"estado": estado_agua, "tawMm": mm, "profundidadCubiertaCm": cubierto, "hastaCm": PROFUNDIDAD_TAW_CM,
            "metodo": "suma de awc_r (cm/cm) x espesor del horizonte (cm) x 10, hasta 100 cm"}
    if estado_agua != "EVALUABLE":
        adv.append({"codigo": "SSURGO_AGUA_INCOMPLETA", "mensaje": f"Solo {cubierto} de {PROFUNDIDAD_TAW_CM} cm traen awc (perfil somero o horizontes sin dato); el agua disponible cubre solo esa profundidad y no se extrapola.", "severidad": "aviso"})
    return {**base, "estado": "EVALUABLE", "unidad": {"mukey": f0["mukey"], "nombre": f0["muname"]},
            "componente": {"nombre": f0["compname"], "porcentaje": _num(f0["comppct_r"]), "grupoHidrologico": f0["hydgrp"] or None},
            "horizontes": horizontes, "agua": agua, "advertencias": adv}
