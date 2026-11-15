// Entorno decorativo de la escena en el laboratorio (modo fondo): una isla de pasto bajo la
// parcela, con borde de tierra, y algunos arboles y arbustos voxel alrededor. Es solo
// decoracion: no representa datos, no recibe clics ni cambia nada de lo que dice el motor.
// Todo va en un grupo que se reconstruye con cada modelo; geometrias y materiales se
// registran para liberarse en limpiar().

import * as THREE from 'three';
import { GROSOR_BASE, type EscenaModelo } from '../modelo';

/** Paleta del entorno (tonos de granja, saturacion media). */
const PASTO = '#86b45a';
const PASTO_OSCURO = '#6f9c48';
const TIERRA = '#8a6440';
const TRONCO = '#7a5434';
const COPAS = ['#4f8f3a', '#5fa143', '#3f7d33', '#6aa84a'];
const ARBUSTOS = ['#5b9a40', '#6fae4c', '#4e8a37'];
const FLORES = ['#f2c14e', '#e98a6b', '#f4f1e6'];

/** Pseudoaleatorio estable a partir de un entero (las posiciones no cambian entre cuadros). */
function azar(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function crearEntorno(modelo: EscenaModelo, registrar: <T extends { dispose(): void }>(r: T) => T): THREE.Group {
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
  const matTierra = registrar(new THREE.MeshLambertMaterial({ color: TIERRA, flatShading: true }));
  const matPasto = registrar(new THREE.MeshLambertMaterial({ color: PASTO, flatShading: true }));
  const mallaIsla = new THREE.Mesh(isla, [matTierra, matPasto, matTierra]);
  mallaIsla.name = 'entorno-isla';
  grupo.add(mallaIsla);

  // Anillo exterior de pasto mas oscuro: da profundidad sin texturas.
  const anillo = registrar(new THREE.RingGeometry(radio * 0.78, radio * 0.995, 12, 1).rotateX(-Math.PI / 2).translate(0, yPasto + 0.004, 0));
  const matAnillo = registrar(new THREE.MeshLambertMaterial({ color: PASTO_OSCURO, flatShading: true }));
  grupo.add(new THREE.Mesh(anillo, matAnillo));

  // Posiciones fuera de la parcela (el radio minimo supera su diagonal), repartidas en circulo;
  // las que quedarian justo delante de la camara inicial (+x +z) pasan al lado opuesto.
  const lugar = (k: number, total: number, sesgo: number) => {
    const ang = ((k + azar(k * 7 + sesgo) * 0.7) / total) * Math.PI * 2 + sesgo;
    let dx = Math.cos(ang);
    let dz = Math.sin(ang);
    if (dx + dz > 0.7) { dx = -dx; dz = -dz; }
    const r = radioParcela + 0.55 + azar(k * 13 + sesgo) * Math.max(0.15, radio - radioParcela - 0.95);
    return new THREE.Vector3(dx * r, yPasto, dz * r);
  };

  const escala = THREE.MathUtils.clamp(radioParcela / 3, 0.42, 2.2);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const color = new THREE.Color();

  // Arboles: tronco y dos cubos de copa.
  const nArboles = Math.min(10, 6 + Math.round(radioParcela / 4));
  const caja = registrar(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const matTronco = registrar(new THREE.MeshLambertMaterial({ color: TRONCO }));
  const matCopa = registrar(new THREE.MeshLambertMaterial());
  const troncos = new THREE.InstancedMesh(caja, matTronco, nArboles);
  const copas = new THREE.InstancedMesh(caja, matCopa, nArboles * 2);
  for (let k = 0; k < nArboles; k++) {
    const p = lugar(k, nArboles, 1);
    const s = escala * (0.8 + azar(k * 3) * 0.5);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), azar(k * 5) * Math.PI);
    m.compose(p, q, new THREE.Vector3(0.22 * s, 0.75 * s, 0.22 * s));
    troncos.setMatrixAt(k, m);
    m.compose(p.clone().setY(p.y + 0.62 * s), q, new THREE.Vector3(0.95 * s, 0.7 * s, 0.95 * s));
    copas.setMatrixAt(k * 2, m);
    copas.setColorAt(k * 2, color.set(COPAS[k % COPAS.length]!));
    m.compose(p.clone().setY(p.y + 1.25 * s), q, new THREE.Vector3(0.6 * s, 0.45 * s, 0.6 * s));
    copas.setMatrixAt(k * 2 + 1, m);
    copas.setColorAt(k * 2 + 1, color.set(COPAS[(k + 1) % COPAS.length]!));
  }
  for (const malla of [troncos, copas]) {
    malla.instanceMatrix.needsUpdate = true;
    if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
    malla.computeBoundingSphere();
    grupo.add(malla);
  }

  // Arbustos y flores: cubos bajos.
  const nArbustos = 8;
  const nFlores = 10;
  const matBajo = registrar(new THREE.MeshLambertMaterial());
  const bajos = new THREE.InstancedMesh(caja, matBajo, nArbustos + nFlores);
  for (let k = 0; k < nArbustos; k++) {
    const p = lugar(k, nArbustos, 31);
    const s = escala * (0.6 + azar(k * 11) * 0.4);
    m.compose(p, q.identity(), new THREE.Vector3(0.6 * s, 0.4 * s, 0.6 * s));
    bajos.setMatrixAt(k, m);
    bajos.setColorAt(k, color.set(ARBUSTOS[k % ARBUSTOS.length]!));
  }
  for (let k = 0; k < nFlores; k++) {
    const p = lugar(k, nFlores, 57);
    const s = escala * 0.16;
    m.compose(p, q.identity(), new THREE.Vector3(s, s * 1.2, s));
    bajos.setMatrixAt(nArbustos + k, m);
    bajos.setColorAt(nArbustos + k, color.set(FLORES[k % FLORES.length]!));
  }
  bajos.instanceMatrix.needsUpdate = true;
  if (bajos.instanceColor) bajos.instanceColor.needsUpdate = true;
  bajos.computeBoundingSphere();
  grupo.add(bajos);

  // Las instancias se liberan con el grupo (limpiar() solo libera las del primer nivel de raiz).
  registrar({ dispose: () => { troncos.dispose(); copas.dispose(); bajos.dispose(); } });
  return grupo;
}

/** Colores de luz con entorno: cielo celeste y suelo verdoso; sol apenas calido. */
export const LUZ_ENTORNO = { cielo: '#d4ecff', suelo: '#7e9a52', hemisferica: 1.55, sol: '#fff0d8', intensidadSol: 1.45 } as const;
