// A2.5: seleccion de escenarios seco / habitual / lluvioso (doc 05, paso 1).
//
// Criterio [DECIDIDO] 14/11: el percentil se calcula sobre la lluvia de las temporadas de siembra PV y OI del anio
// agricola de SIAP, no del anio calendario. Para el anio agricola t (SIAP_CICLOS):
//   OI = siembras de octubre de t-1 a marzo de t;  PV = siembras de abril a septiembre de t.
// La lluvia que entra al percentil es la suma de los dias de las dos ventanas (1 de octubre de t-1 al 30 de
// septiembre de t). El escenario es el anio real t; su serie va del 1 de octubre de t-1 al 31 de marzo de t+1
// (los 18 meses del anio agricola de SIAP) para que quepan los ciclos que se cosechan despues de septiembre.
// Solo son candidatos los anios con las dos ventanas completas (sin dias faltantes: no se rellenan).
// Percentil: definicion 7 de Hyndman y Fan. Anio elegido: el de lluvia mas cercana al percentil; si dos quedan a
// la misma distancia (diferencia menor a 0.05 mm, la mitad de la precision mostrada), gana el anio mas antiguo.
// Siempre se declara el segundo anio mas cercano para que un empate practico sea visible.

import { peorEstado } from './estados';
import { anioDe, rangoFechas } from './fechas';
import { HYNDMAN_FAN, SIAP_CICLOS } from './fuentes';
import {
  ESCENARIOS,
  VERSION_CONTRATO,
  type Advertencia,
  type ClimaEscenario,
  type DiaClima,
  type Escenario,
  type EstadoEvaluacion,
  type SerieClima,
} from './tipos';

export const PERCENTIL_OBJETIVO: Readonly<Record<Escenario, number>> = { seco: 10, habitual: 50, lluvioso: 90 };

/** Doc 04: ventana objetivo de 20 anios, respaldo de 10. Con menos de 10 anios completos no se eligen escenarios. */
export const MIN_ANIOS_COMPLETOS = 10;

const TOLERANCIA_EMPATE_MM = 0.05;

export interface LluviaAnioAgricola {
  anio: number;
  /** Lluvia de la ventana de siembras PV (abril a septiembre de anio). null si falta algun dia. */
  pvMm: number | null;
  /** Lluvia de la ventana de siembras OI (octubre de anio-1 a marzo de anio). null si falta algun dia. */
  oiMm: number | null;
  /** pvMm + oiMm: la cantidad sobre la que se calcula el percentil. */
  temporadasMm: number | null;
  /** Lluvia del anio calendario (contrato: seleccion.lluviaAnualMm). null si falta algun dia. */
  calendarioMm: number | null;
  diasFaltantes: number;
}

export interface SeleccionEscenarios {
  /** EVALUABLE (o el estado de la serie) si se eligieron los tres anios; NO_EVALUABLE o ERROR_DATOS si no. */
  estado: EstadoEvaluacion;
  motivo?: string;
  /** Lluvia por anio agricola, en orden de anio (evidencia para la interfaz). */
  anios: LluviaAnioAgricola[];
  /** Valor del percentil por escenario (mm de temporadas), null si no se calculo. */
  percentiles: Record<Escenario, number | null>;
  escenarios: Partial<Record<Escenario, ClimaEscenario>>;
}

/** Percentil p (0 a 100) por la definicion 7 de Hyndman y Fan (interpolacion lineal). */
export function percentilTipo7(valores: readonly number[], p: number): number {
  if (valores.length === 0) throw new Error('percentil de una lista vacia');
  const x = [...valores].sort((a, b) => a - b);
  const h = ((x.length - 1) * p) / 100;
  const lo = Math.floor(h);
  const a = x[lo] as number;
  const b = x[Math.min(lo + 1, x.length - 1)] as number;
  return a + (h - lo) * (b - a);
}

function sumar(lluvia: Map<string, number | null>, desde: string, hasta: string): { mm: number | null; faltan: number } {
  let mm = 0;
  let faltan = 0;
  for (const f of rangoFechas(desde, hasta)) {
    const v = lluvia.get(f);
    if (v === null || v === undefined) faltan++;
    else mm += v;
  }
  return { mm: faltan === 0 ? mm : null, faltan };
}

/** Lluvia de temporadas PV y OI por anio agricola, para cada anio cuyas ventanas caben en la serie. */
export function lluviaPorAnioAgricola(diario: readonly DiaClima[]): LluviaAnioAgricola[] {
  if (diario.length === 0) return [];
  const lluvia = new Map<string, number | null>();
  for (const d of diario) lluvia.set(d.fecha, d.lluviaMm);
  const fechas = [...lluvia.keys()].sort();
  const primero = anioDe(fechas[0] as string);
  const ultimo = anioDe(fechas[fechas.length - 1] as string);
  const salida: LluviaAnioAgricola[] = [];
  for (let t = primero; t <= ultimo; t++) {
    const oi = sumar(lluvia, `${t - 1}-10-01`, `${t}-03-31`);
    const pv = sumar(lluvia, `${t}-04-01`, `${t}-09-30`);
    const cal = sumar(lluvia, `${t}-01-01`, `${t}-12-31`);
    salida.push({
      anio: t,
      pvMm: pv.mm,
      oiMm: oi.mm,
      temporadasMm: pv.mm !== null && oi.mm !== null ? pv.mm + oi.mm : null,
      calendarioMm: cal.mm,
      diasFaltantes: oi.faltan + pv.faltan,
    });
  }
  return salida;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Una serie de ejemplo o sintetica es, como mucho, EXPLORATORIO (contrato clima-escenario). */
function estadoDeSerie(serie: SerieClima): EstadoEvaluacion {
  return serie.meta.esEjemplo ? peorEstado(serie.estado, 'EXPLORATORIO') : serie.estado;
}

/** Elige los anios reales de cada escenario desde la serie diaria de GET /api/clima. Determinista. */
export function seleccionarEscenarios(serie: SerieClima): SeleccionEscenarios {
  const anios = lluviaPorAnioAgricola(serie.diario);
  const vacio: Record<Escenario, number | null> = { seco: null, habitual: null, lluvioso: null };
  const estadoSerie = estadoDeSerie(serie);
  if (estadoSerie === 'ERROR_DATOS' || estadoSerie === 'NO_EVALUABLE') {
    return { estado: estadoSerie, motivo: `La serie de clima llego como ${estadoSerie}: no hay anios que elegir.`, anios, percentiles: vacio, escenarios: {} };
  }
  const candidatos = anios.filter((a): a is LluviaAnioAgricola & { temporadasMm: number } => a.temporadasMm !== null);
  if (candidatos.length < MIN_ANIOS_COMPLETOS) {
    return {
      estado: 'NO_EVALUABLE',
      motivo: `Solo ${candidatos.length} anios agricolas con las temporadas PV y OI completas; hacen falta al menos ${MIN_ANIOS_COMPLETOS} (doc 04).`,
      anios,
      percentiles: vacio,
      escenarios: {},
    };
  }

  const valores = candidatos.map((a) => a.temporadasMm);
  const percentiles = { ...vacio };
  const escenarios: Partial<Record<Escenario, ClimaEscenario>> = {};
  const ordenFechas = [...serie.diario].sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
  const ventana = serie.periodo ?? {
    desde: (ordenFechas[0] as DiaClima).fecha,
    hasta: (ordenFechas[ordenFechas.length - 1] as DiaClima).fecha,
  };
  const incompletos = anios.filter((a) => a.temporadasMm === null).map((a) => a.anio);
  const elegidos = new Map<number, Escenario[]>();

  for (const esc of ESCENARIOS) {
    const p = PERCENTIL_OBJETIVO[esc];
    const objetivo = percentilTipo7(valores, p);
    percentiles[esc] = objetivo;
    const orden = [...candidatos].sort((a, b) => {
      const da = Math.abs(a.temporadasMm - objetivo);
      const db = Math.abs(b.temporadasMm - objetivo);
      if (Math.abs(da - db) >= TOLERANCIA_EMPATE_MM) return da - db;
      return a.anio - b.anio;
    });
    const elegido = orden[0] as (typeof candidatos)[number];
    const segundo = orden[1];
    elegidos.set(elegido.anio, [...(elegidos.get(elegido.anio) ?? []), esc]);

    const t = elegido.anio;
    const desde = `${t - 1}-10-01`;
    const hasta = `${t + 1}-03-31`;
    const diario = ordenFechas.filter((d) => d.fecha >= desde && d.fecha <= hasta);
    const ultimoDia = (diario[diario.length - 1] as DiaClima).fecha;

    const advertencias: Advertencia[] = [...(serie.advertencias ?? [])];
    advertencias.push({
      codigo: 'CRITERIO_TEMPORADAS_SIAP',
      mensaje:
        `Anio agricola ${t}: lluvia de temporadas ${r1(elegido.temporadasMm)} mm (OI, oct ${t - 1} a mar ${t}: ${r1(elegido.oiMm as number)} mm; ` +
        `PV, abr a sep ${t}: ${r1(elegido.pvMm as number)} mm). p${p} de ${candidatos.length} anios = ${r1(objetivo)} mm.`,
      severidad: 'info',
    });
    if (segundo) {
      advertencias.push({
        codigo: 'ANIO_CERCANO',
        mensaje: `El segundo anio mas cercano al p${p} es ${segundo.anio} (${r1(segundo.temporadasMm)} mm, a ${r1(Math.abs(segundo.temporadasMm - objetivo))} mm del percentil; el elegido esta a ${r1(Math.abs(elegido.temporadasMm - objetivo))} mm).`,
        severidad: 'info',
      });
    }
    if (incompletos.length > 0) {
      advertencias.push({
        codigo: 'ANIOS_INCOMPLETOS_EXCLUIDOS',
        mensaje: `Sin las dos temporadas completas en la serie (no se rellenan): ${incompletos.join(', ')}.`,
        severidad: 'info',
      });
    }
    if (ultimoDia < hasta) {
      advertencias.push({
        codigo: 'SERIE_CORTA_DESPUES_DE_PV',
        mensaje: `La serie termina el ${ultimoDia}; un ciclo que siga despues de esa fecha queda NO_EVALUABLE.`,
        severidad: 'aviso',
      });
    }

    const esc_: ClimaEscenario = {
      meta: serie.meta.esEjemplo
        ? { versionContrato: VERSION_CONTRATO, esEjemplo: true, aviso: serie.meta.aviso ?? 'Serie de ejemplo, no son datos reales.' }
        : { versionContrato: VERSION_CONTRATO, esEjemplo: false },
      escenario: esc,
      anioReal: t,
      estado: estadoSerie,
      respaldo: serie.respaldo,
      coordenada: serie.coordenada,
      fuente: { ...serie.fuente, periodo: { desde: (diario[0] as DiaClima).fecha, hasta: ultimoDia } },
      seleccion: {
        ventana,
        percentilObjetivo: p,
        lluviaAnualMm: elegido.calendarioMm === null ? null : r1(elegido.calendarioMm),
        criterio:
          `Anio agricola SIAP con la lluvia de temporadas PV + OI (1 oct ${t - 1} a 30 sep ${t}) mas cercana al p${p} ` +
          `(${HYNDMAN_FAN.nombre}, ${HYNDMAN_FAN.cita}) de ${candidatos.length} anios completos de ${ventana.desde} a ${ventana.hasta}; ` +
          `empate a menos de ${TOLERANCIA_EMPATE_MM} mm: el anio mas antiguo. Ventanas de siembra: ${SIAP_CICLOS.nombre}, ${SIAP_CICLOS.cita}. ` +
          `lluviaAnualMm es la del anio calendario ${t}, solo como referencia.`,
      },
      diario,
      advertencias,
    };
    if (serie.humedadSuelo) esc_.humedadSuelo = serie.humedadSuelo;
    escenarios[esc] = esc_;
  }

  for (const [anio, escs] of elegidos) {
    if (escs.length > 1) {
      for (const e of escs) {
        escenarios[e]?.advertencias?.push({
          codigo: 'MISMO_ANIO_EN_VARIOS_ESCENARIOS',
          mensaje: `El anio ${anio} representa a ${escs.join(' y ')}: la serie tiene poca variacion entre anios.`,
          severidad: 'aviso',
        });
      }
    }
  }

  return { estado: estadoSerie, anios, percentiles, escenarios };
}
