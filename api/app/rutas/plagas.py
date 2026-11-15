from fastapi import APIRouter, Query

from .. import plagas
from ..modelos import ErrorDatos
from ..modelos_plagas import Plagas

router = APIRouter(prefix="/api", tags=["plagas"])


@router.get("/plagas", response_model=Plagas, responses={503: {"model": ErrorDatos}})
async def obtener_plagas(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Plagas de la tabla datos/plagas/plagas.json con registros de presencia en GBIF alrededor del punto (caja de 1.5 grados, desde 2000).
    **Evidencia**: un registro no es un pronostico de dano; cero registros no prueba ausencia. No entra al motor ni al ranking."""
    return await plagas.plagas(lon, lat)
