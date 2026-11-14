"""Escribe api/openapi.json desde la app. De ahi se genera el cliente TypeScript (api/cliente)."""
import json
from pathlib import Path

from app.main import app

destino = Path(__file__).parent / "openapi.json"
destino.write_text(json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(f"escrito {destino}")
