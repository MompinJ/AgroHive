"""Retencion de agua del suelo por pedotransferencia de Saxton y Rawls (2006), actividad A2.16.

Fuente: Saxton, K. E. y Rawls, W. J. (2006). Soil Water Characteristic Estimates by Texture and Organic Matter
for Hydrologic Solutions. Soil Science Society of America Journal 70(5): 1569-1578. doi:10.2136/sssaj2005.0117.
Ecuaciones [1] a [5] de la Tabla 1 del articulo; los coeficientes se copiaron de ahi.

Escala de las entradas (verificada contra la Tabla 3 del articulo, 12 clases texturales con 2.5 %w de materia
organica, diferencia maxima 0.5 puntos de humedad): arena y arcilla entran como FRACCION (0 a 1) y la materia organica
como PORCENTAJE en peso (2.5 para 2.5 %), sin dividir entre 100. Dividirla entre 100 resta hasta 11 puntos a la saturacion.

Alcance: densidad normal (DF = 1), sin grava ni salinidad. El articulo derivo las ecuaciones sin muestras con materia
organica mayor a 8 %w ni arcilla mayor a 60 %w; fuera de ese rango no se extrapola y el resultado es NO_EVALUABLE.

Solo biblioteca estandar. Uso (desde la raiz del repo):  python -m unittest discover -s datos/catalogos
"""

OM_MAX_PCT = 8.0
ARCILLA_MAX_PCT = 60.0

URL_DOI = "https://doi.org/10.2136/sssaj2005.0117"
NOMBRE_FUENTE = ("Saxton, K. E. y Rawls, W. J. (2006), Soil Water Characteristic Estimates by Texture and Organic "
                 "Matter for Hydrologic Solutions, Soil Sci. Soc. Am. J. 70(5): 1569-1578")
CONSULTADO = "2026-11-14"


def retencion(arena_pct, arcilla_pct, materia_organica_pct):
    """Contenidos de agua (m3/m3) a saturacion, capacidad de campo (33 kPa) y marchitez (1500 kPa).

    Devuelve un dict con thetaSat, thetaFc, thetaWp y tawMmPorM (= 1000 (thetaFc - thetaWp), FAO-56 ec. 82 por metro
    de raiz). Lanza ValueError si las entradas no son validas o caen fuera del rango del articulo.
    """
    for nombre, v in (("arena", arena_pct), ("arcilla", arcilla_pct), ("materia organica", materia_organica_pct)):
        if not isinstance(v, (int, float)) or isinstance(v, bool) or v != v:
            raise ValueError(f"{nombre} debe ser un numero")
        if v < 0 or v > 100:
            raise ValueError(f"{nombre} debe estar entre 0 y 100 %")
    if arena_pct + arcilla_pct > 100:
        raise ValueError("arena + arcilla no puede pasar de 100 %")
    if materia_organica_pct > OM_MAX_PCT:
        raise ValueError(f"materia organica {materia_organica_pct} % > {OM_MAX_PCT} %: fuera del rango del articulo")
    if arcilla_pct > ARCILLA_MAX_PCT:
        raise ValueError(f"arcilla {arcilla_pct} % > {ARCILLA_MAX_PCT} %: fuera del rango del articulo")

    s, c, om = arena_pct / 100.0, arcilla_pct / 100.0, materia_organica_pct  # OM en porcentaje, ver docstring

    t1500t = -0.024*s + 0.487*c + 0.006*om + 0.005*(s*om) - 0.013*(c*om) + 0.068*(s*c) + 0.031      # ec. [1]
    t1500 = t1500t + (0.14*t1500t - 0.02)
    t33t = -0.251*s + 0.195*c + 0.011*om + 0.006*(s*om) - 0.027*(c*om) + 0.452*(s*c) + 0.299        # ec. [2]
    t33 = t33t + (1.283*t33t**2 - 0.374*t33t - 0.015)
    ts33t = 0.278*s + 0.034*c + 0.022*om - 0.018*(s*om) - 0.027*(c*om) - 0.584*(s*c) + 0.078        # ec. [3]
    ts33 = ts33t + (0.636*ts33t - 0.107)
    ts = t33 + ts33 - 0.097*s + 0.043                                                                # ec. [5]

    if not 0 < t1500 < t33 < ts:
        raise ValueError("el resultado no es fisicamente coherente (se espera 0 < marchitez < campo < saturacion)")
    return {"thetaSat": ts, "thetaFc": t33, "thetaWp": t1500, "tawMmPorM": 1000.0 * (t33 - t1500)}


def _fuente(cita, unidades):
    return {"nombre": NOMBRE_FUENTE, "url": URL_DOI, "cita": cita, "consultado": CONSULTADO, "unidades": unidades}


def _citado(valor, unidad, cita):
    return {"estado": "EVALUABLE", "valor": round(valor, 4), "unidad": unidad,
            "fuente": _fuente(cita, unidad), "etiqueta": "SUPUESTO"}


def agua_pedotransferencia(estimacion_id, arena, arcilla, materia_organica):
    """Objeto `agua` del contrato `suelo` (tawMmPorM, metodoTaw y retencion) con el metodo de Saxton y Rawls.

    arena, arcilla y materia_organica son valorCitado del contrato (con su propia fuente), en %, como los entrega la
    API; asi la procedencia de cada entrada viaja con el resultado. Si alguna no es EVALUABLE o cae fuera del rango
    del articulo, el TAW es NO_EVALUABLE con motivo (nunca un numero por defecto) y no se declara metodoTaw.
    """
    entradas = {"arenaPct": arena, "arcillaPct": arcilla, "materiaOrganicaPct": materia_organica}
    faltan = [k for k, v in entradas.items() if v.get("estado") != "EVALUABLE"]
    if faltan:
        return {"tawMmPorM": {"estado": "NO_EVALUABLE",
                              "motivo": "Saxton y Rawls necesita arena, arcilla y materia organica; falta: " + ", ".join(faltan) + "."}}
    try:
        r = retencion(arena["valor"], arcilla["valor"], materia_organica["valor"])
    except ValueError as error:
        return {"tawMmPorM": {"estado": "NO_EVALUABLE", "motivo": f"Saxton y Rawls (2006) no aplica: {error}."}}
    cita = "Tabla 1, ecuaciones [1] a [5]; densidad normal, sin grava ni salinidad"
    return {
        "tawMmPorM": _citado(round(r["tawMmPorM"], 1), "mm/m", cita + "; TAW = 1000 (thetaFC - thetaWP)"),
        "metodoTaw": {
            "metodo": "pedotransferencia_saxton_rawls_2006",
            "fuente": _fuente(cita, "mm/m"),
            "etiqueta": "SUPUESTO",
            "entradas": {"estimacionId": estimacion_id, **entradas},
        },
        "retencion": {
            "thetaSatM3M3": _citado(r["thetaSat"], "m3/m3", cita + "; ecuacion [5]"),
            "thetaFcM3M3": _citado(r["thetaFc"], "m3/m3", cita + "; ecuacion [2], 33 kPa"),
            "thetaWpM3M3": _citado(r["thetaWp"], "m3/m3", cita + "; ecuacion [1], 1500 kPa"),
        },
    }
