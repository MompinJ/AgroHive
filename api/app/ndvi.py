"""GET /api/ndvi (A4.11): NDVI de MODIS por punto como EVIDENCIA de los anios de escenario. No entra al ranking ni al balance."""
import asyncio
from datetime import date, datetime, timezone

from . import cache, http, servicios
from .clientes import ornl

LIMITES = ["PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"]
AVISO = ("NDVI de un pixel de 250 m (mayor que la parcela de 2 ha): muestra el verdor de la zona, no el cultivo del usuario, "
         "y no entra al ranking ni al balance de agua.")
CONCURRENCIA = 2  # el servicio de ORNL falla con 502 y 503 si se le exige mucho


async def _una(sem: asyncio.Semaphore, lat: float, lon: float, ini: date, fin: date):
    """Una ventana con cache. Devuelve (datos, escala, calidad_ok) o el mensaje de error."""
    clave = f"ndvi_v1_{lat:.5f}_{lon:.5f}_{ini:%Y%m%d}_{fin:%Y%m%d}"  # por punto exacto: dos puntos cercanos pueden caer en pixeles distintos
    guardado = cache.leer(clave)
    if guardado and servicios._vigente(guardado[1], fin):
        r = guardado[0]
        return r["datos"], r["escala"], r["calidadOk"], r["consultado"]
    async with sem:
        try:
            async with http.crear_cliente(ornl.TIEMPO_LIMITE_S) as c:
                datos, escala, calidad_ok = await ornl.ventana(c, lat, lon, ini, fin)
        except http.ErrorFuente as e:
            if guardado:  # vencida pero es lo ultimo que hubo: se usa y se dice
                r = guardado[0]
                return r["datos"], r["escala"], r["calidadOk"], r["consultado"]
            return str(e)[:160]
    consultado = date.today().isoformat()
    if calidad_ok:  # una ventana sin calidad no se fija en cache: se vuelve a pedir
        cache.escribir(clave, {"consultado": consultado, "datos": datos, "escala": escala, "calidadOk": True})
    return datos, escala, calidad_ok, consultado


async def serie(lon: float, lat: float, desde: date, hasta: date) -> dict:
    """Serie de NDVI en [desde, hasta]. Lanza servicios.SinDatos si ninguna ventana se pudo leer."""
    sem = asyncio.Semaphore(CONCURRENCIA)
    tramos = ornl.ventanas(desde, hasta)
    resultados = await asyncio.gather(*[_una(sem, lat, lon, a, b) for a, b in tramos])
    datos, escalas, sin_leer, sin_calidad, consultas = [], set(), [], [], []
    for (a, b), r in zip(tramos, resultados):
        if isinstance(r, str):
            sin_leer.append((a, b, r))
            continue
        d, escala, calidad_ok, consultado = r
        escalas.add(escala)
        consultas.append(consultado)
        if not calidad_ok:
            sin_calidad.append((a, b))
        datos.extend(d)
    if not datos:
        raise servicios.SinDatos(f"MODIS (ORNL DAAC) no respondio: {sin_leer[0][2] if sin_leer else 'sin datos'}")
    visto = set()
    serie_ = []
    for d in sorted(datos, key=lambda x: x["fecha"]):  # las ventanas alineadas no se solapan, pero por si acaso
        if d["fecha"] in visto or not (desde.isoformat() <= d["fecha"] <= hasta.isoformat()):
            continue
        visto.add(d["fecha"])
        serie_.append(d)
    adv = [{"codigo": "NDVI_EVIDENCIA", "mensaje": "El NDVI es evidencia de los anios de escenario: no hay relacion publicada entre NDVI y los pilares del motor, asi que no entra al ranking.", "severidad": "info"}]
    if sin_leer:
        rangos = "; ".join(f"{a} a {b}" for a, b, _ in sin_leer)
        adv.append({"codigo": "NDVI_TRAMOS_SIN_LEER", "mensaje": f"No se pudieron leer estos tramos de MODIS ({rangos}); faltan en la serie y no se rellenan.", "severidad": "aviso"})
    if sin_calidad:
        adv.append({"codigo": "NDVI_CALIDAD_NO_DISPONIBLE", "mensaje": "En algunos tramos no se pudo leer la bandera de calidad del pixel; esos dias salen sin ella.", "severidad": "info"})
    con_dato = [d for d in serie_ if d["ndvi"] is not None]
    escala = escalas.pop() if len(escalas) == 1 else 0.0001
    if len(escalas) > 1:  # no deberia pasar: es la misma banda
        raise servicios.SinDatos("ORNL devolvio escalas distintas para la misma banda")
    out = {
        "meta": servicios._meta(),
        "estado": "EXPLORATORIO" if con_dato else "NO_EVALUABLE",
        "aviso": AVISO, "coordenada": (lon, lat), "periodo": {"desde": desde, "hasta": hasta},
        "producto": {"nombre": ornl.PRODUCTO, "banda": ornl.BANDA_NDVI, "pixelM": 250, "compuestoDias": 16, "escala": escala},
        "fuente": {"nombre": ornl.NOMBRE, "url": ornl.URL_SERVICIO, "cita": ornl.CITA, "coordenada": (lon, lat), "periodo": {"desde": desde, "hasta": hasta},
                   "unidades": "NDVI (adimensional); calidad: rango 0 a 3", "consultado": max(consultas), "resolucion": ornl.RESOLUCION,
                   "nota": "Un pixel de 250 m. La calidad (pixel reliability) se entrega tal cual, sin interpretarla. Valor de relleno -3000 y -1 convertidos a null."},
        "limites": LIMITES, "serie": serie_, "advertencias": adv,
    }
    if not con_dato:
        out["motivo"] = "Ningun compuesto del periodo trae NDVI valido en este punto."
    return out
