// Simulacion de daltonismo (dicromacia) para comprobar que los estados visuales
// se distinguen sin depender del color (A3.3). Puro: solo calcula; la escena y la
// leyenda no lo usan en ejecucion, lo usan las pruebas para verificar la tabla de
// estilos de estilos-estado.ts.
//
// Fuente: Machado, G. M., Oliveira, M. M. y Fernandes, L. A. F. (2009), "A
// Physiologically-based Model for Simulation of Color Vision Deficiency", IEEE
// Transactions on Visualization and Computer Graphics 15(6): 1291-1298. Las matrices
// son las de la Tabla 1 con severidad 1.0 (dicromacia), copiadas de
// https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
// (consultada el 14/11/2026). Cada fila suma 1, de modo que el blanco, el negro y los
// grises se conservan (se comprueba en las pruebas).
//
// Metodo: el modelo parte de las distribuciones espectrales de los primarios RGB,
// asi que se aplica sobre RGB LINEAL (luz), no sobre el valor sRGB codificado. El
// resultado se mide en CIELAB (D65) con la diferencia de color CIE76 (dE*ab). El
// umbral de dE para considerar dos colores "distintos a simple vista" es una
// decision del equipo `[PROPUESTA]`, no un valor de la fuente.

import { hexARgb } from './contraste';

export type TipoDaltonismo = 'protanopia' | 'deuteranopia' | 'tritanopia';
/** Vista del color: sin deficiencia o una de las tres dicromacias. */
export type VistaColor = 'normal' | TipoDaltonismo;

export const VISTAS_COLOR: readonly VistaColor[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia'];

type Matriz3 = readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]];

/** Machado et al. (2009), Tabla 1, severidad 1.0. */
export const MATRICES_DICROMACIA: Record<TipoDaltonismo, Matriz3> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export type RgbLineal = [number, number, number];
export type Lab = [number, number, number];

const aLineal = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const limitar = (x: number): number => Math.min(1, Math.max(0, x));

/** RGB lineal (0 a 1) de un color hex tal como lo ve la persona en la vista indicada. */
export function rgbLinealVisto(hex: string, vista: VistaColor): RgbLineal {
  const lineal = hexARgb(hex).map(aLineal) as RgbLineal;
  if (vista === 'normal') return lineal;
  const m = MATRICES_DICROMACIA[vista];
  return m.map((fila) => limitar(fila[0] * lineal[0] + fila[1] * lineal[1] + fila[2] * lineal[2])) as RgbLineal;
}

/** CIELAB (iluminante D65, observador 2 grados) desde RGB lineal con primarios sRGB. */
export function labDeLineal([r, g, b]: RgbLineal): Lab {
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(x / 0.95047);
  const fy = f(y);
  const fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Diferencia de color CIE76 (dE*ab) entre dos colores hex, vistos en la vista indicada. */
export function diferenciaColor(a: string, b: string, vista: VistaColor = 'normal'): number {
  const la = labDeLineal(rgbLinealVisto(a, vista));
  const lb = labDeLineal(rgbLinealVisto(b, vista));
  return Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2]);
}
