from datetime import date

from fastapi import APIRouter, HTTPException, Query

from .. import regional
from ..clientes import cropscape
from ..modelos import ErrorDatos
from ..modelos_regional import Cdl, Ssurgo

router = APIRouter(prefix="/api/ee-uu", tags=["regional EE. UU."])


@router.get("/cdl", response_model=Cdl, responses={503: {"model": ErrorDatos}, 422: {"description": "Anios invalidos"}})
async def obtener_cdl(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180),
                      desde: int = Query(default=cropscape.ANIO_MIN, ge=cropscape.ANIO_MIN, le=cropscape.ANIO_MAX),
                      hasta: int = Query(default=cropscape.ANIO_MAX, ge=cropscape.ANIO_MIN, le=cropscape.ANIO_MAX)):
    """Rotacion real por anio (USDA NASS CDL, 30 m) en el punto. Solo EE. UU. contiguos; fuera de ahi, NO_EVALUABLE. **Contraste**: no entra al ranking."""
    if hasta < desde:
        raise HTTPException(status_code=422, detail="hasta debe ser igual o posterior a desde")
    return await regional.cdl(lon, lat, desde, hasta)


@router.get("/ssurgo", response_model=Ssurgo, responses={503: {"model": ErrorDatos}})
async def obtener_ssurgo(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Suelo de campo de USDA (SSURGO, componente dominante) en el punto. Solo EE. UU. contiguos; fuera de ahi, NO_EVALUABLE. **Contraste**."""
    return await regional.ssurgo(lon, lat)
