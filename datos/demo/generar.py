"""A2.4: genera el paquete de demo sin internet (cache precargada de la API).

Necesita red al correrlo. Uso (desde la raiz del repo):

    api/.venv/bin/python datos/demo/generar.py [--parcela contratos/ejemplos/parcela.ejemplo.json]

Pide a la API (sus mismos servicios) clima 2006-2025, terreno de la parcela, suelo y proxima temporada, y copia lo guardado
a datos/demo/cache/. La API lee esa carpeta cuando falta su cache local (AGROHIVE_DEMO_DIR), asi que /api/clima, /api/elevacion,
/api/suelo y /api/proxima-temporada responden sin red para esa parcela. Hay que volver a correrlo si cambia la zona demo (A0.6).
"""
import argparse
import asyncio
import json
import math
import os
import shutil
import sys
import tempfile
from datetime import date, datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "datos" / "demo" / "cache"
VENTANA = (date(2006, 1, 1), date(2025, 12, 31))  # la ventana estandar de docs/04: el front debe pedir exactamente esta
LADO_M = 20.0
MARGEN_M = 60.0

ap = argparse.ArgumentParser()
ap.add_argument("--parcela", default=str(RAIZ / "contratos" / "ejemplos" / "parcela.ejemplo.json"))
args = ap.parse_args()

tmp = tempfile.mkdtemp(prefix="agrohive-demo-")
os.environ["AGROHIVE_CACHE_DIR"] = tmp
os.environ["AGROHIVE_DEMO_DIR"] = str(Path(tmp) / "_sin_paquete")  # no leer un paquete anterior mientras se genera
sys.path.insert(0, str(RAIZ / "api"))

from app import proxima, servicios  # noqa: E402  (despues de fijar las variables de entorno)
from app.modelos import CeldaEntrada  # noqa: E402

parcela = json.loads(Path(args.parcela).read_text(encoding="utf-8"))
lon, lat = parcela["centroide"]
poligono = parcela["poligono"]


def cuadricula() -> list[CeldaEntrada]:
    """Celdas de LADO_M sobre el rectangulo del poligono mas un margen, para dejar en cache los tiles que cubren la parcela."""
    lons, lats = [p[0] for p in poligono], [p[1] for p in poligono]
    m_lat = LADO_M / 111_320.0
    m_lon = LADO_M / (111_320.0 * math.cos(math.radians(lat)))
    n_i = math.ceil((max(lats) - min(lats)) / m_lat + 2 * MARGEN_M / LADO_M)
    n_j = math.ceil((max(lons) - min(lons)) / m_lon + 2 * MARGEN_M / LADO_M)
    lat0 = max(lats) + MARGEN_M / 111_320.0
    lon0 = min(lons) - MARGEN_M / (111_320.0 * math.cos(math.radians(lat)))
    return [CeldaEntrada(id=f"c-{i}-{j}", i=i, j=j, centro=(round(lon0 + j * m_lon, 6), round(lat0 - i * m_lat, 6)))
            for i in range(n_i) for j in range(n_j)]


async def main():
    print(f"parcela {parcela['id']} en ({lon}, {lat})")
    serie = await servicios.serie_clima(lat, lon, *VENTANA)
    print(f"  clima: {serie['estado']}, {len(serie['diario'])} dias")
    if serie["estado"] != "EVALUABLE":
        raise SystemExit("el paquete de demo debe salir de la fuente principal (NASA POWER); reintenta cuando responda")
    suelo = await servicios.suelo(lat, lon)
    print(f"  suelo: {suelo['textura']['clase']}, pH {suelo['ph'].get('valor')}")
    celdas = cuadricula()
    terreno = await servicios.terreno(celdas, LADO_M)
    print(f"  terreno: {terreno['terreno']['estado']}, {len(celdas)} celdas")
    pt = await proxima.proxima_temporada(lat, lon)
    print(f"  proxima temporada: {pt['metodo']}, {pt['horizonteMeses']} meses")
    if pt["metodo"] != "anomalia_estacional":
        raise SystemExit("el pronostico estacional no respondio; reintenta")


asyncio.run(main())

if SALIDA.exists():
    shutil.rmtree(SALIDA)
shutil.copytree(tmp, SALIDA, ignore=shutil.ignore_patterns("_sin_paquete", "*.tmp"))
shutil.rmtree(tmp, ignore_errors=True)
entradas = sorted(str(p.relative_to(SALIDA)) for p in SALIDA.rglob("*") if p.is_file())
manifiesto = {
    "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "parcela": parcela["id"], "centroide": [lon, lat],
    "coordenadasIlustrativas": bool(parcela.get("coordenadasIlustrativas")),
    "periodoClima": [VENTANA[0].isoformat(), VENTANA[1].isoformat()],
    "entradas": entradas,
}
(SALIDA.parent / "manifiesto.json").write_text(json.dumps(manifiesto, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
peso = sum(p.stat().st_size for p in SALIDA.rglob("*") if p.is_file())
print(f"paquete: {len(entradas)} archivos, {peso / 1024:.0f} KB en {SALIDA.relative_to(RAIZ)}")
