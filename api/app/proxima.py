"""Capa 'proxima temporada (aproximada)' (A2.13): rango por mes, nunca una cifra.

Metodo principal (anomalia_estacional): para cada mes del pronostico estacional se toma la distribucion historica de ese
mes (los 20 anios de POWER) y se desplaza por la anomalia de SEAS5; la banda son los percentiles p10 y p90 de esa
distribucion desplazada. El ANCHO de la banda sale de la variabilidad historica, no de la dispersion del ensamble
(las variables verificadas del servicio no la entregan). Respaldo (respaldo_estadistico): los mismos percentiles sin desplazar.
No incluye tendencia: se declara en una advertencia en vez de estimarla sin base.
"""
import calendar
import math
import statistics
from datetime import date

from . import cache, http, servicios
from .clientes import openmeteo

P_INF, P_SUP = 10.0, 90.0
HORIZONTE_MESES = 6  # V-21, decidido el 14/11: se habla en semestres aunque SEAS5 de 7 meses
MIN_ANIOS = 10
VENTANA = servicios.VENTANA_ESTANDAR  # la misma serie que usa el motor: una sola consulta y una sola cache
TTL_ESTACIONAL_S = 24 * 3600
AVISO = "Rango aproximado, no es una prediccion de la proxima temporada. Muestra lo plausible segun el historico y la tendencia del pronostico estacional."


def percentil(valores: list[float], p: float) -> float:
    v = sorted(valores)
    k = (len(v) - 1) * p / 100.0
    f, c = math.floor(k), min(math.floor(k) + 1, len(v) - 1)
    return v[f] + (v[c] - v[f]) * (k - f)


def climatologia_mensual(dias: list[dict]) -> dict[int, dict[str, list[float]]]:
    """Por mes calendario: lluvia total y temperatura media de cada anio con el mes completo (sin faltantes)."""
    grupos: dict[tuple[int, int], list[dict]] = {}
    for d in dias:
        f = date.fromisoformat(d["fecha"]) if isinstance(d["fecha"], str) else d["fecha"]
        grupos.setdefault((f.year, f.month), []).append(d)
    salida: dict[int, dict[str, list[float]]] = {m: {"lluvia": [], "temp": []} for m in range(1, 13)}
    for (anio, mes), ds in grupos.items():
        if len(ds) != calendar.monthrange(anio, mes)[1]:
            continue
        if all(d["lluviaMm"] is not None for d in ds):
            salida[mes]["lluvia"].append(sum(d["lluviaMm"] for d in ds))
        if all(d.get("tMediaC") is not None for d in ds):
            salida[mes]["temp"].append(statistics.fmean(d["tMediaC"] for d in ds))
    return salida


def _rango(valores: list[float], desplazamiento: float | None, minimo: float | None = None) -> dict:
    if len(valores) < MIN_ANIOS or desplazamiento is None:
        return {"inferior": None, "superior": None}
    ajustados = [v + desplazamiento if minimo is None else max(minimo, v + desplazamiento) for v in valores]
    return {"inferior": round(percentil(ajustados, P_INF), 1), "superior": round(percentil(ajustados, P_SUP), 1)}


def construir_meses(clim: dict, anomalias: dict[str, dict] | None, meses: list[str]) -> list[dict]:
    salida = []
    for mes in meses:
        c = clim[int(mes[5:7])]
        a = (anomalias or {}).get(mes)
        desp_ll = 0.0 if anomalias is None else (a["lluviaMm"] if a else None)
        desp_t = 0.0 if anomalias is None else (a["tMediaC"] if a else None)
        salida.append({
            "mes": mes,
            "lluviaMm": _rango(c["lluvia"], desp_ll, minimo=0.0),
            "tMediaC": _rango(c["temp"], desp_t),
            "climatologiaLluviaMm": round(statistics.median(c["lluvia"]), 1) if len(c["lluvia"]) >= MIN_ANIOS else None,
            "climatologiaTMediaC": round(statistics.median(c["temp"]), 1) if len(c["temp"]) >= MIN_ANIOS else None,
        })
    return salida


def _siguientes_meses(hoy: date, n: int) -> list[str]:
    return [f"{hoy.year + (hoy.month - 1 + k) // 12}-{(hoy.month - 1 + k) % 12 + 1:02d}" for k in range(n)]


async def proxima_temporada(lat: float, lon: float) -> dict:
    hoy = date.today()
    serie = await servicios.serie_clima(lat, lon, *VENTANA)  # puede lanzar SinDatos
    clim = climatologia_mensual(serie["diario"])
    advertencias = [{"codigo": "SIN_TENDENCIA", "mensaje": "El rango no incluye la tendencia del clima: usa los 20 anios historicos como si fueran estables.", "severidad": "info"}]
    if serie["estado"] != "EVALUABLE":
        advertencias.append({"codigo": "CLIMATOLOGIA_DE_RESPALDO", "mensaje": "La climatologia viene de una fuente de respaldo (ver el estado del clima).", "severidad": "aviso"})
    fuentes = [{**serie["fuente"], "nota": f"Climatologia mensual {VENTANA[0].year} a {VENTANA[1].year}: distribucion historica de cada mes."}]

    anomalias, consultado_est = None, hoy
    clave = f"estacional_{round(lat / 0.5)}_{round(lon / 0.5)}"
    en_cache = cache.leer(clave)
    if en_cache and not (isinstance(en_cache[0], dict) and "anomalias" in en_cache[0]):
        en_cache = None  # formato anterior: se ignora
    if en_cache and en_cache[1] < TTL_ESTACIONAL_S:
        anomalias, consultado_est = en_cache[0]["anomalias"], date.fromisoformat(en_cache[0]["consultado"])
    else:
        try:
            async with http.crear_cliente() as c:
                anomalias = await openmeteo.estacional(c, lat, lon)
            cache.escribir(clave, {"consultado": hoy.isoformat(), "anomalias": anomalias})
        except http.ErrorFuente as e:
            if en_cache:
                anomalias, consultado_est = en_cache[0]["anomalias"], date.fromisoformat(en_cache[0]["consultado"])
                advertencias.append({"codigo": "ESTACIONAL_EN_CACHE", "mensaje": f"El pronostico estacional no respondio; se usa el guardado el {consultado_est.isoformat()}.", "severidad": "aviso"})
            else:
                advertencias.append({"codigo": "ESTACIONAL_NO_DISPONIBLE", "mensaje": f"El pronostico estacional no respondio ({e}); se muestra solo el rango historico.", "severidad": "aviso"})

    if anomalias:
        meses = sorted(anomalias)[:HORIZONTE_MESES]
        metodo = "anomalia_estacional"
        fuentes.append({"nombre": openmeteo.NOMBRE_ESTACIONAL, "url": openmeteo.URL_ESTACIONAL, "consultado": consultado_est.isoformat(), "resolucion": "36 km",
                        "unidades": "mm (lluvia), K (temperatura)",
                        "nota": "Anomalia mensual de SEAS5 respecto de la climatologia de ECMWF, aplicada a la climatologia historica de otra fuente. Sin correccion de sesgo. Atribucion: datos y productos de ECMWF."})
        if meses[0] == f"{hoy.year}-{hoy.month:02d}":
            advertencias.append({"codigo": "MES_EN_CURSO", "mensaje": "El primer mes ya esta en curso; la banda cubre el mes completo, no lo que falta.", "severidad": "info"})
        advertencias.append({"codigo": "ANCHO_DE_BANDA_HISTORICO", "mensaje": "El ancho de la banda sale de la variabilidad historica de cada mes, no de la dispersion del pronostico.", "severidad": "info"})
        advertencias.append({"codigo": "ANOMALIA_SOBRE_OTRA_CLIMATOLOGIA", "mensaje": "La anomalia es respecto de ECMWF y se suma a la climatologia de NASA POWER; las dos no coinciden en magnitud.", "severidad": "info"})
    else:
        meses = _siguientes_meses(hoy, HORIZONTE_MESES)
        metodo = "respaldo_estadistico"
    return {
        "meta": servicios._meta(), "esPrediccion": False, "estado": "EXPLORATORIO", "aviso": AVISO, "metodo": metodo,
        "coordenada": (lon, lat), "emitido": consultado_est, "horizonteMeses": HORIZONTE_MESES,
        "climatologia": {"desde": VENTANA[0], "hasta": VENTANA[1]},
        "banda": {"percentilInferior": P_INF, "percentilSuperior": P_SUP},
        "fuentes": fuentes, "meses": construir_meses(clim, anomalias, meses), "advertencias": advertencias,
    }
