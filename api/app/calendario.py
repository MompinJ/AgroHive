"""GET /api/calendario (A4.13). En Mexico manda el calendario cargado (hoy solo Isla). Fuera, GGCMI fase 3."""
import json
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

import h5py

from . import config

CULTIVOS = ("maiz", "frijol", "calabaza", "chile")
# Mismo corte que el ano agricola de SIAP (PV abril-septiembre, OI octubre-marzo). GGCMI no usa estos nombres.
PV = range(4, 10)
ANIO_SIN_BISIESTO = 2001  # el dia del ano de GGCMI va de 1 a 365; no declara bisiesto
CITA = ("Jägermeyr et al. 2021, Nature Food 2: 873-885. "
        "GGCMI Phase 3 crop calendar v1.01, CC BY 4.0, doi:10.5281/zenodo.5062513")
URL_DATOS = "https://doi.org/10.5281/zenodo.5062513"
FUENTES_GGCMI = {
    1: "MIRCA", 2: "SAGE", 3: "Iizumi et al. 2019", 4: "RiceAtlas", 5: "Dimou et al. 2018",
    6: "ChinCropPhen", 7: "IndiaAgStat", 8: "Brazil CONAB", 9: "Australia ABARES",
}
MOTIVO_FRIJOL = ("GGCMI fase 3 publica bea_rf, pero ni el NetCDF ni la ficha de Zenodo "
                 "(doi:10.5281/zenodo.5062513) dicen que bea sea frijol. Queda NO_EVALUABLE.")
MOTIVO_SIN_PRODUCTO = "GGCMI fase 3 no trae calabaza ni chile. Queda NO_EVALUABLE."
MOTIVO_MEXICO = ("En Mexico el calendario es SIAP e INIFAP. Solo esta cargado el de Isla (INEGI 30/077) "
                 "y este punto no cae en su recuadro. No se usa GGCMI.")


class SinPais(Exception):
    """El mapa de 110m no asigna un solo pais. No se inventa la ubicacion."""


def _dentro_de_anillo(lon: float, lat: float, anillo) -> bool:
    dentro = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            dentro = not dentro
        j = i
    return dentro


def _en_poligono(lon: float, lat: float, poligono) -> bool:
    if not _dentro_de_anillo(lon, lat, poligono[0]):
        return False
    return not any(_dentro_de_anillo(lon, lat, hueco) for hueco in poligono[1:])


@lru_cache(maxsize=1)
def _paises() -> tuple:
    crudo = json.loads((config.CALENDARIO_DIR / "paises-110m.json").read_text(encoding="utf-8"))
    return tuple(crudo)


@lru_cache(maxsize=1)
def _recuadro_isla() -> dict:
    return json.loads((config.CALENDARIO_DIR / "isla-recuadro.json").read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def _maiz() -> dict:
    ruta = config.CALENDARIO_DIR / "ggcmi" / "mai_rf_ggcmi_crop_calendar_phase3_v1.01.nc4"
    with h5py.File(ruta, "r") as f:
        return {
            "lat": f["lat"][:].tolist(),
            "lon": f["lon"][:].tolist(),
            "siembra": f["planting_day"][:].tolist(),
            "madurez": f["maturity_day"][:].tolist(),
            "duracion": f["growing_season_length"][:].tolist(),
            "fuente_idx": f["data_source_used"][:].tolist(),
        }


def pais(lon: float, lat: float) -> dict:
    """Pais de Natural Earth 110m. Lanza SinPais si no hay uno solo."""
    hallados = []
    for f in _paises():
        geom = f["geometry"]
        poligonos = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        if any(_en_poligono(lon, lat, p) for p in poligonos):
            hallados.append(f)
    if len(hallados) != 1:
        raise SinPais("sin un solo pais en Natural Earth 110m" if not hallados else "el punto cae en mas de un pais de Natural Earth 110m")
    return {"iso": hallados[0]["iso"], "nombre": hallados[0]["nombre"]}


def _en_isla(lon: float, lat: float) -> bool:
    r = _recuadro_isla()
    return r["sur"] <= lat <= r["norte"] and r["oeste"] <= lon <= r["este"]


def _meta() -> dict:
    return {"versionContrato": config.VERSION_CONTRATO, "esEjemplo": False, "generado": datetime.now(timezone.utc).isoformat()}


def _fuente_ggcmi(lon: float, lat: float, nota: str) -> dict:
    return {
        "nombre": "GGCMI Phase 3 crop calendar v1.01, maiz de temporal (mai_rf)",
        "url": URL_DATOS, "cita": CITA, "coordenada": [lon, lat], "unidades": "dia del ano (1 a 365)",
        "consultado": "2026-11-14", "resolucion": "0.5 grados", "nota": nota,
    }


def _entrada_no(cultivo: str, temporada: str, motivo: str, fuente: dict) -> dict:
    presencia_fuente = {k: fuente[k] for k in ("nombre", "cita", "url", "consultado") if fuente.get(k)}
    return {
        "cultivo": cultivo, "temporada": temporada, "regimen": "temporal", "estado": "NO_EVALUABLE", "motivo": motivo,
        "ventana": {"estado": "NO_EVALUABLE", "motivo": motivo},
        "presencia": {"estado": "sin_dato", "fuente": presencia_fuente, "nota": motivo},
    }


def _fecha_dia(dia: int) -> date:
    return date(ANIO_SIN_BISIESTO, 1, 1) + timedelta(days=dia - 1)


def _celda(lon: float, lat: float) -> tuple[int, int, float, float]:
    m = _maiz()
    lats, lons = m["lat"], m["lon"]
    i = round((lats[0] - lat) / (lats[0] - lats[1]))
    j = round((lon - lons[0]) / (lons[1] - lons[0]))
    i = max(0, min(len(lats) - 1, i))
    j = max(0, min(len(lons) - 1, j))
    return i, j, lats[i], lons[j]


def _numero(valor) -> float | None:
    try:
        n = float(valor)
    except (TypeError, ValueError):
        return None
    if n != n or n > 1e10 or n < 1 or n > 365:
        return None
    return n


def _maiz_ggcmi(lon: float, lat: float) -> tuple[list, list]:
    """Entradas de maiz y advertencias. Un dia de siembra, un solo ciclo."""
    i, j, lat_c, lon_c = _celda(lon, lat)
    m = _maiz()
    siembra, madurez, duracion = _numero(m["siembra"][i][j]), _numero(m["madurez"][i][j]), _numero(m["duracion"][i][j])
    idx = _numero(m["fuente_idx"][i][j])
    origen = FUENTES_GGCMI.get(int(idx), "indice no listado en el NetCDF") if idx is not None else "sin indice de fuente"
    base = (f"Celda {lat_c:.2f} N, {lon_c:.2f} E. Un solo ciclo de temporal por celda; no es ventana de recomendacion local. "
            f"Fuente observada del compuesto: {origen}.")
    if siembra is None:
        motivo = base + " Esta celda no trae dia de siembra."
        return [_entrada_no("maiz", t, motivo, _fuente_ggcmi(lon_c, lat_c, motivo)) for t in ("PV", "OI")], []
    dia = _fecha_dia(int(siembra))
    temporada = "PV" if dia.month in PV else "OI"
    otra = "OI" if temporada == "PV" else "PV"
    mad = _fecha_dia(int(madurez)) if madurez is not None else None
    nota = base + f" Siembra: dia {int(siembra)} ({dia.isoformat()} en un ano no bisiesto)."
    if mad is not None:
        nota += f" Madurez: dia {int(madurez)} ({mad.isoformat()} en un ano no bisiesto)."
    if duracion is not None:
        nota += f" Duracion: {int(duracion)} dias."
    nota += " La etiqueta PV u OI usa el corte de SIAP (PV abril-septiembre) porque el contrato lo exige; GGCMI no la trae."
    fuente = _fuente_ggcmi(lon_c, lat_c, nota)
    con_dato = {
        "cultivo": "maiz", "temporada": temporada, "regimen": "temporal", "estado": "EXPLORATORIO",
        "motivo": "GGCMI da un dia de siembra de temporal, no una ventana PV/OI. La etiqueta de temporada es el corte de SIAP.",
        "ventana": {"estado": "EVALUABLE", "desdeMes": dia.month, "desdeDia": dia.day, "hastaMes": dia.month, "hastaDia": dia.day, "fuente": fuente},
        "presencia": {"estado": "sin_dato", "fuente": fuente,
                      "nota": "El producto rellena celdas fuera de las zonas cultivadas. Un dia de siembra no registra el cultivo en el lugar."},
    }
    motivo_otra = "GGCMI fase 3 publica un solo ciclo de temporal por celda. La otra temporada no tiene dato."
    return [con_dato, _entrada_no("maiz", otra, motivo_otra, fuente)], [
        {"codigo": "GGCMI_UN_SOLO_CICLO", "severidad": "aviso", "mensaje": motivo_otra},
        {"codigo": "GGCMI_NO_ES_CENSO", "severidad": "aviso",
         "mensaje": "La presencia queda sin_dato: el calendario extrapola fuera de las zonas cultivadas y no dice si ahi se siembra."},
    ]


def _sin_fuente_local(lugar: dict, motivo: str) -> dict:
    fuente = {"nombre": "AgroHive, calendarios cargados", "nota": motivo, "consultado": "2026-11-14"}
    entradas = [_entrada_no(c, t, motivo, fuente) for c in CULTIVOS for t in ("PV", "OI")]
    return {
        "meta": _meta(), "id": f"calendario-sin-fuente-local-{lugar['iso'].lower()}",
        "ubicacion": {"pais": lugar["nombre"], "paisIso": lugar["iso"],
                      "unidadAdministrativa": {"sistema": "Natural Earth 110m", "clave": lugar["iso"], "nombre": lugar["nombre"], "nivel": 0}},
        "entradas": entradas,
        "advertencias": [{"codigo": "CALENDARIO_SIN_FUENTE_LOCAL", "severidad": "aviso", "mensaje": motivo}],
    }


def _isla() -> dict:
    # El archivo de Mafer, no el directorio de pruebas: el test redirige CATALOGOS_DIR a una carpeta vacia.
    cuerpo = json.loads((config.RAIZ / "datos" / "catalogos" / "calendario-isla.json").read_text(encoding="utf-8"))
    r = _recuadro_isla()
    cuerpo.setdefault("advertencias", []).append({
        "codigo": "ISLA_RECUADRO_OSM", "severidad": "info",
        "mensaje": (f"Se entrego el calendario de Isla porque el punto cae en el recuadro OSM del municipio "
                    f"(sur {r['sur']}, norte {r['norte']}, oeste {r['oeste']}, este {r['este']}, consultado {r['consultado']}). "
                    "Es un rectangulo, no el poligono."),
    })
    return cuerpo


def armar(lon: float, lat: float) -> dict:
    lugar = pais(lon, lat)
    if lugar["iso"] == "MX":
        if _en_isla(lon, lat):
            return _isla()
        return _sin_fuente_local(lugar, MOTIVO_MEXICO)
    entradas, adv = _maiz_ggcmi(lon, lat)
    fuente = entradas[0]["presencia"]["fuente"]
    for cultivo, motivo in (("frijol", MOTIVO_FRIJOL), ("calabaza", MOTIVO_SIN_PRODUCTO), ("chile", MOTIVO_SIN_PRODUCTO)):
        for temporada in ("PV", "OI"):
            entradas.append(_entrada_no(cultivo, temporada, motivo, fuente))
    i, j, lat_c, lon_c = _celda(lon, lat)
    ident = f"calendario-ggcmi-{lugar['iso'].lower()}-{i}-{j}"
    adv.append({"codigo": "PAIS_NATURAL_EARTH_110M", "severidad": "info",
                 "mensaje": "El pais sale de Natural Earth 1:110m. En la costa el limite es grueso."})
    return {
        "meta": _meta(), "id": ident,
        "ubicacion": {"pais": lugar["nombre"], "paisIso": lugar["iso"], "region": f"celda GGCMI {lat_c:.2f},{lon_c:.2f}",
                      "unidadAdministrativa": {"sistema": "Natural Earth 110m", "clave": lugar["iso"], "nombre": lugar["nombre"], "nivel": 0}},
        "entradas": entradas, "advertencias": adv,
    }
