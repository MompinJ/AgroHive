"""Genera los catalogos de AgroHive (A1.5 cultivos, A1.6 suelos) desde fuentes citadas.

Uso (desde la raiz del repo):  python datos/catalogos/generar.py
Salidas: cultivos.json (contrato cultivo), suelos.json (contrato tabla-suelos) y calendario-isla.json
(contrato calendario-local), todas en datos/catalogos/.
Validacion: node datos/catalogos/validar.mjs

Reglas: cada cifra viene copiada de una tabla publicada y lleva su fuente. Si no hay fuente
verificada, el parametro es NO_EVALUABLE con motivo; nunca un numero inventado ni cero.
Las fuentes las verifica una persona antes de usarlas en la demo.
"""
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent
VERSION_CONTRATO = "0.13.0"
VERSION_CATALOGO = "0.1.0"
CONSULTADO = "2026-11-14"

# ---------------------------------------------------------------- fuentes

FAO56 = "FAO-56 (Allen, Pereira, Raes y Smith, 1998), Crop evapotranspiration, FAO Irrigation and Drainage Paper 56"
URL_FAO56_CAP6 = "https://www.fao.org/4/x0490e/x0490e0b.htm"
URL_FAO56_CAP7 = "https://www.fao.org/4/x0490e/x0490e0c.htm"
URL_FAO56_CAP8 = "https://www.fao.org/4/x0490e/x0490e0e.htm"

ECOCROP_COMMIT = "3a013150a27dde03f458aeec23c3d3589bce0282"
URL_ECOCROP = f"https://raw.githubusercontent.com/cropmodels/Recocrop/{ECOCROP_COMMIT}/inst/parameters/ecocrop.rds"
NOTA_ECOCROP = (
    "Base FAO EcoCrop distribuida en el paquete R Recocrop (archivo ecocrop.rds, sha256 6d2d1280...4e42b2). "
    "ecocrop.fao.org respondio HTTP 503 el 2026-11-14, por eso se uso esta copia. "
    "En EcoCrop las temperaturas se comparan con medias mensuales, no con maximas diarias."
)


def fuente(nombre, url, cita, unidades=None, nota=None):
    f = {"nombre": nombre, "url": url, "cita": cita, "consultado": CONSULTADO}
    if unidades:
        f["unidades"] = unidades
    if nota:
        f["nota"] = nota
    return f


def citado(valor, unidad, fuente_, etiqueta="FUENTE"):
    return {"estado": "EVALUABLE", "valor": valor, "unidad": unidad, "fuente": fuente_, "etiqueta": etiqueta}


def no_evaluable(motivo):
    return {"estado": "NO_EVALUABLE", "motivo": motivo}


# ---------------------------------------------------------------- cultivos

MOTIVO_CALOR = (
    "Sin fuente verificada para un umbral de temperatura maxima diaria de estres. "
    "EcoCrop solo da rangos para medias mensuales (TOPMX, TMAX), que no equivalen a este umbral."
)
MOTIVO_LLUVIA_CICLO = (
    "Sin fuente verificada de lluvia por ciclo. EcoCrop publica lluvia anual, que va en lluviaAnualMinMm/MaxMm "
    "y no se convierte a lluvia del ciclo."
)
# ---------------------------------------------------------------- calendario local de Isla (A0.6, V-20)
# Las ventanas de siembra no van en el catalogo (contratos 0.5.0): dependen del lugar y viven en un archivo con la
# forma de contratos/calendario-local.schema.json. Isla, Veracruz = INEGI 30/077, DDR 175 San Andres Tuxtla (SIAP).

URL_SIAP = "https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php"
URL_INIFAP_MAIZ_SUR = "https://www.gob.mx/cms/uploads/attachment/file/723016/Maiz_temporal_tehuantepec.pdf"
URL_AGENDA_VER = "https://www.gob.mx/cms/uploads/attachment/file/1066118/Agenda_T_cnica_Agr_cola_-_Veracruz-compressed.pdf"
CSV_SIAP_ISLA = AQUI / "fuentes" / "siap_isla_2021_2025.csv"
PERIODO_SIAP = ("2021-01-01", "2025-12-31")
CICLO_SIAP = {"PV": "Primavera-Verano", "OI": "Otoño-Invierno"}
CULTIVO_SIAP = {"maiz": "Maíz grano", "frijol": "Frijol", "chile": "Chile verde", "calabaza": None,
                "sorgo": "Sorgo grano", "sandia": "Sandía", "camote": "Camote", "cacahuate": "Cacahuate"}

INIFAP_MAIZ_PV = ("INIFAP, Tecnologia de produccion de maiz de temporal en el sur de Veracruz (region del Istmo de "
                  "Tehuantepec) para el ciclo de primavera-verano (C. A. Tinoco Alfaro, Campo Experimental Cotaxtla, 2022)")
AGENDA_VER = "INIFAP, Agenda Tecnica Agricola de Veracruz, 2a edicion (SAGARPA-INIFAP, 2015)"

# (cultivo, temporada) -> ventana con fuente. Lo que no esta aqui queda NO_EVALUABLE con motivo.
VENTANAS_ISLA = {
    ("maiz", "PV"): dict(
        desdeMes=6, desdeDia=1, hastaMes=7, hastaDia=15,
        fuente=fuente(INIFAP_MAIZ_PV, URL_INIFAP_MAIZ_SUR, "Seccion Siembra, 'Fecha de siembra', pag. 9", None,
                      "Texto: sembrar una vez establecidas las lluvias, lo cual puede ocurrir entre el 1 de junio y el 15 de julio. "
                      "La guia cubre el DDR San Andres Tuxtla, al que pertenece Isla."),
    ),
    ("maiz", "OI"): dict(
        desdeMes=11, hastaMes=12,
        fuente=fuente(AGENDA_VER, URL_AGENDA_VER, "Capitulo Maiz, 'Epocas de siembra', pag. 58", None,
                      "Texto: para siembras de riego y humedad residual se sugiere sembrar en noviembre y diciembre. "
                      "Recomendacion estatal, no especifica de Isla; se registra como temporal porque SIAP clasifica el maiz OI "
                      "de Isla como temporal."),
    ),
    ("frijol", "OI"): dict(
        desdeMes=9, desdeDia=20, hastaMes=10, hastaDia=20,
        fuente=fuente(AGENDA_VER, URL_AGENDA_VER, "Capitulo Frijol, 'Epocas de siembra', pag. 40", None,
                      "Texto: en otono-invierno con humedad residual, sembrar del 20 de septiembre al 20 de octubre. "
                      "Recomendacion estatal, no especifica de Isla."),
    ),
}
MOTIVO_SIN_VENTANA = {
    ("frijol", "PV"): "La ventana de verano de la Agenda Tecnica de Veracruz es solo para Las Altas Montanas; no hay ventana con fuente para Isla.",
    ("chile", "PV"): "Cultivo extra: aun no se consulta una fuente de calendario de siembra (INIFAP) para chile.",
    ("chile", "OI"): "Cultivo extra: aun no se consulta una fuente de calendario de siembra (INIFAP) para chile.",
    ("calabaza", "PV"): "SIAP no registra calabaza en Isla y la Agenda Tecnica de Veracruz no da calendario de calabaza.",
    ("calabaza", "OI"): "SIAP no registra calabaza en Isla y la Agenda Tecnica de Veracruz no da calendario de calabaza.",
    ("sorgo", "PV"): "Cultivo nuevo (encargo #198): aun no se consulta una fuente de calendario de siembra (INIFAP) para sorgo.",
    ("sorgo", "OI"): "Cultivo nuevo (encargo #198): aun no se consulta una fuente de calendario de siembra (INIFAP) para sorgo.",
    ("sandia", "PV"): "Cultivo nuevo (encargo #198): aun no se consulta una fuente de calendario de siembra (INIFAP) para sandia.",
    ("sandia", "OI"): "Cultivo nuevo (encargo #198): aun no se consulta una fuente de calendario de siembra (INIFAP) para sandia.",
    ("camote", "PV"): "SIAP no registra camote en Isla (si en San Andres y Santiago Tuxtla, del mismo DDR) y no se consulto una fuente de calendario para el.",
    ("camote", "OI"): "SIAP no registra camote en Isla (si en San Andres y Santiago Tuxtla, del mismo DDR) y no se consulto una fuente de calendario para el.",
    ("cacahuate", "PV"): "SIAP no registra cacahuate en Isla (si en Catemaco, del mismo DDR) y no se consulto una fuente de calendario para el.",
    ("cacahuate", "OI"): "SIAP no registra cacahuate en Isla (si en Catemaco, del mismo DDR) y no se consulto una fuente de calendario para el.",
}
ORDEN_ISLA = [("maiz", "PV"), ("maiz", "OI"), ("frijol", "PV"), ("frijol", "OI"),
              ("chile", "PV"), ("chile", "OI"), ("calabaza", "PV"), ("calabaza", "OI"),
              ("sorgo", "PV"), ("sorgo", "OI"), ("sandia", "PV"), ("sandia", "OI"),
              ("camote", "PV"), ("camote", "OI"), ("cacahuate", "PV"), ("cacahuate", "OI")]


def superficie_siap_isla():
    """(cultivo SIAP, ciclo SIAP) -> {anio: hectareas sembradas de temporal}, leido del extracto de SIAP."""
    import csv
    sup = {}
    with open(CSV_SIAP_ISLA, encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["Nommodalidad"] != "Temporal":
                continue
            clave = (r["Nomcultivo"], r["Nomcicloproductivo"])
            sup.setdefault(clave, {})
            sup[clave][r["Anio"]] = sup[clave].get(r["Anio"], 0.0) + float(r["Sembrada"] or 0)
    return sup


def presencia_isla(cultivo_id, temporada, sup):
    fuente_siap = fuente("SIAP, cierre agricola municipal (datos abiertos)", URL_SIAP,
                         "Isla (Veracruz, municipio 77, DDR San Andres Tuxtla); extracto en datos/catalogos/fuentes/siap_isla_2021_2025.csv",
                         "hectareas sembradas (temporal)")
    nombre = CULTIVO_SIAP[cultivo_id]
    ciclo = CICLO_SIAP_PROPIO.get(cultivo_id, CICLO_SIAP[temporada])
    anios = {a: h for a, h in sup.get((nombre, ciclo), {}).items() if h > 0} if nombre else {}
    if not anios:
        return {"estado": "no_registrado", "periodo": {"desde": PERIODO_SIAP[0], "hasta": PERIODO_SIAP[1]},
                "fuente": fuente_siap,
                "nota": "Sin superficie sembrada de este cultivo en este ciclo en Isla, 2021-2025."}
    a0, a1 = min(anios), max(anios)
    lista = ", ".join(f"{a}: {anios[a]:,.0f} ha" for a in sorted(anios))
    return {"estado": "registrado", "periodo": {"desde": f"{a0}-01-01", "hasta": f"{a1}-12-31"},
            "fuente": fuente_siap, "nota": f"Superficie sembrada de temporal por anio: {lista}."
            + (f" SIAP lo registra en el ciclo '{ciclo}', no por temporada PV u OI." if cultivo_id in CICLO_SIAP_PROPIO else "")}


def calendario_isla():
    sup = superficie_siap_isla()
    entradas = []
    for cultivo_id, temporada in ORDEN_ISLA:
        presencia = presencia_isla(cultivo_id, temporada, sup)
        clave = (cultivo_id, temporada)
        entrada = {"cultivo": cultivo_id, "temporada": temporada, "regimen": "temporal"}
        if clave in VENTANAS_ISLA:
            entrada |= {"estado": "EVALUABLE", "ventana": {"estado": "EVALUABLE", **VENTANAS_ISLA[clave]}}
        else:
            motivo = MOTIVO_SIN_VENTANA[clave]
            entrada |= {"estado": "NO_EVALUABLE", "motivo": motivo, "ventana": no_evaluable(motivo)}
        entrada["presencia"] = presencia
        entradas.append(entrada)
    return {
        "meta": {"versionContrato": VERSION_CONTRATO, "esEjemplo": False, "generado": f"{CONSULTADO}T00:00:00Z",
                 "aviso": "Ventanas de recomendaciones regionales de INIFAP y presencia segun SIAP; no son un calendario validado "
                          "para la parcela. Requieren validacion con un tecnico local."},
        "id": "calendario-isla",
        "ubicacion": {"pais": "Mexico", "claveEstadoInegi": "30", "estado": "Veracruz",
                      "claveMunicipioInegi": "077", "municipio": "Isla", "ddr": "San Andres Tuxtla"},
        "entradas": entradas,
        "advertencias": [
            {"codigo": "VENTANAS_REGIONALES", "severidad": "aviso",
             "mensaje": "Solo el maiz de primavera-verano tiene una guia que cubre el distrito de Isla; el resto son recomendaciones "
                        "estatales de Veracruz."},
            {"codigo": "CALABAZA_NO_REGISTRADA", "severidad": "aviso",
             "mensaje": "SIAP no registra calabaza en Isla entre 2021 y 2025: se muestra en la demo, pero no es recomendable alli."},
            {"codigo": "CAMOTE_CACAHUATE_NO_REGISTRADOS", "severidad": "aviso",
             "mensaje": "SIAP no registra camote ni cacahuate en Isla entre 2021 y 2025 (si en municipios vecinos del mismo distrito): "
                        "no son recomendables alli sin validar con un tecnico local."},
        ] + ADVERTENCIAS_ISLA_AMPLIACION,
    }

# Cada cultivo: fila de FAO-56 Tabla 11 (dias por etapa), Tabla 12 (Kc), Tabla 22 (Zr, p) y fila de EcoCrop.
CULTIVOS = [
    {
        "id": "maiz",
        "nombreComun": "Maiz",
        "nombreCientifico": "Zea mays L.",
        "esLeguminosa": False,
        "t11": {"fila": "Maize (grain)", "region": "Nigeria (humid)", "siembra": "June",
                "etapas": (20, 35, 40, 30), "total": 125,
                "porque": "Unica fila de tropico humedo con siembra en junio, analoga al temporal primavera-verano de Isla, Veracruz."},
        "t12": {"fila": "Maize, Field (grain) (field corn)",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila del maiz no da Kc ini propio)."),
                "mid": (1.20, None),
                "end": (0.35, "Tabla 12 da 0.60-0.35 (nota 11): 0.35 es para cosecha tras secado completo en campo, como el grano de la milpa.")},
        "t22": {"fila": "Maize, Field (grain) (field corn)", "zr": 1.7, "zrRango": "1.0-1.7", "p": 0.55},
        "eco": {"fila": "Maize", "sci": "Zea mays L. s. mays", "gmin": 65, "gmax": 365,
                "tmin": 10, "topmn": 18, "topmx": 33, "tmax": 47,
                "rmin": 400, "ropmn": 600, "ropmx": 1200, "rmax": 1800},
        "modelo3d": "maiz",
    },
    {
        "id": "frijol",
        "nombreComun": "Frijol",
        "nombreCientifico": "Phaseolus vulgaris L.",
        "esLeguminosa": True,
        "t11": {"fila": "Beans (dry)", "region": "Pakistan, Calif.", "siembra": "June",
                "etapas": (15, 25, 35, 20), "total": 95,
                "porque": "Tabla 11 no tiene fila tropical para frijol; se eligio la de clima calido con siembra en junio. Verificar con calendario INIFAP."},
        "t12": {"fila": "Beans, dry and Pulses",
                "ini": (0.4, None),
                "mid": (1.15, "Nota 2: si el frijol crece en guia sobre el maiz (milpa) puede tomarse 1.20."),
                "end": (0.35, None)},
        "t22": {"fila": "Beans, dry and Pulses", "zr": 0.9, "zrRango": "0.6-0.9", "p": 0.45},
        "eco": {"fila": "Bean, Common", "sci": "Phaseolus vulgaris L.", "gmin": 50, "gmax": 270,
                "tmin": 7, "topmn": 16, "topmx": 25, "tmax": 32,
                "rmin": 300, "ropmn": 500, "ropmx": 2000, "rmax": 4300},
        "modelo3d": "frijol",
    },
    {
        "id": "calabaza",
        "nombreComun": "Calabaza",
        "nombreCientifico": "Cucurbita moschata Duchesne",
        "esLeguminosa": False,
        "t11": {"fila": "Pumpkin, Winter squash", "region": "Mediterranean", "siembra": "Mar, Aug",
                "etapas": (20, 30, 30, 20), "total": 100,
                "porque": "Calabaza de milpa cosechada madura: se uso Pumpkin/Winter squash y no Zucchini. Tabla 11 no tiene fila tropical; se eligio la mediterranea (mas calida que la de Europa)."},
        "t12": {"fila": "Pumpkin, Winter Squash",
                "ini": (0.5, "Kc ini general del grupo c. Vegetables - Cucumber Family (la fila no da Kc ini propio)."),
                "mid": (1.00, None),
                "end": (0.80, None)},
        "t22": {"fila": "Pumpkin, Winter Squash", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.35},
        "eco": {"fila": "Pumpkin", "sci": "Cucurbita moschata (Duch.)", "gmin": 80, "gmax": 140,
                "tmin": 10, "topmn": 20, "topmx": 30, "tmax": 40,
                "rmin": 300, "ropmn": 600, "ropmx": 1600, "rmax": 2800},
        "modelo3d": "calabaza",
    },
    {
        "id": "chile",
        "nombreComun": "Chile",
        "nombreCientifico": "Capsicum annuum L.",
        "esLeguminosa": False,
        "equivalencia": ("FAO-56 y EcoCrop no traen 'chile verde': se usa el pimiento dulce (Sweet pepper, Sweet Peppers (bell)), "
                         "que es la misma especie, Capsicum annuum. Es una equivalencia, no un dato medido en chile serrano o jalapeno: "
                         "una persona debe revisarla. 'Hot pepper' de EcoCrop es otra especie (Capsicum frutescens) y no se uso."),
        "t11": {"fila": "Sweet peppers (bell)", "region": "Europe and Medit.", "siembra": "April/June",
                "etapas": (30, 35, 40, 20), "total": 125,
                "porque": ("Tabla 11 no tiene fila tropical para pimiento; se eligio la de siembra abril/junio, que coincide con el temporal "
                           "primavera-verano de Isla. La etapa inicial se imprime '25/30' y el total 125 solo cuadra con 30, asi que se usa 30.")},
        "t12": {"fila": "Sweet Peppers (bell)",
                "ini": (0.6, "Kc ini general del grupo b. Vegetables - Solanum Family (la fila del pimiento no da Kc ini propio)."),
                "mid": (1.05, "Nota 2: si el chile crece en estacas de 1.5 a 2 m puede tomarse 1.15."),
                "end": (0.90, None)},
        "t22": {"fila": "Sweet Peppers (bell)", "zr": 1.0, "zrRango": "0.5-1.0", "p": 0.30},
        "eco": {"fila": "Sweet pepper", "sci": "Capsicum annuum L.", "gmin": 60, "gmax": 180,
                "tmin": 8, "topmn": 17, "topmx": 30, "tmax": 35,
                "rmin": 500, "ropmn": 600, "ropmx": 1250, "rmax": 1700},
        "modelo3d": "chile",
    },
    {
        "id": "sorgo",
        "nombreComun": "Sorgo",
        "nombreCientifico": "Sorghum bicolor (L.) Moench",
        "esLeguminosa": False,
        "t11": {"fila": "Sorghum", "region": "USA, Pakis., Med.", "siembra": "May/June",
                "etapas": (20, 35, 40, 30), "total": 125, "total_impreso": 130,
                "porque": ("Tabla 11 no tiene fila tropical para sorgo; se eligio la de siembra mayo/junio, que coincide con el temporal "
                           "primavera-verano de Isla. La fila imprime 20/35/40/30 pero un total de 130 dias: las cuatro etapas suman 125. "
                           "Se guardan las etapas tal como estan impresas y el ciclo es su suma (125); la diferencia de 5 dias queda por "
                           "cotejar contra el PDF de FAO-56 (la pagina web es una version con OCR corregido a mano).")},
        "t12": {"fila": "Sorghum - grain",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila del sorgo no da Kc ini propio)."),
                "mid": (1.05, "Tabla 12 da el rango 1.00-1.10; 1.05 es su punto medio (eleccion del equipo, no de la fuente)."),
                "end": (0.55, None)},
        "t22": {"fila": "Sorghum - grain", "zr": 2.0, "zrRango": "1.0-2.0", "p": 0.55},
        "eco": {"fila": "Sorghum (low altitude)", "sci": "Sorghum bicolor (L.) Moench", "gmin": 90, "gmax": 300,
                "tmin": 8, "topmn": 27, "topmx": 35, "tmax": 40,
                "rmin": 300, "ropmn": 500, "ropmx": 1000, "rmax": 3000},
        "nota_extra": ("EcoCrop trae tres filas de la misma especie por altitud (baja, media, alta); se uso la de altitud baja por ser "
                       "Isla zona de tierras bajas del sur de Veracruz (la altitud exacta de la parcela no se verifico). Una persona debe revisarlo."),
        "modelo3d": "sorgo",
    },
    {
        "id": "sandia",
        "nombreComun": "Sandia",
        "nombreCientifico": "Citrullus lanatus (Thunb.) Matsum. & Nakai",
        "esLeguminosa": False,
        "t11": {"fila": "Watermelon", "region": "Italy", "siembra": "April",
                "etapas": (20, 30, 30, 30), "total": 110,
                "porque": ("Tabla 11 no tiene fila tropical para sandia; se eligio la de Italia con siembra en abril (110 dias, clima calido). "
                           "La otra fila es de desierto del Cercano Oriente (80 dias) y no se uso.")},
        "t12": {"fila": "Watermelon",
                "ini": (0.4, None),
                "mid": (1.00, None),
                "end": (0.75, None)},
        "t22": {"fila": "Watermelon", "zr": 1.5, "zrRango": "0.8-1.5", "p": 0.40},
        "eco": {"fila": "Watermelon", "sci": "Citrullus lanatus (T) Mansf", "gmin": 80, "gmax": 160,
                "tmin": 15, "topmn": 20, "topmx": 30, "tmax": 35,
                "rmin": 400, "ropmn": 500, "ropmx": 750, "rmax": 1800},
        "modelo3d": "sandia",
    },
    {
        "id": "camote",
        "nombreComun": "Camote",
        "nombreCientifico": "Ipomoea batatas (L.) Lam.",
        "esLeguminosa": False,
        "t11": {"fila": "Sweet potato", "region": "Tropical regions", "siembra": "Rainy seas.",
                "etapas": (15, 30, 50, 30), "total": 125,
                "porque": ("Unica fila tropical de camote (temporada de lluvias), analoga al temporal primavera-verano de Isla. "
                           "La otra fila es de siembra en abril en el Mediterraneo (150 dias).")},
        "t12": {"fila": "Sweet Potato",
                "ini": (0.5, "Kc ini general del grupo d. Roots and Tubers (la fila del camote no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.65, None)},
        "t22": {"fila": "Sweet Potato", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.65},
        "eco": {"fila": "Sweet potato", "sci": "Ipomoea batatas (L.) Lam.", "gmin": 80, "gmax": 170,
                "tmin": 10, "topmn": 18, "topmx": 28, "tmax": 38,
                "rmin": 500, "ropmn": 750, "ropmx": 1250, "rmax": 5000},
        "nota_extra": ("SIAP no registra camote en Isla entre 2021 y 2025; si lo registra en San Andres Tuxtla y Santiago Tuxtla, del "
                       "mismo distrito (DDR 175). Ver datos/catalogos/fuentes/siap_veracruz_candidatos_2021_2025.csv."),
        "modelo3d": "camote",
    },
    {
        "id": "cacahuate",
        "nombreComun": "Cacahuate",
        "nombreCientifico": "Arachis hypogaea L.",
        "esLeguminosa": True,
        "t11": {"fila": "Groundnut", "region": "West Africa", "siembra": "Dry season",
                "etapas": (25, 35, 45, 25), "total": 130,
                "porque": ("Tabla 11 no tiene fila tropical etiquetada para cacahuate; se eligio la de Africa Occidental (clima calido). "
                           "Su fecha impresa es 'Dry season' (temporada seca), no el temporal de lluvias de Isla: es una analogia de ciclo, "
                           "no de calendario. Las otras filas son de latitudes altas y del Mediterraneo. La extraccion de la pagina parte "
                           "las fechas en celdas, asi que esta asignacion es una lectura que una persona debe cotejar.")},
        "t12": {"fila": "Groundnut (Peanut)",
                "ini": (0.4, "Kc ini general del grupo e. Legumes (la fila del cacahuate no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.60, None)},
        "t22": {"fila": "Groundnut (Peanut)", "zr": 1.0, "zrRango": "0.5-1.0", "p": 0.50},
        "eco": {"fila": "Groundnut", "sci": "Arachis hypogaea L.", "gmin": 90, "gmax": 150,
                "tmin": 10, "topmn": 22, "topmx": 32, "tmax": 45,
                "rmin": 400, "ropmn": 600, "ropmx": 1500, "rmax": 4000},
        "nota_extra": ("SIAP no registra cacahuate en Isla entre 2021 y 2025; si lo registra en Catemaco, del mismo distrito (DDR 175). "
                       "Ver datos/catalogos/fuentes/siap_veracruz_candidatos_2021_2025.csv."),
        "modelo3d": "cacahuate",
    },
]

NOTA_KC_INI = (
    "FAO-56 Tabla 12 nota 1: con mojado frecuente (lluvia diaria) el Kc ini puede subir hasta 1.0-1.2; "
    "para temporal lluvioso conviene calcularlo con el procedimiento del capitulo 6 de FAO-56."
)
NOTA_ZR = "Se toma el extremo mayor del rango: Tabla 22 nota 1 indica los valores mayores para modelar estres hidrico o temporal."
NOTA_P = "Valido para ETc ~ 5 mm/dia; ajustar con p = p_tabla + 0.04 (5 - ETc), limitado a 0.1 <= p <= 0.8 (FAO-56, cap. 8)."
NOTA_CLIMA_KC = "Kc mid y Kc end de Tabla 12 son para clima subhumedo (RHmin ~45 %, u2 ~2 m/s); ajustar por clima segun FAO-56 ec. 62 y 65."

# ---------------------------------------------------------------- ampliacion del catalogo (15/11, decidido por Mompin)
# Cultivos nuevos, al final de la lista y sin modelo3d. Mismas fuentes y criterios que los ocho de arriba; las elecciones
# nuevas estan en la tabla "Elecciones que una persona debe revisar" de README.md. Criterio de fila de Tabla 11:
# (a) fila tropical si existe; (b) si no, la de siembra mas cercana a junio (temporal PV de Isla); (c) empate: la region
# mas calida; (d) se salta una fila con etapas impresas ambiguas o que no suman su total si otra fila cumple.
MOTIVO_SIN_VENTANA_AMPLIACION = ("Cultivo de la ampliacion del catalogo (15/11): aun no se consulta una fuente de calendario de "
                                 "siembra (INIFAP) para {nombre}.")
NOTA_ESTACAS = "Nota 2 de Tabla 12: si crece con tutores de 1.5 a 2 m el Kc medio debe aumentarse."
FILA_CEREALES = {"fila": "Barley/Oats/Wheat", "region": "East Africa", "siembra": "July",
                 "etapas": (15, 30, 65, 40), "total": 150,
                 "porque": ("Tabla 11 da una sola fila para cebada, avena y trigo. De sus filas de latitudes tropicales (India central, "
                            "noviembre, 120 d; Africa Oriental, julio, 150 d) se eligio la de julio, la mas cercana al temporal "
                            "primavera-verano de Isla. La tabla no dice la altitud de esa fila: una persona debe revisarlo.")}
AMPLIACION = [
    # -- tanda 1: leguminosas y cereales para rotaciones
    {
        "id": "soya",
        "modelo3d": "soya",
        "nombreComun": "Soya",
        "nombreCientifico": "Glycine max (L.) Merr.",
        "esLeguminosa": True,
        "t11": {"fila": "Soybeans", "region": "Tropics", "siembra": "Dec",
                "etapas": (15, 15, 40, 15), "total": 85,
                "porque": ("Unica fila tropical de soya; su siembra impresa es diciembre (otono-invierno en Isla). Las otras filas son "
                           "del centro de EUA (mayo, 140 d) y de Japon (junio, 150 d).")},
        "t12": {"fila": "Soybeans",
                "ini": (0.4, "Kc ini general del grupo e. Legumes (la fila de la soya no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.50, None)},
        "t22": {"fila": "Soybeans", "zr": 1.3, "zrRango": "0.6-1.3", "p": 0.50},
        "eco": {"fila": "Soyabean", "sci": "Glycine max (L.) Merrill", "gmin": 75, "gmax": 180,
                "tmin": 10, "topmn": 20, "topmx": 33, "tmax": 38,
                "rmin": 450, "ropmn": 600, "ropmx": 1500, "rmax": 1800},
        "nota_extra": ("SIAP no registra soya en Isla entre 2021 y 2025; en Veracruz solo en Panuco, al norte del estado. "
                       "Ver datos/catalogos/fuentes/siap_veracruz_candidatos_2021_2025.csv."),
    },
    {
        "id": "caupi",
        "modelo3d": "caupi",
        "nombreComun": "Frijol caupi",
        "nombreCientifico": "Vigna unguiculata (L.) Walp.",
        "esLeguminosa": True,
        "t11": {"fila": "Green gram, cowpeas", "region": "Mediterranean", "siembra": "March",
                "etapas": (20, 30, 30, 20), "total": 100, "total_impreso": 110,
                "porque": ("Unica fila de Tabla 11 para caupi (compartida con el frijol mungo); no hay fila tropical. La fila imprime "
                           "20/30/30/20 pero un total de 110 dias: las cuatro etapas suman 100. Como con el sorgo, se guardan las "
                           "etapas impresas y el ciclo es su suma (100); la diferencia queda por cotejar contra el PDF de FAO-56.")},
        "t12": {"fila": "Green Gram and Cowpeas",
                "ini": (0.4, "Kc ini general del grupo e. Legumes (la fila del caupi no da Kc ini propio)."),
                "mid": (1.05, None),
                "end": (0.35, "Tabla 12 da 0.60-0.35 (nota 6): el primer valor es para cosecha en fresco y el segundo para grano seco; se usa 0.35, grano seco.")},
        "t22": {"fila": "Green Gram and Cowpeas", "zr": 1.0, "zrRango": "0.6-1.0", "p": 0.45},
        "eco": {"fila": "Cowpea", "sci": "Vigna unguiculata unguic. L", "gmin": 60, "gmax": 240,
                "tmin": 10, "topmn": 20, "topmx": 35, "tmax": 40,
                "rmin": 400, "ropmn": 600, "ropmx": 1500, "rmax": 4100},
    },
    {
        "id": "haba",
        "modelo3d": "haba",
        "nombreComun": "Haba",
        "nombreCientifico": "Vicia faba L.",
        "esLeguminosa": True,
        "t11": {"fila": "Faba bean, broad bean", "region": "Europe", "siembra": "May",
                "etapas": (15, 25, 35, 15), "total": 90,
                "porque": ("Tabla 11 no tiene fila tropical para haba; se eligio la de siembra en mayo, la mas cercana al temporal "
                           "primavera-verano de Isla. Las otras son marzo/abril en el Mediterraneo (100 d) y noviembre en Europa "
                           "(haba de invierno, 235 d).")},
        "t12": {"fila": "Fababean (broad bean) - Dry/Seed",
                "ini": (0.5, None),
                "mid": (1.15, NOTA_ESTACAS),
                "end": (0.30, None)},
        "t22": {"fila": "Fababean (broad bean) - Dry/Seed", "zr": 0.7, "zrRango": "0.5-0.7", "p": 0.45},
        "eco": {"fila": "Broad bean", "sci": "Vicia faba L.", "gmin": 100, "gmax": 150,
                "tmin": 5, "topmn": 18, "topmx": 28, "tmax": 32,
                "rmin": 250, "ropmn": 650, "ropmx": 1000, "rmax": 2600},
        "nota_extra": ("Se usa la subfila de grano seco (Dry/Seed) porque SIAP registra 'haba grano'; la de cosecha en fresco "
                       "tiene Kc end 1.10. SIAP no registra haba en Isla entre 2021 y 2025."),
    },
    {
        "id": "chicharo",
        "modelo3d": "chicharo",
        "nombreComun": "Chicharo",
        "nombreCientifico": "Pisum sativum L.",
        "esLeguminosa": True,
        "t11": {"fila": "Peas", "region": "Europe", "siembra": "May",
                "etapas": (15, 25, 35, 15), "total": 90,
                "porque": ("Tabla 11 no tiene fila tropical para chicharo; se eligio la de siembra en mayo, la mas cercana al temporal "
                           "primavera-verano de Isla. Las otras son marzo/abril en el Mediterraneo (100 d) y abril en Idaho (110 d).")},
        "t12": {"fila": "Peas - Fresh",
                "ini": (0.5, None),
                "mid": (1.15, NOTA_ESTACAS + " Para chicharo con tutores la nota da 1.20."),
                "end": (1.10, None)},
        "t22": {"fila": "Peas - Fresh", "zr": 1.0, "zrRango": "0.6-1.0", "p": 0.35},
        "eco": {"fila": "Pea", "sci": "Pisum sativum L.", "gmin": 60, "gmax": 140,
                "tmin": 4, "topmn": 10, "topmx": 24, "tmax": 30,
                "rmin": 350, "ropmn": 800, "ropmx": 1200, "rmax": 2500},
        "nota_extra": ("Se usa la subfila de cosecha en fresco (chicharo verde); la de grano seco (Dry/Seed) da Kc end 0.30 y "
                       "p 0.40. Eleccion del equipo: una persona debe revisarla."),
    },
    {
        "id": "lenteja",
        "modelo3d": "lenteja",
        "nombreComun": "Lenteja",
        "nombreCientifico": "Lens culinaris Medik.",
        "esLeguminosa": True,
        "t11": {"fila": "Lentil", "region": "Europe", "siembra": "April",
                "etapas": (20, 30, 60, 40), "total": 150,
                "porque": ("Tabla 11 no tiene fila tropical para lenteja; se eligio la de siembra en abril, la mas cercana al temporal "
                           "primavera-verano de Isla. La otra es de octubre/noviembre en region arida (170 d).")},
        "t12": {"fila": "Lentil",
                "ini": (0.4, "Kc ini general del grupo e. Legumes (la fila de la lenteja no da Kc ini propio)."),
                "mid": (1.10, None),
                "end": (0.30, None)},
        "t22": {"fila": "Lentil", "zr": 0.8, "zrRango": "0.6-0.8", "p": 0.50},
        "eco": {"fila": "Lentil", "sci": "Lens culinaris Medikus", "gmin": 70, "gmax": 240,
                "tmin": 5, "topmn": 15, "topmx": 29, "tmax": 32,
                "rmin": 250, "ropmn": 600, "ropmx": 1000, "rmax": 2500},
    },
    {
        "id": "ejote",
        "nombreComun": "Ejote",
        "nombreCientifico": "Phaseolus vulgaris L.",
        "esLeguminosa": True,
        "t11": {"fila": "Beans (green)", "region": "Calif., Egypt, Lebanon", "siembra": "Aug/Sep",
                "etapas": (15, 25, 25, 10), "total": 75,
                "porque": ("Tabla 11 no tiene fila tropical para ejote; se eligio la de siembra agosto/septiembre, la mas cercana al "
                           "temporal primavera-verano de Isla. La otra es de febrero/marzo en California y el Mediterraneo (90 d).")},
        "t12": {"fila": "Beans, green",
                "ini": (0.5, None),
                "mid": (1.05, "Nota 2: si crece con tutores de 1.5 a 2 m puede tomarse 1.15."),
                "end": (0.90, None)},
        "t22": {"fila": "Beans, green", "zr": 0.7, "zrRango": "0.5-0.7", "p": 0.45},
        "eco": {"fila": "Bean, Common", "sci": "Phaseolus vulgaris L.", "gmin": 50, "gmax": 270,
                "tmin": 7, "topmn": 16, "topmx": 25, "tmax": 32,
                "rmin": 300, "ropmn": 500, "ropmx": 2000, "rmax": 4300},
        "nota_extra": "Misma especie que el frijol, cosechada en vaina verde: EcoCrop no separa el ejote y se usa la fila del frijol comun.",
    },
    {
        "id": "cebada",
        "nombreComun": "Cebada",
        "nombreCientifico": "Hordeum vulgare L.",
        "esLeguminosa": False,
        "t11": FILA_CEREALES,
        "t12": {"fila": "Barley",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila de la cebada no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.25, None)},
        "t22": {"fila": "Barley", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.55},
        "eco": {"fila": "Barley", "sci": "Hordeum vulgare L.", "gmin": 90, "gmax": 240,
                "tmin": 2, "topmn": 15, "topmx": 20, "tmax": 40,
                "rmin": 200, "ropmn": 500, "ropmx": 1000, "rmax": 2000},
    },
    {
        "id": "trigo",
        "nombreComun": "Trigo",
        "nombreCientifico": "Triticum aestivum L.",
        "esLeguminosa": False,
        "t11": FILA_CEREALES,
        "t12": {"fila": "Spring Wheat",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila del trigo no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.25, "Tabla 12 da 0.25-0.4 (nota 10): el valor mayor es para cosecha manual; se usa 0.25, cosecha mecanica. Eleccion del equipo: una persona debe revisarla.")},
        "t22": {"fila": "Spring Wheat", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.55},
        "eco": {"fila": "Wheat, common", "sci": "Triticum aestivum L.", "gmin": 90, "gmax": 250,
                "tmin": 5, "topmn": 15, "topmx": 23, "tmax": 27,
                "rmin": 300, "ropmn": 750, "ropmx": 900, "rmax": 1600},
        "nota_extra": "Se usa trigo de primavera (Spring Wheat): las filas de trigo de invierno de Tabla 12 suponen suelos helados o latencia invernal.",
    },
    {
        "id": "avena",
        "nombreComun": "Avena",
        "nombreCientifico": "Avena sativa L.",
        "esLeguminosa": False,
        "t11": FILA_CEREALES,
        "t12": {"fila": "Oats",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila de la avena no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.25, None)},
        "t22": {"fila": "Oats", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.55},
        "eco": {"fila": "Oats", "sci": "Avena sativa L.", "gmin": 110, "gmax": 270,
                "tmin": 5, "topmn": 16, "topmx": 20, "tmax": 30,
                "rmin": 250, "ropmn": 600, "ropmx": 1000, "rmax": 1500},
        "nota_extra": "Avena para grano: la avena forrajera de corte no tiene fila propia en FAO-56.",
    },
    {
        "id": "maiz_dulce",
        "nombreComun": "Maiz dulce (elote)",
        "nombreCientifico": "Zea mays L. var. saccharata",
        "esLeguminosa": False,
        "t11": {"fila": "Maize (sweet)", "region": "Philippines", "siembra": "March",
                "etapas": (20, 20, 30, 10), "total": 80,
                "porque": "Unica fila tropical de maiz dulce. Nota 3 de Tabla 11: la etapa final dura unos 35 dias si el grano se deja madurar y secar."},
        "t12": {"fila": "Maize, Sweet (sweet corn)",
                "ini": (0.3, "Kc ini general del grupo i. Cereals (la fila del maiz dulce no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (1.05, "Nota 12: 1.05 si se cosecha en fresco para consumo humano; si se deja secar en campo, usar el Kc end del maiz de grano.")},
        "t22": {"fila": "Maize, Sweet (sweet corn)", "zr": 1.2, "zrRango": "0.8-1.2", "p": 0.50},
        "eco": {"fila": "Sweet Corn", "sci": "Zea mays v.saccharata Sturt", "gmin": 65, "gmax": 100,
                "tmin": 12, "topmn": 16, "topmx": 24, "tmax": 38,
                "rmin": 600, "ropmn": 800, "ropmx": 1500, "rmax": 1800},
        "nota_extra": ("Maiz dulce cosechado en fresco. El elote de maiz criollo que se cosecha tierno no es esta variedad: "
                       "para el se usaria la fila del maiz de grano con otra fecha de cosecha, que FAO-56 no publica."),
    },
    # -- tanda 2: cultivos de campo del tropico y de Mexico (raices, cana, oleaginosas, algodon, tomate, papa, calabacita)
    {
        "id": "yuca",
        "nombreComun": "Yuca",
        "nombreCientifico": "Manihot esculenta Crantz",
        "esLeguminosa": False,
        "t11": {"fila": "Cassava: year 1", "region": "Tropical regions", "siembra": "Rainy season",
                "etapas": (20, 40, 90, 60), "total": 210,
                "porque": ("Unica fila tropical de yuca (temporada de lluvias), analoga al temporal primavera-verano de Isla. Se usa el "
                           "primer ano: el segundo (360 d) es la continuacion del mismo cultivo y no cabe en la serie del escenario. "
                           "La pagina parte 'Rainy season' entre las filas del ano 1 y del ano 2: cotejar con el PDF.")},
        "t12": {"fila": "Cassava - year 1",
                "ini": (0.3, None),
                "mid": (0.80, "Nota 3: el Kc medio supone condiciones sin estres durante o despues de la temporada de lluvias; el Kc end considera la latencia en la temporada seca."),
                "end": (0.30, None)},
        "t22": {"fila": "Cassava - year 1", "zr": 0.8, "zrRango": "0.5-0.8", "p": 0.35},
        "eco": {"fila": "Cassava", "sci": "Manihot esculenta Crantz.", "gmin": 180, "gmax": 365,
                "tmin": 10, "topmn": 20, "topmx": 29, "tmax": 35,
                "rmin": 500, "ropmn": 1000, "ropmx": 1500, "rmax": 5000},
        "nota_extra": ("SIAP no registra yuca en ningun municipio de Veracruz entre 2021 y 2025 (temporal). "
                       "Ver datos/catalogos/fuentes/LEEME.md."),
    },
    {
        "id": "cana",
        "nombreComun": "Cana de azucar",
        "nombreCientifico": "Saccharum officinarum L.",
        "esLeguminosa": False,
        "siap": "Caña de azúcar",
        "t11": {"fila": "Sugarcane, virgin", "region": "Tropics", "siembra": "sin fecha impresa",
                "etapas": (50, 70, 220, 140), "total": 480,
                "porque": ("Fila tropical de cana de planta (virgin), la que corresponde a una siembra nueva. La de soca (ratoon, Tropics, "
                           "320 d) es el rebrote tras el corte, sin siembra. Con 480 dias el ciclo solo cabe en la serie del escenario "
                           "(1 de octubre de t-1 al 31 de marzo de t+1, doc 05) si se siembra en octubre a diciembre (OI); otra fecha "
                           "deja el ciclo NO_EVALUABLE. La tabla no imprime fecha de siembra.")},
        "t12": {"fila": "Sugar Cane",
                "ini": (0.40, None),
                "mid": (1.25, None),
                "end": (0.75, None)},
        "t22": {"fila": "Sugar Cane", "zr": 2.0, "zrRango": "1.2-2.0", "p": 0.65},
        "eco": {"fila": "Sugarcane", "sci": "Saccharum officinarum L.", "gmin": 210, "gmax": 365,
                "tmin": 15, "topmn": 24, "topmx": 37, "tmax": 41,
                "rmin": 1000, "ropmn": 1500, "ropmx": 2000, "rmax": 5000},
        "nota_extra": ("Cultivo perenne: SIAP la registra en Isla en el ciclo 'Perennes', no por temporada PV u OI. EcoCrop trae dos "
                       "filas 'Sugarcane'; se uso la de Saccharum officinarum (la otra es S. robustum)."),
    },
    {
        "id": "ajonjoli",
        "nombreComun": "Ajonjoli",
        "nombreCientifico": "Sesamum indicum L.",
        "esLeguminosa": False,
        "t11": {"fila": "Sesame", "region": "China", "siembra": "June",
                "etapas": (20, 30, 40, 20), "total": 110, "total_impreso": 100,
                "porque": ("Unica fila de Tabla 11 para ajonjoli; su siembra en junio coincide con el temporal primavera-verano de Isla. "
                           "La fila imprime 20/30/40/20 pero un total de 100 dias: las cuatro etapas suman 110. Como con el sorgo, se "
                           "guardan las etapas impresas y el ciclo es su suma (110); la diferencia queda por cotejar contra el PDF de FAO-56.")},
        "t12": {"fila": "Sesame",
                "ini": (0.35, "Kc ini general del grupo h. Oil Crops (la fila del ajonjoli no da Kc ini propio)."),
                "mid": (1.10, None),
                "end": (0.25, None)},
        "t22": {"fila": "Sesame", "zr": 1.5, "zrRango": "1.0-1.5", "p": 0.60},
        "eco": {"fila": "Sesame seed", "sci": "Sesamum indicum L.", "gmin": 40, "gmax": 180,
                "tmin": 10, "topmn": 20, "topmx": 30, "tmax": 40,
                "rmin": 300, "ropmn": 500, "ropmx": 1000, "rmax": 1500},
        "nota_extra": ("SIAP no registra ajonjoli en Isla entre 2021 y 2025; en Veracruz si, en 7 a 9 municipios. "
                       "Ver datos/catalogos/fuentes/siap_veracruz_candidatos_2021_2025.csv."),
    },
    {
        "id": "girasol",
        "nombreComun": "Girasol",
        "nombreCientifico": "Helianthus annuus L.",
        "esLeguminosa": False,
        "t11": {"fila": "Sunflower", "region": "Medit.; California", "siembra": "April/May",
                "etapas": (25, 35, 45, 25), "total": 130,
                "porque": "Unica fila de Tabla 11 para girasol; no hay fila tropical."},
        "t12": {"fila": "Sunflower",
                "ini": (0.35, "Kc ini general del grupo h. Oil Crops (la fila del girasol no da Kc ini propio)."),
                "mid": (1.0, "Tabla 12 da 1.0-1.15 (nota 9): los valores menores son para cultivos de temporal con menor densidad; se usa 1.0, temporal."),
                "end": (0.35, None)},
        "t22": {"fila": "Sunflower", "zr": 1.5, "zrRango": "0.8-1.5", "p": 0.45},
        "eco": {"fila": "Sunflower", "sci": "Helianthus annuus L v macro", "gmin": 70, "gmax": 200,
                "tmin": 5, "topmn": 17, "topmx": 34, "tmax": 45,
                "rmin": 300, "ropmn": 600, "ropmx": 1000, "rmax": 1600},
    },
    {
        "id": "algodon",
        "nombreComun": "Algodon",
        "nombreCientifico": "Gossypium hirsutum L.",
        "esLeguminosa": False,
        "t11": {"fila": "Cotton", "region": "Egypt; Pakistan; Calif.", "siembra": "Mar-May",
                "etapas": (30, 50, 60, 55), "total": 195,
                "porque": ("Tabla 11 no tiene fila tropical para algodon; se eligio la de siembra marzo a mayo, la mas cercana al temporal "
                           "primavera-verano de Isla. Las otras son de septiembre en Yemen (195 d), abril en Texas (180 d) y marzo en el "
                           "desierto de California (225 d).")},
        "t12": {"fila": "Cotton",
                "ini": (0.35, "Kc ini general del grupo g. Fibre Crops (la fila del algodon no da Kc ini propio)."),
                "mid": (1.175, "Tabla 12 da el rango 1.15-1.20; 1.175 es su punto medio (eleccion del equipo, no de la fuente)."),
                "end": (0.60, "Tabla 12 da el rango 0.70-0.50; 0.60 es su punto medio (eleccion del equipo, no de la fuente).")},
        "t22": {"fila": "Cotton", "zr": 1.7, "zrRango": "1.0-1.7", "p": 0.65},
        "eco": {"fila": "Cotton, American upland", "sci": "Gossypium hirsutum L.", "gmin": 150, "gmax": 200,
                "tmin": 15, "topmn": 22, "topmx": 36, "tmax": 42,
                "rmin": 450, "ropmn": 750, "ropmx": 1200, "rmax": 1500},
        "nota_extra": "Algodon americano de tierras altas (upland), la especie que se siembra en Mexico; EcoCrop trae otras tres especies de Gossypium.",
    },
    {
        "id": "cartamo",
        "nombreComun": "Cartamo",
        "nombreCientifico": "Carthamus tinctorius L.",
        "esLeguminosa": False,
        "t11": {"fila": "Safflower", "region": "California, USA", "siembra": "April",
                "etapas": (20, 35, 45, 25), "total": 125,
                "porque": ("Tabla 11 no tiene fila tropical para cartamo; se eligio la de siembra en abril, la mas cercana al temporal "
                           "primavera-verano de Isla. Las otras son marzo en latitudes altas (145 d) y octubre/noviembre en region arida (190 d).")},
        "t12": {"fila": "Safflower",
                "ini": (0.35, "Kc ini general del grupo h. Oil Crops (la fila del cartamo no da Kc ini propio)."),
                "mid": (1.0, "Tabla 12 da 1.0-1.15 (nota 9): los valores menores son para cultivos de temporal con menor densidad; se usa 1.0, temporal."),
                "end": (0.25, None)},
        "t22": {"fila": "Safflower", "zr": 2.0, "zrRango": "1.0-2.0", "p": 0.60},
        "eco": {"fila": "Safflower", "sci": "Carthamus tinctoius L.", "gmin": 120, "gmax": 245,
                "tmin": 5, "topmn": 20, "topmx": 32, "tmax": 45,
                "rmin": 300, "ropmn": 600, "ropmx": 1000, "rmax": 1400},
        "nota_extra": "EcoCrop escribe 'Carthamus tinctoius' (errata de la base); el nombre correcto es Carthamus tinctorius.",
    },
    {
        "id": "higuerilla",
        "nombreComun": "Higuerilla",
        "nombreCientifico": "Ricinus communis L.",
        "esLeguminosa": False,
        "t11": {"fila": "Castor beans", "region": "Indonesia", "siembra": "Nov.",
                "etapas": (20, 40, 50, 25), "total": 135,
                "porque": "Unica fila tropical de higuerilla (Indonesia, noviembre: otono-invierno en Isla). La otra es de marzo en clima (semi)arido (180 d)."},
        "t12": {"fila": "Castorbean (Ricinus)",
                "ini": (0.35, "Kc ini general del grupo h. Oil Crops (la fila de la higuerilla no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.55, None)},
        "t22": {"fila": "Castorbean (Ricinus)", "zr": 2.0, "zrRango": "1.0-2.0", "p": 0.50},
        "eco": {"fila": "Castor", "sci": "Ricinus communis L.", "gmin": 140, "gmax": 210,
                "tmin": 15, "topmn": 20, "topmx": 30, "tmax": 39,
                "rmin": 400, "ropmn": 600, "ropmx": 1000, "rmax": 2000},
    },
    {
        "id": "tomate",
        "nombreComun": "Jitomate",
        "nombreCientifico": "Solanum lycopersicum L.",
        "esLeguminosa": False,
        "t11": {"fila": "Tomato", "region": "Mediterranean", "siembra": "April/May",
                "etapas": (30, 40, 45, 30), "total": 145,
                "porque": ("Tabla 11 no tiene fila tropical para jitomate. Las de siembra mas cercana a junio son abril/mayo en California "
                           "(155 d) y en el Mediterraneo (145 d); se eligio la mediterranea, como con la calabaza.")},
        "t12": {"fila": "Tomato",
                "ini": (0.6, "Kc ini general del grupo b. Vegetables - Solanum Family (la fila del jitomate no da Kc ini propio)."),
                "mid": (1.15, "Nota 2: si crece en estacas de 1.5 a 2 m puede tomarse 1.20."),
                "end": (0.80, "Tabla 12 da el rango 0.70-0.90; 0.80 es su punto medio (eleccion del equipo, no de la fuente).")},
        "t22": {"fila": "Tomato", "zr": 1.5, "zrRango": "0.7-1.5", "p": 0.40},
        "eco": {"fila": "Tomato", "sci": "Lycopersicon esculentum M.", "gmin": 70, "gmax": 150,
                "tmin": 7, "topmn": 20, "topmx": 27, "tmax": 35,
                "rmin": 400, "ropmn": 600, "ropmx": 1300, "rmax": 1800},
    },
    {
        "id": "papa",
        "nombreComun": "Papa",
        "nombreCientifico": "Solanum tuberosum L.",
        "esLeguminosa": False,
        "t11": {"fila": "Potato", "region": "Continental Climate", "siembra": "May",
                "etapas": (25, 30, 45, 30), "total": 130,
                "porque": ("Tabla 11 no tiene fila tropical para papa; se eligio la de siembra en mayo, la mas cercana al temporal "
                           "primavera-verano de Isla. Las otras son de abril en Europa (145 d), abril/mayo en Idaho (165 d), diciembre "
                           "en California (140 d) y enero/noviembre en clima (semi)arido, que imprime etapas ambiguas (30/45).")},
        "t12": {"fila": "Potato",
                "ini": (0.5, "Kc ini general del grupo d. Roots and Tubers (la fila de la papa no da Kc ini propio)."),
                "mid": (1.15, None),
                "end": (0.75, "Nota 4: para papas de ciclo largo con defoliacion el Kc end es de unos 0.40.")},
        "t22": {"fila": "Potato", "zr": 0.6, "zrRango": "0.4-0.6", "p": 0.35},
        "eco": {"fila": "Potato", "sci": "Solanum tuberosum L.", "gmin": 90, "gmax": 160,
                "tmin": 7, "topmn": 15, "topmx": 25, "tmax": 30,
                "rmin": 250, "ropmn": 500, "ropmx": 800, "rmax": 2000},
    },
    {
        "id": "calabacita",
        "nombreComun": "Calabacita",
        "nombreCientifico": "Cucurbita pepo L.",
        "esLeguminosa": False,
        "t11": {"fila": "Squash, Zucchini", "region": "Medit.; Europe", "siembra": "May/June",
                "etapas": (20, 30, 25, 15), "total": 90,
                "porque": ("Tabla 11 no tiene fila tropical para calabacita; se eligio la de siembra mayo/junio, que coincide con el "
                           "temporal primavera-verano de Isla. La otra es de abril y diciembre (100 d).")},
        "t12": {"fila": "Squash, Zucchini",
                "ini": (0.5, "Kc ini general del grupo c. Vegetables - Cucumber Family (la fila de la calabacita no da Kc ini propio)."),
                "mid": (0.95, None),
                "end": (0.75, None)},
        "t22": {"fila": "Squash, Zucchini", "zr": 1.0, "zrRango": "0.6-1.0", "p": 0.50},
        "eco": {"fila": "Vegetable marrow", "sci": "Cucurbita pepo L.", "gmin": 40, "gmax": 100,
                "tmin": 6, "topmn": 17, "topmx": 30, "tmax": 40,
                "rmin": 300, "ropmn": 600, "ropmx": 1500, "rmax": 2800},
        "nota_extra": "Calabacita tierna (zucchini), cosechada inmadura; la calabaza de milpa madura es el cultivo 'calabaza'.",
    },
    # -- tanda 3: hortalizas
    {
        "id": "cebolla",
        "nombreComun": "Cebolla",
        "nombreCientifico": "Allium cepa L.",
        "esLeguminosa": False,
        "t11": {"fila": "Onion (dry)", "region": "Mediterranean", "siembra": "April",
                "etapas": (15, 25, 70, 40), "total": 150,
                "porque": 'Tabla 11 no tiene fila tropical para cebolla; se eligio la de siembra en abril, la mas cercana al temporal primavera-verano de Isla. La otra es de octubre o enero en region arida y California (210 d).'},
        "t12": {"fila": "Onions - dry",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la cebolla no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.75, None)},
        "t22": {"fila": "Onions - dry", "zr": 0.6, "zrRango": "0.3-0.6", "p": 0.30},
        "eco": {"fila": "Onion", "sci": "Allium cepa L. v cepa", "gmin": 85, "gmax": 175,
                "tmin": 4, "topmn": 12, "topmx": 25, "tmax": 30,
                "rmin": 300, "ropmn": 350, "ropmx": 600, "rmax": 2800},
        "nota_extra": 'Cebolla de bulbo seco; la cebolla de rabo (green) tiene otra fila.',
    },
    {
        "id": "pepino",
        "nombreComun": "Pepino",
        "nombreCientifico": "Cucumis sativus L.",
        "esLeguminosa": False,
        "t11": {"fila": "Cucumber", "region": "Arid Region", "siembra": "June/Aug",
                "etapas": (20, 30, 40, 15), "total": 105,
                "porque": 'Tabla 11 no tiene fila tropical para pepino; se eligio la de siembra junio/agosto, que coincide con el temporal primavera-verano de Isla. La otra es de noviembre o febrero (130 d).'},
        "t12": {"fila": "Cucumber - Fresh Market",
                "ini": (0.60, None),
                "mid": (1.00, 'Nota 2: si crece con tutores de 1.5 a 2 m puede tomarse 1.15.'),
                "end": (0.75, None)},
        "t22": {"fila": "Cucumber - Fresh Market", "zr": 1.2, "zrRango": "0.7-1.2", "p": 0.50},
        "eco": {"fila": "Cucumber", "sci": "Cucumis sativus L.", "gmin": 40, "gmax": 180,
                "tmin": 6, "topmn": 18, "topmx": 32, "tmax": 38,
                "rmin": 400, "ropmn": 1000, "ropmx": 1200, "rmax": 4300},
        "nota_extra": 'Pepino para mercado en fresco (la subfila de cosecha mecanica tiene Kc end 0.90).',
    },
    {
        "id": "melon",
        "nombreComun": "Melon",
        "nombreCientifico": "Cucumis melo L.",
        "esLeguminosa": False,
        "t11": {"fila": "Sweet melons", "region": "Mediterranean", "siembra": "May",
                "etapas": (25, 35, 40, 20), "total": 120,
                "porque": 'Tabla 11 no tiene fila tropical para melon; se eligio la de siembra en mayo, la mas cercana al temporal primavera-verano de Isla. Las otras son de marzo en California (140 d), agosto en el desierto de California (135 d) y diciembre/enero en region arida (160 d).'},
        "t12": {"fila": "Sweet Melons",
                "ini": (0.50, 'Kc ini general del grupo c. Vegetables - Cucumber Family (la fila de el melon no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.75, None)},
        "t22": {"fila": "Sweet Melons", "zr": 1.5, "zrRango": "0.8-1.5", "p": 0.40},
        "eco": {"fila": "Musk melon", "sci": "Cucumis melo L.", "gmin": 50, "gmax": 120,
                "tmin": 9, "topmn": 18, "topmx": 30, "tmax": 35,
                "rmin": 900, "ropmn": 1000, "ropmx": 1300, "rmax": 2500},
        "nota_extra": "Se usa la fila general de melon (Sweet melons); FAO-56 trae aparte el cantaloupe (Kc 0.5/0.85/0.60) solo con filas de California. EcoCrop 'Musk melon' es Cucumis melo.",
    },
    {
        "id": "lechuga",
        "nombreComun": "Lechuga",
        "nombreCientifico": "Lactuca sativa L.",
        "esLeguminosa": False,
        "t11": {"fila": "Lettuce", "region": "Mediterranean", "siembra": "April",
                "etapas": (20, 30, 15, 10), "total": 75,
                "porque": 'Tabla 11 no tiene fila tropical para lechuga; se eligio la de siembra en abril, la mas cercana al temporal primavera-verano de Isla. Las otras son de noviembre a febrero (100 a 140 d).'},
        "t12": {"fila": "Lettuce",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la lechuga no da Kc ini propio).'),
                "mid": (1.00, None),
                "end": (0.95, None)},
        "t22": {"fila": "Lettuce", "zr": 0.5, "zrRango": "0.3-0.5", "p": 0.30},
        "eco": {"fila": "Lettuce", "sci": "Lactuca sativa L.", "gmin": 35, "gmax": 85,
                "tmin": 5, "topmn": 12, "topmx": 21, "tmax": 30,
                "rmin": 900, "ropmn": 1100, "ropmx": 1400, "rmax": 4100},
    },
    {
        "id": "zanahoria",
        "nombreComun": "Zanahoria",
        "nombreCientifico": "Daucus carota L.",
        "esLeguminosa": False,
        "t11": {"fila": "Carrots", "region": "Mediterranean", "siembra": "Feb/Mar",
                "etapas": (30, 40, 60, 20), "total": 150,
                "porque": 'Tabla 11 no tiene fila tropical para zanahoria. La de octubre/enero en clima arido imprime una etapa media ambigua (50/30) y se salto; entre las otras, la de febrero/marzo en el Mediterraneo es la mas cercana a junio (la de octubre en California dura 200 d).'},
        "t12": {"fila": "Carrots",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la zanahoria no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.95, None)},
        "t22": {"fila": "Carrots", "zr": 1.0, "zrRango": "0.5-1.0", "p": 0.35},
        "eco": {"fila": "Carrot", "sci": "Daucus carota L.", "gmin": 40, "gmax": 150,
                "tmin": 3, "topmn": 15, "topmx": 24, "tmax": 30,
                "rmin": 400, "ropmn": 600, "ropmx": 1200, "rmax": 4000},
    },
    {
        "id": "berenjena",
        "nombreComun": "Berenjena",
        "nombreCientifico": "Solanum melongena L.",
        "esLeguminosa": False,
        "t11": {"fila": "Egg plant", "region": "Arid Region", "siembra": "October",
                "etapas": (30, 40, 40, 20), "total": 130,
                "porque": "Tabla 11 no tiene fila tropical para berenjena. La de mayo/junio en el Mediterraneo imprime 30/45/40/25 con total 40 (las etapas suman 140) y se salto; se uso la de octubre en region arida (130 d; la pagina imprime el total como 130 seguido de una barra y un 1, que se lee 130, la suma de las etapas)."},
        "t12": {"fila": "Egg Plant",
                "ini": (0.60, 'Kc ini general del grupo b. Vegetables - Solanum Family (la fila de la berenjena no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.90, None)},
        "t22": {"fila": "Egg Plant", "zr": 1.2, "zrRango": "0.7-1.2", "p": 0.45},
        "eco": {"fila": "Eggplant", "sci": "Solanum melongena L.", "gmin": 70, "gmax": 120,
                "tmin": 9, "topmn": 20, "topmx": 35, "tmax": 40,
                "rmin": 800, "ropmn": 1200, "ropmx": 1600, "rmax": 4000},
    },
    {
        "id": "brocoli",
        "nombreComun": "Brocoli",
        "nombreCientifico": "Brassica oleracea var. italica Plenck",
        "esLeguminosa": False,
        "t11": {"fila": "Broccoli", "region": "Calif. Desert, USA", "siembra": "Sept",
                "etapas": (35, 45, 40, 15), "total": 135,
                "porque": 'Unica fila de Tabla 11 para brocoli (desierto de California, septiembre). Nota 1: la duracion de las cruciferas varia mucho con la variedad.'},
        "t12": {"fila": "Broccoli",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de el brocoli no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.95, None)},
        "t22": {"fila": "Broccoli", "zr": 0.6, "zrRango": "0.4-0.6", "p": 0.45},
        "eco": {"fila": "Sprouting broccoli", "sci": "Brassica oleracea L.v ital.", "gmin": 80, "gmax": 120,
                "tmin": 3, "topmn": 15, "topmx": 24, "tmax": 35,
                "rmin": 350, "ropmn": 900, "ropmx": 1500, "rmax": 2000},
    },
    {
        "id": "col",
        "nombreComun": "Col (repollo)",
        "nombreCientifico": "Brassica oleracea var. capitata L.",
        "esLeguminosa": False,
        "t11": {"fila": "Cabbage", "region": "Calif. Desert, USA", "siembra": "Sept",
                "etapas": (40, 60, 50, 15), "total": 165,
                "porque": 'Unica fila de Tabla 11 para col (desierto de California, septiembre). Nota 1: la duracion de las cruciferas varia mucho con la variedad.'},
        "t12": {"fila": "Cabbage",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la col no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.95, None)},
        "t22": {"fila": "Cabbage", "zr": 0.8, "zrRango": "0.5-0.8", "p": 0.45},
        "eco": {"fila": "Cabbage", "sci": "Brassica oleracea L.v capi.", "gmin": 60, "gmax": 200,
                "tmin": 7, "topmn": 15, "topmx": 24, "tmax": 32,
                "rmin": 300, "ropmn": 500, "ropmx": 1000, "rmax": 2500},
    },
    {
        "id": "coliflor",
        "nombreComun": "Coliflor",
        "nombreCientifico": "Brassica oleracea var. botrytis L.",
        "esLeguminosa": False,
        "t11": {"fila": "Cauliflower", "region": "Calif. Desert, USA", "siembra": "Sept",
                "etapas": (35, 50, 40, 15), "total": 140,
                "porque": 'Unica fila de Tabla 11 para coliflor (desierto de California, septiembre). Nota 1: la duracion de las cruciferas varia mucho con la variedad.'},
        "t12": {"fila": "Cauliflower",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la coliflor no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.95, None)},
        "t22": {"fila": "Cauliflower", "zr": 0.7, "zrRango": "0.4-0.7", "p": 0.45},
        "eco": {"fila": "Cauliflower", "sci": "Brassica oleracea L.v botr.", "gmin": 60, "gmax": 120,
                "tmin": 5, "topmn": 10, "topmx": 25, "tmax": 30,
                "rmin": 450, "ropmn": 600, "ropmx": 1100, "rmax": 1900},
    },
    {
        "id": "espinaca",
        "nombreComun": "Espinaca",
        "nombreCientifico": "Spinacia oleracea L.",
        "esLeguminosa": False,
        "t11": {"fila": "Spinach", "region": "Arid Region", "siembra": "November",
                "etapas": (20, 30, 40, 10), "total": 100,
                "porque": 'Tabla 11 no tiene fila tropical para espinaca. La de abril y septiembre/octubre en el Mediterraneo imprime etapas y total ambiguos (15/25, 60/70) y se salto; se uso la de noviembre en region arida (100 d).'},
        "t12": {"fila": "Spinach",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de la espinaca no da Kc ini propio).'),
                "mid": (1.00, None),
                "end": (0.95, None)},
        "t22": {"fila": "Spinach", "zr": 0.5, "zrRango": "0.3-0.5", "p": 0.20},
        "eco": {"fila": "Spinach", "sci": "Spinacia oleracea L.", "gmin": 40, "gmax": 120,
                "tmin": 2, "topmn": 13, "topmx": 20, "tmax": 27,
                "rmin": 300, "ropmn": 800, "ropmx": 1200, "rmax": 1700},
    },
    {
        "id": "rabano",
        "nombreComun": "Rabano",
        "nombreCientifico": "Raphanus sativus L.",
        "esLeguminosa": False,
        "t11": {"fila": "Radish", "region": "Medit.; Europe", "siembra": "Mar/Apr",
                "etapas": (5, 10, 15, 5), "total": 35,
                "porque": 'Tabla 11 no tiene fila tropical para rabano; se eligio la de siembra marzo/abril, la mas cercana al temporal primavera-verano de Isla. La otra es de invierno en region arida (40 d).'},
        "t12": {"fila": "Radish",
                "ini": (0.70, 'Kc ini general del grupo a. Small Vegetables (la fila de el rabano no da Kc ini propio).'),
                "mid": (0.90, None),
                "end": (0.85, None)},
        "t22": {"fila": "Radishes", "zr": 0.5, "zrRango": "0.3-0.5", "p": 0.30},
        "eco": {"fila": "Radish, Western", "sci": "Raphanus sativus L. (S.R.)", "gmin": 21, "gmax": 135,
                "tmin": 3, "topmn": 12, "topmx": 25, "tmax": 30,
                "rmin": 500, "ropmn": 800, "ropmx": 1000, "rmax": 2800},
        "nota_extra": "Rabano pequeno de mesa: EcoCrop 'Radish, Western' (S.R., small radish).",
    },
    {
        "id": "betabel",
        "nombreComun": "Betabel",
        "nombreCientifico": "Beta vulgaris L.",
        "esLeguminosa": False,
        "t11": {"fila": "Beets, table", "region": "Mediterranean", "siembra": "Apr/May",
                "etapas": (15, 25, 20, 10), "total": 70,
                "porque": 'Tabla 11 no tiene fila tropical para betabel; se eligio la de siembra abril/mayo, la mas cercana al temporal primavera-verano de Isla. La otra es de febrero/marzo (90 d).'},
        "t12": {"fila": "Beets, table",
                "ini": (0.50, 'Kc ini general del grupo d. Roots and Tubers (la fila de el betabel no da Kc ini propio).'),
                "mid": (1.05, None),
                "end": (0.95, None)},
        "t22": {"fila": "Beets, table", "zr": 1.0, "zrRango": "0.6-1.0", "p": 0.50},
        "eco": {"fila": "Garden beet", "sci": "Beta vulgaris L. v crassa", "gmin": 55, "gmax": 90,
                "tmin": 5, "topmn": 15, "topmx": 25, "tmax": 30,
                "rmin": 500, "ropmn": 800, "ropmx": 1500, "rmax": 2500},
        "nota_extra": 'Betabel de mesa; la remolacha azucarera tiene otra fila.',
    },
]
# SIAP registra algunos cultivos fuera de las temporadas PV u OI (por ejemplo, la cana como 'Perennes').
CICLO_SIAP_PROPIO = {"cana": "Perennes"}
CULTIVOS += AMPLIACION
CULTIVO_SIAP.update({c["id"]: c.get("siap") for c in AMPLIACION})
for _c in AMPLIACION:
    for _t in ("PV", "OI"):
        ORDEN_ISLA.append((_c["id"], _t))
        MOTIVO_SIN_VENTANA[(_c["id"], _t)] = MOTIVO_SIN_VENTANA_AMPLIACION.format(nombre=_c["nombreComun"].lower())
ADVERTENCIAS_ISLA_AMPLIACION = [
    {"codigo": "AMPLIACION_SIN_VENTANA", "severidad": "aviso",
     "mensaje": ("Los cultivos de la ampliacion del catalogo (15/11) aun no tienen ventana de siembra con fuente para Isla: su "
                 "compatibilidad de ciclo sale NO_EVALUABLE. Los que SIAP no registra en Isla se muestran, pero no se recomiendan.")},
]


def cultivo(c):
    t11, t12, t22, eco = c["t11"], c["t12"], c["t22"], c["eco"]
    f11 = fuente(f"{FAO56}, Tabla 11", URL_FAO56_CAP6,
                 f"Tabla 11, fila '{t11['fila']}', region '{t11['region']}', siembra '{t11['siembra']}'",
                 "dias", t11["porque"])
    etapas = dict(zip(("inicial", "desarrollo", "media", "final"), t11["etapas"]))
    assert sum(etapas.values()) == t11["total"], c["id"]  # "total" es la suma; "total_impreso" documenta una discrepancia de la fuente

    def kc(clave, nota_extra):
        valor, nota = t12[clave]
        partes = [p for p in (nota, nota_extra) if p]
        return citado(valor, "adimensional",
                      fuente(f"{FAO56}, Tabla 12", URL_FAO56_CAP6, f"Tabla 12, fila '{t12['fila']}', Kc {clave}",
                             nota=" ".join(partes) or None))

    f22 = lambda campo, nota: fuente(f"{FAO56}, Tabla 22", URL_FAO56_CAP8,
                                     f"Tabla 22, fila '{t22['fila']}', {campo}", nota=nota)

    def eco_val(campo, valor, unidad="grados C", unidades="grados C (media mensual)", nota=NOTA_ECOCROP):
        return citado(valor, unidad,
                      fuente("FAO EcoCrop", URL_ECOCROP,
                             f"Fila '{eco['fila']}' ({eco['sci']}), campo {campo}", unidades, nota))

    nota_lluvia = (f"Rango absoluto de lluvia anual de EcoCrop; el optimo es {eco['ropmn']} a {eco['ropmx']} mm/anio "
                   f"(ROPMN, ROPMX). No es lluvia del ciclo. " + NOTA_ECOCROP)
    lluvia_ciclo = no_evaluable(MOTIVO_LLUVIA_CICLO)
    return {
        "id": c["id"],
        "nombreComun": c["nombreComun"],
        "nombreCientifico": c["nombreCientifico"],
        "estado": "EVALUABLE",
        "esLeguminosa": c["esLeguminosa"],
        "cicloDias": citado(t11["total"], "dias", f11),
        "duracionEtapasDias": {k: citado(v, "dias", f11) for k, v in etapas.items()},
        "kc": {"inicial": kc("ini", NOTA_KC_INI), "media": kc("mid", NOTA_CLIMA_KC), "final": kc("end", NOTA_CLIMA_KC)},
        "profundidadRaizM": citado(t22["zr"], "m", f22(f"Zr maximo {t22['zrRango']} m", NOTA_ZR)),
        "fraccionAgotamientoP": citado(t22["p"], "fraccion", f22("p (para ETc ~ 5 mm/dia)", NOTA_P)),
        "umbrales": {
            "tMinAbsC": eco_val("TMIN", eco["tmin"]),
            "tMaxAbsC": eco_val("TMAX", eco["tmax"]),
            "tOptMinC": eco_val("TOPMN", eco["topmn"]),
            "tOptMaxC": eco_val("TOPMX", eco["topmx"]),
            "lluviaCicloMinMm": lluvia_ciclo,
            "lluviaCicloMaxMm": lluvia_ciclo,
            "lluviaAnualMinMm": eco_val("RMIN", eco["rmin"], "mm/anio", "mm por anio", nota_lluvia),
            "lluviaAnualMaxMm": eco_val("RMAX", eco["rmax"], "mm/anio", "mm por anio", nota_lluvia),
            "tEstresCalorC": no_evaluable(MOTIVO_CALOR),
        },
        **({"modelo3d": {"prefijo": c["modelo3d"]}} if "modelo3d" in c else {}),
        "notas": (
            f"Ciclo y etapas de FAO-56 Tabla 11 (total {t11['total']} dias"
            + (f"; la tabla imprime {t11['total_impreso']}" if "total_impreso" in t11 else "")
            + f"). EcoCrop da un ciclo de "
            f"{eco['gmin']} a {eco['gmax']} dias para la especie, demasiado amplio para el motor. "
            "Etapas sensibles al deficit: pendiente de fuente (FAO-33 / Ky), no se fijan aqui."
            + (" " + c["equivalencia"] if "equivalencia" in c else "")
            + (" " + c["nota_extra"] if "nota_extra" in c else "")
        ),
    }


# ---------------------------------------------------------------- suelos

# FAO-56 Tabla 19 (cap. 7), copiada tal cual: thetaFC, thetaWP, (thetaFC - thetaWP) en m3/m3; REW y TEW en mm.
TABLA19 = [
    # clase USDA (contrato suelo), fila FAO, grupo selector, FC, WP, FC-WP, REW, TEW
    ("arena", "Sand", "arenoso", (0.07, 0.17), (0.02, 0.07), (0.05, 0.11), (2, 7), (6, 12)),
    ("arena_franca", "Loamy sand", "arenoso", (0.11, 0.19), (0.03, 0.10), (0.06, 0.12), (4, 8), (9, 14)),
    ("franco_arenoso", "Sandy loam", "franco", (0.18, 0.28), (0.06, 0.16), (0.11, 0.15), (6, 10), (15, 20)),
    ("franco", "Loam", "franco", (0.20, 0.30), (0.07, 0.17), (0.13, 0.18), (8, 10), (16, 22)),
    ("franco_limoso", "Silt loam", "franco", (0.22, 0.36), (0.09, 0.21), (0.13, 0.19), (8, 11), (18, 25)),
    ("limo", "Silt", "franco", (0.28, 0.36), (0.12, 0.22), (0.16, 0.20), (8, 11), (22, 26)),
    ("franco_arcillo_limoso", "Silt clay loam", "arcilloso", (0.30, 0.37), (0.17, 0.24), (0.13, 0.18), (8, 11), (22, 27)),
    ("arcillo_limoso", "Silty clay", "arcilloso", (0.30, 0.42), (0.17, 0.29), (0.13, 0.19), (8, 12), (22, 28)),
    ("arcilla", "Clay", "arcilloso", (0.32, 0.40), (0.20, 0.24), (0.12, 0.20), (8, 12), (22, 29)),
]
# Clases USDA del contrato que no tienen fila en Tabla 19.
SIN_FILA = [
    ("franco_arcillo_arenoso", "arcilloso"),
    ("franco_arcilloso", "arcilloso"),
    ("arcillo_arenoso", "arcilloso"),
]
NOTAS_FILA = {
    "Silty clay": "La pagina imprime '0-30 - 0.42' para thetaFC; se interpreta como 0.30 - 0.42 (errata tipografica). No afecta a TAW, que usa la columna FC-WP.",
}
# Clase representativa de cada grupo del selector manual (doc 04): es una eleccion del equipo, no de FAO.
REPRESENTANTE_GRUPO = {"arenoso": "arena_franca", "franco": "franco", "arcilloso": "arcilla"}


def rango(par):
    return {"min": par[0], "max": par[1]}


def suelos():
    texturas = []
    for clase, fila, grupo, fc, wp, dif, rew, tew in TABLA19:
        medio = round(1000 * (dif[0] + dif[1]) / 2, 1)
        nota = (f"TAW = 1000 (thetaFC - thetaWP) por metro de raiz (FAO-56 ec. 82). Se usa el punto medio del rango "
                f"{dif[0]}-{dif[1]} m3/m3 de Tabla 19; rango completo {round(1000 * dif[0])}-{round(1000 * dif[1])} mm/m.")
        if fila in NOTAS_FILA:
            nota += " " + NOTAS_FILA[fila]
        texturas.append({
            "clase": clase,
            "grupo": grupo,
            "estado": "EVALUABLE",
            "filaFao": fila,
            "rangos": {
                "estado": "EVALUABLE",
                "fuente": fuente(f"{FAO56}, Tabla 19", URL_FAO56_CAP7, f"Tabla 19, fila '{fila}'",
                                 "m3/m3 (theta) y mm (REW, TEW)", NOTAS_FILA.get(fila)),
                "thetaFcM3M3": rango(fc),
                "thetaWpM3M3": rango(wp),
                "aguaDisponibleM3M3": rango(dif),
                "rewMm": rango(rew),
                "tewMm": rango(tew),
            },
            "tawMmPorM": citado(medio, "mm/m",
                                fuente(f"{FAO56}, Tabla 19 y ecuacion 82", URL_FAO56_CAP7,
                                       f"Tabla 19, fila '{fila}', columna (thetaFC - thetaWP)", "mm por metro de suelo", nota)),
        })
    for clase, grupo in SIN_FILA:
        texturas.append({
            "clase": clase,
            "grupo": grupo,
            "estado": "NO_EVALUABLE",
            "filaFao": None,
            "rangos": no_evaluable("FAO-56 Tabla 19 no tiene fila para esta clase USDA."),
            "tawMmPorM": no_evaluable("FAO-56 Tabla 19 no tiene fila para esta clase USDA; falta otra fuente citada."),
        })
    return {
        "meta": {"versionContrato": VERSION_CONTRATO, "esEjemplo": False,
                 "aviso": "Valores tipicos por textura (FAO-56 Tabla 19), no medidos en la parcela. El suelo de la parcela siempre es SUPUESTO."},
        "versionCatalogo": VERSION_CATALOGO,
        "metodoTaw": "Punto medio del rango (thetaFC - thetaWP) de FAO-56 Tabla 19, por 1000 (FAO-56 ecuacion 82), en mm por metro de raiz.",
        "representanteGrupo": REPRESENTANTE_GRUPO,
        "notaRepresentanteGrupo": "Clase USDA que usa el selector manual (arenoso, franco, arcilloso) cuando no hay mapa global. Eleccion del equipo, no de FAO.",
        "texturas": texturas,
    }


def main():
    catalogo = {
        "meta": {"versionContrato": VERSION_CONTRATO, "esEjemplo": False,
                 "aviso": "Parametros de tablas generales (FAO-56, FAO EcoCrop), no calibrados para Isla, Veracruz. Requieren validacion agronomica local."},
        "versionCatalogo": VERSION_CATALOGO,
        "cultivos": [cultivo(c) for c in CULTIVOS],
    }
    for nombre, datos in (("cultivos.json", catalogo), ("suelos.json", suelos()), ("calendario-isla.json", calendario_isla())):
        ruta = AQUI / nombre
        ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("escrito", ruta.relative_to(AQUI.parent.parent))


if __name__ == "__main__":
    main()
