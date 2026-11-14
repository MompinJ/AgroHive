"""Cache en archivos JSON (doc 04). Clave = coordenada de la celda del dataset + variable + periodo."""
import json
import os
import re
import tempfile
import time
from typing import Any

from . import config


def _ruta(clave: str):
    return config.CACHE_DIR / (re.sub(r"[^A-Za-z0-9._-]", "_", clave) + ".json")


def leer(clave: str) -> tuple[Any, float] | None:
    """Devuelve (valor, edad en segundos) o None si no existe o esta danado."""
    ruta = _ruta(clave)
    try:
        contenido = json.loads(ruta.read_text(encoding="utf-8"))
        return contenido["valor"], time.time() - contenido["guardado"]
    except (OSError, ValueError, KeyError):
        return None


def escribir(clave: str, valor: Any) -> None:
    """Escritura atomica: un lector nunca ve un archivo a medias."""
    ruta = _ruta(clave)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=ruta.parent, suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"guardado": time.time(), "valor": valor}, f, ensure_ascii=False)
        os.replace(tmp, ruta)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise
