"""Configuracion por variables de entorno. Nunca poner llaves ni tokens en el repo."""
import os
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CACHE_DIR = Path(os.environ.get("AGROHIVE_CACHE_DIR", RAIZ / "datos" / "cache"))
DEMO_DIR = Path(os.environ.get("AGROHIVE_DEMO_DIR", RAIZ / "datos" / "demo" / "cache"))  # paquete de demo precargado (A2.4): se lee si falta la cache local
CATALOGOS_DIR = Path(os.environ.get("AGROHIVE_CATALOGOS_DIR", RAIZ / "datos" / "catalogos"))
CALENDARIO_DIR = Path(os.environ.get("AGROHIVE_CALENDARIO_DIR", RAIZ / "datos" / "calendario"))
CORS_ORIGENES = [o.strip() for o in os.environ.get("AGROHIVE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",") if o.strip()]
VERSION_API = "0.1.0"
VERSION_CONTRATO = "0.12.1"  # debe coincidir con contratos/package.json; la prueba de /health lo exige


def commit() -> str | None:
    """Commit corto de git del checkout en que corre la API, para /health (None si no hay git). Sirve para verificar despliegues."""
    import subprocess
    try:
        r = subprocess.run(["git", "-C", str(RAIZ), "rev-parse", "--short", "HEAD"], capture_output=True, text=True, timeout=3)
        return r.stdout.strip() or None if r.returncode == 0 else None
    except (OSError, subprocess.SubprocessError):
        return None


COMMIT = commit()  # se lee una vez al arrancar
USER_AGENT = f"agrohive-api/{VERSION_API}"
