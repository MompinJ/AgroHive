"""Extracto ligero de MIRCA2000 v1.1 (calendarios por celda de 30 minutos, temporal) para GET /api/calendario.

MIRCA2000 (Portmann, Siebert y Döll 2010, Global Biogeochemical Cycles 24, GB1011; datos v1.1 en Zenodo,
doi:10.5281/zenodo.7422506, CC BY 4.0) da, por celda de 0.5 grados y clase de cultivo, hasta 9 subcultivos con su area
cosechada (ha, hacia el ano 2000) y el mes de inicio y de fin del periodo de crecimiento.

De `growing_periods_listed.zip` (172 MB) solo se lee `CELL_SPECIFIC_CROPPING_CALENDARS_30MN.TXT.gz` (8.7 MB) con
peticiones por rangos HTTP, sin bajar el zip entero; zipfile comprueba su CRC32. Salida `mirca-rf.npz`:
- `area_<clase>`: area cosechada de temporal por celda (ha, float32) de las clases que mapean a cultivos de AgroHive.
- `pulses_inicio`, `pulses_fin` (mes 1-12, 0 = sin subcultivo) y `pulses_area` de hasta 3 subcultivos de Pulses.

Uso (desde la raiz del repo, con el entorno de la API):
    python datos/calendario/extraer_mirca.py            # descarga 8.7 MB a datos/cache/mirca/ y escribe el extracto
    python datos/calendario/extraer_mirca.py --sin-red  # con lo ya descargado
"""
import argparse
import gzip
import io
import json
import sys
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = Path(__file__).resolve().parent
URL_ZIP = "https://zenodo.org/records/7422506/files/growing_periods_listed.zip?download=1"
MIEMBRO = "growing_periods_listed/CELL_SPECIFIC_CROPPING_CALENDARS_30MN.TXT.gz"
# Clases de MIRCA (1-26 riego, 27-52 temporal = clase + 26) que el extracto guarda.
CLASES = {1: "wheat", 2: "maize", 4: "barley", 7: "sorghum", 8: "soybeans", 9: "sunflower", 10: "potatoes",
          11: "cassava", 12: "sugar_cane", 16: "groundnuts", 17: "pulses", 21: "cotton"}
PULSES = 17
MAX_SUB = 3


class _ArchivoHttp(io.RawIOBase):
    """Archivo de solo lectura sobre una URL: cada lectura es una peticion por rango."""

    def __init__(self, url: str):
        r = urllib.request.urlopen(urllib.request.Request(url, method="HEAD"), timeout=60)
        self.url, self.tam, self.pos = r.geturl(), int(r.headers["Content-Length"]), 0

    def readable(self):
        return True

    def seekable(self):
        return True

    def tell(self):
        return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.tam + off
        return self.pos

    def readinto(self, b):
        if self.pos >= self.tam:
            return 0
        fin = min(self.tam, self.pos + len(b)) - 1
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{fin}"})
        datos = urllib.request.urlopen(req, timeout=300).read()
        b[: len(datos)] = datos
        self.pos += len(datos)
        return len(datos)


def _bajar(ruta: Path) -> None:
    print("leyendo por rangos", URL_ZIP, file=sys.stderr)
    with zipfile.ZipFile(io.BufferedReader(_ArchivoHttp(URL_ZIP), buffer_size=1 << 20)) as z, z.open(MIEMBRO) as src:
        ruta.write_bytes(src.read())  # zipfile lanza BadZipFile si el CRC32 no coincide


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--descargas", type=Path, default=RAIZ / "datos" / "cache" / "mirca")
    p.add_argument("--sin-red", action="store_true")
    a = p.parse_args()
    a.descargas.mkdir(parents=True, exist_ok=True)
    ruta = a.descargas / Path(MIEMBRO).name
    if not ruta.exists():
        if a.sin_red:
            raise SystemExit(f"falta {ruta}")
        _bajar(ruta)
    area = {c: np.zeros((360, 720), np.float32) for c in CLASES}
    inicio = np.zeros((MAX_SUB, 360, 720), np.uint8)
    fin = np.zeros((MAX_SUB, 360, 720), np.uint8)
    area_p = np.zeros((MAX_SUB, 360, 720), np.float32)
    with gzip.open(ruta, "rt") as f:
        next(f)
        for linea in f:
            _, _, _, lat, lon, cultivo, sub, ha, ini, fi = linea.split()
            clase = int(cultivo) - 26
            if clase not in CLASES or float(ha) <= 0:
                continue
            i, j = round((89.75 - float(lat)) / 0.5), round((float(lon) + 179.75) / 0.5)
            area[clase][i, j] += float(ha)
            k = int(sub) - 1
            if clase == PULSES and k < MAX_SUB:
                inicio[k, i, j], fin[k, i, j], area_p[k, i, j] = int(ini), int(fi), float(ha)
    np.savez_compressed(SALIDA / "mirca-rf.npz", pulses_inicio=inicio, pulses_fin=fin, pulses_area=area_p,
                        **{f"area_{n}": area[c] for c, n in CLASES.items()})
    (SALIDA / "mirca-rf.json").write_text(json.dumps({
        "producto": "MIRCA2000 v1.1, cell-specific cropping calendars 30 arcmin, temporal (clases 27-52)",
        "doi": "10.5281/zenodo.7422506", "licencia": "CC BY 4.0",
        "cita": "Portmann, F. T., Siebert, S. y Döll, P. (2010). Global Biogeochemical Cycles 24, GB1011, doi:10.1029/2008GB003435",
        "archivo": MIEMBRO, "generado": date.today().isoformat(), "periodoRepresentado": "hacia el ano 2000 (1998-2002)",
        "rejilla": "0.5 grados, la misma de GGCMI (fila 0 = 89.75 N, columna 0 = 179.75 W)",
        "clases": {str(c): n for c, n in CLASES.items()},
        "subcultivosPulses": f"hasta {MAX_SUB} por celda (el maximo observado a 30 minutos es 3)",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("escrito", SALIDA / "mirca-rf.npz", (SALIDA / "mirca-rf.npz").stat().st_size, "bytes", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
