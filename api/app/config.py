"""Configuracion por variables de entorno. Nunca poner llaves ni tokens en el repo."""
import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CACHE_DIR = Path(os.environ.get("AGROHIVE_CACHE_DIR", RAIZ / "datos" / "cache"))
DEMO_DIR = Path(os.environ.get("AGROHIVE_DEMO_DIR", RAIZ / "datos" / "demo" / "cache"))  # paquete de demo precargado (A2.4): se lee si falta la cache local
CATALOGOS_DIR = Path(os.environ.get("AGROHIVE_CATALOGOS_DIR", RAIZ / "datos" / "catalogos"))
CALENDARIO_DIR = Path(os.environ.get("AGROHIVE_CALENDARIO_DIR", RAIZ / "datos" / "calendario"))
CORS_ORIGENES = [o.strip() for o in os.environ.get("AGROHIVE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173").split(",") if o.strip()]
VERSION_API = "0.1.0"
PAQUETE_CONTRATOS = Path(os.environ.get("AGROHIVE_CONTRATOS_PACKAGE", RAIZ / "contratos" / "package.json"))


def leer_version_contrato(ruta: Path) -> str:
    """Version de contratos/package.json. Si no esta, la API no arranca: no se inventa un numero."""
    try:
        texto = ruta.read_text(encoding="utf-8")
    except OSError as e:
        raise RuntimeError(f"No se encontro la version de contratos en {ruta}") from e
    try:
        paquete = json.loads(texto)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"contratos/package.json no es JSON valido: {ruta}") from e
    version = paquete.get("version") if isinstance(paquete, dict) else None
    if not isinstance(version, str) or not version.strip():
        raise RuntimeError(f"contratos/package.json no trae version: {ruta}")
    return version.strip()


VERSION_CONTRATO = leer_version_contrato(PAQUETE_CONTRATOS)


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


# Hora de la sede (Boca del Rio, Veracruz): America/Mexico_City es UTC-6 fijo desde 2022 (Mexico dejo el horario de verano).
# Se usa un desfase fijo y no zoneinfo para no depender de tzdata en el servidor. Las fechas que la API declara (consultado,
# "hoy" de los limites de periodo, mes de la proxima temporada) van en hora de la sede, no en la del servidor (UTC en el droplet).
ZONA_SEDE = timezone(timedelta(hours=-6), "America/Mexico_City")


def hoy() -> date:
    """Fecha de hoy en hora de la sede, sin importar la zona horaria del servidor."""
    return datetime.now(ZONA_SEDE).date()
