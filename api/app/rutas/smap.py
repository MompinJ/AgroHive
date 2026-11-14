"""GET /api/smap: humedad del suelo SMAP (36 km) por dia, como contraste del motor (A4.8). No entra al ranking."""
import asyncio
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Query

from .. import cache, http, servicios
from ..clientes import earthdata
from ..modelos import Advertencia, ErrorDatos, Fuente, Periodo
from ..modelos_smap import DiaSmap, PaseSmap, Smap, CeldaSmap

router = APIRouter(prefix="/api", tags=["smap"])

MAX_DIAS = 10  # cada dia cuesta unos 20 s de lectura por rangos; las pruebas con cache previa no pagan eso
LATENCIA_DIAS = 3  # SMAP publica el granulo unos dias despues de la observacion
CACHEAR_DESDE_DIAS = 10  # un dia sin granulo solo se recuerda si ya es antiguo (puede publicarse con retraso)
CONCURRENCIA = 3
AVISO = ("Humedad del suelo superficial (unos 5 cm) de un satelite, promediada en una celda de 36 km: sirve de contraste "
         "con la humedad de raiz del motor, no es una medicion de la parcela ni entra al ranking.")


def _meta() -> dict:
    return servicios._meta()


def _dia_desde(fecha: date, datos: dict | None) -> DiaSmap:
    if datos is None:
        return DiaSmap(fecha=fecha, estado="NO_EVALUABLE", motivo="SMAP no tiene granulo para ese dia en la celda (hueco de orbita o aun no publicado)")
    pases = [PaseSmap(**p) for p in datos["pases"]]
    validos = [p.humedadM3M3 for p in pases if p.humedadM3M3 is not None]
    if not validos:
        return DiaSmap(fecha=fecha, estado="NO_EVALUABLE", granulo=datos["granulo"], pases=pases,
                       motivo="ningun pase trae humedad valida en la celda ese dia (fuera de rango, congelado o sin recuperacion)")
    return DiaSmap(fecha=fecha, estado="EVALUABLE", granulo=datos["granulo"], pases=pases, humedadM3M3=round(sum(validos) / len(validos), 4))


async def _un_dia(sem: asyncio.Semaphore, lon: float, lat: float, sitio: tuple[int, int], fecha: date) -> DiaSmap:
    clave = f"smap36_{sitio[0]}_{sitio[1]}_{fecha.isoformat()}"
    guardado = cache.leer(clave)
    if guardado is not None:
        return _dia_desde(fecha, guardado[0] or None)
    async with sem:
        try:
            datos = await earthdata.humedad_dia(lon, lat, fecha)
        except earthdata.SinToken:
            raise
        except http.ErrorFuente as e:
            return DiaSmap(fecha=fecha, estado="ERROR_DATOS", motivo=str(e)[:200])
    if datos is not None or fecha <= datetime.now(timezone.utc).date() - timedelta(days=CACHEAR_DESDE_DIAS):
        cache.escribir(clave, datos or {})
    return _dia_desde(fecha, datos)


async def serie(lon: float, lat: float, desde: date, hasta: date) -> Smap:
    sitio = earthdata.celda(lon, lat)
    if sitio is None:
        raise HTTPException(status_code=422, detail="El punto cae fuera de la rejilla global de SMAP")
    sem = asyncio.Semaphore(CONCURRENCIA)
    try:
        dias = await asyncio.gather(*[_un_dia(sem, lon, lat, sitio, desde + timedelta(days=i)) for i in range((hasta - desde).days + 1)])
    except earthdata.SinToken as e:
        raise servicios.SinDatos(f"SMAP no disponible: {e}") from e
    if all(d.estado == "ERROR_DATOS" for d in dias):
        raise servicios.SinDatos(f"SMAP no respondio: {dias[0].motivo}")
    centro = earthdata.centro(*sitio)
    advertencias = [Advertencia(codigo="RESOLUCION_GRUESA", mensaje="Celda de 36 km: una parcela cabe entera dentro de una sola celda y no se distinguen zonas.", severidad="aviso"),
                    Advertencia(codigo="SMAP_CONTRASTE", mensaje="Solo contraste con el motor; no es una medicion de la parcela y no entra al ranking.", severidad="info")]
    if any(d.estado == "ERROR_DATOS" for d in dias):
        advertencias.append(Advertencia(codigo="DIAS_SIN_LEER", mensaje="Algunos dias no se pudieron leer; aparecen con estado ERROR_DATOS.", severidad="aviso"))
    return Smap(
        meta=_meta(), estado="EVALUABLE" if any(d.estado == "EVALUABLE" for d in dias) else "NO_EVALUABLE", etiqueta="SUPUESTO", aviso=AVISO,
        coordenada=(lon, lat), celda=CeldaSmap(fila=sitio[0], columna=sitio[1], centro=centro),
        fuente=Fuente(nombre=earthdata.NOMBRE, url=earthdata.URL, coordenada=centro, periodo=Periodo(desde=desde, hasta=hasta),
                      unidades=earthdata.UNIDADES, consultado=datetime.now(timezone.utc).date(), resolucion=earthdata.RESOLUCION,
                      nota="Valor por pase (AM y PM) del algoritmo DCA; la bandera de calidad se entrega tal cual, sin interpretarla."),
        dias=list(dias), advertencias=advertencias)


@router.get("/smap", response_model=Smap, responses={503: {"model": ErrorDatos}, 422: {"description": "Rango o punto invalido"}})
async def smap(lon: float = Query(ge=-180, le=180), lat: float = Query(ge=-90, le=90), desde: date = Query(), hasta: date = Query()):
    """Humedad del suelo SMAP L3 (36 km) por dia. Maximo 10 dias, hasta 3 dias antes de hoy. Sin token de Earthdata responde 503 con motivo."""
    if hasta < desde:
        raise HTTPException(status_code=422, detail="hasta debe ser igual o posterior a desde")
    if (hasta - desde).days + 1 > MAX_DIAS:
        raise HTTPException(status_code=422, detail=f"maximo {MAX_DIAS} dias por consulta")
    if hasta > datetime.now(timezone.utc).date() - timedelta(days=LATENCIA_DIAS):
        raise HTTPException(status_code=422, detail=f"SMAP publica con unos {LATENCIA_DIAS} dias de retraso: pide una fecha anterior")
    return await serie(lon, lat, desde, hasta)
