// Animaciones de la escena (A5.1, con Mafer). Puro: decide desde que escala crece o
// se encoge cada planta; el render (escena-three.ts) solo interpola en el tiempo.
// Minimas: cambio de modelo por etapa con transicion suave (la planta vieja se encoge
// mientras la nueva crece). Deseables: escala continua al crecer dentro de la misma
// etapa (85 % a 100 % segun avanceEtapa del motor) y viento leve (en el shader).
// Con "reducir movimiento" (prefers-reduced-motion o el control de la escena) no hay
// ninguna animacion: el cambio es inmediato. Una actualizacion nueva corta la anterior:
// las animaciones no se acumulan.

/** Duracion de una transicion `[PROPUESTA]`: corta, como pide doc 06. */
export const DURACION_TRANSICION_MS = 450;

/** Amplitud del viento leve `[PROPUESTA]` (desplazamiento por altura al cuadrado, en celdas). */
export const AMPLITUD_VIENTO = 0.02;

/** Curva suave de entrada y salida (0 -> 0, 1 -> 1). */
export function suavizar(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
}

export function interpolar(desde: number, hasta: number, t: number): number {
  return desde + (hasta - desde) * suavizar(t);
}

/** Lo que habia en una celda antes de la actualizacion. */
export interface PlantaPrevia {
  clave: string;
  escala: number;
}

/**
 * Escala inicial de una planta nueva: si la celda ya tenia el mismo modelo, sigue
 * desde su escala (crece o encoge sin saltar); si el modelo cambio o no habia planta,
 * nace desde cero. Sin animacion, empieza ya en su escala final.
 */
export function escalaInicial(previa: PlantaPrevia | undefined, clave: string, escalaFinal: number, animar: boolean): number {
  if (!animar) return escalaFinal;
  return previa && previa.clave === clave ? previa.escala : 0;
}

/**
 * La planta vieja de una celda: se encoge hasta desaparecer si en la celda cambia el
 * modelo o ya no hay planta; si el modelo sigue, desaparece de inmediato (la nueva
 * continua desde su misma escala y no hace falta dibujar dos).
 */
export function saleEncogiendo(claveAnterior: string, claveNueva: string | null, animar: boolean): boolean {
  return animar && claveAnterior !== claveNueva;
}
