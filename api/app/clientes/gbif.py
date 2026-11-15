"""GBIF (Global Biodiversity Information Facility): registros de presencia de una especie en una caja alrededor de un punto.

API publica sin llave. Verificado el 15/11/2026: /v1/occurrence/search con taxonKey, decimalLatitude y decimalLongitude como rango
"min,max", year "desde,hasta", hasCoordinate=true, occurrenceStatus=PRESENT, limit=0 y facet=year devuelve el conteo total (`count`) y
el conteo por anio (`facets[0].counts`, con `name` = anio). Asi una sola llamada da el total y el anio mas reciente.
"""
from .. import http

URL = "https://api.gbif.org/v1/occurrence/search"
URL_PORTAL = "https://www.gbif.org"
NOMBRE = "GBIF Occurrence Search API"


def parametros(taxon_key: int, lon: float, lat: float, radio: float, desde: int, hasta: int) -> dict:
    return {
        "taxonKey": taxon_key,
        "decimalLatitude": f"{lat - radio:.4f},{lat + radio:.4f}",
        "decimalLongitude": f"{lon - radio:.4f},{lon + radio:.4f}",
        "year": f"{desde},{hasta}",
        "hasCoordinate": "true",
        "occurrenceStatus": "PRESENT",
        "limit": 0,
        "facet": "year",
        "facetLimit": 200,
    }


def interpretar(d: dict) -> dict:
    """Del JSON de GBIF a {registros, ultimoAnio}. Un cuerpo sin `count` entero es un error de la fuente, no un cero."""
    total = d.get("count") if isinstance(d, dict) else None
    if not isinstance(total, int) or total < 0:
        raise http.ErrorFuente(f"GBIF respondio sin conteo valido: {str(d)[:120]!r}")
    anios = []
    for f in d.get("facets") or []:
        if f.get("field") in ("YEAR", "year"):
            anios = [int(c["name"]) for c in f.get("counts", []) if str(c.get("name", "")).isdigit() and c.get("count", 0) > 0]
    return {"registros": total, "ultimoAnio": max(anios) if total and anios else None}


async def conteo(cliente, taxon_key: int, lon: float, lat: float, radio: float, desde: int, hasta: int) -> dict:
    r = await http.get(cliente, URL, params=parametros(taxon_key, lon, lat, radio, desde, hasta))
    try:
        return interpretar(r.json())
    except ValueError as e:
        raise http.ErrorFuente(f"GBIF respondio algo que no es JSON: {r.text[:120]!r}") from e
