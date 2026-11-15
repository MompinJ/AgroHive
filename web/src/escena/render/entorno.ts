// Entorno decorativo de la escena en el laboratorio (modo fondo): una isla de pasto bajo la
// parcela, con borde de tierra, y vegetacion voxel alrededor segun el BIOMA de la parcela
// (palmeras en el tropico humedo, cactus en zonas aridas, pinos en el frio...). Es solo
// decoracion: no representa datos, no recibe clics ni cambia nada de lo que dice el motor.
// El bioma lo decide la interfaz. Todo va en un grupo que se reconstruye con cada modelo;
// geometrias y materiales se registran para liberarse en limpiar().

import * as THREE from 'three';
import { GROSOR_BASE, type EscenaModelo } from '../modelo';

export type Bioma = 'tropical_humedo' | 'tropical_seco' | 'arido' | 'templado' | 'frio';
export const BIOMA_DEFECTO: Bioma = 'tropical_humedo';

type TipoPlanta = 'palmera' | 'copaAncha' | 'arbolBajo' | 'arbusto' | 'matorral' | 'flor' | 'saguaro' | 'nopal' | 'pino' | 'roca' | 'nieve';

interface ConfigBioma {
  pasto: string;
  pastoOscuro: string;
  tierra: string;
  /** Plantas decorativas: tipo y cuantas (se escala un poco con la parcela). */
  vegetacion: [TipoPlanta, number][];
  /** Colores por tipo (la primera es la dominante). */
  colores: Partial<Record<TipoPlanta, string[]>>;
  luz: { cielo: string; suelo: string; hemisferica: number; sol: string; intensidadSol: number };
}

/** Colores y vegetacion de cada bioma `[PROPUESTA]` (solo apariencia). */
export const BIOMAS: Record<Bioma, ConfigBioma> = {
  tropical_humedo: {
    pasto: '#79b84f', pastoOscuro: '#5f9e3d', tierra: '#7d5a3a',
    vegetacion: [['palmera', 4], ['copaAncha', 5], ['arbusto', 8], ['flor', 10]],
    colores: { copaAncha: ['#3f8f3a', '#4fa443', '#2f7a33'], arbusto: ['#4f9a40', '#64b04c'], flor: ['#f2c14e', '#e9706b', '#f4f1e6', '#d96bb0'], palmera: ['#4aa04a', '#3a8a3c'] },
    luz: { cielo: '#d0f0ee', suelo: '#6f9a4a', hemisferica: 1.55, sol: '#fff0d8', intensidadSol: 1.45 },
  },
  tropical_seco: {
    pasto: '#a9b860', pastoOscuro: '#8fa04c', tierra: '#8c6a42',
    vegetacion: [['arbolBajo', 6], ['arbusto', 9], ['matorral', 6], ['flor', 4]],
    colores: { arbolBajo: ['#7d9a3c', '#8fa845', '#6a8a34'], arbusto: ['#8a9d48', '#a3ae58'], matorral: ['#9a9a5a', '#b0a868'], flor: ['#f2a03e', '#f2d24e'] },
    luz: { cielo: '#f3e6c8', suelo: '#9a8a4a', hemisferica: 1.5, sol: '#ffe6c0', intensidadSol: 1.55 },
  },
  arido: {
    pasto: '#d8c08a', pastoOscuro: '#c7a970', tierra: '#a8613d',
    vegetacion: [['saguaro', 4], ['nopal', 5], ['matorral', 8], ['roca', 6]],
    colores: { saguaro: ['#4f8a4a', '#5e9a55'], nopal: ['#6a9e4a', '#7aad55'], matorral: ['#a39a6a', '#8c8a5a'], roca: ['#b39a7a', '#9a8468'] },
    luz: { cielo: '#f6ead0', suelo: '#c8a874', hemisferica: 1.45, sol: '#ffe2b8', intensidadSol: 1.65 },
  },
  templado: {
    pasto: '#7fb05c', pastoOscuro: '#679a49', tierra: '#7a5a3e',
    vegetacion: [['copaAncha', 5], ['pino', 4], ['arbusto', 6], ['flor', 8]],
    colores: { copaAncha: ['#4f9a44', '#68ad4e', '#86b84c'], pino: ['#2f6a3a', '#3a7a44'], arbusto: ['#5a9a46', '#72ae55'], flor: ['#f4f1e6', '#e9a0c0', '#f2c14e'] },
    luz: { cielo: '#d8ecff', suelo: '#7a9a5a', hemisferica: 1.55, sol: '#fff6e6', intensidadSol: 1.4 },
  },
  frio: {
    pasto: '#8fa58a', pastoOscuro: '#7a907a', tierra: '#6e5e4e',
    vegetacion: [['pino', 9], ['roca', 5], ['nieve', 12]],
    colores: { pino: ['#22503a', '#2c5e44', '#1d4632'], roca: ['#9aa0a6', '#868c92'], nieve: ['#f4f7fa', '#e6eef4'] },
    luz: { cielo: '#e2eaf2', suelo: '#8a9a98', hemisferica: 1.6, sol: '#eef4ff', intensidadSol: 1.25 },
  },
};

/** Luz del entorno por defecto (tropical humedo). */
export const LUZ_ENTORNO = BIOMAS[BIOMA_DEFECTO].luz;

const TRONCO = '#7a5434';
const TRONCO_PALMERA = ['#a07a4e', '#8a6640'];

/** Pseudoaleatorio estable a partir de un entero (las posiciones no cambian entre cuadros). */
function azar(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Una caja de una planta: centro, tamano y giro locales (1 = tamano base), y su color. */
interface Pieza { o: [number, number, number]; t: [number, number, number]; r?: [number, number, number]; c: string }

/** Piezas de cada tipo de planta; `c` es el color dominante y `k` el de contraste. */
function piezasDe(tipo: TipoPlanta, c: string, k: string, n: number): Pieza[] {
  switch (tipo) {
    case 'copaAncha':
      return [
        { o: [0, 0.38, 0], t: [0.22, 0.75, 0.22], c: TRONCO },
        { o: [0, 0.95, 0], t: [1.05, 0.55, 1.05], c },
        { o: [0, 1.38, 0], t: [0.7, 0.42, 0.7], c: k },
      ];
    case 'palmera': {
      const p: Pieza[] = [
        { o: [0, 0.45, 0], t: [0.16, 0.9, 0.16], c: TRONCO_PALMERA[0]! },
        { o: [0.04, 1.2, 0], t: [0.15, 0.6, 0.15], r: [0, 0, -0.12], c: TRONCO_PALMERA[1]! },
        { o: [0.08, 1.52, 0], t: [0.2, 0.14, 0.2], c: '#6a8a34' },
      ];
      // Cuatro frondas largas que caen desde la copa, y dos cocos.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + n * 0.7;
        p.push({ o: [0.08 + Math.cos(a) * 0.36, 1.48, Math.sin(a) * 0.36], t: [0.7, 0.05, 0.2], r: [0, -a, -0.45], c: i % 2 ? c : k });
      }
      p.push({ o: [0.16, 1.4, 0.06], t: [0.09, 0.09, 0.09], c: '#6b4a2a' }, { o: [0.02, 1.4, -0.08], t: [0.09, 0.09, 0.09], c: '#6b4a2a' });
      return p;
    }
    case 'arbolBajo':
      return [
        { o: [0, 0.3, 0], t: [0.16, 0.6, 0.16], c: TRONCO },
        { o: [0.12, 0.62, 0], t: [0.1, 0.25, 0.1], r: [0, 0, -0.6], c: TRONCO },
        { o: [0, 0.78, 0], t: [1.2, 0.22, 0.95], c },
        { o: [0.1, 0.92, 0.05], t: [0.75, 0.16, 0.6], c: k },
      ];
    case 'arbusto':
      return [{ o: [0, 0.2, 0], t: [0.62, 0.4, 0.62], c }, { o: [0.12, 0.42, -0.06], t: [0.36, 0.22, 0.36], c: k }];
    case 'matorral':
      return [
        { o: [-0.1, 0.1, 0], t: [0.3, 0.2, 0.3], c },
        { o: [0.13, 0.08, 0.1], t: [0.24, 0.16, 0.24], c: k },
        { o: [0.02, 0.18, -0.12], t: [0.2, 0.18, 0.2], c },
      ];
    case 'flor':
      return [{ o: [0, 0.06, 0], t: [0.04, 0.12, 0.04], c: '#4f8a3a' }, { o: [0, 0.14, 0], t: [0.12, 0.08, 0.12], c }];
    case 'saguaro':
      return [
        { o: [0, 0.75, 0], t: [0.24, 1.5, 0.24], c },
        { o: [0.25, 0.7, 0], t: [0.28, 0.16, 0.16], c: k },
        { o: [0.34, 0.98, 0], t: [0.16, 0.5, 0.16], c },
        { o: [-0.22, 0.95, 0], t: [0.24, 0.15, 0.15], c: k },
        { o: [-0.3, 1.15, 0], t: [0.15, 0.4, 0.15], c },
        { o: [0, 1.52, 0], t: [0.14, 0.05, 0.14], c: '#f2d24e' },
      ];
    case 'nopal':
      return [
        { o: [0, 0.22, 0], t: [0.32, 0.42, 0.08], c },
        { o: [0.2, 0.52, 0], t: [0.28, 0.36, 0.07], r: [0, 0, -0.35], c: k },
        { o: [-0.18, 0.5, 0.02], t: [0.26, 0.32, 0.07], r: [0, 0.4, 0.3], c },
        { o: [0.25, 0.74, 0], t: [0.07, 0.07, 0.07], c: '#d9466a' },
      ];
    case 'pino':
      return [
        { o: [0, 0.2, 0], t: [0.16, 0.4, 0.16], c: TRONCO },
        { o: [0, 0.55, 0], t: [0.95, 0.45, 0.95], c },
        { o: [0, 0.95, 0], t: [0.68, 0.42, 0.68], c: k },
        { o: [0, 1.3, 0], t: [0.42, 0.4, 0.42], c },
        { o: [0, 1.58, 0], t: [0.16, 0.22, 0.16], c: k },
      ];
    case 'roca':
      return [{ o: [0, 0.12, 0], t: [0.5, 0.26, 0.42], c }, { o: [0.12, 0.28, 0.04], t: [0.28, 0.14, 0.24], c: k }];
    case 'nieve':
      return [{ o: [0, 0.012, 0], t: [0.9, 0.025, 0.6], c }, { o: [0.3, 0.02, 0.2], t: [0.4, 0.03, 0.35], c: k }];
  }
}

/** Tamano relativo de cada tipo y si va en el anillo cercano (bajo) o lejano (alto). */
const ESCALA_TIPO: Record<TipoPlanta, number> = {
  palmera: 1.05, copaAncha: 1, arbolBajo: 0.95, arbusto: 0.9, matorral: 0.8, flor: 1.2, saguaro: 1, nopal: 0.9, pino: 1, roca: 0.8, nieve: 1.1,
};

export function crearEntorno(modelo: EscenaModelo, registrar: <T extends { dispose(): void }>(r: T) => T, bioma: Bioma = BIOMA_DEFECTO): THREE.Group {
  const config = BIOMAS[bioma] ?? BIOMAS[BIOMA_DEFECTO];
  const grupo = new THREE.Group();
  grupo.name = 'entorno';
  const medioX = Math.max(modelo.columnas, 1) / 2;
  const medioZ = Math.max(modelo.filas, 1) / 2;
  const radioParcela = Math.hypot(medioX, medioZ);
  const radio = radioParcela * 1.12 + 1.35;
  const yPasto = -GROSOR_BASE - 0.01;

  // Isla: cilindro de 12 lados, cara de pasto arriba y tierra a los lados (look de diorama).
  const alto = 0.55;
  const isla = registrar(new THREE.CylinderGeometry(radio, radio * 0.94, alto, 12, 1).translate(0, yPasto - alto / 2, 0));
  const matTierra = registrar(new THREE.MeshLambertMaterial({ color: config.tierra, flatShading: true }));
  const matPasto = registrar(new THREE.MeshLambertMaterial({ color: config.pasto, flatShading: true }));
  const mallaIsla = new THREE.Mesh(isla, [matTierra, matPasto, matTierra]);
  mallaIsla.name = 'entorno-isla';
  grupo.add(mallaIsla);

  // Anillo exterior en otro tono: da profundidad sin texturas.
  const anillo = registrar(new THREE.RingGeometry(radio * 0.78, radio * 0.995, 12, 1).rotateX(-Math.PI / 2).translate(0, yPasto + 0.004, 0));
  const matAnillo = registrar(new THREE.MeshLambertMaterial({ color: config.pastoOscuro, flatShading: true }));
  grupo.add(new THREE.Mesh(anillo, matAnillo));

  // Posiciones fuera de la parcela (el radio minimo supera su diagonal), repartidas en circulo;
  // las que quedarian justo delante de la camara inicial (+x +z) pasan al lado opuesto.
  const lugar = (k: number, total: number, sesgo: number, bajo: boolean) => {
    const ang = ((k + azar(k * 7 + sesgo) * 0.7) / total) * Math.PI * 2 + sesgo;
    let dx = Math.cos(ang);
    let dz = Math.sin(ang);
    if (!bajo && dx + dz > 0.7) { dx = -dx; dz = -dz; }
    const r = radioParcela + 0.55 + azar(k * 13 + sesgo) * Math.max(0.15, radio - radioParcela - 0.95);
    return new THREE.Vector3(dx * r, yPasto, dz * r);
  };

  const escala = THREE.MathUtils.clamp(radioParcela / 3, 0.42, 2.2);
  const extra = Math.round(radioParcela / 4);
  // Todas las cajas de todas las plantas en una sola malla instanciada (un draw call).
  const instancias: { m: THREE.Matrix4; c: string }[] = [];
  const planta = new THREE.Matrix4();
  const local = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  config.vegetacion.forEach(([tipo, base], t) => {
    const total = Math.min(base + extra, base * 2);
    const colores = config.colores[tipo] ?? ['#5a9a46'];
    const bajo = tipo === 'flor' || tipo === 'nieve' || tipo === 'roca' || tipo === 'matorral';
    for (let k = 0; k < total; k++) {
      const p = lugar(k, total, 1 + t * 19, bajo);
      const s = escala * ESCALA_TIPO[tipo] * (0.8 + azar(k * 3 + t) * 0.45);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), azar(k * 5 + t) * Math.PI * 2);
      planta.compose(p, q, new THREE.Vector3(s, s, s));
      const c = colores[k % colores.length]!;
      const k2 = colores[(k + 1) % colores.length]!;
      for (const pz of piezasDe(tipo, c, k2, k)) {
        const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(pz.r ?? [0, 0, 0])));
        local.compose(new THREE.Vector3(...pz.o), rot, new THREE.Vector3(...pz.t));
        instancias.push({ m: planta.clone().multiply(local), c: pz.c });
      }
    }
  });
  if (instancias.length > 0) {
    const caja = registrar(new THREE.BoxGeometry(1, 1, 1));
    const mat = registrar(new THREE.MeshLambertMaterial());
    const malla = new THREE.InstancedMesh(caja, mat, instancias.length);
    const color = new THREE.Color();
    instancias.forEach((x, i) => {
      malla.setMatrixAt(i, x.m);
      malla.setColorAt(i, color.set(x.c));
    });
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.computeBoundingSphere();
    malla.name = `entorno-vegetacion-${bioma}`;
    grupo.add(malla);
    // Las instancias se liberan con el grupo (limpiar() solo libera las del primer nivel de raiz).
    registrar({ dispose: () => malla.dispose() });
  }
  return grupo;
}
