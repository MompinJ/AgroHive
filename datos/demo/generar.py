"""A2.4: genera el paquete de demo sin internet.

Necesita red al correrlo. Uso (desde la raiz del repo):

    api/.venv/bin/python datos/demo/generar.py [--parcela contratos/ejemplos/parcela.ejemplo.json]

Hace cuatro llamadas a la API (mas tres de NDVI MODIS, A4.11) (por dentro, con TestClient, el mismo codigo que sirve el servidor): clima de la ventana
estandar, terreno de la parcela, suelo y proxima temporada. Valida cada respuesta contra los schemas de contratos/ y
las deja de dos formas:

  * datos/demo/cache/         la cache de la API: con ella /api/* responde sin red para esta parcela (AGROHIVE_DEMO_DIR);
  * datos/demo/respuestas/    el cuerpo de cada respuesta tal cual, para que el motor lo consuma directo.

Si una respuesta no cumple el contrato o una fuente cae al respaldo, el script falla y no escribe nada.
"""
import argparse
import json
import math
import os
import shutil
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DEMO = RAIZ / "datos" / "demo"
CONTRATOS = RAIZ / "contratos"
LADO_CALENTAMIENTO_M = 20.0  # cuadricula auxiliar para dejar en cache los tiles de elevacion que cubren la parcela
MARGEN_M = 60.0

ap = argparse.ArgumentParser()
ap.add_argument("--parcela", default=str(CONTRATOS / "ejemplos" / "parcela.ejemplo.json"))
args = ap.parse_args()

tmp = tempfile.mkdtemp(prefix="agrohive-demo-")
os.environ["AGROHIVE_CACHE_DIR"] = tmp
os.environ["AGROHIVE_DEMO_DIR"] = str(Path(tmp) / "_sin_paquete")  # no leer un paquete anterior mientras se genera
sys.path.insert(0, str(RAIZ / "api"))

from fastapi.testclient import TestClient  # noqa: E402  (despues de fijar las variables de entorno)
from jsonschema import Draft202012Validator  # noqa: E402
from referencing import Registry, Resource  # noqa: E402

from app import servicios  # noqa: E402
from app.main import app  # noqa: E402

BASE = "https://agrohive.example/contratos/"
registro = Registry().with_resources([(c["$id"], Resource.from_contents(c)) for c in
                                      (json.loads(f.read_text(encoding="utf-8")) for f in CONTRATOS.glob("*.schema.json"))])


def validar(instancia, ref: str, que: str):
    archivo, _, ruta = ref.partition("#")
    errores = list(Draft202012Validator({"$ref": f"{BASE}{archivo}.schema.json#{ruta}"}, registry=registro).iter_errors(instancia))
    if errores:
        raise SystemExit(f"{que} NO cumple {ref}: {errores[0].message} (en {list(errores[0].absolute_path)})")
    print(f"  {que}: cumple {ref}")


def cuadricula_calentamiento(poligono, lat):
    lons, lats = [p[0] for p in poligono], [p[1] for p in poligono]
    m_lat = LADO_CALENTAMIENTO_M / 111_320.0
    m_lon = LADO_CALENTAMIENTO_M / (111_320.0 * math.cos(math.radians(lat)))
    n_i = math.ceil((max(lats) - min(lats)) / m_lat + 2 * MARGEN_M / LADO_CALENTAMIENTO_M)
    n_j = math.ceil((max(lons) - min(lons)) / m_lon + 2 * MARGEN_M / LADO_CALENTAMIENTO_M)
    lat0, lon0 = max(lats) + MARGEN_M / 111_320.0, min(lons) - MARGEN_M / (111_320.0 * math.cos(math.radians(lat)))
    return [{"id": f"c-{i}-{j}", "i": i, "j": j, "centro": [round(lon0 + j * m_lon, 6), round(lat0 - i * m_lat, 6)]}
            for i in range(n_i) for j in range(n_j)]


parcela = json.loads(Path(args.parcela).read_text(encoding="utf-8"))
lon, lat = parcela["centroide"]
desde, hasta = servicios.VENTANA_ESTANDAR
cliente = TestClient(app)
print(f"parcela {parcela['id']} en ({lon}, {lat}); ventana {desde} a {hasta}")

respuestas = {}

r = cliente.get("/api/clima", params={"lat": lat, "lon": lon, "desde": desde.isoformat(), "hasta": hasta.isoformat()})
if r.status_code != 200 or r.json()["estado"] != "EVALUABLE":
    raise SystemExit(f"el paquete debe salir de NASA POWER (EVALUABLE); la API respondio {r.status_code} {r.json().get('estado')}")
respuestas["serie-clima"] = r.json()
validar(respuestas["serie-clima"], "serie-clima#", f"clima ({len(respuestas['serie-clima']['diario'])} dias)")

r = cliente.get("/api/suelo", params={"lat": lat, "lon": lon})
if r.status_code != 200:
    raise SystemExit(f"suelo: la API respondio {r.status_code} {r.text[:200]}")
respuestas["suelo"] = r.json()
validar(respuestas["suelo"], "suelo#", f"suelo ({respuestas['suelo']['textura']['clase']}, {respuestas['suelo']['textura']['estado']})")

# Terreno: primero una cuadricula auxiliar (deja en cache los tiles de toda la zona) y luego las celdas de la parcela.
aux = cliente.post("/api/elevacion", json={"tamanoCeldaM": LADO_CALENTAMIENTO_M, "celdas": cuadricula_calentamiento(parcela["poligono"], lat)})
if aux.status_code != 200 or aux.json()["terreno"]["estado"] != "EVALUABLE":
    raise SystemExit(f"elevacion: la API respondio {aux.status_code}")
celdas = [{k: c[k] for k in ("id", "i", "j", "centro")} for c in parcela["celdas"]]
r = cliente.post("/api/elevacion", json={"tamanoCeldaM": parcela["tamanoCeldaM"], "celdas": celdas})
if r.status_code != 200:
    raise SystemExit(f"elevacion: la API respondio {r.status_code}")
respuestas["terreno"] = r.json()
validar(respuestas["terreno"]["meta"], "comun#/$defs/meta", "terreno.meta")
validar(respuestas["terreno"]["terreno"], "parcela#/properties/terreno", f"terreno ({len(celdas)} celdas)")
for dada, calc in zip(celdas, respuestas["terreno"]["celdas"]):
    validar({**dada, "elevacionM": calc["elevacionM"], "pendientePct": calc["pendientePct"]}, "parcela#/$defs/celda", f"celda {dada['id']}")

r = cliente.get("/api/proxima-temporada", params={"lat": lat, "lon": lon})
if r.status_code != 200 or r.json()["metodo"] != "anomalia_estacional":
    raise SystemExit(f"proxima temporada: debe salir del pronostico estacional; la API respondio {r.status_code}")
respuestas["proxima-temporada"] = r.json()
validar(respuestas["proxima-temporada"], "proxima-temporada#", f"proxima temporada ({respuestas['proxima-temporada']['horizonteMeses']} meses)")

# A4.11: NDVI de MODIS de los tres anios de escenario (evidencia, no entra al ranking). El servicio de ORNL es lento (unos 8 a 13 s por fecha) e
# inestable: se reintenta cada anio hasta 3 veces y una serie con huecos de red no se acepta. Anio agricola t = 1 de octubre de t-1 al 30 de septiembre de t.
ANIOS_NDVI = {"seco": 2023, "habitual": 2016, "lluvioso": 2024}  # docs/05, paso 1 (A2.5); si el motor elige otros anios, hay que regenerar
for escenario, anio in ANIOS_NDVI.items():
    for intento in range(1, 4):
        r = cliente.get("/api/ndvi", params={"lat": lat, "lon": lon, "desde": f"{anio - 1}-10-01", "hasta": f"{anio}-09-30"})
        if r.status_code == 200 and not any(d["estado"] == "ERROR_DATOS" for d in r.json()["serie"]):
            break
        print(f"  ndvi {escenario} {anio}: intento {intento} sin serie completa ({r.status_code})")
    else:
        raise SystemExit(f"ndvi {escenario} {anio}: el servicio de ORNL no entrego la serie completa tras 3 intentos; no se escribe el paquete")
    respuestas[f"ndvi-{escenario}"] = r.json()
    n_ok = sum(1 for d in r.json()["serie"] if d["estado"] == "EVALUABLE")
    validar(respuestas[f"ndvi-{escenario}"], "ndvi#", f"ndvi {escenario} {anio} ({n_ok} de {len(r.json()['serie'])} compuestos con dato)")

# Todo cumple: ahora si se escribe el paquete.
for carpeta in (DEMO / "cache", DEMO / "respuestas"):
    if carpeta.exists():
        shutil.rmtree(carpeta)
shutil.copytree(tmp, DEMO / "cache", ignore=shutil.ignore_patterns("_sin_paquete", "*.tmp"))
shutil.rmtree(tmp, ignore_errors=True)
(DEMO / "respuestas").mkdir()
for nombre, cuerpo in respuestas.items():
    (DEMO / "respuestas" / f"{nombre}.json").write_text(json.dumps(cuerpo, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

entradas = sorted(str(p.relative_to(DEMO)) for p in DEMO.rglob("*") if p.is_file() and p.suffix in (".json", ".png"))
manifiesto = {
    "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "parcela": parcela["id"], "centroide": [lon, lat],
    "coordenadasIlustrativas": bool(parcela.get("coordenadasIlustrativas")),
    "ventanaClima": [desde.isoformat(), hasta.isoformat()],
    "versionContrato": respuestas["serie-clima"]["meta"]["versionContrato"],
    "validadoContra": ["serie-clima", "suelo", "parcela (terreno y celdas)", "proxima-temporada", "ndvi (3 anios de escenario)"],
    "ndviAnios": ANIOS_NDVI,
    "entradas": entradas,
}
(DEMO / "manifiesto.json").write_text(json.dumps(manifiesto, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
peso = sum(p.stat().st_size for p in DEMO.rglob("*") if p.is_file())
print(f"paquete: {len(entradas)} archivos, {peso / 1024:.0f} KB en datos/demo/")
