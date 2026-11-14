import json

from fastapi import APIRouter

from .. import config

router = APIRouter(prefix="/api", tags=["cultivos"])


@router.get("/cultivos")
def cultivos():
    """Catalogo propio (A1.5, de Mafer) leido de datos/catalogos/cultivos.json. Sin catalogo no se inventa nada."""
    ruta = config.CATALOGOS_DIR / "cultivos.json"
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"estado": "NO_EVALUABLE", "motivo": "El catalogo de cultivos aun no existe (A1.5).", "cultivos": []}
