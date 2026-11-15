"""CDL (Cropland Data Layer, USDA NASS) por punto y anio, desde el servicio CropScape (A4.12).

Servicio: GetCDLValue de CropScape (George Mason University para USDA NASS). Verificado el 14/11: pide x,y en EPSG:5070 (Conus Albers; con lon/lat
responde 500), acepta anios 1997 a 2025 (cobertura nacional completa desde 2008), contesta en XML con un texto `{x: ..., y: ..., value: 1,
category: "Corn", color: "#FFD300"}` y devuelve value 0 / "No Data" fuera del raster. Tarda cerca de 1 s por consulta.
"""
import re

from pyproj import Transformer

from .. import http

URL = "https://nassgeodata.gmu.edu/axis2/services/CDLService/GetCDLValue"
URL_PORTAL = "https://nassgeodata.nass.usda.gov/CropScape/"
NOMBRE = "USDA NASS Cropland Data Layer (CropScape)"
ANIO_MIN, ANIO_MAX = 2008, 2025  # CDL cubre todo EE. UU. contiguos desde 2008; 2025 fue lo ultimo que acepto el servicio el 14/11/2026
RESOLUCION = "30 m (un pixel)"
# Cultivos del catalogo de AgroHive que existen como categoria propia de CDL. El resto no se mapea: queda en null, no se asimila a otro cultivo.
CATALOGO = {"Corn": "maiz", "Dry Beans": "frijol", "Squash": "calabaza", "Peppers": "chile"}
CONUS = {"lon": (-125.0, -66.5), "lat": (24.0, 50.0)}  # caja de EE. UU. contiguos; fuera de ella no se consulta
_A_ALBERS = Transformer.from_crs(4326, 5070, always_xy=True)
_VALOR = re.compile(r'value:\s*(\d+),\s*category:\s*"([^"]*)"')


def en_cobertura(lon: float, lat: float) -> bool:
    return CONUS["lon"][0] <= lon <= CONUS["lon"][1] and CONUS["lat"][0] <= lat <= CONUS["lat"][1]


def a_albers(lon: float, lat: float) -> tuple[float, float]:
    x, y = _A_ALBERS.transform(lon, lat)
    return round(x, 1), round(y, 1)


def interpretar(texto: str) -> dict:
    """Del XML de CropScape a {codigo, categoria}. value 0 (No Data) es sin clasificar: codigo None."""
    m = _VALOR.search(texto)
    if not m:
        raise http.ErrorFuente(f"CropScape respondio algo que no es un valor de CDL: {texto[:120]!r}")
    codigo, categoria = int(m.group(1)), m.group(2)
    if codigo == 0:
        return {"codigo": None, "categoria": None, "motivo": f"CDL no clasifica este pixel ({categoria})"}
    return {"codigo": codigo, "categoria": categoria, "motivo": None}


async def valor(cliente, x: float, y: float, anio: int) -> dict:
    r = await http.get(cliente, URL, params={"year": anio, "x": x, "y": y})
    return interpretar(r.text)
