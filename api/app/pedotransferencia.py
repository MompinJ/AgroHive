"""TAW por pedotransferencia de Saxton y Rawls (2006) para /api/suelo (A2.16 de Mafer, conectada aqui por A2.15/A2.16).

El calculo vive en `datos/catalogos/saxton_rawls.py` (de Mafer, verificado contra la Tabla 3 del articulo). Aqui no se
copia: se carga ese archivo, para que haya una sola fuente de verdad. Si el archivo no esta (checkout sin esa rama), el TAW
cae a la tabla FAO-56 o queda NO_EVALUABLE; nunca se inventa.
"""
import importlib.util
from datetime import date
from functools import lru_cache

from . import config

FACTOR_MO_SOBRE_CO = 1.724
CITA_FACTOR = ("Materia organica = 1.724 x carbono organico (factor de van Bemmelen; Nelson y Sommers, 1982, "
               "Methods of Soil Analysis, Part 2). VERIFICAR la cita: la confirma una persona")


@lru_cache(maxsize=1)
def modulo():
    """El modulo saxton_rawls de datos/catalogos, o None si no esta en este checkout."""
    ruta = config.RAIZ / "datos" / "catalogos" / "saxton_rawls.py"
    if not ruta.exists():
        return None
    spec = importlib.util.spec_from_file_location("saxton_rawls", ruta)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def materia_organica_pct(carbono_organico_g_kg: float) -> float:
    """% de materia organica desde g/kg de carbono organico: C (g/kg) / 10 = % de C; x 1.724 = % de materia organica."""
    return carbono_organico_g_kg / 10.0 * FACTOR_MO_SOBRE_CO


def _evaluable(valor: float, fuente: dict) -> dict:
    return {"estado": "EVALUABLE", "valor": round(valor, 2), "unidad": "%", "fuente": fuente, "etiqueta": "SUPUESTO"}


def agua(estimacion: dict) -> dict | None:
    """Objeto `agua` del contrato suelo por Saxton y Rawls desde una estimacion de /api/suelo; None si el modulo no esta.

    Solo se calcula con estimaciones EVALUABLE: con pixeles a mas de 1 km (EXPLORATORIO) la textura es una extrapolacion y el
    TAW queda NO_EVALUABLE con su motivo exacto, igual que sin carbono organico.
    """
    mod = modulo()
    if mod is None:
        return None
    fuente = estimacion["fuente"]
    frac = estimacion["textura"]["fraccionesPct"]
    if estimacion["estado"] != "EVALUABLE":
        return {"tawMmPorM": {"estado": "NO_EVALUABLE", "motivo": "La estimacion de suelo es EXPLORATORIA (viene de pixeles lejanos del punto): no se calcula el TAW por pedotransferencia."}}
    oc = estimacion.get("carbonoOrganicoGKg")
    if oc is None:
        return {"tawMmPorM": {"estado": "NO_EVALUABLE", "motivo": "El servicio de suelo no entrego carbono organico para estimar la materia organica que pide Saxton y Rawls."}}
    arena, arcilla = _evaluable(frac["arena"], fuente), _evaluable(frac["arcilla"], fuente)
    fuente_mo = {**fuente, "nombre": f"{fuente['nombre']} (carbono organico convertido a materia organica)", "cita": CITA_FACTOR,
                 "unidades": "% de materia organica", "consultado": fuente.get("consultado") or date.today()}
    return mod.agua_pedotransferencia(estimacion["id"], arena, arcilla, _evaluable(materia_organica_pct(oc), fuente_mo))
