from fastapi import APIRouter, HTTPException

from .. import servicios
from ..modelos import ErrorDatos, TerrenoEntrada, TerrenoRespuesta

router = APIRouter(prefix="/api", tags=["terreno"])


@router.post("/elevacion", response_model=TerrenoRespuesta, responses={503: {"model": ErrorDatos}})
async def elevacion(entrada: TerrenoEntrada):
    """Elevacion y pendiente por celda para una cuadricula ya generada por el front (tope 1600 celdas)."""
    try:
        return await servicios.terreno(entrada.celdas, entrada.tamanoCeldaM)
    except servicios.SinDatos as e:
        raise HTTPException(503, detail=ErrorDatos(motivo=str(e)).model_dump())
