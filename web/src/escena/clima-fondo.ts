// Clima del fondo (decorativo): el cielo de la escena cambia con el clima de la fecha que se muestra.
// Puro. Lluvia: la clase del dia que ya entrego el motor (lluvia.ts, mismos cortes). Sin lluvia, la
// epoca del ano se compara con la propia parcela: calida o fresca si la temperatura media tipica de
// ese dia del ano cae en el 20 % mas alto o mas bajo de sus dias (percentiles 20 y 80 de la serie
// historica de NASA POWER de la parcela). No hay umbral absoluto: no se afirma que "haga calor", solo
// que es una epoca calida o fresca para ese lugar. Sin dato, el fondo queda como el del bioma.

import type { ClaseLluvia } from './lluvia';

export type EpocaRelativa = 'calida' | 'templada' | 'fresca';
export type ClimaFondo = 'despejado' | 'calido' | 'fresco' | 'llovizna' | 'lluvia' | 'tormenta';

export const NOMBRE_CLIMA_FONDO: Record<ClimaFondo, string> = {
  despejado: 'cielo despejado',
  calido: 'época cálida',
  fresco: 'época fresca',
  llovizna: 'llovizna',
  lluvia: 'lluvia',
  tormenta: 'lluvia fuerte',
};

const diaDelAnio = (f: string) => {
  const t = Date.UTC(Number(f.slice(0, 4)), Number(f.slice(5, 7)) - 1, Number(f.slice(8, 10)));
  return Math.floor((t - Date.UTC(Number(f.slice(0, 4)), 0, 1)) / 86400000);
};

function percentil(ordenados: readonly number[], p: number): number {
  const k = (ordenados.length - 1) * p;
  const a = Math.floor(k);
  const b = Math.min(ordenados.length - 1, a + 1);
  return ordenados[a]! + (ordenados[b]! - ordenados[a]!) * (k - a);
}

/** Epoca del ano de `fecha` frente a la climatologia de la parcela (tMediaDia por dia del ano). null si falta dato. */
export function epocaRelativa(tMediaDia: readonly (number | null)[] | null | undefined, fecha: string | null | undefined): EpocaRelativa | null {
  if (!tMediaDia || !fecha || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return null;
  const validos = tMediaDia.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (validos.length < 30) return null; // con muy pocos dias no hay "epoca" que comparar
  const t = tMediaDia[Math.min(diaDelAnio(fecha), tMediaDia.length - 1)];
  if (t == null) return null;
  if (t >= percentil(validos, 0.8)) return 'calida';
  if (t <= percentil(validos, 0.2)) return 'fresca';
  return 'templada';
}

/** Clima del fondo: la lluvia del dia manda; sin lluvia, la epoca; sin nada, despejado (el color del bioma). */
export function climaFondo(clase: ClaseLluvia | null | undefined, epoca: EpocaRelativa | null | undefined): ClimaFondo {
  if (clase === 'llovizna') return 'llovizna';
  if (clase === 'moderada') return 'lluvia';
  if (clase === 'fuerte') return 'tormenta';
  if (epoca === 'calida') return 'calido';
  if (epoca === 'fresca') return 'fresco';
  return 'despejado';
}
