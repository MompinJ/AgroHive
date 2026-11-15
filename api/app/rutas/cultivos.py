import json

from fastapi import APIRouter

from .. import config, servicios
from ..modelos import CatalogoCultivos, ErrorDatos

router = APIRouter(prefix="/api", tags=["cultivos"])


@router.get("/cultivos", response_model=CatalogoCultivos, response_model_exclude_none=True, responses={503: {"model": ErrorDatos}})
def cultivos():
    """Catalogo propio (A1.5, de Mafer) leido de datos/catalogos/cultivos.json. Sin catalogo, 503 ERROR_DATOS: no se inventa nada
    y no se responde un documento que no cumpla contratos/cultivo.schema.json (H-B8). El front trata los cultivos como obligatorios."""
    ruta = config.CATALOGOS_DIR / "cultivos.json"
    try:
        return json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise servicios.SinDatos(f"El catalogo de cultivos no esta en este servidor ({type(e).__name__}).") from e
