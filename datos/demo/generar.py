"""A2.4: genera el paquete de demo sin internet.

Necesita red al correrlo. Uso (desde la raiz del repo):

    api/.venv/bin/python datos/demo/generar.py [--parcela contratos/ejemplos/parcela.ejemplo.json]

Hace cuatro llamadas a la API (por dentro, con TestClient, el mismo codigo que sirve el servidor): clima de la ventana
estandar, terreno de la parcela, suelo y proxima temporada. Valida cada respuesta contra los schemas de contratos/ y
las deja de dos formas:

  * datos/demo/cache/         la cache de la API: con ella /api/* responde sin red para esta parcela (AGROHIVE_DEMO_DIR);
  * datos/demo/respuestas/    el cuerpo de cada respuesta tal cual, para que el motor lo consuma directo.

Si una respuesta no cumple el contrato o una fuente cae al respaldo, el script falla y no escribe nada.
"""
import argparse
import asyncio
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
ap.add_argument("--con-ndvi", action="store_true", help="incluye el NDVI de MODIS (ORNL DAAC); solo si el servicio responde")
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
# Orientacion (contratos/parcela.schema.json, 14/11): i=0 es la fila mas al SUR y j=0 la columna mas al OESTE. Si el centro de las celdas
# no la cumple, las elevaciones quedarian cruzadas y las pruebas de forma no lo verian: se aborta antes de escribir nada.
for c in celdas:
    for otra in celdas:
        if otra["i"] > c["i"] and otra["j"] == c["j"] and not otra["centro"][1] > c["centro"][1]:
            raise SystemExit(f"la parcela no cumple 'i crece hacia el norte': {c['id']} y {otra['id']}")
        if otra["j"] > c["j"] and otra["i"] == c["i"] and not otra["centro"][0] > c["centro"][0]:
            raise SystemExit(f"la parcela no cumple 'j crece hacia el este': {c['id']} y {otra['id']}")
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

# NDVI de MODIS (A4.11, evidencia): OPCIONAL. ORNL DAAC fue inestable el 14/11 (502, 503 y llamadas de 40 s sin respuesta), asi que el paquete
# de demo no depende de el: solo se incluye con --con-ndvi, cuando el servicio responda. Sin la bandera el paquete sale igual que antes.
if args.con_ndvi:
    from app import ndvi as modulo_ndvi  # noqa: E402
    from app.modelos_ndvi import Ndvi  # noqa: E402

    # Se llama a la orquestacion y no a la ruta porque la ruta limita a 400 dias por consulta; pasa por el mismo modelo Ndvi.
    try:
        respuestas["ndvi"] = Ndvi.model_validate(asyncio.run(modulo_ndvi.serie(lon, lat, desde, hasta))).model_dump(mode="json")
    except servicios.SinDatos as e:
        raise SystemExit(f"NDVI de MODIS (ORNL DAAC): {e}. El servicio es intermitente: reintenta o genera sin --con-ndvi.")
    if respuestas["ndvi"]["estado"] != "EXPLORATORIO" or any(
            x["codigo"] in ("NDVI_TRAMOS_SIN_LEER", "NDVI_CALIDAD_NO_DISPONIBLE") for x in respuestas["ndvi"]["advertencias"]):
        raise SystemExit("el NDVI del paquete debe salir completo (todos los tramos y con calidad); reintenta cuando ORNL responda")
    validar(respuestas["ndvi"], "ndvi#", f"NDVI MODIS ({len(respuestas['ndvi']['serie'])} compuestos)")

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
    "validadoContra": ["serie-clima", "suelo", "parcela (terreno y celdas)", "proxima-temporada"] + (["ndvi"] if args.con_ndvi else []),
    "entradas": entradas,
}
(DEMO / "manifiesto.json").write_text(json.dumps(manifiesto, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
peso = sum(p.stat().st_size for p in DEMO.rglob("*") if p.is_file())
print(f"paquete: {len(entradas)} archivos, {peso / 1024:.0f} KB en datos/demo/")
