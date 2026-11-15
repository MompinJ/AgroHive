"""Paises de Natural Earth 1:110m (v5.1.2) para `pais()` de GET /api/calendario: solo iso, nombre (ADMIN) y geometria;
`unidos` lista las piezas de Natural Earth que se sumaron a ese pais.

Natural Earth es dominio publico. Su campo ISO_A2 vale -99 en paises con un caso especial de ISO (Francia y Noruega por sus
territorios de ultramar, Kosovo, Chipre del Norte, Somalilandia): filtrar por ISO_A2 los dejaba fuera y la API respondia 422
en toda Francia (R9, 15/11/2026). Por eso el codigo sale en este orden:
1. ISO_A2, si no es -99.
2. ISO_A2_EH ("ISO_A2 con excepciones", el respaldo que trae el mismo Natural Earth): FR, NO, XK (Kosovo, codigo de uso
   comun que ISO 3166 reserva para uso de usuario).
3. Para los dos que ni asi tienen codigo (Chipre del Norte y Somalilandia), el pais de ISO 3166-1 que los contiene (CY y SO),
   en RESPALDO_SOBERANO. Es una regla de esta tabla, no un dato de Natural Earth, y se declara en LEEME.md.
Las piezas con el mismo codigo se unen en un solo MultiPolygon, para que la busqueda por cercania a la costa no las cuente
como dos paises. Nunca queda un -99: el script falla si aparece uno.

Uso (desde la raiz del repo):
    python datos/calendario/extraer_paises.py            # descarga el GeoJSON (0.8 MB) a datos/cache/natural-earth/
    python datos/calendario/extraer_paises.py --sin-red  # con lo ya descargado
"""
import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = Path(__file__).resolve().parent / "paises-110m.json"
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_admin_0_countries.geojson"
# ADM0_A3 de Natural Earth -> codigo ISO 3166-1 del pais que lo contiene.
RESPALDO_SOBERANO = {"CYN": "CY", "SOL": "SO"}
ISO = re.compile(r"^[A-Z]{2}$")


def codigo(p: dict) -> str:
    for c in (p.get("ISO_A2"), p.get("ISO_A2_EH"), RESPALDO_SOBERANO.get(p.get("ADM0_A3"))):
        if c and ISO.match(c):
            return c
    raise SystemExit(f"sin codigo ISO para {p.get('NAME')} ({p.get('ADM0_A3')}): agregarlo a RESPALDO_SOBERANO")


def main() -> int:
    a = argparse.ArgumentParser()
    a.add_argument("--descargas", type=Path, default=RAIZ / "datos" / "cache" / "natural-earth")
    a.add_argument("--sin-red", action="store_true")
    a = a.parse_args()
    a.descargas.mkdir(parents=True, exist_ok=True)
    ruta = a.descargas / Path(URL).name
    if not ruta.exists():
        if a.sin_red:
            raise SystemExit(f"falta {ruta}")
        print("descargando", URL, file=sys.stderr)
        with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "agrohive-datos"}), timeout=120) as r:
            ruta.write_bytes(r.read())
    paises: dict[str, dict] = {}
    for f in json.loads(ruta.read_text(encoding="utf-8"))["features"]:
        p, g = f["properties"], f["geometry"]
        iso = codigo(p)
        partes = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        propio = iso == p.get("ISO_A2")  # el nombre del pais unido es el del que trae su ISO_A2 propio
        if iso in paises:
            paises[iso]["geometry"]["coordinates"].extend(partes)
            if propio:
                paises[iso]["unidos"].append(paises[iso]["nombre"])
                paises[iso]["nombre"] = p["ADMIN"]
            else:
                paises[iso]["unidos"].append(p["ADMIN"])
        else:
            paises[iso] = {"iso": iso, "nombre": p["ADMIN"], "geometry": {"type": "MultiPolygon", "coordinates": partes},
                           "unidos": []}
    salida = []
    for x in paises.values():
        if not x["unidos"]:
            del x["unidos"]
            if len(x["geometry"]["coordinates"]) == 1:
                x["geometry"] = {"type": "Polygon", "coordinates": x["geometry"]["coordinates"][0]}
        salida.append(x)
    SALIDA.write_text(json.dumps(salida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(salida)} paises en {SALIDA}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
