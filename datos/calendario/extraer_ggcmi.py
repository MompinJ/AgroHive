"""Extracto ligero de GGCMI fase 3 (calendario mundial de siembra) para GET /api/calendario.

Descarga de Zenodo los NetCDF de temporal (`*_rf_*`) de los cultivos que la API usa, comprueba su md5 contra la ficha y
escribe `ggcmi-rf.npz` (dia de siembra, dia de madurez e indice de fuente por celda de 0.5 grados, enteros sin signo; 0 =
sin dato) y `ggcmi-rf.json` (que archivo salio de donde, con su md5). Los NetCDF originales no se suben al repo: quedan
en la carpeta de descarga (por defecto datos/cache/ggcmi, ignorada por git).

Uso (desde la raiz del repo, con el entorno de la API):
    python datos/calendario/extraer_ggcmi.py            # descarga y escribe el extracto
    python datos/calendario/extraer_ggcmi.py --sin-red  # solo reconstruye desde la carpeta de descarga

Fuente: Jägermeyr et al. 2021, Nature Food 2: 873-885. GGCMI Phase 3 crop calendar v1.01, CC BY 4.0,
doi:10.5281/zenodo.5062513.
"""
import argparse
import hashlib
import json
import sys
import urllib.request
from datetime import date
from pathlib import Path

import h5py
import numpy as np

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = Path(__file__).resolve().parent
REGISTRO = "https://zenodo.org/api/records/5062513"
# Codigos de GGCMI que la API usa (el mapeo a cultivos de AgroHive vive en api/app/calendario.py y en el LEEME).
CODIGOS = ("mai", "sor", "soy", "nut", "swh", "bar", "pot", "cas", "sgc", "sun", "cot", "pea", "bea")
VARIABLES = (("siembra", "planting_day"), ("madurez", "maturity_day"), ("fuente", "data_source_used"))


def _md5(ruta: Path) -> str:
    h = hashlib.md5()
    with ruta.open("rb") as f:
        for bloque in iter(lambda: f.read(1 << 20), b""):
            h.update(bloque)
    return h.hexdigest()


def _ficha() -> dict:
    with urllib.request.urlopen(REGISTRO, timeout=60) as r:
        return {f["key"]: f for f in json.load(r)["files"]}


def _entero(valores: np.ndarray, maximo: int, tipo) -> np.ndarray:
    v = np.where((valores >= 1) & (valores <= maximo) & np.isfinite(valores), valores, 0)
    if np.any(np.mod(v, 1) != 0):
        raise SystemExit("GGCMI trae dias no enteros: revisar antes de redondear")
    return v.astype(tipo)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--descargas", type=Path, default=RAIZ / "datos" / "cache" / "ggcmi")
    p.add_argument("--sin-red", action="store_true")
    a = p.parse_args()
    a.descargas.mkdir(parents=True, exist_ok=True)
    ficha = {} if a.sin_red else _ficha()
    arreglos, archivos, lat, lon = {}, {}, None, None
    for codigo in CODIGOS:
        nombre = f"{codigo}_rf_ggcmi_crop_calendar_phase3_v1.01.nc4"
        ruta = a.descargas / nombre
        if not a.sin_red and (not ruta.exists() or "md5:" + _md5(ruta) != ficha[nombre]["checksum"]):
            print("descargando", nombre, file=sys.stderr)
            urllib.request.urlretrieve(ficha[nombre]["links"]["self"], ruta)
        md5 = _md5(ruta)
        if not a.sin_red and "md5:" + md5 != ficha[nombre]["checksum"]:
            raise SystemExit(f"{nombre}: md5 {md5} no coincide con la ficha de Zenodo")
        with h5py.File(ruta, "r") as f:
            la, lo = f["lat"][:], f["lon"][:]
            if lat is None:
                lat, lon = la, lo
            elif not (np.array_equal(la, lat) and np.array_equal(lo, lon)):
                raise SystemExit(f"{nombre}: otra rejilla")
            arreglos[f"{codigo}_siembra"] = _entero(f["planting_day"][:], 365, np.uint16)
            arreglos[f"{codigo}_madurez"] = _entero(f["maturity_day"][:], 365, np.uint16)
            arreglos[f"{codigo}_fuente"] = _entero(f["data_source_used"][:], 255, np.uint8)
        archivos[codigo] = {"archivo": nombre, "md5": md5}
    np.savez_compressed(SALIDA / "ggcmi-rf.npz", lat=lat.astype(np.float32), lon=lon.astype(np.float32), **arreglos)
    (SALIDA / "ggcmi-rf.json").write_text(json.dumps({
        "producto": "GGCMI Phase 3 crop calendar v1.01, temporal (rainfed)",
        "doi": "10.5281/zenodo.5062513", "licencia": "CC BY 4.0",
        "cita": "Jägermeyr et al. 2021, Nature Food 2: 873-885",
        "generado": date.today().isoformat(), "rejilla": "0.5 grados, lat de 89.75 a -89.75, lon de -179.75 a 179.75",
        "valores": "siembra y madurez: dia del ano 1 a 365, 0 = sin dato; fuente: indice data_source_used, 0 = sin dato",
        "archivos": archivos,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("escrito", SALIDA / "ggcmi-rf.npz", (SALIDA / "ggcmi-rf.npz").stat().st_size, "bytes", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
