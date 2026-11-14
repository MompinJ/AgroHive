from fastapi import APIRouter, HTTPException, Query

from .. import calendario

router = APIRouter(prefix="/api", tags=["calendario"])


@router.get("/calendario")
def obtener_calendario(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    """Calendario de siembra del punto. En Mexico, SIAP/INIFAP (hoy solo Isla). Fuera, maiz de temporal de GGCMI fase 3."""
    try:
        return calendario.armar(lon, lat)
    except calendario.SinPais as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
