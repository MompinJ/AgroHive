"""Extracto ligero de SIAP para todo Mexico: presencia de temporal por municipio y una rejilla punto -> municipio.

Lo usa GET /api/calendario como capa local encima de la base mundial (GGCMI): en cualquier municipio de Mexico, la
presencia de cada cultivo (`registrado` / `no_registrado`) sale del cierre agricola municipal de SIAP 2021-2025, modalidad
temporal. No da ventanas de siembra (SIAP no las publica).

Entradas (se descargan a datos/cache/siap/, ignorada por git):
- SIAP, cierre de la produccion agricola municipal 2021-2025 (datos abiertos), un CSV por ano.
- geoBoundaries gbOpen MEX ADM2 (municipios, CC BY 4.0) y ADM1 (estados, CC BY 3.0 IGO), geometria simplificada,
  en commits fijos del repositorio wmgeolab/geoBoundaries.

Salidas (en datos/calendario/):
- `siap-mexico.npz`: rejilla de 0.01 grados con el indice del municipio (0 = sin municipio o sin pareja en SIAP).
- `siap-mexico.json`: municipios (clave INEGI y nombre), presencia por cultivo de AgroHive y temporada, y el informe del
  emparejamiento de nombres geoBoundaries -> SIAP (los que no se emparejaron quedan sin presencia, no se adivinan).

Uso (desde la raiz del repo, con el entorno de la API):
    python datos/calendario/extraer_siap_mexico.py            # descarga (unos 50 MB) y escribe el extracto
    python datos/calendario/extraer_siap_mexico.py --sin-red  # rehace el extracto con lo ya descargado
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import numpy as np
from rasterio import features
from rasterio.transform import from_origin

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = Path(__file__).resolve().parent
ANIOS = (2021, 2022, 2023, 2024, 2025)
URL_SIAP = "https://nube.agricultura.gob.mx/index.php?view=10AE434F-A2158368-A120BC5A-EDF4AFAA&ANIO={anio}"
URL_PORTAL_SIAP = "https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php"
URL_ADM2 = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/MEX/ADM2/geoBoundaries-MEX-ADM2_simplified.geojson"
URL_ADM1 = "https://github.com/wmgeolab/geoBoundaries/raw/90a1d52/releaseData/gbOpen/MEX/ADM1/geoBoundaries-MEX-ADM1_simplified.geojson"
# Rejilla: cubre Mexico continental e islas cercanas.
OESTE, NORTE, PASO = -118.5, 32.8, 0.01
COLUMNAS, FILAS = 3200, 1840

# Cultivo de AgroHive -> nombre exacto en SIAP. None: SIAP no lo separa o el nombre no es el mismo producto.
CULTIVO_SIAP = {
    "maiz": "Maíz grano", "frijol": "Frijol", "calabaza": "Calabaza", "chile": "Chile verde", "sorgo": "Sorgo grano",
    "sandia": "Sandía", "camote": "Camote", "cacahuate": "Cacahuate", "soya": "Soya", "caupi": None,
    "haba": "Haba grano", "chicharo": "Chícharo", "lenteja": "Lenteja", "ejote": "Ejote", "cebada": "Cebada grano",
    "trigo": "Trigo grano", "avena": "Avena grano", "maiz_dulce": None, "yuca": "Yuca alimenticia",
    "cana": "Caña de azúcar", "ajonjoli": "Ajonjolí", "girasol": "Girasol", "algodon": "Algodón hueso",
    "cartamo": "Cártamo", "higuerilla": "Higuerilla", "tomate": "Tomate rojo (jitomate)", "papa": "Papa",
    "calabacita": "Calabacita", "cebolla": "Cebolla", "pepino": "Pepino", "melon": "Melón", "lechuga": "Lechuga",
    "zanahoria": "Zanahoria", "berenjena": "Berenjena", "brocoli": "Brócoli", "col": "Col (repollo)",
    "coliflor": "Coliflor", "espinaca": "Espinaca", "rabano": "Rábano", "betabel": "Betabel",
}
CICLO = {"PV": "Primavera-Verano", "OI": "Otoño-Invierno"}
CICLO_PROPIO = {"cana": "Perennes"}  # perenne: SIAP no la separa por temporada
# geoBoundaries ADM1 (shapeName) -> clave INEGI de la entidad.
ESTADO_INEGI = {
    "Aguascalientes": "01", "Baja California": "02", "Baja California Sur": "03", "Campeche": "04",
    "Coahuila de Zaragoza": "05", "Colima": "06", "Chiapas": "07", "Chihuahua": "08", "Distrito Federal": "09",
    "Durango": "10", "Guanajuato": "11", "Guerrero": "12", "Hidalgo": "13", "Jalisco": "14", "Mexico": "15",
    "Michoacan de Ocampo": "16", "Morelos": "17", "Nayarit": "18", "Nuevo Leon": "19", "Oaxaca": "20", "Puebla": "21",
    "Queretaro de Arteaga": "22", "Quintana Roo": "23", "San Luis Potosi": "24", "Sinaloa": "25", "Sonora": "26",
    "Tabasco": "27", "Tamaulipas": "28", "Tlaxcala": "29", "Veracruz de Ignacio de la Llave": "30", "Yucatan": "31",
    "Zacatecas": "32",
}


def normal(nombre: str) -> str:
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def _parecido(geo: str, siap: str) -> bool:
    """Nombre largo contra corto, por palabras completas y solo si queda un candidato en el estado. SIAP puede traer el
    nombre completo ("Cintalapa de Figueroa", "Heroica Villa de San Blas Atempa"); geoBoundaries puede traer de mas solo
    al final ("Villa de Tututepec de Melchor Ocampo"). Asi "San Pedro Garza Garcia" no cae en "Garcia"."""
    if not geo or not siap or geo == siap:
        return False
    if len(siap) > len(geo):
        return f" {geo} " in f" {siap} "
    return geo.startswith(siap + " ")


def _bajar(url: str, ruta: Path, sin_red: bool) -> Path:
    if not ruta.exists():
        if sin_red:
            raise SystemExit(f"falta {ruta} y se pidio --sin-red")
        print("descargando", url, file=sys.stderr)
        req = urllib.request.Request(url, headers={"User-Agent": "agrohive-datos"})
        with urllib.request.urlopen(req, timeout=300) as r:
            ruta.write_bytes(r.read())
    return ruta


def _leer_siap(carpeta: Path, sin_red: bool):
    municipios, presencia = {}, defaultdict(lambda: defaultdict(dict))
    por_nombre = {v: k for k, v in CULTIVO_SIAP.items() if v}
    for anio in ANIOS:
        ruta = _bajar(URL_SIAP.format(anio=anio), carpeta / f"cierre_agricola_mun_{anio}.csv", sin_red)
        with ruta.open(encoding="latin-1", newline="") as f:
            for r in csv.DictReader(f):
                clave = (f"{int(r['Idestado']):02d}", f"{int(r['Idmunicipio']):03d}")
                municipios[clave] = (r["Nomestado"], r["Nommunicipio"])
                cultivo = por_nombre.get(r["Nomcultivo"])
                if not cultivo or r["Nommodalidad"] != "Temporal" or float(r["Sembrada"] or 0) <= 0:
                    continue
                ciclo = r["Nomcicloproductivo"]
                temporadas = ("PV", "OI") if CICLO_PROPIO.get(cultivo) == ciclo else [t for t, c in CICLO.items() if c == ciclo and cultivo not in CICLO_PROPIO]
                for t in temporadas:
                    previo = presencia[clave][f"{cultivo}|{t}"]
                    previo[anio] = previo.get(anio, 0.0) + float(r["Sembrada"])
    return municipios, presencia


def _formas(geo: dict):
    return [(f["geometry"], i + 1) for i, f in enumerate(geo["features"])]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--descargas", type=Path, default=RAIZ / "datos" / "cache" / "siap")
    p.add_argument("--sin-red", action="store_true")
    a = p.parse_args()
    a.descargas.mkdir(parents=True, exist_ok=True)
    municipios, presencia = _leer_siap(a.descargas, a.sin_red)
    adm2 = json.loads(_bajar(URL_ADM2, a.descargas / "geoBoundaries-MEX-ADM2_simplified.geojson", a.sin_red).read_text(encoding="utf-8"))
    adm1 = json.loads(_bajar(URL_ADM1, a.descargas / "geoBoundaries-MEX-ADM1_simplified.geojson", a.sin_red).read_text(encoding="utf-8"))
    transform = from_origin(OESTE, NORTE, PASO, PASO)
    forma = (FILAS, COLUMNAS)
    estados = features.rasterize(_formas(adm1), out_shape=forma, transform=transform, dtype="uint8")
    rejilla = features.rasterize(_formas(adm2), out_shape=forma, transform=transform, dtype="uint16")
    # Municipios mas chicos que una celda: se queman con all_touched para que no desaparezcan.
    cuenta = np.bincount(rejilla.ravel(), minlength=len(adm2["features"]) + 1)
    chicos = [(g, v) for g, v in _formas(adm2) if cuenta[v] == 0]
    if chicos:
        extra = features.rasterize(chicos, out_shape=forma, transform=transform, dtype="uint16", all_touched=True)
        rejilla = np.where(extra > 0, extra, rejilla)
    clave_estado = {i + 1: ESTADO_INEGI[f["properties"]["shapeName"]] for i, f in enumerate(adm1["features"])}
    siap_por_estado = defaultdict(dict)
    for (ent, mun), (_, nombre) in municipios.items():
        siap_por_estado[ent].setdefault(normal(nombre), []).append(mun)
    tabla, indice, sin_pareja = [], {}, []
    salida = np.zeros(forma, dtype=np.uint16)
    for i, f in enumerate(adm2["features"]):
        v = i + 1
        celdas = rejilla == v
        if not celdas.any():
            sin_pareja.append({"geoBoundaries": f["properties"]["shapeName"], "motivo": "sin celdas en la rejilla"})
            continue
        votos = Counter(estados[celdas].tolist())
        votos.pop(0, None)
        if not votos:
            sin_pareja.append({"geoBoundaries": f["properties"]["shapeName"], "motivo": "fuera de los estados de ADM1"})
            continue
        ent = clave_estado[votos.most_common(1)[0][0]]
        n = normal(f["properties"]["shapeName"])
        candidatos = siap_por_estado[ent].get(n, [])
        if not candidatos:
            candidatos = [m for k, ms in siap_por_estado[ent].items() if _parecido(n, k) for m in ms]
        if len(set(candidatos)) != 1:
            sin_pareja.append({"geoBoundaries": f["properties"]["shapeName"], "estado": ent,
                               "motivo": "sin nombre igual en SIAP" if not candidatos else f"{len(set(candidatos))} municipios de SIAP posibles"})
            continue
        clave = (ent, candidatos[0])
        if clave not in indice:
            indice[clave] = len(tabla) + 1
            tabla.append(clave)
        salida[celdas] = indice[clave]
    filas = []
    for ent, mun in tabla:
        nom_estado, nom_mun = municipios[(ent, mun)]
        pres = {k: {str(anio): round(ha, 1) for anio, ha in sorted(v.items())} for k, v in sorted(presencia[(ent, mun)].items())}
        filas.append({"ent": ent, "mun": mun, "estado": nom_estado, "municipio": nom_mun, "presencia": pres})
    np.savez_compressed(SALIDA / "siap-mexico.npz", municipio=salida,
                        rejilla=np.array([OESTE, NORTE, PASO], dtype=np.float64))
    (SALIDA / "siap-mexico.json").write_text(json.dumps({
        "fuente": "SIAP, cierre de la produccion agricola municipal (datos abiertos), modalidad temporal, superficie sembrada",
        "url": URL_PORTAL_SIAP, "anios": list(ANIOS), "generado": date.today().isoformat(),
        "limites": {"municipios": URL_ADM2, "licenciaMunicipios": "CC BY 4.0 (geoBoundaries gbOpen, fuente World Bank, ano 2012)",
                    "estados": URL_ADM1, "licenciaEstados": "CC BY 3.0 IGO (geoBoundaries gbOpen)",
                    "rejilla": f"{PASO} grados desde {OESTE} E, {NORTE} N; {COLUMNAS} columnas x {FILAS} filas"},
        "cultivoSiap": CULTIVO_SIAP, "cicloPropio": CICLO_PROPIO,
        "municipios": filas,
        "sinPareja": sin_pareja,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(tabla)} municipios con pareja; {len(sin_pareja)} sin pareja de {len(adm2['features'])}; "
          f"{len(municipios)} municipios en SIAP", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
