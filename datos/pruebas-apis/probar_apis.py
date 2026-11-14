"""A0.7: pruebas reales de las APIs de AgroHive. Repite las llamadas y guarda respuestas.

Uso: python3 probar_apis.py [lat] [lon]
Las coordenadas por defecto son de PRUEBA (cerca de Isla, Veracruz); la zona demo
se confirma en A0.6. Biblioteca estandar; certifi y Pillow son opcionales (certificados y decodificar Terrarium).
"""
import json
import math
import sys
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

LAT = float(sys.argv[1]) if len(sys.argv) > 2 else 18.03
LON = float(sys.argv[2]) if len(sys.argv) > 2 else -95.53
SALIDA = Path(__file__).parent / "respuestas"
SALIDA.mkdir(exist_ok=True)
CLIENTE = "agrohive-pruebas/0.1"
try:  # Python de python.org en macOS no trae certificados: certifi los da
    import certifi
    CONTEXTO = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CONTEXTO = ssl.create_default_context()


def pedir(nombre, url, origen=None):
    """GET con User-Agent generico. Guarda el cuerpo y devuelve (estado, cabeceras, cuerpo)."""
    cab = {"User-Agent": CLIENTE}
    if origen:
        cab["Origin"] = origen
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=cab), timeout=120, context=CONTEXTO) as r:
            estado, cabeceras, cuerpo = r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        estado, cabeceras, cuerpo = e.code, dict(e.headers), e.read()
    (SALIDA / nombre).write_bytes(cuerpo)
    print(f"{estado:>3} {nombre} ({len(cuerpo)} bytes)")
    return estado, cabeceras, cuerpo


def q(**kw):
    return urllib.parse.urlencode(kw, safe=",")


POWER = "https://power.larc.nasa.gov/api/temporal/daily/point?"
PARAMS = "PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,RH2M,WS2M,GWETROOT"
base = dict(latitude=LAT, longitude=LON, format="json")

print(f"Consulta del {date.today()} en ({LAT}, {LON})")
_, cab, _ = pedir("power_ag.json", POWER + q(start=20240101, end=20240110, community="AG", parameters=PARAMS, **base), "http://localhost:5173")
print("   CORS access-control-allow-origin:", cab.get("access-control-allow-origin"))
pedir("power_ag_gwet.json", POWER + q(start=20240101, end=20240105, community="AG", parameters="GWETROOT,GWETTOP,GWETPROF", **base))
pedir("power_config.json", "https://power.larc.nasa.gov/api/temporal/daily/configuration")
pedir("power_20y.json", POWER + q(start=20060101, end=20251231, community="AG", parameters=PARAMS, **base))

OM = "https://archive-api.open-meteo.com/v1/archive?"
diario = "precipitation_sum,temperature_2m_max,temperature_2m_min,shortwave_radiation_sum,et0_fao_evapotranspiration"
pedir("om_archive.json", OM + q(latitude=LAT, longitude=LON, start_date="2024-01-01", end_date="2024-01-10", daily=diario + ",wind_speed_10m_max", models="era5", timezone="auto"))
pedir("om_archive_soil.json", OM + q(latitude=LAT, longitude=LON, start_date="2024-01-01", end_date="2024-01-05", daily="soil_moisture_0_to_7cm_mean,soil_moisture_7_to_28cm_mean,soil_moisture_28_to_100cm_mean", models="era5_land", timezone="auto"))
pedir("om_archive_20y.json", OM + q(latitude=LAT, longitude=LON, start_date="2006-01-01", end_date="2025-12-31", daily=diario, models="era5", timezone="auto"))
pedir("om_elev.json", "https://api.open-meteo.com/v1/elevation?" + q(latitude=f"{LAT},{LAT + 0.001}", longitude=f"{LON},{LON - 0.001}"))
SEAS = "https://seasonal-api.open-meteo.com/v1/seasonal?"
pedir("om_seasonal.json", SEAS + q(latitude=LAT, longitude=LON, monthly="precipitation_mean,precipitation_anomaly,temperature_2m_mean,temperature_2m_anomaly", timezone="auto"))
pedir("om_seasonal_210d.json", SEAS + q(latitude=LAT, longitude=LON, monthly="precipitation_mean,precipitation_anomaly,temperature_2m_anomaly", forecast_days=210))

z = 12
n = 2 ** z
x = int((LON + 180) / 360 * n)
y = int((1 - math.asinh(math.tan(math.radians(LAT))) / math.pi) / 2 * n)
estado, _, _ = pedir("terrarium.png", f"https://elevation-tiles-prod.s3.amazonaws.com/terrarium/{z}/{x}/{y}.png")
try:
    from PIL import Image
    px = [r * 256 + g + b / 256 - 32768 for r, g, b in Image.open(SALIDA / "terrarium.png").convert("RGB").getdata()]
    print(f"   Terrarium z{z}: elevacion min/max/media = {min(px):.0f}/{max(px):.0f}/{sum(px)/len(px):.0f} m")
except ImportError:
    print("   Pillow no instalado: no se decodifico el tile")
