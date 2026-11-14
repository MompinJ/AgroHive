// Lluvia del dia en la escena (pedido de Mompin, nota en A5.1). Pura: toma la lluvia del
// dia que ya entrego el motor en serieBalance (contrato serie-balance: columna diaria
// lluviaMm del clima del escenario, con su fecha de clima y su fuente). No calcula ni
// rellena nada: un dia sin dato no llueve en la escena y se dice que falta.

import type { Fuente, SerieBalance } from '../../../contratos/tipos/contratos';

/**
 * Cortes de lluvia diaria `[PROPUESTA]` (mm/dia), solo para el dibujo y la etiqueta:
 * - menos de 0.1 mm: sin lluvia (cantidades menores no se distinguen de cero);
 * - de 0.1 a 5 mm: llovizna; de 5 a 20 mm: moderada; desde 20 mm: fuerte.
 * - La intensidad del dibujo crece con los mm hasta llenarse en 50 mm.
 */
export const CORTES_LLUVIA = { minimaMm: 0.1, moderadaDesdeMm: 5, fuerteDesdeMm: 20, saturaEnMm: 50 } as const;

export type ClaseLluvia = 'sin_lluvia' | 'llovizna' | 'moderada' | 'fuerte';

export type LluviaDia =
  | {
      estado: 'con_dato';
      /** Fecha del plan que muestra la escena. */
      fecha: string;
      /** Dia real del clima del escenario que le corresponde. */
      fechaClima: string | null;
      mm: number;
      clase: ClaseLluvia;
      /** 0 a 1, proporcional a los mm (0 sin lluvia). */
      intensidad: number;
      fuente: Fuente | null;
    }
  | { estado: 'sin_dato'; fecha: string; motivo: string };

export const NOMBRE_CLASE: Record<ClaseLluvia, string> = {
  sin_lluvia: 'sin lluvia',
  llovizna: 'llovizna',
  moderada: 'lluvia moderada',
  fuerte: 'lluvia fuerte',
};

export function claseLluvia(mm: number): ClaseLluvia {
  if (mm < CORTES_LLUVIA.minimaMm) return 'sin_lluvia';
  if (mm < CORTES_LLUVIA.moderadaDesdeMm) return 'llovizna';
  if (mm < CORTES_LLUVIA.fuerteDesdeMm) return 'moderada';
  return 'fuerte';
}

export function intensidadLluvia(mm: number): number {
  if (mm < CORTES_LLUVIA.minimaMm) return 0;
  return Math.min(1, mm / CORTES_LLUVIA.saturaEnMm);
}

const DIA_MS = 86400000;
const aDia = (f: string) => Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
const deDia = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Fuente de la lluvia entre las de la serie: la de NASA POWER si esta; si no, la primera. */
function fuenteLluvia(serie: SerieBalance): Fuente | null {
  return serie.fuentes.find((f) => /POWER/i.test(f.nombre)) ?? serie.fuentes[0] ?? null;
}

/**
 * Lluvia del dia `fecha` (del plan) segun la serie del motor. null si no hay serie ni fecha.
 * Fuera de los ciclos simulados, o con el dato en null, devuelve sin_dato con su motivo.
 */
export function lluviaDelDia(serie: SerieBalance | null | undefined, fecha: string | null | undefined): LluviaDia | null {
  if (!serie || !fecha) return null;
  const dia = aDia(fecha);
  for (const c of serie.ciclos) {
    const i = Math.round((dia - aDia(c.desde)) / DIA_MS);
    const columna = c.dias.lluviaMm;
    if (i < 0 || i >= columna.length) continue;
    const mm = columna[i];
    if (mm === null || mm === undefined || !Number.isFinite(mm)) {
      return { estado: 'sin_dato', fecha, motivo: c.motivo ?? 'El clima del escenario no tiene la lluvia de ese dia.' };
    }
    return {
      estado: 'con_dato',
      fecha,
      fechaClima: c.fechaClima ? deDia(aDia(c.fechaClima) + i * DIA_MS) : null,
      mm,
      clase: claseLluvia(mm),
      intensidad: intensidadLluvia(mm),
      fuente: fuenteLluvia(serie),
    };
  }
  return { estado: 'sin_dato', fecha, motivo: 'La serie del motor solo cubre los dias de cada ciclo; esta fecha queda fuera.' };
}

const numero = (n: number) => n.toLocaleString('es-MX', { maximumFractionDigits: 1 });

/** Texto del indicador fijo (siempre visible; con reducir movimiento reemplaza a la animacion). */
export function textoLluvia(l: LluviaDia): string {
  if (l.estado === 'sin_dato') return `Lluvia del ${l.fecha}: NO_EVALUABLE. ${l.motivo}`;
  const dia = l.fechaClima ? ` (clima real del ${l.fechaClima})` : '';
  const fuente = l.fuente ? ` Fuente: ${l.fuente.nombre}.` : '';
  if (l.clase === 'sin_lluvia') return `Sin lluvia el ${l.fecha}${dia}: ${numero(l.mm)} mm.${fuente}`;
  return `Lluvia: ${numero(l.mm)} mm, ${NOMBRE_CLASE[l.clase]}, el ${l.fecha}${dia}.${fuente}`;
}
