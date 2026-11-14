"""Open-Meteo: archivo historico (respaldo de clima) y elevacion (respaldo de terreno). Probado en A0.7."""
from datetime import date

import httpx

from .. import http

URL_ARCHIVO = "https://archive-api.open-meteo.com/v1/archive"
URL_ELEVACION = "https://api.open-meteo.com/v1/elevation"
URL_ESTACIONAL = "https://seasonal-api.open-meteo.com/v1/seasonal"
NOMBRE_ESTACIONAL = "Open-Meteo pronostico estacional (ECMWF SEAS5)"
NOMBRE_CLIMA = "Open-Meteo archivo historico (ERA5)"
RESOLUCION_CLIMA = "ERA5, 0.25 grados"
LOTE_ELEVACION = 100
DIARIAS = "precipitation_sum,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum,et0_fao_evapotranspiration"


def parsear(cuerpo: dict) -> list[dict]:
    d = cuerpo["daily"]
    dias = []
    for i, fecha in enumerate(d["time"]):
        dias.append({
            "fecha": fecha,
            "lluviaMm": d["precipitation_sum"][i],
            "tMaxC": d["temperature_2m_max"][i],
            "tMinC": d["temperature_2m_min"][i],
            "tMediaC": None,
            "radiacionMjM2Dia": d["shortwave_radiation_sum"][i],
            "humedadRelativaPct": None,
            "vientoMS": None,
            "et0Mm": d["et0_fao_evapotranspiration"][i],
        })
    return dias


async def serie_diaria(cliente: httpx.AsyncClient, lat: float, lon: float, desde: date, hasta: date) -> list[dict]:
    params = {
        "latitude": lat, "longitude": lon, "start_date": desde.isoformat(), "end_date": hasta.isoformat(),
        "daily": DIARIAS, "models": "era5", "timezone": "auto",
    }
    r = await http.get(cliente, URL_ARCHIVO, params)
    try:
        return parsear(r.json())
    except (KeyError, ValueError, IndexError) as e:
        raise http.ErrorFuente(f"respuesta de Open-Meteo inesperada: {e!r}") from e


async def elevaciones(cliente: httpx.AsyncClient, puntos: list[tuple[float, float]]) -> list[float | None]:
    """Elevacion (Copernicus GLO-90, 90 m) para una lista de (lon, lat), en lotes de 100."""
    salida: list[float | None] = []
    for i in range(0, len(puntos), LOTE_ELEVACION):
        lote = puntos[i:i + LOTE_ELEVACION]
        params = {"latitude": ",".join(f"{lat:.5f}" for _, lat in lote), "longitude": ",".join(f"{lon:.5f}" for lon, _ in lote)}
        r = await http.get(cliente, URL_ELEVACION, params)
        try:
            valores = r.json()["elevation"]
        except (KeyError, ValueError) as e:
            raise http.ErrorFuente(f"respuesta de elevacion inesperada: {e!r}") from e
        if len(valores) != len(lote):
            raise http.ErrorFuente("Open-Meteo devolvio un numero distinto de elevaciones")
        salida.extend(valores)
    return salida


async def estacional(cliente: httpx.AsyncClient, lat: float, lon: float) -> dict[str, dict]:
    """Anomalia mensual de SEAS5 por mes ('AAAA-MM'): {'lluviaMm': mm, 'tMediaC': K}. Probado el 14/11: 7 meses con forecast_days=210.

    Es una serie por mes (no trae miembros ni dispersion en las variables verificadas). La anomalia es respecto
    de la climatologia del propio ECMWF, no de POWER.
    """
    params = {"latitude": lat, "longitude": lon, "monthly": "precipitation_anomaly,temperature_2m_anomaly",
              "forecast_days": 210, "models": "ecmwf_seas5"}
    r = await http.get(cliente, URL_ESTACIONAL, params)
    try:
        m = r.json()["monthly"]
        return {t[:7]: {"lluviaMm": p, "tMediaC": a} for t, p, a in zip(m["time"], m["precipitation_anomaly"], m["temperature_2m_anomaly"])}
    except (KeyError, ValueError, TypeError) as e:
        raise http.ErrorFuente(f"respuesta estacional inesperada: {e!r}") from e
