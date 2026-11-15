import { tt } from '../ui/i18n/actual';
// Nivel de graficos de la escena 3D. Puro. Cuesta menos dibujar con menos pixeles (a 2x son cuatro
// veces mas que a 1x), sin aves ni viento ambiental y con menos insectos. No cambia datos, colores
// de los indicadores ni el motor. El suavizado de bordes (antialias) solo se fija al crear el
// contexto WebGL, asi que no depende del nivel y no hay que recrear la escena al cambiarlo.

export type NivelGraficos = 'bajo' | 'medio' | 'alto';
export const NIVELES_GRAFICOS: readonly NivelGraficos[] = ['bajo', 'medio', 'alto'];
export const NOMBRE_NIVEL_GRAFICOS: Record<NivelGraficos, string> = { get bajo() { return tt('graf.bajo'); }, get medio() { return tt('graf.medio'); }, get alto() { return tt('graf.alto'); } };

export interface AjustesGraficos {
  /** Tope del ratio de pixeles del lienzo (1 = un pixel por pixel CSS). */
  pixelRatioMax: number;
  /** Aves y viento ambiental del entorno. */
  ambiente: boolean;
  /** Tope de insectos dibujados en toda la parcela. */
  insectosMax: number;
  /** Descripcion para el usuario. */
  detalle: string;
}

export const AJUSTES_GRAFICOS: Record<NivelGraficos, AjustesGraficos> = {
  bajo: { pixelRatioMax: 1, ambiente: false, insectosMax: 120, get detalle() { return tt('graf.bajoDetalle'); } },
  medio: { pixelRatioMax: 1.5, ambiente: true, insectosMax: 240, get detalle() { return tt('graf.medioDetalle'); } },
  alto: { pixelRatioMax: 2, ambiente: true, insectosMax: 480, get detalle() { return tt('graf.altoDetalle'); } },
};

const LLAVE = 'agrohive:graficos:v1';

export function esNivelGraficos(x: unknown): x is NivelGraficos {
  return x === 'bajo' || x === 'medio' || x === 'alto';
}

/**
 * Nivel con el que arranca: el que el usuario guardo; si no hay, uno segun el equipo. Con 4 nucleos o
 * menos, o 4 GB o menos de memoria (si el navegador la declara), medio; con 2 nucleos o 2 GB o menos,
 * bajo; si no, alto. Es una sugerencia: el usuario lo cambia en la escena.
 */
export function nivelInicial(guardado: string | null | undefined, nucleos?: number, memoriaGB?: number): NivelGraficos {
  if (esNivelGraficos(guardado)) return guardado;
  if ((nucleos != null && nucleos <= 2) || (memoriaGB != null && memoriaGB <= 2)) return 'bajo';
  if ((nucleos != null && nucleos <= 4) || (memoriaGB != null && memoriaGB <= 4)) return 'medio';
  return 'alto';
}

export function leerNivelGuardado(): NivelGraficos {
  let guardado: string | null = null;
  try { guardado = localStorage.getItem(LLAVE); } catch { /* sin almacenamiento */ }
  const nav = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { deviceMemory?: number });
  return nivelInicial(guardado, nav?.hardwareConcurrency, nav?.deviceMemory);
}

export function guardarNivel(nivel: NivelGraficos): void {
  try { localStorage.setItem(LLAVE, nivel); } catch { /* sin almacenamiento */ }
}
