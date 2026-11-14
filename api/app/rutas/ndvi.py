from datetime import date

from fastapi import APIRouter, HTTPException, Query

from .. import ndvi
from ..modelos import ErrorDatos
from ..modelos_ndvi import Ndvi

router = APIRouter(prefix="/api", tags=["ndvi"])
MAX_DIAS = 400  # unas 3 ventanas (6 llamadas a ORNL); un anio agricola cabe


@router.get("/ndvi", response_model=Ndvi, responses={503: {"model": ErrorDatos}, 422: {"description": "Periodo invalido"}})
async def obtener_ndvi(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180), desde: date = Query(), hasta: date = Query()):
    """NDVI de MODIS MOD13Q1 (250 m, 16 dias) en el punto, de ORNL DAAC. **Evidencia**: no entra al ranking. Maximo 400 dias por consulta."""
    if hasta < desde:
        raise HTTPException(status_code=422, detail="hasta debe ser igual o posterior a desde")
    if hasta > date.today():
        raise HTTPException(status_code=422, detail="hasta no puede ser una fecha futura")
    if (hasta - desde).days + 1 > MAX_DIAS:
        raise HTTPException(status_code=422, detail=f"maximo {MAX_DIAS} dias por consulta")
    return await ndvi.serie(lon, lat, desde, hasta)
