// Ambiente vivo del laboratorio (solo con la opcion entorno): bandadas de aves voxel que
// cruzan el cielo de vez en cuando y rafagas de viento sobre el campo. DECORATIVO: no
// representa datos del motor, no recibe clics y no se anima con "reducir movimiento"
// (escena-three lo oculta). Todo es instanciado o un solo LineSegments con shader.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Aves por bandada y duracion de cada cruce y del ciclo completo (s) `[PROPUESTA]`. */
const AVES = 4;
const CRUCE_S = 9;
const CICLO_S = 21;
const RAFAGAS = 48;

function azar(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function caja(ancho: number, alto: number, fondo: number, x: number, y: number, z: number, color: string): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(ancho, alto, fondo).translate(x, y, z).toNonIndexed();
  const c = new THREE.Color(color);
  const n = g.getAttribute('position').count;
  const colores = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colores.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colores, 3));
  return g;
}

/** Ave mirando a +x: cuerpo, cabeza y pico; las alas van aparte para aletear. */
function geometriaCuerpo(): THREE.BufferGeometry {
  return mergeGeometries([
    caja(0.34, 0.12, 0.12, 0, 0, 0, '#3d4652'),
    caja(0.12, 0.11, 0.11, 0.2, 0.04, 0, '#2e353f'),
    caja(0.07, 0.03, 0.03, 0.29, 0.03, 0, '#e3a33b'),
    caja(0.1, 0.03, 0.12, -0.21, 0.02, 0, '#2e353f'),
  ])!;
}
/** Ala con su bisagra en z = 0 (se rota sobre x para aletear). */
function geometriaAla(): THREE.BufferGeometry {
  return mergeGeometries([caja(0.16, 0.025, 0.3, 0, 0, 0.15, '#4d5866'), caja(0.1, 0.02, 0.12, -0.02, 0, 0.33, '#5d6977')])!;
}

export class Ambiente {
  readonly grupo = new THREE.Group();
  private readonly cuerpos: THREE.InstancedMesh;
  private readonly alas: THREE.InstancedMesh;
  private readonly viento: THREE.LineSegments;
  private readonly uniformes = { uTiempo: { value: 0 }, uRadio: { value: 4 }, uAlto: { value: 1.5 } };
  private readonly recursos: { dispose(): void }[] = [];

  constructor(private readonly radio: number, private readonly altoCielo: number, private readonly escala: number) {
    this.grupo.name = 'ambiente';
    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    const cuerpo = geometriaCuerpo();
    const ala = geometriaAla();
    this.recursos.push(material, cuerpo, ala);
    this.cuerpos = new THREE.InstancedMesh(cuerpo, material, AVES);
    this.alas = new THREE.InstancedMesh(ala, material, AVES * 2);
    for (const m of [this.cuerpos, this.alas]) {
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.grupo.add(m);
    }
    this.viento = this.crearViento();
    this.grupo.add(this.viento);
    this.uniformes.uRadio.value = radio;
    this.uniformes.uAlto.value = Math.max(0.8, escala * 1.6);
  }

  /** Rafagas: trazos blancos cortos que avanzan con el viento y se desvanecen en los extremos. */
  private crearViento(): THREE.LineSegments {
    const semillas = new Float32Array(RAFAGAS * 2 * 3);
    const extremos = new Float32Array(RAFAGAS * 2);
    for (let k = 0; k < RAFAGAS; k++) {
      for (let e = 0; e < 2; e++) {
        semillas.set([azar(k * 3 + 1), azar(k * 3 + 2), azar(k * 3 + 3)], (k * 2 + e) * 3);
        extremos[k * 2 + e] = e;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RAFAGAS * 2 * 3), 3));
    geo.setAttribute('aSemilla', new THREE.BufferAttribute(semillas, 3));
    geo.setAttribute('aExtremo', new THREE.BufferAttribute(extremos, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniformes,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        uniform float uTiempo;
        uniform float uRadio;
        uniform float uAlto;
        attribute vec3 aSemilla;
        attribute float aExtremo;
        varying float vAlfa;
        void main() {
          // Avance a lo largo de la diagonal (viento del noreste), con lazo sobre la isla.
          float vel = 0.35 + aSemilla.z * 0.25;
          float d = fract(aSemilla.x + uTiempo * vel / (2.0 * uRadio));
          float largo = 0.35 + aSemilla.z * 0.4;
          float a = (d - 0.5) * 2.0 * uRadio + aExtremo * largo;
          float lado = (aSemilla.y - 0.5) * 1.6 * uRadio;
          vec3 dir = normalize(vec3(-1.0, 0.0, 0.6));
          vec3 perp = vec3(-dir.z, 0.0, dir.x);
          float ola = sin(a * 1.7 + uTiempo * 1.3 + aSemilla.y * 6.0) * 0.12;
          float y = 0.15 + aSemilla.z * uAlto + ola;
          vec3 p = dir * a + perp * (lado + ola * 0.5) + vec3(0.0, y, 0.0);
          // Se desvanece al entrar y salir del recorrido y en la cola del trazo.
          vAlfa = smoothstep(0.0, 0.18, d) * (1.0 - smoothstep(0.82, 1.0, d)) * mix(0.15, 0.6, aExtremo);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `
        varying float vAlfa;
        void main() { gl_FragColor = vec4(1.0, 1.0, 1.0, vAlfa); }`,
    });
    this.recursos.push(geo, mat);
    const lineas = new THREE.LineSegments(geo, mat);
    lineas.frustumCulled = false;
    lineas.renderOrder = 4;
    lineas.name = 'ambiente-viento';
    return lineas;
  }

  /** Coloca aves y viento para el tiempo t (s). */
  actualizar(t: number) {
    this.uniformes.uTiempo.value = t;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const qAla = new THREE.Quaternion();
    const eje = new THREE.Vector3(1, 0, 0);
    const s = this.escala;
    const vuelta = Math.floor(t / CICLO_S);
    const enCiclo = t - vuelta * CICLO_S;
    const volando = enCiclo < CRUCE_S;
    this.cuerpos.visible = volando;
    this.alas.visible = volando;
    if (!volando) return;
    // Cada cruce sale de un rumbo distinto, alto y corrido hacia el fondo de la isla, para no
    // tapar la parcela mucho tiempo.
    const rumbo = azar(vuelta + 7) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(rumbo), 0, Math.sin(rumbo));
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const corrimiento = (azar(vuelta + 13) - 0.5) * this.radio * 0.8 - this.radio * 0.25;
    const avance = (enCiclo / CRUCE_S - 0.5) * this.radio * 3.2;
    const yaw = Math.atan2(-dir.z, dir.x);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    for (let k = 0; k < AVES; k++) {
      // Formacion en V: la primera al frente, las demas atras y a los lados.
      const fila = Math.ceil(k / 2);
      const ladoV = k === 0 ? 0 : k % 2 ? 1 : -1;
      const p = dir.clone().multiplyScalar(avance - fila * 0.55 * s)
        .add(perp.clone().multiplyScalar(corrimiento + ladoV * fila * 0.45 * s))
        .add(new THREE.Vector3(-1, 0, -1).multiplyScalar(this.radio * 0.25));
      p.y = this.altoCielo + Math.sin(t * 1.1 + k) * 0.08 * s + fila * 0.05;
      const tam = s * (0.9 + azar(k + 3) * 0.2);
      m.compose(p, q, new THREE.Vector3(tam, tam, tam));
      this.cuerpos.setMatrixAt(k, m);
      const aleteo = Math.sin(t * 9 + k * 1.7) * 0.75;
      for (const [i, signo] of [[0, 1], [1, -1]] as const) {
        qAla.setFromAxisAngle(eje, signo * aleteo).premultiply(q);
        const espejo = new THREE.Vector3(tam, tam, signo * tam);
        m.compose(p.clone().add(new THREE.Vector3(0, 0.04 * tam, 0)), qAla, espejo);
        this.alas.setMatrixAt(k * 2 + i, m);
      }
    }
    this.cuerpos.instanceMatrix.needsUpdate = true;
    this.alas.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.grupo.removeFromParent();
    this.cuerpos.dispose();
    this.alas.dispose();
    for (const r of this.recursos) r.dispose();
  }
}
