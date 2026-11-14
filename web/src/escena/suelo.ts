// Color del bloque de suelo segun la humedad que entrega el motor (doc 06:
// "bloques de suelo que se oscurecen con humedad y se aclaran si esta seco").
// Solo representa `humedad` (fraccion de TAW, 0 a 1) del registro; no la calcula.
// Sin humedad (null o sin registro) se usa un gris que no esta en la escala,
// para no confundir "sin dato" con "humedad media".
// Colores de modelos/paleta.md: 16 suelo_seco, 0 soil, 17 suelo_humedo, 8 stone.

import { hexARgb } from './contraste';

export const SUELO_SECO = '#9b7a55';
export const SUELO_MEDIO = '#6b4a2f';
export const SUELO_HUMEDO = '#3f2b19';
export const SUELO_SIN_HUMEDAD = '#8d8d86';

function mezclar(a: string, b: string, t: number): [number, number, number] {
  const x = hexARgb(a);
  const y = hexARgb(b);
  return [0, 1, 2].map((k) => Math.round(x[k]! + (y[k]! - x[k]!) * t)) as [number, number, number];
}

/** rgb 0..255 del suelo. Escala seco -> medio -> humedo; null -> gris sin dato. */
export function colorSuelo(humedad: number | null): [number, number, number] {
  if (humedad === null || !Number.isFinite(humedad)) return hexARgb(SUELO_SIN_HUMEDAD);
  const h = Math.min(1, Math.max(0, humedad));
  return h <= 0.5 ? mezclar(SUELO_SECO, SUELO_MEDIO, h / 0.5) : mezclar(SUELO_MEDIO, SUELO_HUMEDO, (h - 0.5) / 0.5);
}

export const TEXTO_ESCALA_SUELO =
  'Color del suelo: mas claro = mas seco, mas oscuro = mas humedo (humedad del motor). Gris: humedad NO_EVALUABLE.';
