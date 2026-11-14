"""Cliente HTTP comun con reintentos. Los clientes de cada API lo usan por modulo para poder simularlo en pruebas."""
import asyncio

import httpx

from . import config

ESPERA_BASE_S = 1.0
REINTENTABLES = {429, 500, 502, 503, 504}


class ErrorFuente(Exception):
    """Una fuente externa fallo despues de los reintentos."""


def crear_cliente(tiempo_s: float = 60) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=tiempo_s, headers={"User-Agent": config.USER_AGENT}, follow_redirects=True)


async def get(cliente: httpx.AsyncClient, url: str, params: dict | list | None = None, reintentos: int = 3) -> httpx.Response:
    return await _pedir(cliente, "GET", url, reintentos, params=params)


async def post_json(cliente: httpx.AsyncClient, url: str, cuerpo: dict, reintentos: int = 3) -> httpx.Response:
    """POST con cuerpo JSON y los mismos reintentos que get (catalogos STAC)."""
    return await _pedir(cliente, "POST", url, reintentos, json=cuerpo)


async def _pedir(cliente: httpx.AsyncClient, metodo: str, url: str, reintentos: int, **kwargs) -> httpx.Response:
    ultimo = "sin respuesta"
    for intento in range(reintentos):
        try:
            r = await cliente.request(metodo, url, **kwargs)
        except httpx.TransportError as e:
            ultimo = type(e).__name__
        else:
            if r.status_code == 200:
                return r
            if r.status_code not in REINTENTABLES:
                raise ErrorFuente(f"{url} respondio {r.status_code}")
            ultimo = f"HTTP {r.status_code}"
        if intento < reintentos - 1:
            await asyncio.sleep(ESPERA_BASE_S * 2**intento)
    raise ErrorFuente(f"{url} fallo tras {reintentos} intentos ({ultimo})")
