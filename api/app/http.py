"""Cliente HTTP comun con reintentos y plazo total. Los clientes de cada API lo usan por modulo para poder simularlo en pruebas.

Tiempos (H-B6, decidido por Mompin el 14/11): unos 20 s por intento y 2 intentos por fuente, y un plazo total por peticion a la
API (`plazo()`, 70 s) para que la cadena POWER -> Open-Meteo -> cache quepa en los 90 s que espera el front aunque una fuente se
cuelgue. Medido el 14/11: POWER entrega los 20 anios de la ventana estandar en 1 a 2 s.
"""
import asyncio
import time
from contextlib import contextmanager
from contextvars import ContextVar

import httpx

from . import config

ESPERA_BASE_S = 1.0
TIEMPO_INTENTO_S = 20.0
INTENTOS = 2
PLAZO_TOTAL_S = 70.0
REINTENTABLES = {429, 500, 502, 503, 504}
_fin: ContextVar[float | None] = ContextVar("fin_de_plazo", default=None)


class ErrorFuente(Exception):
    """Una fuente externa fallo despues de los reintentos (o se agoto el plazo de la peticion)."""


@contextmanager
def plazo(segundos: float | None = None):
    """Fija el fin del plazo de esta peticion (PLAZO_TOTAL_S por defecto). Un plazo anidado nunca alarga el de afuera."""
    actual = _fin.get()
    nuevo = time.monotonic() + (PLAZO_TOTAL_S if segundos is None else segundos)
    token = _fin.set(nuevo if actual is None else min(actual, nuevo))
    try:
        yield
    finally:
        _fin.reset(token)


def restante() -> float | None:
    """Segundos que quedan del plazo de la peticion (None si no hay plazo)."""
    fin = _fin.get()
    return None if fin is None else fin - time.monotonic()


def crear_cliente(tiempo_s: float = TIEMPO_INTENTO_S) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=tiempo_s, headers={"User-Agent": config.USER_AGENT}, follow_redirects=True)


async def solicitar(cliente: httpx.AsyncClient, metodo: str, url: str, *, params: dict | list | None = None, json=None, reintentos: int = INTENTOS) -> httpx.Response:
    """GET o POST con reintentos y espera exponencial en 429 y 5xx; cualquier otro estado distinto de 200 es un error de la fuente.
    Ningun intento ni espera pasa del plazo de la peticion: al agotarse se lanza ErrorFuente para que actue el respaldo."""
    ultimo = "sin respuesta"
    for intento in range(reintentos):
        queda = restante()
        if queda is not None and queda <= 0:
            raise ErrorFuente(f"{url}: se agoto el plazo de la peticion ({PLAZO_TOTAL_S:.0f} s) tras {intento} intento(s) ({ultimo})")
        try:
            if queda is None:
                r = await cliente.request(metodo, url, params=params, json=json)
            else:
                r = await asyncio.wait_for(cliente.request(metodo, url, params=params, json=json), timeout=queda)
        except (httpx.TransportError, asyncio.TimeoutError) as e:
            ultimo = "plazo agotado" if isinstance(e, asyncio.TimeoutError) else type(e).__name__
        else:
            if r.status_code == 200:
                return r
            if r.status_code not in REINTENTABLES:
                raise ErrorFuente(f"{url} respondio {r.status_code}")
            ultimo = f"HTTP {r.status_code}"
        if intento < reintentos - 1:
            espera = ESPERA_BASE_S * 2**intento
            queda = restante()
            await asyncio.sleep(espera if queda is None else max(0.0, min(espera, queda)))
    raise ErrorFuente(f"{url} fallo tras {reintentos} intentos ({ultimo})")


async def get(cliente: httpx.AsyncClient, url: str, params: dict | list | None = None, reintentos: int = INTENTOS) -> httpx.Response:
    return await solicitar(cliente, "GET", url, params=params, reintentos=reintentos)
