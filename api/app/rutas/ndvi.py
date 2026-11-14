"""GET /api/ndvi: NDVI de MODIS MOD13Q1 (250 m, 16 dias) por punto, como evidencia de los anios de escenario (A4.11). No entra al ranking."""
from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from .. import cache, servicios
from ..clientes import modis
from ..modelos import Advertencia, ErrorDatos, Fuente, Periodo
from ..modelos_ndvi import DatoNdvi, Ndvi, ProductoNdvi

router = APIRouter(prefix="/api", tags=["ndvi"])

MAX_DIAS = 400  # un anio agricola: 23 compuestos; el servicio de ORNL tarda unos 8 a 13 s por compuesto y banda (no es para consultas en vivo largas)
AVISO = ("NDVI de un satelite (MODIS Terra) en un pixel de 250 m: es mayor que la parcela y no muestra el cultivo del usuario. "
         "Sirve para ver que los anios de escenario fueron anios reales; no entra al ranking ni cambia el balance de agua.")
LIMITES = ["PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"]


async def serie(lat: float, lon: float, desde: date, hasta: date) -> Ndvi:
    clave = f"ndvi_v1_{lat:.4f}_{lon:.4f}_{desde:%Y%m%d}_{hasta:%Y%m%d}"
    guardado = cache.leer(clave)
    if guardado and servicios._vigente(guardado[1], hasta):
        registro = guardado[0]
    else:
        dias, pixel = await modis.serie(lat, lon, desde, hasta)
        if pixel is None or (dias and all(d.get("error") for d in dias)):
            if guardado:
                registro = guardado[0]
            else:
                motivo = dias[0]["motivo"] if dias else "el rango no contiene ningun compuesto de 16 dias"
                raise servicios.SinDatos(f"MODIS NDVI no respondio: {motivo}")
        else:
            registro = {"consultado": date.today().isoformat(), "dias": dias, "pixel": pixel}
            if not any(d.get("error") for d in dias):  # una serie con huecos de red no se guarda: se vuelve a pedir
                cache.escribir(clave, registro)
    datos = [DatoNdvi(fecha=d["fecha"], ndvi=d["ndvi"], estado="ERROR_DATOS" if d.get("error") else ("EVALUABLE" if d["ndvi"] is not None else "NO_EVALUABLE"),
                      motivo=d["motivo"], calidad=d.get("calidad")) for d in registro["dias"]]
    hay = any(d.estado == "EVALUABLE" for d in datos)
    centro = modis.centro_pixel(registro["pixel"])
    advertencias = [Advertencia(codigo="NDVI_EVIDENCIA", mensaje="Evidencia visual de los anios de escenario; no entra al ranking.", severidad="info"),
                    Advertencia(codigo="RESOLUCION_GRUESA", mensaje="Pixel de 250 m (unas 5 a 6 ha): mayor que la parcela de 2 ha.", severidad="aviso")]
    if any(d.estado == "ERROR_DATOS" for d in datos):
        advertencias.append(Advertencia(codigo="DIAS_SIN_LEER", mensaje="El servicio de ORNL fallo para algunos compuestos; aparecen con estado ERROR_DATOS.", severidad="aviso"))
    return Ndvi(
        meta=servicios._meta(), estado="EVALUABLE" if hay else "NO_EVALUABLE",
        motivo=None if hay else "ningun compuesto del rango trae un NDVI valido", aviso=AVISO, coordenada=(lon, lat),
        periodo=Periodo(desde=desde, hasta=hasta),
        producto=ProductoNdvi(nombre="MOD13Q1", banda=modis.BANDA, pixelM=modis.PIXEL_M, compuestoDias=modis.COMPUESTO_DIAS, escala=registro["pixel"]["escala"]),
        fuente=Fuente(nombre=modis.NOMBRE, url=modis.DOCUMENTACION, cita=modis.CITA, coordenada=centro, periodo=Periodo(desde=desde, hasta=hasta),
                      unidades=modis.UNIDADES, consultado=date.fromisoformat(registro["consultado"]), resolucion=modis.RESOLUCION,
                      nota=("Servicio REST de ORNL DAAC, sin cuenta. El NDVI ya viene multiplicado por la escala del producto; el relleno queda en null, nunca en 0. "
                            "calidad es la confiabilidad del pixel (pixel reliability, rango 0 a 3) tal cual la entrega el producto, sin interpretarla: VERIFICAR su lectura en la guia de MOD13 antes de filtrar por ella.")),
        limites=LIMITES, serie=datos, advertencias=advertencias)


@router.get("/ndvi", response_model=Ndvi, responses={503: {"model": ErrorDatos}, 422: {"description": "Rango invalido"}})
async def ndvi(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180), desde: date = Query(), hasta: date = Query()):
    """NDVI por compuesto de 16 dias en el pixel del punto. Maximo 400 dias por consulta (el servicio es lento: usar el paquete de demo o la cache); sin cuenta de Earthdata."""
    if hasta < desde:
        raise HTTPException(status_code=422, detail="hasta debe ser igual o posterior a desde")
    if (hasta - desde).days + 1 > MAX_DIAS:
        raise HTTPException(status_code=422, detail=f"maximo {MAX_DIAS} dias por consulta")
    if hasta > datetime.now(timezone.utc).date():
        raise HTTPException(status_code=422, detail="hasta no puede ser una fecha futura")
    return await serie(lat, lon, desde, hasta)
