// Manchon de plantas por celda (idea de balam, aprobada por Mompin): cada celda se dibuja
// con un modelo ligero de varias plantas en surcos, y la celda elegida con el modelo
// detallado. Los modelos de bloque los hace Mafer en modelos/cultivos/bloques/
// (<cultivo>_<etapa>_bloque.bbmodel, convenciones de doc 07; [DECIDIDO] Mompin con Mafer:
// como mucho 24 cubos, sin caras de abajo, y un lomo bajo de 1 cubo por surco). Si falta uno, se
// usa un bloque PROVISIONAL generado aqui a partir del modelo detallado: 3 surcos con su
// lomo y 3 plantas de dos cubos (tallo y copa) cada uno, con la altura y los colores del
// detallado (21 cubos). Desde el 14/11 estan los bloques de los 8 cultivos (tope de 24 cubos sin
// caras de abajo): el provisional queda solo de respaldo si falta un .bbmodel.
// La densidad es visual, no a escala.

import type { CuboVoxel, ModeloVoxel, NombreCara, Vec3 } from './bbmodel';
import { unirCubos } from './geometria';
import { UNIDADES_BBMODEL_POR_CELDA } from '../modelo';

export const claveBloque = (clave: string) => `${clave}_bloque`;

/** Tope de cubos de un modelo de bloque `[DECIDIDO]` (Mompin con Mafer, 14/11: 24 sin caras de abajo). */
export const TOPE_CUBOS_BLOQUE = 24;

const caras = (i: number, sinAbajo = true): Record<NombreCara, number | null> => ({
  north: i,
  south: i,
  east: i,
  west: i,
  up: i,
  down: sinAbajo ? null : i, // la cara de abajo nunca se ve: no se dibuja
});

/** Indice de paleta mas frecuente en las caras de arriba de los cubos que cumplen el filtro. */
function colorFrecuente(cubos: readonly CuboVoxel[], filtro: (c: CuboVoxel) => boolean, defecto: number): number {
  const cuenta = new Map<number, number>();
  for (const c of cubos.filter(filtro)) {
    const i = c.caras.up ?? c.caras.north;
    if (i !== null) cuenta.set(i, (cuenta.get(i) ?? 0) + 1);
  }
  let mejor = defecto;
  let n = 0;
  for (const [i, k] of cuenta) if (k > n) [mejor, n] = [i, k];
  return mejor;
}

/** Bloque provisional: 3 surcos x 3 plantas (tallo y copa), con la altura y los colores del detallado. */
export function bloqueProvisional(detallado: ModeloVoxel): ModeloVoxel {
  const cubos = detallado.cubos;
  // Alto real del detallado, con sus rotaciones: una hoja larga tendida se guarda como caja alta girada, y medir
  // desde/hasta sin girar la haria crecer (pasaba con las hojas de la sandia).
  const altoDetallado = cubos.length ? unirCubos(detallado, () => [1, 1, 1]).caja.max[1] * UNIDADES_BBMODEL_POR_CELDA : 4;
  // Hojas: lo que esta por encima del lomo (y >= 2); tallo: el cubo mas esbelto.
  const hoja = colorFrecuente(cubos, (c) => Math.min(c.desde[1], c.hasta[1]) >= 2, 3);
  const esbeltez = (c: CuboVoxel) => Math.abs(c.hasta[1] - c.desde[1]) / Math.max(0.5, Math.abs(c.hasta[0] - c.desde[0]), Math.abs(c.hasta[2] - c.desde[2]));
  const tallo = [...cubos].sort((a, b) => esbeltez(b) - esbeltez(a))[0];
  const colorTallo = tallo ? (tallo.caras.north ?? tallo.caras.up ?? 4) : 4;
  const alto = Math.max(1.5, altoDetallado * 0.55);
  // Copa angosta y alta (se lee como mata, no como arbol); en etapas bajas, mas ancha que alta.
  const copa = Math.max(0.8, alto * 0.6);
  const ancho = Math.min(2.5, 1.2 + alto * 0.08);
  // Lomo: el color del cubo 'lomo' del detallado (tierra), o soil (0) de la paleta compartida.
  const lomoDetallado = cubos.find((c) => c.nombre.startsWith('lomo'));
  const colorLomo = lomoDetallado ? (lomoDetallado.caras.up ?? 0) : 0;
  const resultado: CuboVoxel[] = [];
  const origen: Vec3 = [0, 0, 0];
  const giro: Vec3 = [0, 0, 0];
  for (const z of [-5, 0, 5]) {
    resultado.push({ nombre: `lomo_${z}`, desde: [-7.5, 0, z - 1.5], hasta: [7.5, 1, z + 1.5], origen, rotacion: giro, caras: caras(colorLomo) });
    for (const x of [-5, 0, 5]) {
      const dx = x + (z === 0 ? 1 : 0); // surcos un poco desfasados
      resultado.push({ nombre: `tallo_${x}_${z}`, desde: [dx - 0.5, 1, z - 0.5], hasta: [dx + 0.5, 1 + alto - copa * 0.5, z + 0.5], origen, rotacion: giro, caras: caras(colorTallo) });
      resultado.push({ nombre: `copa_${x}_${z}`, desde: [dx - ancho / 2, 1 + alto - copa, z - ancho / 2], hasta: [dx + ancho / 2, 1 + alto, z + ancho / 2], origen, rotacion: giro, caras: caras(hoja) });
    }
  }
  return { nombre: `${detallado.nombre}_bloque_provisional`, textura: detallado.textura, cubos: resultado };
}
