from datetime import date

from fastapi import APIRouter, HTTPException, Query

from .. import config, http, servicios
from ..modelos import ErrorDatos, SerieClima

router = APIRouter(prefix="/api", tags=["clima"])
LIMITE_ANIOS = 30


@router.get("/clima", response_model=SerieClima, responses={503: {"model": ErrorDatos}})
async def clima(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    desde: date = Query(description="Primer dia, desde 1981-01-01 (limite de NASA POWER)"),
    hasta: date = Query(description="Ultimo dia; no puede ser futuro"),
):
    """Serie diaria de NASA POWER con cache; respaldo Open-Meteo (estado RESPALDO_HISTORICO)."""
    if desde < date(1981, 1, 1) or hasta < desde or hasta > config.hoy():
        raise HTTPException(422, "Periodo invalido: desde >= 1981-01-01, desde <= hasta y hasta no futuro")
    if (hasta - desde).days > LIMITE_ANIOS * 366:
        raise HTTPException(422, f"Periodo mayor a {LIMITE_ANIOS} anios")
    with http.plazo():  # H-B6: POWER -> Open-Meteo -> cache dentro de los 90 s del front
        return await servicios.serie_clima(lat, lon, desde, hasta)
