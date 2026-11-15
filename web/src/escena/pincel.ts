// Brocha (PAINT_BLOCK, doc 06): pieza ligera compartida por la escena 3D y la vista 2D.
// Solo decide que celdas toca un trazo; el cultivo de cada celda lo guarda el plan
// (porCelda) y lo evalua el motor. No importa Three.js.

import type { BloqueEscena } from './modelo';

export interface PincelEscena {
  /** 1 = una celda; 2 = 3 x 3; 3 = 5 x 5. */
  tamano: number;
  /** Color de la marca mientras el motor evalua (entrada del usuario, no un resultado). */
  color: string;
  /** Celdas del trazo terminado. */
  onTrazo: (celdas: string[]) => void;
}

/** Celdas que cubre la brocha centrada en `centro` (cuadrado de lado 2 * tamano - 1). */
export function huellaPincel(bloques: readonly Pick<BloqueEscena, 'celdaId' | 'x' | 'z'>[], centro: Pick<BloqueEscena, 'x' | 'z'>, tamano: number): string[] {
  const r = Math.max(0, Math.round(tamano) - 1);
  return bloques.filter((b) => Math.abs(b.x - centro.x) <= r + 1e-6 && Math.abs(b.z - centro.z) <= r + 1e-6).map((b) => b.celdaId);
}
