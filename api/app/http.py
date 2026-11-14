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


async def solicitar(cliente: httpx.AsyncClient, metodo: str, url: str, *, params: dict | list | None = None, json=None, reintentos: int = 3) -> httpx.Response:
    """GET o POST con reintentos y espera exponencial en 429 y 5xx; cualquier otro estado distinto de 200 es un error de la fuente."""
    ultimo = "sin respuesta"
    for intento in range(reintentos):
        try:
            r = await cliente.request(metodo, url, params=params, json=json)
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


async def get(cliente: httpx.AsyncClient, url: str, params: dict | list | None = None, reintentos: int = 3) -> httpx.Response:
    return await solicitar(cliente, "GET", url, params=params, reintentos=reintentos)
