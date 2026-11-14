"""Clase textural USDA (12 clases) a partir de arena, limo y arcilla en %, y grupo del selector manual.

Las reglas son el triangulo textural USDA (Soil Survey Manual) en la forma de umbrales usada por NRCS.
El grupo (arenoso, franco, arcilloso) y el TAW salen de la tabla de suelos de A1.6 (`datos/catalogos/suelos.json`, de Mafer):
si el archivo existe manda; GRUPO es solo la copia de respaldo de esa tabla al 14/11.
"""
import json

from . import config


def clasificar(arena: float, limo: float, arcilla: float) -> str | None:
    s, si, c = arena, limo, arcilla
    if si + 1.5 * c < 15:
        return "arena"
    if si + 1.5 * c >= 15 and si + 2 * c < 30:
        return "arena_franca"
    if (7 <= c < 20 and s > 52 and si + 2 * c >= 30) or (c < 7 and si < 50 and si + 2 * c >= 30):
        return "franco_arenoso"
    if 7 <= c < 27 and 28 <= si < 50 and s <= 52:
        return "franco"
    if (si >= 50 and 12 <= c < 27) or (50 <= si < 80 and c < 12):
        return "franco_limoso"
    if si >= 80 and c < 12:
        return "limo"
    if 20 <= c < 35 and si < 28 and s > 45:
        return "franco_arcillo_arenoso"
    if 27 <= c < 40 and 20 < s <= 45:
        return "franco_arcilloso"
    if 27 <= c < 40 and s <= 20:
        return "franco_arcillo_limoso"
    if c >= 35 and s > 45:
        return "arcillo_arenoso"
    if c >= 40 and si >= 40:
        return "arcillo_limoso"
    if c >= 40 and s <= 45 and si < 40:
        return "arcilla"
    return None


GRUPO = {  # copia de respaldo de datos/catalogos/suelos.json (A1.6, 14/11); si el archivo existe, manda el archivo
    "arena": "arenoso", "arena_franca": "arenoso",
    "franco_arenoso": "franco", "franco": "franco", "franco_limoso": "franco", "limo": "franco",
    "franco_arcillo_limoso": "arcilloso", "arcillo_limoso": "arcilloso", "arcilla": "arcilloso",
    "franco_arcillo_arenoso": "arcilloso", "franco_arcilloso": "arcilloso", "arcillo_arenoso": "arcilloso",
}


def cargar_catalogo_suelos() -> dict[str, dict]:
    """Tabla de suelos de A1.6 por clase USDA ({} si el archivo aun no esta en este checkout)."""
    try:
        datos = json.loads((config.CATALOGOS_DIR / "suelos.json").read_text(encoding="utf-8"))
        return {t["clase"]: t for t in datos["texturas"]}
    except (OSError, ValueError, KeyError, TypeError):
        return {}
