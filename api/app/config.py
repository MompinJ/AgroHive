"""Configuracion por variables de entorno. Nunca poner llaves ni tokens en el repo."""
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CACHE_DIR = Path(os.environ.get("AGROHIVE_CACHE_DIR", RAIZ / "datos" / "cache"))
CATALOGOS_DIR = Path(os.environ.get("AGROHIVE_CATALOGOS_DIR", RAIZ / "datos" / "catalogos"))
CORS_ORIGENES = [o.strip() for o in os.environ.get("AGROHIVE_CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
VERSION_API = "0.1.0"
VERSION_CONTRATO = "0.1.0"
USER_AGENT = f"agrohive-api/{VERSION_API}"
