from fastapi import APIRouter, HTTPException, Query

from .. import http, servicios
from ..modelos import ErrorDatos, Suelo

router = APIRouter(prefix="/api", tags=["suelo"])


@router.get("/suelo", response_model=Suelo, response_model_exclude_none=True, responses={503: {"model": ErrorDatos}})
async def suelo(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Textura y pH estimados de la zona (SoilGrids). Siempre SUPUESTO. Si no hay dato, 503: el front usa el selector manual."""
    with http.plazo():  # H-B6
        return await servicios.suelo(lat, lon)
