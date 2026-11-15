// Piezas de medio cuadrado de la escena 3D (bordes diagonales, [DECIDIDO] Mompin 14/11 noche).
// La escena solo representa lo que entrega el contrato: la forma de cada bloque sale de
// parcela.celdas[].forma (geo/forma-celda.ts la calcula al generar la cuadricula). Aqui solo
// se decide como se dibuja: la columna de suelo es un prisma triangular, las plantas y losas
// se recortan por la diagonal (voxel/media.ts) y la placa y el banderin se mueven a la mitad
// que queda. Todo lo que no es three puro vive aqui para tocar poco escena-three.ts.

import * as THREE from 'three';
import type { FormaCelda, Triangulo } from '../../geo/forma-celda';
import type { BloqueEscena } from '../modelo';

/** Signo de la esquina del angulo recto en la escena (x este, z sur). */
const ESQUINA: Record<Triangulo, readonly [number, number]> = {
  SO: [-1, 1],
  SE: [1, 1],
  NE: [1, -1],
  NO: [-1, -1],
};

/**
 * Giro alrededor de +Y que lleva el prisma canonico (SO) a la forma pedida. Con la rotacion de
 * three (x' = x cos + z sen, z' = -x sen + z cos), 90 grados lleva la esquina SO a la SE.
 */
export function giroForma(forma: Triangulo): number {
  return { SO: 0, SE: 1, NE: 2, NO: 3 }[forma] * (Math.PI / 2);
}

export const esMedia = (forma: FormaCelda): forma is Triangulo => forma !== 'completa';

/**
 * Prisma de la mitad suroeste de la caja unidad (x y z de -0.5 a 0.5, y de 0 a 1), como la
 * caja de la columna de suelo: se escala y se coloca igual. uv de la tapa por x y z y de los
 * lados por largo y alto, para que la textura de huecos se vea como en la caja.
 */
export function geometriaPrisma(): THREE.BufferGeometry {
  const SO = [-0.5, 0.5];
  const SE = [0.5, 0.5];
  const NO = [-0.5, -0.5];
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const tri = (ps: number[][], n: number[], uvs: number[][]) => {
    ps.forEach((p, k) => {
      pos.push(p[0]!, p[1]!, p[2]!);
      nor.push(n[0]!, n[1]!, n[2]!);
      uv.push(uvs[k]![0]!, uvs[k]![1]!);
    });
  };
  const uvTapa = (x: number, z: number) => [x + 0.5, 0.5 - z];
  const p3 = ([x, z]: number[], y: number) => [x!, y, z!];
  // Tapa de arriba y de abajo (antihorario visto desde fuera).
  tri([p3(SO, 1), p3(SE, 1), p3(NO, 1)], [0, 1, 0], [uvTapa(-0.5, 0.5), uvTapa(0.5, 0.5), uvTapa(-0.5, -0.5)]);
  tri([p3(SO, 0), p3(NO, 0), p3(SE, 0)], [0, -1, 0], [uvTapa(-0.5, 0.5), uvTapa(-0.5, -0.5), uvTapa(0.5, 0.5)]);
  // Lado como rectangulo de a a b (vistos desde fuera, a a la izquierda).
  const lado = (a: number[], b: number[], n: number[], largo: number) => {
    tri([p3(a, 0), p3(b, 0), p3(b, 1)], n, [[0, 0], [largo, 0], [largo, 1]]);
    tri([p3(a, 0), p3(b, 1), p3(a, 1)], n, [[0, 0], [largo, 1], [0, 1]]);
  };
  lado(SO, SE, [0, 0, 1], 1); // sur
  lado(NO, SO, [-1, 0, 0], 1); // oeste
  lado(SE, NO, [Math.SQRT1_2, 0, -Math.SQRT1_2], Math.SQRT2); // diagonal
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  geo.computeBoundingSphere();
  return geo;
}

/** Lado de la placa de estado en medio cuadrado, en celdas `[PROPUESTA]`: cabe en el triangulo con margen. */
export const LADO_PLACA_MEDIA = 0.42;
const MARGEN_PLACA_MEDIA = 0.04;

/**
 * Placa de estado en una celda: en medio cuadrado se achica (0.42 en vez de 0.6, la misma
 * textura con sus iconos y patrones) y se corre hacia la esquina del angulo recto para que
 * quede dentro del triangulo. Completa: centrada y del tamano de siempre.
 */
export function placaEnCelda(forma: FormaCelda, ladoPlaca: number): { dx: number; dz: number; escala: number } {
  if (!esMedia(forma)) return { dx: 0, dz: 0, escala: 1 };
  const [sx, sz] = ESQUINA[forma];
  const d = 0.5 - MARGEN_PLACA_MEDIA - LADO_PLACA_MEDIA / 2;
  return { dx: sx * d, dz: sz * d, escala: LADO_PLACA_MEDIA / ladoPlaca };
}

/**
 * Banderin de "no recomendado": en la esquina noroeste en celda completa (como siempre); en
 * medio cuadrado, en la esquina del angulo recto, con la bandera hacia adentro de la celda.
 */
export function banderinEnCelda(forma: FormaCelda): { dx: number; dz: number; giro: number } {
  if (!esMedia(forma)) return { dx: -0.42, dz: -0.42, giro: 0 };
  const [sx, sz] = ESQUINA[forma];
  return { dx: sx * 0.42, dz: sz * 0.42, giro: sx > 0 ? Math.PI : 0 };
}

/** Separa bloques completos y de medio cuadrado, con la forma de cada uno. */
export function porForma<T extends Pick<BloqueEscena, 'forma'>>(bloques: readonly T[]): Map<FormaCelda, T[]> {
  const grupos = new Map<FormaCelda, T[]>();
  for (const b of bloques) grupos.set(b.forma, [...(grupos.get(b.forma) ?? []), b]);
  return grupos;
}
