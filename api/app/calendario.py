"""GET /api/calendario (A4.13). Base MUNDIAL (15/11): GGCMI fase 3 en cualquier coordenada, tambien en Mexico.

Las fuentes de un pais se suman encima, nunca como base (docs/13, "Alcance geografico"): en el recuadro de Isla, las
ventanas de SIAP/INIFAP de `datos/catalogos/calendario-isla.json` reemplazan a las de GGCMI y su presencia (SIAP) reemplaza
el `sin_dato` de GGCMI. Un cultivo del catalogo sin fuente mundial queda NO_EVALUABLE con su motivo.
"""
import json
import math
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

import numpy as np

from . import config

# Mismo corte que el ano agricola de SIAP (PV abril-septiembre, OI octubre-marzo). GGCMI no usa estos nombres.
PV = range(4, 10)
TEMPORADAS = ("PV", "OI")
ANIO_SIN_BISIESTO = 2001  # el dia del ano de GGCMI va de 1 a 365; no declara bisiesto
CITA = ("Jägermeyr et al. 2021, Nature Food 2: 873-885. "
        "GGCMI Phase 3 crop calendar v1.01, CC BY 4.0, doi:10.5281/zenodo.5062513")
URL_DATOS = "https://doi.org/10.5281/zenodo.5062513"
CONSULTADO_GGCMI = "2026-11-15"
FUENTES_GGCMI = {
    1: "MIRCA", 2: "SAGE", 3: "Iizumi et al. 2019", 4: "RiceAtlas", 5: "Dimou et al. 2018",
    6: "ChinCropPhen", 7: "IndiaAgStat", 8: "Brazil CONAB", 9: "Australia ABARES",
}

# Cultivo de AgroHive -> (codigo de GGCMI, nombre del cultivo en GGCMI, equivalencia SUPUESTO o None).
# Una equivalencia es un calendario de otro producto de la misma especie: se declara en la respuesta y en
# datos/calendario/LEEME.md, y la entrada sigue EXPLORATORIO. Lo que no esta aqui no tiene fuente mundial.
GGCMI = {
    "maiz": ("mai", "maize", None),
    "sorgo": ("sor", "sorghum", None),
    "soya": ("soy", "soybean", None),
    "cacahuate": ("nut", "groundnut", None),
    "trigo": ("swh", "spring wheat", None),
    "cebada": ("bar", "barley", None),
    "papa": ("pot", "potato", None),
    "yuca": ("cas", "cassava", None),
    "cana": ("sgc", "sugarcane", None),
    "girasol": ("sun", "sunflower", None),
    "algodon": ("cot", "cotton", None),
    "chicharo": ("pea", "field pea", "SUPUESTO: GGCMI publica chicharo de grano seco (field pea); el catalogo usa chicharo "
                 "verde de la misma especie (Pisum sativum). Se toma el mismo dia de siembra."),
    "maiz_dulce": ("mai", "maize", "SUPUESTO: GGCMI no separa el maiz dulce; se toma el dia de siembra del maiz de grano "
                   "(misma especie, Zea mays)."),
}

# Motivo de NO_EVALUABLE para los cultivos del catalogo sin fuente mundial con licencia abierta.
MOTIVO_BEA = ("GGCMI fase 3 publica bea_rf, pero ni el NetCDF ni la ficha de Zenodo (doi:10.5281/zenodo.5062513) dicen "
              "que bea sea frijol. Queda NO_EVALUABLE.")
MOTIVO_SIN_FUENTE_MUNDIAL = ("Ninguna fuente mundial con licencia abierta cargada (GGCMI fase 3) publica calendario de "
                             "siembra para este cultivo. Queda NO_EVALUABLE.")
MOTIVOS_SIN_GGCMI = {
    "frijol": MOTIVO_BEA,
    "ejote": MOTIVO_BEA + " El ejote es la misma especie (Phaseolus vulgaris) y queda igual.",
    "betabel": ("GGCMI fase 3 trae remolacha azucarera (sgb), no betabel de mesa: mismo genero y especie, pero otro "
                "producto y otro ciclo. No se usa como equivalencia. Queda NO_EVALUABLE."),
    "avena": "GGCMI fase 3 no trae avena. " + MOTIVO_SIN_FUENTE_MUNDIAL,
}

# H-B10: en la costa, Natural Earth 1:110m generaliza el litoral y deja fuera puntos en tierra (Boca del Rio, a 1.4 km del
# poligono de Mexico; Veracruz puerto, 4.2 km). Medido el 14/11 sobre este archivo: Ensenada queda a 20 km y Lima a 15 km.
# Si el punto no cae en ningun pais, se toma el mas cercano a 25 km o menos, solo si ningun otro pais esta a 25 km o menos
# (en una frontera no se adivina). Es una tolerancia SUPUESTO sobre la precision del mapa, y la respuesta lo dice.
TOLERANCIA_COSTA_KM = 25.0


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
def _ggcmi() -> dict:
    """Extracto de `datos/calendario/extraer_ggcmi.py`: enteros sin signo, 0 = sin dato (unos 10 MB en memoria)."""
    with np.load(config.CALENDARIO_DIR / "ggcmi-rf.npz") as z:
        return {k: z[k] for k in z.files}


@lru_cache(maxsize=1)
def _ids_catalogo() -> tuple:
    # El catalogo del repo, no CATALOGOS_DIR: el test redirige esa carpeta a una vacia.
    crudo = json.loads((config.RAIZ / "datos" / "catalogos" / "cultivos.json").read_text(encoding="utf-8"))
    return tuple(c["id"] for c in crudo["cultivos"])


def _poligonos(f: dict) -> list:
    geom = f["geometry"]
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


def _distancia_km(lon: float, lat: float, poligonos: list) -> float:
    """Distancia del punto al borde mas cercano, en km, en un plano local (basta para decenas de km)."""
    kx, ky = 111.32 * math.cos(math.radians(lat)), 110.57
    px, py = lon * kx, lat * ky
    mejor = math.inf
    for p in poligonos:
        for anillo in p:
            for a, b in zip(anillo, anillo[1:]):
                ax, ay, bx, by = a[0] * kx, a[1] * ky, b[0] * kx, b[1] * ky
                dx, dy = bx - ax, by - ay
                t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
                mejor = min(mejor, math.hypot(px - ax - t * dx, py - ay - t * dy))
    return mejor


def pais(lon: float, lat: float) -> dict:
    """Pais de Natural Earth 110m. Fuera de todo poligono, el mas cercano dentro de TOLERANCIA_COSTA_KM si no hay otro igual de
    cerca (trae `distanciaKm`). Lanza SinPais si no hay uno solo."""
    hallados = [f for f in _paises() if any(_en_poligono(lon, lat, p) for p in _poligonos(f))]
    if len(hallados) > 1:
        raise SinPais("el punto cae en mas de un pais de Natural Earth 110m")
    if hallados:
        return {"iso": hallados[0]["iso"], "nombre": hallados[0]["nombre"]}
    cerca = sorted((_distancia_km(lon, lat, _poligonos(f)), i) for i, f in enumerate(_paises()))
    cerca = [(d, _paises()[i]) for d, i in cerca if d <= TOLERANCIA_COSTA_KM]
    if len(cerca) != 1:
        raise SinPais("sin un solo pais en Natural Earth 110m" + (f" (hay {len(cerca)} a menos de {TOLERANCIA_COSTA_KM:.0f} km)" if cerca else ""))
    d, f = cerca[0]
    return {"iso": f["iso"], "nombre": f["nombre"], "distanciaKm": round(d, 1)}


def _aviso_cercania(lugar: dict) -> list[dict]:
    if "distanciaKm" not in lugar:
        return []
    return [{"codigo": "PAIS_POR_CERCANIA", "severidad": "aviso",
             "mensaje": (f"El punto cae fuera de los poligonos de Natural Earth 1:110m (costa generalizada); se toma {lugar['nombre']}, "
                         f"el unico pais a menos de {TOLERANCIA_COSTA_KM:.0f} km (a {lugar['distanciaKm']} km de su borde en ese mapa).")}]


def _en_isla(lon: float, lat: float) -> bool:
    r = _recuadro_isla()
    return r["sur"] <= lat <= r["norte"] and r["oeste"] <= lon <= r["este"]


def _meta() -> dict:
    return {"versionContrato": config.VERSION_CONTRATO, "esEjemplo": False, "generado": datetime.now(timezone.utc).isoformat()}


def _fuente_ggcmi(codigo: str, nombre: str, lon: float, lat: float, nota: str) -> dict:
    return {
        "nombre": f"GGCMI Phase 3 crop calendar v1.01, {nombre} de temporal ({codigo}_rf)",
        "url": URL_DATOS, "cita": CITA, "coordenada": [lon, lat], "unidades": "dia del ano (1 a 365)",
        "consultado": CONSULTADO_GGCMI, "resolucion": "0.5 grados", "nota": nota,
    }


def _fuente_sin_dato(motivo: str) -> dict:
    return {"nombre": "AgroHive, calendarios mundiales cargados (GGCMI fase 3)", "url": URL_DATOS, "cita": CITA,
            "consultado": CONSULTADO_GGCMI, "nota": motivo}


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
    g = _ggcmi()
    lats, lons = g["lat"], g["lon"]
    i = round((float(lats[0]) - lat) / (float(lats[0]) - float(lats[1])))
    j = round((lon - float(lons[0])) / (float(lons[1]) - float(lons[0])))
    i = max(0, min(len(lats) - 1, i))
    j = max(0, min(len(lons) - 1, j))
    return i, j, float(lats[i]), float(lons[j])


def _entradas_ggcmi(cultivo: str, celda: tuple[int, int, float, float]) -> list[dict]:
    """Dos entradas (PV y OI) del cultivo con su dia de siembra de GGCMI. Un dia de siembra, un solo ciclo."""
    codigo, nombre, equivalencia = GGCMI[cultivo]
    i, j, lat_c, lon_c = celda
    g = _ggcmi()
    siembra, madurez, idx = (int(g[f"{codigo}_{v}"][i, j]) for v in ("siembra", "madurez", "fuente"))
    origen = FUENTES_GGCMI.get(idx, "indice no listado en el NetCDF") if idx else "sin indice de fuente"
    base = (f"Celda {lat_c:.2f} N, {lon_c:.2f} E. Un solo ciclo de temporal por celda; no es ventana de recomendacion local. "
            f"Fuente observada del compuesto: {origen}.")
    if equivalencia:
        base += " " + equivalencia
    if not siembra:
        motivo = base + " Esta celda no trae dia de siembra."
        fuente = _fuente_ggcmi(codigo, nombre, lon_c, lat_c, motivo)
        return [_entrada_no(cultivo, t, motivo, fuente) for t in TEMPORADAS]
    dia = _fecha_dia(siembra)
    temporada = "PV" if dia.month in PV else "OI"
    nota = base + f" Siembra: dia {siembra} ({dia.isoformat()} en un ano no bisiesto)."
    if madurez:
        nota += f" Madurez: dia {madurez} ({_fecha_dia(madurez).isoformat()} en un ano no bisiesto)."
        nota += f" Duracion: {(madurez - siembra) % 365 or 365} dias."
    nota += " La etiqueta PV u OI usa el corte de SIAP (PV abril-septiembre) porque el contrato lo exige; GGCMI no la trae."
    fuente = _fuente_ggcmi(codigo, nombre, lon_c, lat_c, nota)
    motivo = "GGCMI da un dia de siembra de temporal, no una ventana PV/OI. La etiqueta de temporada es el corte de SIAP."
    if equivalencia:
        motivo += " " + equivalencia
    con_dato = {
        "cultivo": cultivo, "temporada": temporada, "regimen": "temporal", "estado": "EXPLORATORIO", "motivo": motivo,
        "ventana": {"estado": "EVALUABLE", "desdeMes": dia.month, "desdeDia": dia.day, "hastaMes": dia.month, "hastaDia": dia.day, "fuente": fuente},
        "presencia": {"estado": "sin_dato", "fuente": fuente,
                      "nota": "El producto rellena celdas fuera de las zonas cultivadas. Un dia de siembra no registra el cultivo en el lugar."},
    }
    otra = "OI" if temporada == "PV" else "PV"
    motivo_otra = "GGCMI fase 3 publica un solo ciclo de temporal por celda. La otra temporada no tiene dato."
    return [con_dato, _entrada_no(cultivo, otra, motivo_otra, fuente)] if temporada == "PV" else [_entrada_no(cultivo, otra, motivo_otra, fuente), con_dato]


def _base_mundial(celda: tuple[int, int, float, float]) -> tuple[list, list]:
    """Entradas PV y OI de todos los cultivos del catalogo, en su orden, y las advertencias de la base."""
    entradas = []
    for cultivo in _ids_catalogo():
        if cultivo in GGCMI:
            entradas.extend(_entradas_ggcmi(cultivo, celda))
        else:
            motivo = MOTIVOS_SIN_GGCMI.get(cultivo, MOTIVO_SIN_FUENTE_MUNDIAL)
            entradas.extend(_entrada_no(cultivo, t, motivo, _fuente_sin_dato(motivo)) for t in TEMPORADAS)
    con = sorted({e["cultivo"] for e in entradas if e["ventana"]["estado"] == "EVALUABLE"})
    sin = [c for c in _ids_catalogo() if c not in con]
    equivalencias = sorted(c for c, (_, _, eq) in GGCMI.items() if eq and c in con)
    adv = [
        {"codigo": "CALENDARIO_BASE_MUNDIAL", "severidad": "info",
         "mensaje": (f"Base mundial GGCMI fase 3 (celda de 0.5 grados): {len(con)} de {len(_ids_catalogo())} cultivos con dia de siembra. "
                     f"Sin fuente mundial: {', '.join(sin)}.")},
        {"codigo": "GGCMI_UN_SOLO_CICLO", "severidad": "aviso",
         "mensaje": "GGCMI fase 3 publica un solo ciclo de temporal por celda y cultivo. La otra temporada no tiene dato."},
        {"codigo": "GGCMI_NO_ES_CENSO", "severidad": "aviso",
         "mensaje": "La presencia queda sin_dato: el calendario extrapola fuera de las zonas cultivadas y no dice si ahi se siembra."},
    ]
    if equivalencias:
        adv.append({"codigo": "GGCMI_EQUIVALENCIA_SUPUESTO", "severidad": "aviso",
                    "mensaje": f"Calendario tomado de otro producto de la misma especie (SUPUESTO): {', '.join(equivalencias)}. Ver el motivo de cada entrada."})
    return entradas, adv


def _isla_encima(entradas: list) -> tuple[list, list, dict]:
    """Capa local de Isla (SIAP/INIFAP) sobre la base mundial. Devuelve entradas, advertencias y la ubicacion INEGI."""
    # El archivo de Mafer, no el directorio de pruebas: el test redirige CATALOGOS_DIR a una carpeta vacia.
    local = json.loads((config.RAIZ / "datos" / "catalogos" / "calendario-isla.json").read_text(encoding="utf-8"))
    por_clave = {(e["cultivo"], e["temporada"]): e for e in local["entradas"] if e["regimen"] == "temporal"}
    salida, de_isla, presencia_siap = [], [], []
    for e in entradas:
        l = por_clave.get((e["cultivo"], e["temporada"]))
        if l is None:
            salida.append(e)
        elif l["ventana"]["estado"] == "EVALUABLE" or e["ventana"]["estado"] != "EVALUABLE":
            salida.append(l)  # la ventana local manda; sin ventana en ninguna de las dos, se queda el motivo y la presencia de SIAP
            if l["ventana"]["estado"] == "EVALUABLE":
                de_isla.append(f"{l['cultivo']} {l['temporada']}")
        else:
            salida.append({**e, "presencia": l["presencia"]})
            presencia_siap.append(f"{e['cultivo']} {e['temporada']}")
    r = _recuadro_isla()
    adv = [*local.get("advertencias", []), {
        "codigo": "CAPA_LOCAL_ISLA", "severidad": "info",
        "mensaje": (f"El punto cae en el recuadro OSM de Isla, Veracruz (sur {r['sur']}, norte {r['norte']}, oeste {r['oeste']}, "
                    f"este {r['este']}, consultado {r['consultado']}; es un rectangulo, no el poligono). Encima de la base mundial: "
                    f"ventana de SIAP/INIFAP en {', '.join(de_isla) or 'ninguna entrada'}; presencia de SIAP con ventana de GGCMI en "
                    f"{', '.join(presencia_siap) or 'ninguna entrada'}."),
    }]
    return salida, adv, local["ubicacion"]


def armar(lon: float, lat: float) -> dict:
    lugar = pais(lon, lat)
    celda = _celda(lon, lat)
    i, j, lat_c, lon_c = celda
    entradas, adv = _base_mundial(celda)
    ubicacion = {"pais": lugar["nombre"], "paisIso": lugar["iso"], "region": f"celda GGCMI {lat_c:.2f},{lon_c:.2f}",
                 "unidadAdministrativa": {"sistema": "Natural Earth 110m", "clave": lugar["iso"], "nombre": lugar["nombre"], "nivel": 0}}
    ident = f"calendario-ggcmi-{lugar['iso'].lower()}-{i}-{j}"
    if lugar["iso"] == "MX" and _en_isla(lon, lat):
        entradas, adv_local, inegi = _isla_encima(entradas)
        adv = adv_local + adv
        ubicacion = {**inegi, **ubicacion, "pais": inegi.get("pais", lugar["nombre"])}
        ident = f"calendario-isla-ggcmi-{i}-{j}"
    adv.append({"codigo": "PAIS_NATURAL_EARTH_110M", "severidad": "info",
                "mensaje": "El pais sale de Natural Earth 1:110m. En la costa el limite es grueso."})
    adv.extend(_aviso_cercania(lugar))
    return {"meta": _meta(), "id": ident, "ubicacion": ubicacion, "entradas": entradas, "advertencias": adv}
