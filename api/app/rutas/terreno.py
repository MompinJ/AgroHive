from fastapi import APIRouter, HTTPException

from .. import http, servicios
from ..modelos import ErrorDatos, TerrenoEntrada, TerrenoRespuesta

router = APIRouter(prefix="/api", tags=["terreno"])


@router.post("/elevacion", response_model=TerrenoRespuesta, responses={503: {"model": ErrorDatos}})
async def elevacion(entrada: TerrenoEntrada):
    """Elevacion y pendiente por celda para una cuadricula ya generada por el front (tope 1600 celdas)."""
    with http.plazo():  # H-B6
        return await servicios.terreno(entrada.celdas, entrada.tamanoCeldaM)
