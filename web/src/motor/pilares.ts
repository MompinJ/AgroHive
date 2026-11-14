// A3.7: pilares 2 (compatibilidad de ciclo) y 3 (proteccion del suelo). Solo con datos que alcanzan; sin fuente,
// NO_EVALUABLE con motivo (doc 05, paso 6).
//
// Compatibilidad de ciclo: siembras del plan fuera de la ventana del calendario local (contrato calendario-local, fuente
// SIAP o INIFAP) para su cultivo y temporada. Si alguna siembra no tiene ventana con fuente, el pilar es NO_EVALUABLE:
// contar solo las que si tienen ventana sesgaria la comparacion. No depende del clima del escenario.
//
// Proteccion del suelo: dias de suelo desnudo = dias del anio agricola de SIAP del escenario (1 de octubre de t-1 al
// 30 de septiembre de t) sin ningun cultivo del plan, con cada ciclo en su temporada (A2.8) y su duracion FAO-56. El
// indice de erosion relativo queda en null: RUSLE necesita intensidad de lluvia sub-diaria (I30) y factores C y LS con
// fuente para la parcela, que no tenemos; con lluvia diaria solo se inventarian. El pilar es EVALUABLE con los dias.
import { aDia, mesDe } from './fechas';
import { siembraEnEscenario } from './temporadas';
import type { CalendarioLocal, PilarCompatibilidadCiclo, PilarProteccionSuelo, PlanSiembra, Temporada } from './tipos';

export interface CicloParaPilar {
  ciclo: number;
  cultivo: string;
  siembra: string;
  temporada: Temporada;
  /** Duracion FAO-56 del ciclo; null si el cultivo no tiene parametros. */
  totalDias: number | null;
}

export const MOTIVO_SIN_INDICE_EROSION =
  'Indice de erosion relativo NO_EVALUABLE: RUSLE necesita intensidad de lluvia sub-diaria (I30) y factores C y LS con fuente para la parcela; con lluvia diaria se inventarian. El pilar usa los dias de suelo desnudo.';

function diaDelMes(fecha: string): number {
  return Number(fecha.slice(8, 10));
}

/** true si la fecha (mes y dia) cae en la ventana; acepta ventanas que cruzan el anio (por ejemplo noviembre a febrero). */
export function dentroDeVentana(fecha: string, v: { desdeMes: number; hastaMes: number; desdeDia?: number; hastaDia?: number }): boolean {
  const x = mesDe(fecha) * 100 + diaDelMes(fecha);
  const a = v.desdeMes * 100 + (v.desdeDia ?? 1);
  const b = v.hastaMes * 100 + (v.hastaDia ?? 31);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
}

export function pilarCompatibilidad(
  plan: PlanSiembra,
  calendario: CalendarioLocal | null | undefined,
  ciclosPorCelda: Map<string, CicloParaPilar[]>,
  pesos: Map<string, number>,
): { pilar: PilarCompatibilidadCiclo; avisos: string[] } {
  const avisos: string[] = [];
  if (!calendario || !('calendarioId' in plan.calendarioLocal) || plan.calendarioLocal.calendarioId !== calendario.id) {
    const motivo = 'sinCalendarioLocal' in plan.calendarioLocal ? `Sin calendario local: ${plan.calendarioLocal.motivo}` : 'No se recibio el calendario local que cita el plan.';
    return { pilar: { estado: 'NO_EVALUABLE', motivo, siembrasFueraDeVentana: null }, avisos };
  }
  const faltan = new Set<string>();
  let w = 0;
  let fuera = 0;
  for (const [celda, ciclos] of ciclosPorCelda) {
    const peso = pesos.get(celda) ?? 1;
    w += peso;
    for (const c of ciclos) {
      const e = calendario.entradas.find((x) => x.cultivo === c.cultivo && x.temporada === c.temporada);
      if (!e || e.ventana.estado !== 'EVALUABLE') {
        faltan.add(`${c.cultivo} ${c.temporada}${e && e.ventana.estado === 'NO_EVALUABLE' ? ` (${e.ventana.motivo})` : ' (sin entrada en el calendario)'}`);
        continue;
      }
      if (!dentroDeVentana(c.siembra, e.ventana)) fuera += peso;
    }
  }
  if (faltan.size > 0) {
    return {
      pilar: { estado: 'NO_EVALUABLE', motivo: `Sin ventana de siembra con fuente en el calendario ${calendario.id} para: ${[...faltan].join('; ')}.`, siembrasFueraDeVentana: null },
      avisos,
    };
  }
  // Lo que el plan dice (dentroDeVentana del selector) debe coincidir con lo que calcula el motor.
  for (const c of plan.ciclos) {
    const e = calendario.entradas.find((x) => x.cultivo === c.cultivo && x.temporada === c.temporada);
    if (e && e.ventana.estado === 'EVALUABLE' && typeof c.dentroDeVentana === 'boolean' && c.dentroDeVentana !== dentroDeVentana(c.siembra, e.ventana)) {
      avisos.push(`Ciclo ${c.ciclo}: el plan dice dentroDeVentana=${c.dentroDeVentana}, pero la siembra del ${c.siembra} ${c.dentroDeVentana ? 'no cae' : 'cae'} en la ventana del calendario.`);
    }
  }
  return { pilar: { estado: 'EVALUABLE', siembrasFueraDeVentana: Math.round(fuera / w) }, avisos };
}

export function pilarProteccion(
  anioAgricola: number | null,
  ciclosPorCelda: Map<string, CicloParaPilar[]>,
  pesos: Map<string, number>,
): PilarProteccionSuelo {
  if (anioAgricola === null) {
    return { estado: 'NO_EVALUABLE', motivo: 'Sin anio real del escenario.', indiceErosionRelativo: null, diasSueloDesnudo: null };
  }
  const inicio = aDia(`${anioAgricola - 1}-10-01`);
  const fin = aDia(`${anioAgricola}-09-30`);
  let w = 0;
  let desnudo = 0;
  for (const [celda, ciclos] of ciclosPorCelda) {
    const peso = pesos.get(celda) ?? 1;
    w += peso;
    const cubiertos = new Set<number>();
    for (const c of ciclos) {
      if (c.totalDias === null) {
        return {
          estado: 'NO_EVALUABLE',
          motivo: `El cultivo ${c.cultivo} (ciclo ${c.ciclo}) no tiene duracion con fuente: no se sabe cuanto cubre el suelo.`,
          indiceErosionRelativo: null,
          diasSueloDesnudo: null,
        };
      }
      const s = aDia(siembraEnEscenario(c.siembra, c.temporada, anioAgricola).fecha);
      for (let d = Math.max(s, inicio); d < Math.min(s + c.totalDias, fin + 1); d++) cubiertos.add(d);
    }
    desnudo += peso * (fin - inicio + 1 - cubiertos.size);
  }
  return { estado: 'EVALUABLE', motivo: MOTIVO_SIN_INDICE_EROSION, indiceErosionRelativo: null, diasSueloDesnudo: Math.round(desnudo / w) };
}

/** Dias del anio agricola de SIAP del anio t (365 o 366). */
export function diasAnioAgricola(t: number): number {
  return aDia(`${t}-09-30`) - aDia(`${t - 1}-10-01`) + 1;
}
