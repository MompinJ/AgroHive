"""Pruebas de los hallazgos de la auditoria del back (docs/hallazgos-back.md). Cada una fallaba antes de su arreglo."""
from datetime import date, datetime, timedelta, timezone

import httpx
from fastapi.testclient import TestClient

from app import config
from app.clientes import terrarium
from app.main import app
from tests.test_clima import PARAMS, responder

cliente = TestClient(app)


def test_hoy_es_la_fecha_de_la_sede_y_no_la_del_servidor(monkeypatch):
    """H-B1: a las 23:00 del 14/11 en la sede ya es 15/11 en UTC (zona del droplet). La API debe decir 14/11."""
    noche_sede_en_utc = datetime(2026, 11, 15, 5, 0, tzinfo=timezone.utc)

    class Reloj(datetime):
        @classmethod
        def now(cls, tz=None):
            return noche_sede_en_utc.astimezone(tz) if tz else noche_sede_en_utc.replace(tzinfo=None)
    monkeypatch.setattr(config, "datetime", Reloj)
    assert config.hoy() == date(2026, 11, 14)


def test_consultado_del_clima_sale_en_hora_de_la_sede(simular, monkeypatch):
    monkeypatch.setattr(config, "hoy", lambda: date(2026, 11, 14))
    simular(responder())
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    assert c["fuente"]["consultado"] == "2026-11-14"


def test_imerg_sin_cobertura_no_arma_un_periodo_invertido(simular, validar):
    """H-B2: antes de 1998 el bloque salia con dias [] y periodo desde 1998-01-01 > hasta 1990-01-10."""
    simular(responder())
    c = cliente.get("/api/clima?lat=18.03&lon=-95.53&desde=1990-01-01&hasta=1990-01-10").json()
    validar(c, "serie-clima#")
    assert "lluviaSatelital" not in c
    assert "IMERG_FUERA_DE_COBERTURA" in {a["codigo"] for a in c["advertencias"]}


def test_respaldo_open_meteo_de_cache_lo_dice(simular, validar):
    """H-B3: con POWER y Open-Meteo caidos se servia la serie guardada de Open-Meteo sin decir que era de cache."""
    simular(responder(power_ok=False))
    cliente.get(f"/api/clima?{PARAMS}")
    simular(responder(power_ok=False, om_ok=False))
    c = cliente.get(f"/api/clima?{PARAMS}").json()
    validar(c, "serie-clima#")
    assert c["estado"] == "RESPALDO_HISTORICO"
    assert "CLIMA_RESPALDO_EN_CACHE" in {a["codigo"] for a in c["advertencias"]}


def test_un_tile_con_404_en_la_url_no_oculta_un_error_de_red():
    """H-B4: `"404" in str(e)` tomaba un 503 del tile .../14/4040/... como "no hay tile" y dejaba la celda en null sin pasar al respaldo."""
    import asyncio

    import pytest

    async def pedir():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(503))) as c:
            return await terrarium._tile(c, 14, 4040, 7357, asyncio.Semaphore(1))
    with pytest.raises(Exception) as e:
        asyncio.run(pedir())
    assert "503" in str(e.value)

    async def pedir_404():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda r: httpx.Response(404))) as c:
            return await terrarium._tile(c, 14, 3844, 7357, asyncio.Semaphore(1))
    assert asyncio.run(pedir_404()) is None


def test_openapi_json_committeado_esta_al_dia():
    """H-B5: api/openapi.json no traia /api/calendario ni /api/ee-uu/*, y de el sale api/cliente/api.d.ts.
    Si falla: `python exportar_openapi.py` y `cd cliente && npm run todo`."""
    import json
    from pathlib import Path
    guardado = json.loads((Path(__file__).parents[1] / "openapi.json").read_text(encoding="utf-8"))
    assert guardado == json.loads(json.dumps(app.openapi(), ensure_ascii=False))
