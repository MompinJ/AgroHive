"""Extracto de FAO Crop Calendar (ventanas de siembra por pais y cultivo) para GET /api/calendario.

LICENCIA: estos datos se tratan como CC BY-NC-SA 4.0 (ver LICENCIA.md de esta carpeta). No mezclar con los extractos
CC BY de la carpeta de arriba.

Fuente: FAO, Crop Calendar (By Country - crop and activity), catalogo de datos de FAO. Un CSV con, por pais, zona
agroecologica (AEZ) y cultivo, hasta cinco periodos de siembra con dia ("Nov 01 - Jan 10") o "todo el ano". FAO no publica
el limite de cada AEZ, asi que AgroHive no sabe en que zona cae un punto: por pais, cultivo y temporada se toma la UNION
de los periodos de todas las zonas; si la union es un solo tramo, esa es la ventana; si son varios tramos separados en la
misma temporada, queda ambigua (la API responde NO_EVALUABLE con los tramos en el motivo). La temporada sale del corte de
SIAP sobre el dia de inicio del tramo (PV abril-septiembre).

Uso (desde la raiz del repo):
    python datos/calendario/fao-crop-calendar/extraer_fao.py            # descarga el CSV (1.4 MB) y escribe el extracto
    python datos/calendario/fao-crop-calendar/extraer_fao.py --sin-red  # con el CSV ya descargado en datos/cache/fao/
"""
import argparse
import csv
import json
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
SALIDA = Path(__file__).resolve().parent
URL_CSV = ("https://api.data.apps.fao.org/api/v2/bigquery?sql_url=https://data.apps.fao.org/catalog/dataset/"
           "86b7daf0-4fae-450b-b88f-76690e2fdc17/resource/0026de2e-c12c-457c-b4f5-8c4cd2ef7960/download/"
           "crop-calendar-parameterized-query.sql&crop_process=all&crop=all&download=true")
URL_FICHA = "https://data.apps.fao.org/catalog/dataset/crop-calendar-by-country-crop-and-activity"
URL_PAISES = "https://api-cropcalendar.apps.fao.org/api/v1/countries?language=en"
# Cultivo de AgroHive -> (ids de cultivo de FAO, equivalencia SUPUESTO o None). Se eligieron por el nombre cientifico que
# da el catalogo de cultivos de la API de FAO (/api/v1/crops). Varios ids = misma especie; se unen.
CULTIVOS = {
    "tomate": (["0356"], None), "cebolla": (["0247"], None), "lechuga": (["0202"], None), "zanahoria": (["0073"], None),
    "berenjena": (["0132"], None), "brocoli": (["0056"], None), "col": (["0065", "0062"], None),
    "coliflor": (["0078"], None), "espinaca": (["0329"], None), "pepino": (["0119"], None),
    "melon": (["0219", "0220"], None), "sandia": (["0370"], None), "rabano": (["0293"], None),
    "betabel": (["0298"], None),
    "chile": (["0340"], "FAO 'Sweet pepper' (Capsicum annuum), la especie y el producto del catalogo; 'Pepper, chili' es C. frutescens y no se usa."),
    "calabaza": (["0332"], "FAO 'Squash, butternut' (Cucurbita moschata), la especie del catalogo."),
    "calabacita": (["0285"], "SUPUESTO: FAO 'Pumpkin' es Cucurbita pepo cosechada madura; la calabacita es la misma especie cosechada tierna."),
    "ajonjoli": (["0318"], None), "caupi": (["0117"], None), "camote": (["0341"], None), "avena": (["0241"], None),
    "cartamo": (["0311"], None), "higuerilla": (["0077"], None), "haba": (["0028"], None), "lenteja": (["0200"], None),
    "maiz": (["0338"], None), "maiz_dulce": (["0113"], None), "sorgo": (["0325"], None), "soya": (["0327"], None),
    "cacahuate": (["0262"], None),
    "trigo": (["0373", "0372"], "FAO no separa trigo de primavera y de invierno."),
    "cebada": (["0024"], None), "papa": (["0283"], None), "yuca": (["0076"], None), "cana": (["0334"], None),
    "girasol": (["0335"], None), "algodon": (["0362", "0115"], None),
    "chicharo": (["0260", "0259"], "Incluye 'Pea, dry' (grano seco) ademas de 'Pea, green': misma especie (Pisum sativum)."),
    "frijol": (["0030"], None),
    "ejote": (["0031"], "SUPUESTO: FAO 'Beans, harvested green' agrupa Phaseolus y Vigna."),
}
NOMBRES_PAIS = {"Bolivia (Plurinational State of)": "BO"}
MES = {m: i + 1 for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split())}
FECHA = re.compile(r"([A-Z][a-z]{2}) (\d{2}) - ([A-Z][a-z]{2}) (\d{2})")
PV = range(91, 274)  # 1 de abril a 30 de septiembre en un ano no bisiesto


def _dia(mes: str, dia: str) -> int:
    m = MES[mes]
    tope = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)[m - 1]
    return date(2001, m, min(int(dia), tope)).timetuple().tm_yday


def _fecha(d: int) -> tuple[int, int]:
    f = date.fromordinal(date(2001, 1, 1).toordinal() + d - 1)
    return f.month, f.day


def _tramos(dias: list) -> list | str:
    """Tramos continuos (inicio, fin) en un ano circular de 365 dias, o 'todo'."""
    if all(dias[1:]):
        return "todo"
    d0 = next(d for d in range(1, 366) if not dias[d])
    tramos, inicio, d = [], None, d0 % 365 + 1
    for _ in range(365):
        if dias[d] and inicio is None:
            inicio = d
        if not dias[d] and inicio is not None:
            tramos.append((inicio, (d - 2) % 365 + 1))
            inicio = None
        d = d % 365 + 1
    if inicio is not None:
        tramos.append((inicio, (d0 - 2) % 365 + 1))
    return tramos


def _ventana(inicio: int, fin: int) -> dict:
    (dm, dd), (hm, hd) = _fecha(inicio), _fecha(fin)
    return {"desdeMes": dm, "desdeDia": dd, "hastaMes": hm, "hastaDia": hd}


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--descargas", type=Path, default=RAIZ / "datos" / "cache" / "fao")
    p.add_argument("--sin-red", action="store_true")
    a = p.parse_args()
    a.descargas.mkdir(parents=True, exist_ok=True)
    ruta_csv, ruta_paises = a.descargas / "crop-calendar-by-country.csv", a.descargas / "countries.json"
    for url, ruta in ((URL_CSV, ruta_csv), (URL_PAISES, ruta_paises)):
        if not ruta.exists():
            if a.sin_red:
                raise SystemExit(f"falta {ruta}")
            print("descargando", url, file=sys.stderr)
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "agrohive-datos"}), timeout=300) as r:
                ruta.write_bytes(r.read())
    iso = {x["name"]: x["id"] for x in json.loads(ruta_paises.read_text(encoding="utf-8"))} | NOMBRES_PAIS
    por_id = {i: c for c, (ids, _) in CULTIVOS.items() for i in ids}
    dias = defaultdict(lambda: [False] * 366)
    zonas, ids_usados, actualizado = defaultdict(set), defaultdict(set), defaultdict(str)
    with ruta_csv.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            cultivo = por_id.get(r["cropId"])
            if r["cropProcess"] != "Sowing" or not cultivo:
                continue
            clave = (iso[r["country_name_en"]], cultivo)
            zonas[clave].add(r["aez_name"].strip())
            ids_usados[clave].add(f"{r['cropId']} {r['cropName']}")
            actualizado[clave] = max(actualizado[clave], r["lastUpdated"])
            if r["allYear"] == "yes":
                dias[clave][1:] = [True] * 365
            for k in ("period1", "period2", "period3", "period4", "period5"):
                v = r[k].strip()
                if not v:
                    continue
                m1, d1, m2, d2 = FECHA.fullmatch(v).groups()
                d, fin = _dia(m1, d1), _dia(m2, d2)
                while True:
                    dias[clave][d] = True
                    if d == fin:
                        break
                    d = d % 365 + 1
    salida = defaultdict(dict)
    for (pais, cultivo), b in sorted(dias.items()):
        t = _tramos(b)
        reg = {"zonas": sorted(zonas[(pais, cultivo)]), "productos": sorted(ids_usados[(pais, cultivo)]),
               "actualizado": actualizado[(pais, cultivo)]}
        if t == "todo":
            reg["todoElAno"] = True
            reg["PV"] = {"desdeMes": 4, "desdeDia": 1, "hastaMes": 9, "hastaDia": 30}
            reg["OI"] = {"desdeMes": 10, "desdeDia": 1, "hastaMes": 3, "hastaDia": 31}
        else:
            for temporada in ("PV", "OI"):
                de_t = [x for x in t if (x[0] in PV) == (temporada == "PV")]
                if len(de_t) == 1:
                    reg[temporada] = _ventana(*de_t[0])
                elif de_t:
                    reg[temporada] = {"ambiguo": [_ventana(*x) for x in de_t]}
        salida[pais][cultivo] = reg
    (SALIDA / "fao-crop-calendar.json").write_text(json.dumps({
        "fuente": "FAO, Crop Calendar (By Country - crop and activity)", "ficha": URL_FICHA,
        "app": "https://cropcalendar.apps.fao.org", "licenciaUsada": "CC BY-NC-SA 4.0 (la mas restrictiva de las fichas de FAO; ver LICENCIA.md)",
        "generado": date.today().isoformat(),
        "metodo": ("Union de los periodos de siembra de todas las zonas agroecologicas del pais (FAO no publica sus limites); "
                   "un tramo por temporada = ventana; varios tramos separados = ambiguo. Temporada por el dia de inicio con el "
                   "corte de SIAP (PV abril-septiembre). FAO no separa riego y temporal."),
        "cultivos": {c: {"ids": ids, "nota": nota} for c, (ids, nota) in CULTIVOS.items()},
        "paises": salida,
    }, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    n = sum(len(v) for v in salida.values())
    print(f"{len(salida)} paises, {n} pares pais-cultivo", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
