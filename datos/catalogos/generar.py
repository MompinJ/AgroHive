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
VERSION_CONTRATO = "0.5.0"
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
CULTIVO_SIAP = {"maiz": "Maíz grano", "frijol": "Frijol", "chile": "Chile verde", "calabaza": None}

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
}
ORDEN_ISLA = [("maiz", "PV"), ("maiz", "OI"), ("frijol", "PV"), ("frijol", "OI"),
              ("chile", "PV"), ("chile", "OI"), ("calabaza", "PV"), ("calabaza", "OI")]


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
    anios = {a: h for a, h in sup.get((nombre, CICLO_SIAP[temporada]), {}).items() if h > 0} if nombre else {}
    if not anios:
        return {"estado": "no_registrado", "periodo": {"desde": PERIODO_SIAP[0], "hasta": PERIODO_SIAP[1]},
                "fuente": fuente_siap,
                "nota": "Sin superficie sembrada de este cultivo en este ciclo en Isla, 2021-2025."}
    a0, a1 = min(anios), max(anios)
    lista = ", ".join(f"{a}: {anios[a]:,.0f} ha" for a in sorted(anios))
    return {"estado": "registrado", "periodo": {"desde": f"{a0}-01-01", "hasta": f"{a1}-12-31"},
            "fuente": fuente_siap, "nota": f"Superficie sembrada de temporal por anio: {lista}."}


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
        ],
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
]

NOTA_KC_INI = (
    "FAO-56 Tabla 12 nota 1: con mojado frecuente (lluvia diaria) el Kc ini puede subir hasta 1.0-1.2; "
    "para temporal lluvioso conviene calcularlo con el procedimiento del capitulo 6 de FAO-56."
)
NOTA_ZR = "Se toma el extremo mayor del rango: Tabla 22 nota 1 indica los valores mayores para modelar estres hidrico o temporal."
NOTA_P = "Valido para ETc ~ 5 mm/dia; ajustar con p = p_tabla + 0.04 (5 - ETc), limitado a 0.1 <= p <= 0.8 (FAO-56, cap. 8)."
NOTA_CLIMA_KC = "Kc mid y Kc end de Tabla 12 son para clima subhumedo (RHmin ~45 %, u2 ~2 m/s); ajustar por clima segun FAO-56 ec. 62 y 65."


def cultivo(c):
    t11, t12, t22, eco = c["t11"], c["t12"], c["t22"], c["eco"]
    f11 = fuente(f"{FAO56}, Tabla 11", URL_FAO56_CAP6,
                 f"Tabla 11, fila '{t11['fila']}', region '{t11['region']}', siembra '{t11['siembra']}'",
                 "dias", t11["porque"])
    etapas = dict(zip(("inicial", "desarrollo", "media", "final"), t11["etapas"]))
    assert sum(etapas.values()) == t11["total"], c["id"]

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
        "modelo3d": {"prefijo": c["modelo3d"]},
        "notas": (
            f"Ciclo y etapas de FAO-56 Tabla 11 (total {t11['total']} dias). EcoCrop da un ciclo de "
            f"{eco['gmin']} a {eco['gmax']} dias para la especie, demasiado amplio para el motor. "
            "Etapas sensibles al deficit: pendiente de fuente (FAO-33 / Ky), no se fijan aqui."
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
