import json
from pathlib import Path

import httpx
import pytest
from jsonschema import Draft202012Validator
from referencing import Registry, Resource

from app import config, http

RAIZ = Path(__file__).resolve().parents[2]
RESPUESTAS = RAIZ / "datos" / "pruebas-apis" / "respuestas"
CONTRATOS = RAIZ / "contratos"
BASE = "https://agrohive.example/contratos/"


@pytest.fixture(autouse=True)
def entorno(tmp_path, monkeypatch):
    monkeypatch.setattr(config, "CACHE_DIR", tmp_path / "cache")
    monkeypatch.setattr(config, "CATALOGOS_DIR", tmp_path / "catalogos")
    monkeypatch.setattr(http, "ESPERA_BASE_S", 0)


@pytest.fixture
def simular(monkeypatch):
    """simular(handler): todas las llamadas HTTP de la API pasan por handler(request) -> httpx.Response."""
    llamadas = []

    def instalar(handler):
        def envolver(request):
            llamadas.append(str(request.url))
            return handler(request)
        monkeypatch.setattr(http, "crear_cliente", lambda: httpx.AsyncClient(transport=httpx.MockTransport(envolver)))
        return llamadas
    return instalar


def real(nombre):
    """Respuesta real guardada en A0.7 (datos/pruebas-apis/respuestas/)."""
    return (RESPUESTAS / nombre).read_bytes()


def real_json(nombre):
    return json.loads(real(nombre))


@pytest.fixture
def validar():
    """validar(instancia, 'clima-escenario#/$defs/dia'): valida contra los schemas de contratos/ (de Mompin)."""
    recursos = []
    for f in CONTRATOS.glob("*.schema.json"):
        contenido = json.loads(f.read_text(encoding="utf-8"))
        recursos.append((contenido["$id"], Resource.from_contents(contenido)))
    registro = Registry().with_resources(recursos)

    def _validar(instancia, ref):
        archivo, _, ruta = ref.partition("#")
        Draft202012Validator({"$ref": f"{BASE}{archivo}.schema.json#{ruta}"}, registry=registro).validate(instancia)
    return _validar
