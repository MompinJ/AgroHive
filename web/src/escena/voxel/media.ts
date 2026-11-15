// Medio cuadrado de un modelo voxel (bordes diagonales, [DECIDIDO] Mompin 14/11 noche).
// En vez de modelar cada cultivo dos veces, se recorta en el render cualquier .bbmodel
// (bloque de 24 cubos, losa de suelo o detallado) por la diagonal de la celda: cada cubo se
// corta exactamente con el plano vertical de la diagonal y el corte se tapa con el color de
// una cara lateral del mismo cubo. No se configura por cultivo: sirve para los que ya estan
// y para los que lleguen con las convenciones de doc 07. Puro: devuelve los mismos arreglos
// que unirCubos (GeometriaUnida).
//
// Ejes del .bbmodel (doc 07): +X al este, +Z al frente, que en la escena es el sur
// (el adaptador pone el norte en -z). La celda va de -8 a 8 en x y z.

import type { Triangulo } from '../../geo/forma-celda';
import { UNIDADES_BBMODEL_POR_CELDA } from '../modelo';
import type { CuboVoxel, ModeloVoxel, NombreCara, Vec3 } from './bbmodel';
import { aplicar, esquinasCara, matrizRotacionZYX, type GeometriaUnida } from './geometria';

/**
 * Semiplano que se conserva, a * x + c * z <= 0 (x este, z sur), por la esquina del angulo
 * recto: SO conserva la esquina (-8, 8), SE la (8, 8), NE la (8, -8) y NO la (-8, -8).
 */
export const SEMIPLANO: Record<Triangulo, readonly [number, number]> = {
  SO: [1, -1],
  NE: [-1, 1],
  NO: [1, 1],
  SE: [-1, -1],
};

const LATERALES: readonly NombreCara[] = ['north', 'south', 'east', 'west', 'up'];
const EPS = 1e-9;

/** Recorta un poligono 3D con el semiplano f(p) <= 0 (Sutherland-Hodgman). */
function recortar(pol: readonly Vec3[], f: (p: Vec3) => number): Vec3[] {
  const salida: Vec3[] = [];
  for (let k = 0; k < pol.length; k++) {
    const p = pol[k]!;
    const q = pol[(k + 1) % pol.length]!;
    const fp = f(p);
    const fq = f(q);
    if (fp <= EPS) salida.push(p);
    if ((fp < -EPS && fq > EPS) || (fp > EPS && fq < -EPS)) {
      const t = fp / (fp - fq);
      salida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2])]);
    }
  }
  return salida;
}

const resta = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Une los cubos del modelo como unirCubos, pero solo la mitad `forma` de la celda: los cubos
 * de la otra mitad se descartan, los que cruzan la diagonal se cortan y se tapan.
 */
export function unirCubosMedia(
  modelo: ModeloVoxel,
  colorDe: (indicePaleta: number) => Vec3 | null,
  forma: Triangulo,
  escala = 1 / UNIDADES_BBMODEL_POR_CELDA,
): GeometriaUnida {
  const [a, c] = SEMIPLANO[forma];
  const f = (p: Vec3) => a * p[0] + c * p[2];
  const normalCorte: Vec3 = [a / Math.SQRT2, 0, c / Math.SQRT2];
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let cubos = 0;

  const triangulo = (p0: Vec3, p1: Vec3, p2: Vec3, n: Vec3, color: Vec3) => {
    for (const p of [p0, p1, p2]) {
      const e: Vec3 = [p[0] * escala, p[1] * escala, p[2] * escala];
      pos.push(e[0], e[1], e[2]);
      nor.push(n[0], n[1], n[2]);
      col.push(color[0], color[1], color[2]);
      for (let k = 0; k < 3; k++) {
        if (e[k]! < min[k]!) min[k] = e[k]!;
        if (e[k]! > max[k]!) max[k] = e[k]!;
      }
    }
  };
  const abanico = (pol: readonly Vec3[], n: Vec3, color: Vec3) => {
    for (let k = 1; k + 1 < pol.length; k++) triangulo(pol[0]!, pol[k]!, pol[k + 1]!, n, color);
  };

  const agregarCubo = (cubo: CuboVoxel) => {
    const m = matrizRotacionZYX(cubo.rotacion);
    const lo: Vec3 = [Math.min(cubo.desde[0], cubo.hasta[0]), Math.min(cubo.desde[1], cubo.hasta[1]), Math.min(cubo.desde[2], cubo.hasta[2])];
    const hi: Vec3 = [Math.max(cubo.desde[0], cubo.hasta[0]), Math.max(cubo.desde[1], cubo.hasta[1]), Math.max(cubo.desde[2], cubo.hasta[2])];
    const o = cubo.origen;
    const mover = (p: Vec3): Vec3 => {
      const r = aplicar(m, [p[0] - o[0], p[1] - o[1], p[2] - o[2]]);
      return [r[0] + o[0], r[1] + o[1], r[2] + o[2]];
    };
    // Las 8 esquinas del cubo ya giradas: si todas caen del lado que se descarta, fuera.
    const esq: Vec3[] = [];
    for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) esq.push(mover([x, y, z]));
    const valores = esq.map(f);
    if (valores.every((v) => v >= -EPS)) return;
    const corta = valores.some((v) => v > EPS);
    let colorCorte: Vec3 | null = null;
    for (const cara of Object.keys(cubo.caras) as NombreCara[]) {
      const indice = cubo.caras[cara];
      if (indice === null) continue;
      const color = colorDe(indice);
      if (!color) continue;
      if (!colorCorte && LATERALES.includes(cara)) colorCorte = color;
      const { esquinas, normal } = esquinasCara(cara, lo, hi);
      const t = esquinas.map(mover);
      const quedan = corta ? recortar(t, f) : t;
      if (quedan.length >= 3) abanico(quedan, aplicar(m, normal), color);
    }
    cubos++;
    if (!corta || !colorCorte) return;
    // Tapa del corte: puntos donde las aristas del cubo cruzan el plano (y esquinas sobre el).
    const aristas: [number, number][] = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      // Esquinas indexadas por bits (x: 4, y: 2, z: 1): son arista si difieren en un bit.
      const d = i ^ j;
      if (d === 1 || d === 2 || d === 4) aristas.push([i, j]);
    }
    const cruces: Vec3[] = esq.filter((_, k) => Math.abs(valores[k]!) <= EPS);
    for (const [i, j] of aristas) {
      const vi = valores[i]!;
      const vj = valores[j]!;
      if ((vi < -EPS && vj > EPS) || (vi > EPS && vj < -EPS)) {
        const t = vi / (vi - vj);
        const p = esq[i]!;
        const q = esq[j]!;
        cruces.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), p[2] + t * (q[2] - p[2])]);
      }
    }
    if (cruces.length < 3) return;
    // Ordenar alrededor del centro en la base (u, v) del plano y tapar antihorario visto desde fuera.
    const centro: Vec3 = [0, 0, 0];
    for (const p of cruces) for (let k = 0; k < 3; k++) centro[k] = centro[k]! + p[k]! / cruces.length;
    const u: Vec3 = [-normalCorte[2], 0, normalCorte[0]];
    const v: Vec3 = [0, 1, 0];
    const orden = cruces
      .map((p) => ({ p, ang: Math.atan2(punto(resta(p, centro), v), punto(resta(p, centro), u)) }))
      .sort((x, y) => x.ang - y.ang)
      .map((x) => x.p);
    const n = cruz(resta(orden[1]!, orden[0]!), resta(orden[2]!, orden[0]!));
    if (punto(n, normalCorte) < 0) orden.reverse();
    abanico(orden, normalCorte, colorCorte);
  };
  modelo.cubos.forEach(agregarCubo);

  const vertices = pos.length / 3;
  return {
    posiciones: new Float32Array(pos),
    normales: new Float32Array(nor),
    colores: new Float32Array(col),
    vertices,
    cubos,
    caja: vertices > 0 ? { min, max } : { min: [0, 0, 0], max: [0, 0, 0] },
  };
}
