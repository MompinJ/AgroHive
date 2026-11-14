"""Prototipo (Mompin-features): lluvia GPM IMERG via NASA POWER contra PRECTOTCORR (MERRA-2).

Que hace:
- Pide a NASA POWER (diario, punto, comunidad AG) IMERG_PRECTOT y PRECTOTCORR en hora UTC
  (IMERG solo existe en UTC: en hora solar local POWER devuelve -999).
- Agrupa por anio agricola de SIAP (1 oct t-1 a 30 sep t, igual que el motor, doc 05 paso 1).
- Compara totales, maximo diario, dias por rango de lluvia y totales mensuales.
- Calcula con IMERG los percentiles p10 / p50 / p90 (Hyndman y Fan tipo 7, como el motor)
  para ver si IMERG elegiria los mismos anios seco / habitual / lluvioso que POWER.

No alimenta al motor: es evidencia para decidir si IMERG entra a la API (A2.17).
Uso:
    python3 features/imerg/comparar_imerg.py            # usa la respuesta guardada si existe
    python3 features/imerg/comparar_imerg.py --descargar  # vuelve a pedirla a POWER
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RESPUESTA = AQUI / "respuestas" / "power_imerg_utc.json"
RESULTADO = AQUI / "resultado.json"

URL_POWER = "https://power.larc.nasa.gov/api/temporal/daily/point"
# Coordenada de la peticion de clima del paquete de demo (datos/demo/respuestas/serie-clima.json).
# Es ilustrativa: no es la ubicacion de una parcela real.
LAT, LON = 18.03, -95.53
DESDE, HASTA = "20051001", "20251231"
RELLENO = -999.0

# Anios de escenario que hoy elige el motor con PRECTOTCORR (doc 05, paso 1, paquete de demo).
ESCENARIOS_POWER = {"seco": 2023, "habitual": 2016, "lluvioso": 2024}

# Rangos de lluvia acumulada del SMN, tal como los reproduce CONADESUCA, "Pronostico de lluvias
# (periodo del 9 al 18 de agosto)", aviso 002, agosto de 2019:
# https://www.gob.mx/cms/uploads/attachment/file/484193/Pronostico_de_lluvias_a_10_dias_02_agosto_2019.pdf
# Ahi se usan para lluvia acumulada del pronostico; aplicarlos a un dia es SUPUESTO (VERIFICAR la
# clasificacion oficial de 24 h del SMN).
RANGOS_SMN = [
    ("fuerte", 25.0, 50.0),
    ("muy_fuerte", 50.0, 75.0),
    ("intensa", 75.0, 150.0),
    ("torrencial", 150.0, math.inf),
]


def descargar() -> dict:
    params = {
        "start": DESDE, "end": HASTA, "latitude": LAT, "longitude": LON,
        "community": "AG", "parameters": "IMERG_PRECTOT,PRECTOTCORR",
        "format": "json", "time-standard": "UTC",
    }
    url = f"{URL_POWER}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=180) as r:
        datos = json.load(r)
    datos["_consulta"] = {"url": url, "consultado": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    RESPUESTA.parent.mkdir(parents=True, exist_ok=True)
    RESPUESTA.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    return datos


def serie(datos: dict, parametro: str) -> dict[date, float | None]:
    """Fecha -> mm/dia; el valor de relleno de POWER pasa a None (nunca a 0)."""
    crudo = datos["properties"]["parameter"][parametro]
    relleno = datos.get("header", {}).get("fill_value", RELLENO)
    salida: dict[date, float | None] = {}
    for clave, valor in crudo.items():
        d = date(int(clave[:4]), int(clave[4:6]), int(clave[6:8]))
        salida[d] = None if valor is None or valor == relleno or valor < 0 else float(valor)
    return salida


def anio_agricola(d: date) -> int:
    """Anio agricola de SIAP: octubre a diciembre cuentan para t + 1."""
    return d.year + 1 if d.month >= 10 else d.year


def dias_del_anio_agricola(t: int) -> list[date]:
    inicio, fin = date(t - 1, 10, 1), date(t, 9, 30)
    return [date.fromordinal(o) for o in range(inicio.toordinal(), fin.toordinal() + 1)]


def percentil_tipo7(valores: list[float], p: float) -> float:
    """Hyndman y Fan (1996), definicion 7 (la de R y NumPy por defecto)."""
    x = sorted(valores)
    h = (len(x) - 1) * p
    bajo = math.floor(h)
    return x[bajo] + (h - bajo) * (x[min(bajo + 1, len(x) - 1)] - x[bajo])


def anio_mas_cercano(totales: dict[int, float], objetivo: float) -> int:
    """Anio con total mas cercano; empate (< 0.05 mm) gana el mas reciente, como el motor."""
    minimo = min(abs(v - objetivo) for v in totales.values())
    return max(t for t, v in totales.items() if abs(v - objetivo) - minimo < 0.05)


def resumen_anio(s: dict[date, float | None], t: int) -> dict | None:
    dias = dias_del_anio_agricola(t)
    valores = [s.get(d) for d in dias]
    if any(v is None for v in valores):
        return None  # anio incompleto: no se rellena
    v = [float(x) for x in valores]  # type: ignore[arg-type]
    return {
        "totalMm": round(sum(v), 1),
        "maxDiaMm": round(max(v), 1),
        "diasPorRango": {n: sum(1 for x in v if lo <= x < hi) for n, lo, hi in RANGOS_SMN},
    }


def mensuales(s: dict[date, float | None]) -> dict[str, float]:
    meses: dict[str, list[float | None]] = {}
    for d, v in s.items():
        meses.setdefault(f"{d.year}-{d.month:02d}", []).append(v)
    return {m: round(sum(vs), 1) for m, vs in meses.items() if all(x is not None for x in vs)}  # type: ignore[misc]


def correlacion(a: list[float], b: list[float]) -> float:
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    cov = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    return cov / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))


def analizar(datos: dict) -> dict:
    imerg, merra = serie(datos, "IMERG_PRECTOT"), serie(datos, "PRECTOTCORR")
    anios = sorted({anio_agricola(d) for d in imerg if anio_agricola(d) <= int(HASTA[:4])})
    por_anio = {}
    for t in anios:
        ri, rm = resumen_anio(imerg, t), resumen_anio(merra, t)
        if ri and rm:
            por_anio[t] = {"imerg": ri, "prectotcorr": rm}

    tot_i = {t: r["imerg"]["totalMm"] for t, r in por_anio.items()}
    tot_m = {t: r["prectotcorr"]["totalMm"] for t, r in por_anio.items()}
    escenarios = {}
    for nombre, p in (("seco", 0.10), ("habitual", 0.50), ("lluvioso", 0.90)):
        escenarios[nombre] = {
            "p": p,
            "imerg": {"percentilMm": round(percentil_tipo7(list(tot_i.values()), p), 1),
                      "anio": anio_mas_cercano(tot_i, percentil_tipo7(list(tot_i.values()), p))},
            "prectotcorrUtc": {"percentilMm": round(percentil_tipo7(list(tot_m.values()), p), 1),
                               "anio": anio_mas_cercano(tot_m, percentil_tipo7(list(tot_m.values()), p))},
            "anioMotorPower": ESCENARIOS_POWER[nombre],
        }

    mi, mm = mensuales(imerg), mensuales(merra)
    comunes = sorted(set(mi) & set(mm))
    faltan = sorted(d.isoformat() for d, v in imerg.items() if v is None)
    return {
        "meta": {
            "prototipo": "features/imerg (rama Mompin-features), no es contrato ni salida del motor",
            "consulta": datos.get("_consulta"),
            "fuentesPower": datos.get("header", {}).get("sources"),
            "coordenada": [LON, LAT],
            "coordenadaNota": "Coordenada ilustrativa del paquete de demo (no es una parcela real).",
            "estandarHora": "UTC (IMERG no existe en hora solar local en POWER). El dia UTC va unas 6 h "
                            "corrido respecto al dia local de Veracruz; PRECTOTCORR tambien se pidio en UTC "
                            "para comparar dia contra dia.",
            "resolucion": {"IMERG_PRECTOT": "0.1 grados (GPM IMERG)", "PRECTOTCORR": "MERRA-2, 0.5 x 0.625 grados"},
            "rangos": "Rangos de lluvia acumulada del SMN (via CONADESUCA 2019) aplicados a 24 h: SUPUESTO",
        },
        "diasSinDatoImerg": {"total": len(faltan), "primero": faltan[0] if faltan else None,
                             "ultimo": faltan[-1] if faltan else None},
        "porAnioAgricola": por_anio,
        "escenarios": escenarios,
        "mensual": {"meses": len(comunes),
                    "correlacionPearson": round(correlacion([mi[m] for m in comunes], [mm[m] for m in comunes]), 3)},
    }


def tabla(res: dict) -> str:
    lineas = ["| Anio agricola | IMERG total | MERRA-2 total | IMERG max dia | MERRA-2 max dia | IMERG dias >= 50 mm | MERRA-2 dias >= 50 mm |",
              "| --- | --- | --- | --- | --- | --- | --- |"]
    for t, r in res["porAnioAgricola"].items():
        i, m = r["imerg"], r["prectotcorr"]
        g50 = lambda x: sum(v for k, v in x["diasPorRango"].items() if k != "fuerte")  # noqa: E731
        marca = " (escenario)" if int(t) in ESCENARIOS_POWER.values() else ""
        lineas.append(f"| {t}{marca} | {i['totalMm']} | {m['totalMm']} | {i['maxDiaMm']} | {m['maxDiaMm']} | {g50(i)} | {g50(m)} |")
    lineas.append("")
    for n, e in res["escenarios"].items():
        lineas.append(f"- {n}: IMERG elige {e['imerg']['anio']} (p={e['p']}, {e['imerg']['percentilMm']} mm); "
                      f"PRECTOTCORR en UTC elige {e['prectotcorrUtc']['anio']}; el motor (POWER, hora local) usa {e['anioMotorPower']}.")
    lineas.append(f"- Correlacion mensual IMERG vs PRECTOTCORR: {res['mensual']['correlacionPearson']} ({res['mensual']['meses']} meses).")
    lineas.append(f"- Dias sin dato de IMERG: {res['diasSinDatoImerg']}")
    return "\n".join(lineas)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--descargar", action="store_true", help="volver a pedir la serie a NASA POWER")
    args = ap.parse_args(argv)
    datos = descargar() if args.descargar or not RESPUESTA.exists() else json.loads(RESPUESTA.read_text(encoding="utf-8"))
    res = analizar(datos)
    RESULTADO.write_text(json.dumps(res, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(tabla(res))
    return 0


if __name__ == "__main__":
    sys.exit(main())
