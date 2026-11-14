// Une los cubos de un modelo voxel en una sola geometria (arreglos planos) para
// usarla en un InstancedMesh: un draw call por cultivo + etapa (doc 07 y 08).
// Puro: la capa three solo envuelve estos arreglos en un BufferGeometry.
// Misma transformacion que herramientas/voxelkit.py y el visor de Mafer:
// p' = Rz * Ry * Rx * (p - origin) + origin, con angulos en grados.

import { UNIDADES_BBMODEL_POR_CELDA } from '../modelo';
import type { CuboVoxel, ModeloVoxel, NombreCara, Vec3 } from './bbmodel';

type Mat3 = [number, number, number, number, number, number, number, number, number];

export function matrizRotacionZYX(grados: Vec3): Mat3 {
  const [x, y, z] = grados.map((g) => (g * Math.PI) / 180) as Vec3;
  const cx = Math.cos(x), sx = Math.sin(x);
  const cy = Math.cos(y), sy = Math.sin(y);
  const cz = Math.cos(z), sz = Math.sin(z);
  // Rz * Ry * Rx, por filas.
  return [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
}

function aplicar(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Esquinas de cada cara en orden antihorario visto desde fuera, con su normal. */
function esquinasCara(cara: NombreCara, a: Vec3, b: Vec3): { esquinas: Vec3[]; normal: Vec3 } {
  const [x0, y0, z0] = a;
  const [x1, y1, z1] = b;
  switch (cara) {
    case 'up': return { normal: [0, 1, 0], esquinas: [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]] };
    case 'down': return { normal: [0, -1, 0], esquinas: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] };
    case 'south': return { normal: [0, 0, 1], esquinas: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] };
    case 'north': return { normal: [0, 0, -1], esquinas: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]] };
    case 'east': return { normal: [1, 0, 0], esquinas: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]] };
    case 'west': return { normal: [-1, 0, 0], esquinas: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] };
  }
}

export interface GeometriaUnida {
  /** xyz por vertice, en celdas (1 celda = 16 unidades del .bbmodel). Triangulos sin indice. */
  posiciones: Float32Array;
  normales: Float32Array;
  /** rgb por vertice (0 a 1), en el espacio que devuelva `colorDe`. */
  colores: Float32Array;
  vertices: number;
  cubos: number;
  caja: { min: Vec3; max: Vec3 };
}

/**
 * `colorDe(indice)` resuelve el indice de paleta a rgb 0..1. Si devuelve null,
 * la cara no se dibuja (por ejemplo, un pixel transparente).
 */
export function unirCubos(
  modelo: ModeloVoxel,
  colorDe: (indicePaleta: number) => Vec3 | null,
  escala = 1 / UNIDADES_BBMODEL_POR_CELDA,
): GeometriaUnida {
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  const agregarCubo = (cubo: CuboVoxel) => {
    const m = matrizRotacionZYX(cubo.rotacion);
    const a: Vec3 = [Math.min(cubo.desde[0], cubo.hasta[0]), Math.min(cubo.desde[1], cubo.hasta[1]), Math.min(cubo.desde[2], cubo.hasta[2])];
    const b: Vec3 = [Math.max(cubo.desde[0], cubo.hasta[0]), Math.max(cubo.desde[1], cubo.hasta[1]), Math.max(cubo.desde[2], cubo.hasta[2])];
    const o = cubo.origen;
    for (const cara of Object.keys(cubo.caras) as NombreCara[]) {
      const indice = cubo.caras[cara];
      if (indice === null) continue;
      const color = colorDe(indice);
      if (!color) continue;
      const { esquinas, normal } = esquinasCara(cara, a, b);
      const t = esquinas.map((p) => {
        const r = aplicar(m, [p[0] - o[0], p[1] - o[1], p[2] - o[2]]);
        return [(r[0] + o[0]) * escala, (r[1] + o[1]) * escala, (r[2] + o[2]) * escala] as Vec3;
      });
      const n = aplicar(m, normal);
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const p = t[k] as Vec3;
        pos.push(p[0], p[1], p[2]);
        nor.push(n[0], n[1], n[2]);
        col.push(color[0], color[1], color[2]);
        for (let e = 0; e < 3; e++) {
          if (p[e]! < min[e]!) min[e] = p[e]!;
          if (p[e]! > max[e]!) max[e] = p[e]!;
        }
      }
    }
  };
  modelo.cubos.forEach(agregarCubo);

  const vertices = pos.length / 3;
  return {
    posiciones: new Float32Array(pos),
    normales: new Float32Array(nor),
    colores: new Float32Array(col),
    vertices,
    cubos: modelo.cubos.length,
    caja: vertices > 0 ? { min, max } : { min: [0, 0, 0], max: [0, 0, 0] },
  };
}
