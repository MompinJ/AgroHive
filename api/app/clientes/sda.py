"""SSURGO (USDA NRCS) por punto, desde Soil Data Access (A4.12). POST con SQL a Tabular/post.rest.

Verificado el 14/11: la funcion SDA_Get_Mukey_from_intersection_with_WktWgs84('point(lon lat)') da la unidad cartografica del punto; un punto sin suelo
cartografiado responde 200 con cuerpo `{}`. Con `JSON+COLUMNNAME` la primera fila de `Table` son los nombres de columna y todo viene como texto.
"""
from .. import http

URL = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest"
URL_PORTAL = "https://sdmdataaccess.nrcs.usda.gov/"
NOMBRE = "USDA NRCS Soil Survey Geographic Database (SSURGO) via Soil Data Access"
CITA = "Soil Survey Staff, Natural Resources Conservation Service, United States Department of Agriculture. Soil Survey Geographic (SSURGO) Database. Disponible en https://sdmdataaccess.nrcs.usda.gov/"
COLUMNAS = ["cokey", "mukey", "muname", "compname", "comppct_r", "hydgrp", "hzname", "hzdept_r", "hzdepb_r", "sandtotal_r", "silttotal_r", "claytotal_r", "om_r", "awc_r"]


def consulta(lon: float, lat: float) -> str:
    # lon y lat son numeros ya validados por FastAPI (float): no hay texto del usuario en el SQL.
    return (f"SELECT co.cokey, mu.mukey, mu.muname, co.compname, co.comppct_r, co.hydgrp, ch.hzname, ch.hzdept_r, ch.hzdepb_r, ch.sandtotal_r, ch.silttotal_r, "
            f"ch.claytotal_r, ch.om_r, ch.awc_r FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('point({float(lon)} {float(lat)})') k "
            f"INNER JOIN mapunit mu ON mu.mukey=k.mukey INNER JOIN component co ON co.mukey=mu.mukey INNER JOIN chorizon ch ON ch.cokey=co.cokey "
            f"WHERE co.majcompflag='Yes' ORDER BY co.comppct_r DESC, co.cokey, ch.hzdept_r")


def filas(cuerpo: dict) -> list[dict]:
    """De la tabla de SDA a una lista de dicts; vacia si el punto no tiene suelo cartografiado."""
    tabla = cuerpo.get("Table") if isinstance(cuerpo, dict) else None
    if not tabla:
        return []
    cab = tabla[0]
    if cab != COLUMNAS:
        raise http.ErrorFuente(f"Soil Data Access devolvio columnas inesperadas: {cab}")
    return [dict(zip(cab, f)) for f in tabla[1:]]


async def componente_dominante(cliente, lon: float, lat: float) -> list[dict]:
    """Horizontes del componente de mayor porcentaje en el punto (las filas ya vienen ordenadas por porcentaje y profundidad)."""
    r = await http.solicitar(cliente, "POST", URL, json={"format": "JSON+COLUMNNAME", "query": consulta(lon, lat)})
    try:
        todas = filas(r.json())
    except ValueError as e:
        raise http.ErrorFuente("Soil Data Access no respondio JSON") from e
    if not todas:
        return []
    cokey = todas[0]["cokey"]
    return [f for f in todas if f["cokey"] == cokey]
