from fastapi import APIRouter, HTTPException, Query

from .. import calendario

router = APIRouter(prefix="/api", tags=["calendario"])


@router.get("/calendario")
def obtener_calendario(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Calendario de siembra del punto. Base mundial: GGCMI fase 3 en cualquier coordenada, tambien en Mexico. SIAP/INIFAP encima donde hay dato (hoy Isla)."""
    try:
        return calendario.armar(lon, lat)
    except calendario.SinPais as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
