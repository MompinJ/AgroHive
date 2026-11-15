"""Graba las parcelas de ejemplo mundiales (decision de Mompin, 15/11): datos reales de la API, validados contra contratos/.

Necesita red. Sin llaves: SMAP necesita EARTHDATA_TOKEN; si no esta en el entorno, SMAP se pide al servidor publico del equipo
(--servidor), que lo tiene configurado. Uso, desde la raiz del repo:

    api/.venv/bin/python herramientas/ejemplos/grabar.py                       # todos los lugares, todo
    api/.venv/bin/python herramientas/ejemplos/grabar.py --id iowa-story       # un lugar (se puede repetir --id)
    api/.venv/bin/python herramientas/ejemplos/grabar.py --solo calendario     # solo regraba el calendario (y el indice)
    api/.venv/bin/python herramientas/ejemplos/grabar.py --solo indice         # solo rearma indice.json con lo grabado

Lugares y geometria: herramientas/ejemplos/lugares.json. La cuadricula sale de web/src/geo/cuadricula.ts (la misma del front),
compilada con Vite (front.ts, que tambien calcula el clima de Koppen-Geiger del indice). Cada lugar se graba en un proceso aparte, con su propia cache temporal, igual que
datos/demo/generar.py: llama a la API por dentro (TestClient, el mismo codigo del servidor) y valida cada respuesta contra su
schema. Salida en datos/demo/ejemplos/<id>/:

    parcela.json          la parcela con la elevacion y pendiente reales de cada celda
    respuestas/*.json     el cuerpo de cada respuesta tal cual (serie-clima, suelo, terreno, proxima-temporada, calendario,
                          ndvi, smap, plagas, cdl, ssurgo); lo que el front carga sin red
    cache/                la cache de la API (para servir sin red esa coordenada; herramientas/demo-sin-red.sh la junta)
    manifiesto.json       fecha, ventana, version del contrato y el estado de cada dato

Nunca se inventa un dato: si una fuente no responde, su archivo no se escribe y el manifiesto lo marca NO_EVALUABLE con el
motivo. El clima es obligatorio (sin el no hay motor): si POWER no responde, ese lugar no se graba y se conserva lo anterior.
"""
import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
AQUI = Path(__file__).resolve().parent
SALIDA = RAIZ / "datos" / "demo" / "ejemplos"
CONTRATOS = RAIZ / "contratos"
SERVIDOR = "https://64-23-143-102.sslip.io"
LADO_CALENTAMIENTO_M = 20.0  # cuadricula auxiliar que deja en cache los tiles de elevacion de la parcela y su margen
MARGEN_M = 60.0
DATOS = ("clima", "suelo", "terreno", "proxima-temporada", "calendario", "plagas", "ndvi", "smap", "cdl", "ssurgo", "worldcover")
AVISO_PARCELA = ("Parcela de ejemplo, no es un levantamiento: poligono ficticio de unas 2.8 ha sobre tierra de cultivo real "
                 "(ESA WorldCover 2021). Clima, suelo, terreno y evidencia son datos reales de la API para esa coordenada.")

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--id", action="append", help="lugar a grabar (por defecto, todos los de lugares.json)")
ap.add_argument("--solo", help="lista separada por comas de datos a regrabar (" + ", ".join(DATOS) + ") o 'indice'")
ap.add_argument("--servidor", default=SERVIDOR, help="API publica para SMAP cuando no hay EARTHDATA_TOKEN")
ap.add_argument("--paralelo", type=int, default=6)
ap.add_argument("--_lugar", help=argparse.SUPPRESS)  # uso interno: un proceso por lugar
ap.add_argument("--_parcelas", help=argparse.SUPPRESS)
args = ap.parse_args()

DEFINICION = json.loads((AQUI / "lugares.json").read_text(encoding="utf-8"))
LUGARES = {l["id"]: l for l in DEFINICION["lugares"]}


def escribir_json(ruta: Path, cuerpo, compacto=True):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(cuerpo, ensure_ascii=False, separators=(",", ":")) if compacto else json.dumps(cuerpo, ensure_ascii=False, indent=2)
    ruta.write_text(texto + "\n", encoding="utf-8")


def compilar_front() -> Path:
    """Compila front.ts con Vite (--ssr): la cuadricula y el clima salen del mismo codigo del front."""
    web = RAIZ / "web"
    destino = web / "node_modules" / ".ejemplos"
    subprocess.run(["npx", "vite", "build", "--ssr", str(AQUI / "front.ts"), "--outDir", str(destino), "--emptyOutDir", "--logLevel", "error"],
                   cwd=web, check=True)
    return destino / "front.js"


def correr_front(*argumentos) -> dict:
    salida = subprocess.run(["node", str(compilar_front()), *map(str, argumentos)], cwd=RAIZ / "web", check=True, capture_output=True, text=True)
    return json.loads(salida.stdout)


def armar_parcelas() -> Path:
    """{id: parcela sin terreno} en un archivo temporal, para los procesos de cada lugar."""
    archivo = Path(tempfile.mkstemp(prefix="agrohive-parcelas-", suffix=".json")[1])
    archivo.write_text(json.dumps(correr_front("parcelas", AQUI / "lugares.json")), encoding="utf-8")
    return archivo


# ---------------------------------------------------------------------------------------------------------------------------
# Indice (proceso principal)
# ---------------------------------------------------------------------------------------------------------------------------

def armar_indice():
    grabados = [l["id"] for l in DEFINICION["lugares"] if (SALIDA / l["id"] / "respuestas" / "serie-clima.json").exists()]
    climas = correr_front("clima", SALIDA, *grabados) if grabados else {}
    ejemplos = []
    for l in DEFINICION["lugares"]:
        man_ruta = SALIDA / l["id"] / "manifiesto.json"
        if not man_ruta.exists():
            continue
        man = json.loads(man_ruta.read_text(encoding="utf-8"))
        parcela = json.loads((SALIDA / l["id"] / "parcela.json").read_text(encoding="utf-8"))
        ejemplos.append({
            "id": l["id"], "nombre": l["nombre"], "pais": l["pais"], "paisIso": l["paisIso"], "continente": l["continente"],
            "ubicacion": l["ubicacion"], "centroide": parcela["centroide"], "areaHa": round(parcela["areaHa"], 2), "celdas": len(parcela["celdas"]),
            "cultivosSugeridos": l["cultivosSugeridos"], "porQue": l["porQue"],
            "clima": climas.get(l["id"]),
            "grabado": man["grabado"], "versionContrato": man["versionContrato"],
            "datos": {k: v["estado"] for k, v in man["datos"].items()},
        })
    indice = {
        "aviso": "Parcelas de ejemplo, no son levantamientos: poligonos ficticios sobre tierra de cultivo real, con datos reales de la API "
                 "grabados en la fecha indicada. Los cultivos sugeridos son ejemplos de la region, no una recomendacion.",
        "regenerar": "api/.venv/bin/python herramientas/ejemplos/grabar.py (ver datos/demo/ejemplos/LEEME.md)",
        "ejemplos": ejemplos,
    }
    escribir_json(SALIDA / "indice.json", indice, compacto=False)
    print(f"indice.json: {len(ejemplos)} ejemplos")


# ---------------------------------------------------------------------------------------------------------------------------
# Un lugar (proceso hijo, con su propia cache)
# ---------------------------------------------------------------------------------------------------------------------------

def grabar_lugar(id_: str, parcelas_json: str, solo: set[str] | None):
    lugar = LUGARES[id_]
    destino = SALIDA / id_
    tmp = tempfile.mkdtemp(prefix=f"agrohive-ejemplo-{id_}-")
    os.environ["AGROHIVE_CACHE_DIR"] = tmp
    # Grabacion completa: no se lee ningun paquete. Con --solo se reutiliza la cache ya grabada del lugar (por ejemplo, las ventanas de
    # NDVI completas) y solo se pide lo que falta; lo nuevo se suma a esa cache al final.
    os.environ["AGROHIVE_DEMO_DIR"] = str(destino / "cache") if solo is not None and (destino / "cache").exists() else str(Path(tmp) / "_sin_paquete")
    sys.path.insert(0, str(RAIZ / "api"))
    import asyncio

    import httpx
    from fastapi.testclient import TestClient
    from jsonschema import Draft202012Validator
    from referencing import Registry, Resource

    from app import servicios
    from app.main import app

    base = "https://agrohive.example/contratos/"
    registro = Registry().with_resources([(c["$id"], Resource.from_contents(c)) for c in
                                          (json.loads(f.read_text(encoding="utf-8")) for f in CONTRATOS.glob("*.schema.json"))])

    def validar(instancia, ref: str):
        archivo, _, ruta = ref.partition("#")
        errores = list(Draft202012Validator({"$ref": f"{base}{archivo}.schema.json#{ruta}"}, registry=registro).iter_errors(instancia))
        if errores:
            raise ValueError(f"no cumple {ref}: {errores[0].message} (en {list(errores[0].absolute_path)})")

    def log(msg):
        print(f"[{id_}] {msg}", flush=True)

    parcela = json.loads(Path(parcelas_json).read_text(encoding="utf-8"))[id_]
    lon, lat = parcela["centroide"]
    desde, hasta = servicios.VENTANA_ESTANDAR
    cliente = TestClient(app)
    hacer = (lambda d: True) if solo is None else (lambda d: d in solo)
    man_previo = json.loads((destino / "manifiesto.json").read_text(encoding="utf-8")) if (destino / "manifiesto.json").exists() else None
    if solo is not None and man_previo is None:
        raise SystemExit(f"[{id_}] no hay grabacion previa: corre sin --solo primero")
    estados: dict = dict(man_previo["datos"]) if man_previo else {}
    respuestas: dict = {}

    def falta(dato, motivo):
        estados[dato] = {"estado": "NO_EVALUABLE", "motivo": motivo}
        log(f"{dato}: NO_EVALUABLE ({motivo})")

    def ok(dato, archivo, cuerpo, ref, detalle=""):
        validar(cuerpo, ref)
        respuestas[archivo] = cuerpo
        estados[dato] = {"estado": cuerpo.get("estado", "EVALUABLE") if isinstance(cuerpo, dict) else "EVALUABLE", "archivo": f"respuestas/{archivo}.json", "contrato": ref}
        log(f"{dato}: cumple {ref} {detalle}")

    def pedir(ruta, intentos=2, **kw):
        ultimo = None
        for _ in range(intentos):
            ultimo = cliente.get(ruta, params=kw)
            if ultimo.status_code == 200:
                return ultimo
        return ultimo

    def motivo_de(r):
        try:
            cuerpo = r.json()
            return cuerpo.get("motivo") or cuerpo.get("detail") or r.text[:200]
        except ValueError:
            return f"HTTP {r.status_code}"

    # Clima: obligatorio y de NASA POWER.
    if hacer("clima"):
        r = pedir("/api/clima", intentos=3, lat=lat, lon=lon, desde=desde.isoformat(), hasta=hasta.isoformat())
        if r.status_code != 200 or r.json()["estado"] != "EVALUABLE":
            raise SystemExit(f"[{id_}] clima: debe salir de NASA POWER (EVALUABLE); la API respondio {r.status_code} {motivo_de(r) if r.status_code != 200 else r.json()['estado']}. No se graba este lugar.")
        ok("clima", "serie-clima", r.json(), "serie-clima#", f"({len(r.json()['diario'])} dias)")

    if hacer("suelo"):
        r = pedir("/api/suelo", lat=lat, lon=lon)
        if r.status_code == 200:
            ok("suelo", "suelo", r.json(), "suelo#", f"({r.json()['textura'].get('clase')})")
        else:
            falta("suelo", f"/api/suelo respondio {r.status_code}: {motivo_de(r)}")

    if hacer("terreno"):
        celdas = [{k: c[k] for k in ("id", "i", "j", "centro")} for c in parcela["celdas"]]
        m_lat = LADO_CALENTAMIENTO_M / 111_320.0
        m_lon = LADO_CALENTAMIENTO_M / (111_320.0 * math.cos(math.radians(lat)))
        lons, lats = [p[0] for p in parcela["poligono"]], [p[1] for p in parcela["poligono"]]
        n_i = math.ceil((max(lats) - min(lats)) / m_lat + 2 * MARGEN_M / LADO_CALENTAMIENTO_M)
        n_j = math.ceil((max(lons) - min(lons)) / m_lon + 2 * MARGEN_M / LADO_CALENTAMIENTO_M)
        lat0, lon0 = min(lats) - MARGEN_M / 111_320.0, min(lons) - MARGEN_M / (111_320.0 * math.cos(math.radians(lat)))
        aux = [{"id": f"c-{i}-{j}", "i": i, "j": j, "centro": [round(lon0 + j * m_lon, 7), round(lat0 + i * m_lat, 7)]} for i in range(n_i) for j in range(n_j)]
        cliente.post("/api/elevacion", json={"tamanoCeldaM": LADO_CALENTAMIENTO_M, "celdas": aux})
        r = cliente.post("/api/elevacion", json={"tamanoCeldaM": parcela["tamanoCeldaM"], "celdas": celdas})
        if r.status_code == 200:
            cuerpo = r.json()
            validar(cuerpo["meta"], "comun#/$defs/meta")
            validar(cuerpo["terreno"], "parcela#/properties/terreno")
            respuestas["terreno"] = cuerpo
            estados["terreno"] = {"estado": cuerpo["terreno"]["estado"], "archivo": "respuestas/terreno.json", "contrato": "parcela#/properties/terreno"}
            log(f"terreno: {cuerpo['terreno']['estado']} ({len(celdas)} celdas)")
        else:
            falta("terreno", f"/api/elevacion respondio {r.status_code}: {motivo_de(r)}")

    if hacer("proxima-temporada"):
        r = pedir("/api/proxima-temporada", lat=lat, lon=lon)
        if r.status_code == 200:
            ok("proxima-temporada", "proxima-temporada", r.json(), "proxima-temporada#", f"({r.json()['metodo']})")
        else:
            falta("proxima-temporada", f"/api/proxima-temporada respondio {r.status_code}: {motivo_de(r)}")

    if hacer("calendario"):
        r = pedir("/api/calendario", intentos=1, lat=lat, lon=lon)
        if r.status_code == 200:
            evaluables = sum(1 for e in r.json()["entradas"] if e["ventana"]["estado"] == "EVALUABLE")
            ok("calendario", "calendario", r.json(), "calendario-local#", f"({evaluables} entradas evaluables)")
            estados["calendario"]["estado"] = "EVALUABLE" if evaluables else "NO_EVALUABLE"
            estados["calendario"]["entradasEvaluables"] = evaluables
        else:
            falta("calendario", f"/api/calendario respondio {r.status_code}: {motivo_de(r)}")

    if hacer("plagas"):
        r = pedir("/api/plagas", lat=lat, lon=lon)
        if r.status_code == 200:
            ok("plagas", "plagas", r.json(), "plagas#")
        else:
            falta("plagas", f"/api/plagas respondio {r.status_code}: {motivo_de(r)}")

    if hacer("cdl"):
        r = pedir("/api/ee-uu/cdl", lat=lat, lon=lon)
        if r.status_code == 200:
            ok("cdl", "cdl", r.json(), "ee-uu#/$defs/cdl")
        else:
            falta("cdl", f"/api/ee-uu/cdl respondio {r.status_code}: {motivo_de(r)}")

    if hacer("ssurgo"):
        r = pedir("/api/ee-uu/ssurgo", lat=lat, lon=lon)
        if r.status_code == 200:
            ok("ssurgo", "ssurgo", r.json(), "ee-uu#/$defs/ssurgo")
        else:
            falta("ssurgo", f"/api/ee-uu/ssurgo respondio {r.status_code}: {motivo_de(r)}")

    if hacer("smap"):
        # Los ultimos 10 dias publicados (hasta hoy menos 3), como pide el front en vivo. Es una foto del dia de grabacion.
        hoy = datetime.now(timezone.utc).date()
        consulta = {"lat": lat, "lon": lon, "desde": (hoy - timedelta(days=12)).isoformat(), "hasta": (hoy - timedelta(days=3)).isoformat()}
        try:
            if os.environ.get("EARTHDATA_TOKEN"):
                r, origen = cliente.get("/api/smap", params=consulta), "API local"
            else:
                r, origen = httpx.get(f"{args.servidor}/api/smap", params=consulta, timeout=600), f"servidor publico {args.servidor}"
            if r.status_code == 200:
                ok("smap", "smap", r.json(), "smap#", f"({origen})")
                estados["smap"]["origen"] = origen
            else:
                falta("smap", f"/api/smap ({origen}) respondio {r.status_code}: {motivo_de(r)}")
        except httpx.HTTPError as e:
            falta("smap", f"/api/smap no respondio: {type(e).__name__}")

    if hacer("ndvi"):
        # Toda la ventana estandar (los anios de los escenarios caen ahi). La ruta limita a 400 dias: se llama a la orquestacion,
        # que pasa por el mismo modelo Ndvi (como datos/demo/generar.py).
        from app import ndvi as modulo_ndvi
        from app.modelos_ndvi import Ndvi
        try:
            cuerpo = Ndvi.model_validate(asyncio.run(modulo_ndvi.serie(lon, lat, desde, hasta))).model_dump(mode="json")
            caidos = [a["codigo"] for a in cuerpo["advertencias"] if a["codigo"] in ("NDVI_TRAMOS_SIN_LEER", "NDVI_COMPUESTOS_CON_ERROR")]
            ok("ndvi", "ndvi", cuerpo, "ndvi#", f"({len(cuerpo['serie'])} compuestos{', con ' + ' y '.join(caidos) if caidos else ''})")
        except servicios.SinDatos as e:
            falta("ndvi", f"MODIS en Planetary Computer: {e}")

    if hacer("worldcover"):
        # Evidencia de que el poligono cae en tierra de cultivo: fraccion de pixeles de ESA WorldCover 10 m 2021 (v200) con clase 40
        # (Cropland) dentro de la caja del poligono. El token SAS anonimo de Planetary Computer vive solo en memoria.
        try:
            import rasterio
            from rasterio.windows import from_bounds
            stac = httpx.post("https://planetarycomputer.microsoft.com/api/stac/v1/search", timeout=60, json={
                "collections": ["esa-worldcover"], "intersects": {"type": "Point", "coordinates": [lon, lat]}, "limit": 5}).json()
            item = max(stac["features"], key=lambda f: f["properties"].get("esa_worldcover:product_version", ""))
            token = httpx.get("https://planetarycomputer.microsoft.com/api/sas/v1/token/esa-worldcover", timeout=60).json()["token"]
            lons, lats = [p[0] for p in parcela["poligono"]], [p[1] for p in parcela["poligono"]]
            with rasterio.open(f"{item['assets']['map']['href']}?{token}") as ds:
                pix = ds.read(1, window=from_bounds(min(lons), min(lats), max(lons), max(lats), ds.transform))
            fraccion = float((pix == 40).mean())
            estados["worldcover"] = {
                "estado": "EVALUABLE", "item": item["id"], "fraccionCultivo": round(fraccion, 3), "pixeles": int(pix.size),
                "fuente": "Zanaga, D. et al. (2022). ESA WorldCover 10 m 2021 v200. doi:10.5281/zenodo.7254221. CC BY 4.0. "
                          "Servido por Microsoft Planetary Computer (coleccion esa-worldcover).",
                "nota": "Fraccion de pixeles de clase 40 (Cropland) en la caja envolvente del poligono.",
            }
            log(f"worldcover: {fraccion:.0%} de cultivo en {pix.size} pixeles")
        except Exception as e:  # noqa: BLE001 - es evidencia de apoyo; si falla, se dice
            falta("worldcover", f"ESA WorldCover (Planetary Computer) no respondio: {type(e).__name__}")

    # Todo lo pedido cumple: se escribe.
    destino.mkdir(parents=True, exist_ok=True)
    for archivo, cuerpo in respuestas.items():
        escribir_json(destino / "respuestas" / f"{archivo}.json", cuerpo)
    for dato, e in estados.items():  # un dato que ahora falta no deja su archivo viejo
        if e["estado"] == "NO_EVALUABLE" and "archivo" not in e:
            nombre = {"clima": "serie-clima"}.get(dato, dato)
            (destino / "respuestas" / f"{nombre}.json").unlink(missing_ok=True)
    if solo is None or "terreno" in solo:
        terreno = respuestas.get("terreno")
        for c in parcela["celdas"]:
            t = next((x for x in terreno["celdas"] if x["id"] == c["id"]), None) if terreno else None
            c["elevacionM"] = t["elevacionM"] if t else None
            c["pendientePct"] = t["pendientePct"] if t else None
        parcela["terreno"] = terreno["terreno"] if terreno else {
            "estado": "NO_EVALUABLE", "fuente": {"nombre": "Sin elevacion", "nota": estados["terreno"]["motivo"]}}
        if terreno and terreno.get("advertencias"):
            parcela["advertencias"] = [*parcela.get("advertencias", []), *terreno["advertencias"]]
        if respuestas.get("suelo"):
            parcela["sueloId"] = respuestas["suelo"]["id"]
        parcela["meta"] = {**parcela["meta"], "esEjemplo": True, "aviso": AVISO_PARCELA}
        validar(parcela, "parcela#")
        escribir_json(destino / "parcela.json", parcela, compacto=False)
    # La cache nueva se suma a la anterior (con --solo solo trae lo regrabado).
    if solo is None and (destino / "cache").exists():
        shutil.rmtree(destino / "cache")
    shutil.copytree(tmp, destino / "cache", ignore=shutil.ignore_patterns("_sin_paquete", "*.tmp"), dirs_exist_ok=True)
    shutil.rmtree(tmp, ignore_errors=True)
    from app.config import VERSION_CONTRATO  # noqa: E402
    manifiesto = {
        "id": id_,
        "grabado": man_previo["grabado"] if man_previo and solo is not None else datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **({"regrabado": {**(man_previo or {}).get("regrabado", {}), **{d: datetime.now(timezone.utc).isoformat(timespec="seconds") for d in solo}}} if solo else
           {"regrabado": {}}),
        "parcela": parcela["id"], "centroide": parcela["centroide"], "coordenadasIlustrativas": True,
        "ventanaClima": [desde.isoformat(), hasta.isoformat()],
        "versionContrato": VERSION_CONTRATO,
        "datos": {d: estados[d] for d in DATOS if d in estados},
        "archivos": sorted(str(p.relative_to(destino)) for p in destino.rglob("*") if p.is_file() and p.name != "manifiesto.json"),
    }
    escribir_json(destino / "manifiesto.json", manifiesto, compacto=False)
    peso = sum(p.stat().st_size for p in destino.rglob("*") if p.is_file())
    log(f"listo: {len(manifiesto['archivos'])} archivos, {peso / 1024:.0f} KB")


# ---------------------------------------------------------------------------------------------------------------------------

if args._lugar:
    grabar_lugar(args._lugar, args._parcelas, set(args.solo.split(",")) if args.solo else None)
    sys.exit(0)

ids = args.id or list(LUGARES)
desconocidos = [i for i in ids if i not in LUGARES]
if desconocidos:
    raise SystemExit(f"lugares desconocidos: {desconocidos}; ver herramientas/ejemplos/lugares.json")
if args.solo == "indice":
    armar_indice()
    sys.exit(0)
if args.solo:
    malos = set(args.solo.split(",")) - set(DATOS)
    if malos:
        raise SystemExit(f"--solo no reconoce {sorted(malos)}; opciones: {', '.join(DATOS)}, indice")

parcelas = armar_parcelas()
comando = [sys.executable, str(Path(__file__).resolve()), "--servidor", args.servidor, "--_parcelas", str(parcelas)] + (["--solo", args.solo] if args.solo else [])


def uno(id_):
    return id_, subprocess.run(comando + ["--_lugar", id_], cwd=RAIZ).returncode


with ThreadPoolExecutor(max_workers=args.paralelo) as hilos:
    resultados = dict(hilos.map(uno, ids))
parcelas.unlink(missing_ok=True)
armar_indice()
fallidos = [i for i, c in resultados.items() if c != 0]
if fallidos:
    raise SystemExit(f"no se grabaron: {fallidos} (se conserva lo anterior de esos lugares)")
print(f"grabados: {', '.join(ids)}")
