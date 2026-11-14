from fastapi import APIRouter, HTTPException, Query

from .. import proxima, servicios
from ..modelos import ErrorDatos, ProximaTemporada

router = APIRouter(prefix="/api", tags=["proxima-temporada"])


@router.get("/proxima-temporada", response_model=ProximaTemporada, responses={503: {"model": ErrorDatos}})
async def proxima_temporada(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Rango aproximado por mes (banda p10 a p90). No es una prediccion y no trae cifra unica."""
    return await proxima.proxima_temporada(lat, lon)
