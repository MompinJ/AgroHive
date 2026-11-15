// Plagas visibles en la escena: insectos voxel sobre las plantas de las celdas que la interfaz
// marca como atacadas, hojas mordidas alrededor y una nube breve de insecticida al rociar.
// ILUSTRATIVO: no cambia el modelo de la escena ni los datos del motor; solo dibuja lo que la
// interfaz le pasa. Los insectos no entran al raycast (no roban el clic de la celda).

import * as THREE from 'three';

export type TipoPlaga = 'chapulin' | 'gusano' | 'mosca' | 'escarabajo' | 'pulgon';
export interface PlagaCelda { tipo: TipoPlaga; comiendo: boolean }

export const NOMBRES_PLAGA: Record<TipoPlaga, string> = {
  chapulin: 'Chapulín', gusano: 'Gusano', mosca: 'Mosca blanca', escarabajo: 'Escarabajo', pulgon: 'Pulgón',
};

/** Punto de apoyo de una celda: centro y cara superior del bloque (con losa). */
export interface ApoyoCelda { celdaId: string; x: number; y: number; z: number }

interface Pieza { insecto: number; offset: THREE.Vector3; rot: THREE.Quaternion; tam: THREE.Vector3; segmento: number }
interface Insecto { tipo: TipoPlaga; base: THREE.Vector3; yaw: number; fase: number }

function azar(n: number): number {
  const x = Math.sin(n * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
}
const rotZ = (r: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), r);
const SIN_ROT = new THREE.Quaternion();
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Piezas (cajas) de cada insecto en su espacio local: mira a +x, 1 = lado de la celda. */
const FORMAS: Record<TipoPlaga, { o: THREE.Vector3; t: THREE.Vector3; r?: THREE.Quaternion; c: string; seg?: number }[]> = {
  chapulin: [
    { o: v(0, 0.035, 0), t: v(0.15, 0.05, 0.05), c: '#c4b83a' },
    { o: v(0.09, 0.05, 0), t: v(0.05, 0.05, 0.045), c: '#8a5a8f' },
    { o: v(0.11, 0.06, 0.012), t: v(0.012, 0.012, 0.012), c: '#1e2a18' },
    { o: v(-0.01, 0.06, 0.035), t: v(0.13, 0.016, 0.016), r: rotZ(0.6), c: '#5a3d1f' },
    { o: v(-0.01, 0.06, -0.035), t: v(0.13, 0.016, 0.016), r: rotZ(0.6), c: '#5a3d1f' },
    { o: v(0.05, 0.012, 0.03), t: v(0.012, 0.03, 0.012), c: '#5a3d1f' },
    { o: v(0.05, 0.012, -0.03), t: v(0.012, 0.03, 0.012), c: '#5a3d1f' },
  ],
  gusano: [0, 1, 2, 3, 4, 5].map((i) => ({ o: v(i * 0.03 - 0.075, 0.016, 0), t: v(0.032, 0.032, 0.034), c: i === 5 ? '#5c3a1c' : i % 2 ? '#7aa83c' : '#8fbf4a', seg: i })),
  mosca: [
    { o: v(0, 0, 0), t: v(0.035, 0.022, 0.022), c: '#f6f6f2' },
    { o: v(-0.004, 0.016, 0.018), t: v(0.03, 0.006, 0.026), c: '#ffffff' },
    { o: v(-0.004, 0.016, -0.018), t: v(0.03, 0.006, 0.026), c: '#ffffff' },
  ],
  escarabajo: [
    { o: v(0, 0.025, 0), t: v(0.11, 0.045, 0.08), c: '#b5c23a' },
    { o: v(0.07, 0.02, 0), t: v(0.035, 0.03, 0.05), c: '#3b3a1e' },
    { o: v(-0.015, 0.05, 0.02), t: v(0.022, 0.006, 0.02), c: '#2a2a16' },
    { o: v(0.02, 0.05, -0.018), t: v(0.022, 0.006, 0.02), c: '#2a2a16' },
    { o: v(-0.035, 0.05, -0.012), t: v(0.02, 0.006, 0.018), c: '#2a2a16' },
  ],
  pulgon: [0, 1, 2, 3, 4, 5, 6].map((i) => ({ o: v((azar(i) - 0.5) * 0.09, azar(i + 9) * 0.03, (azar(i + 4) - 0.5) * 0.09), t: v(0.022, 0.018, 0.018), c: i % 3 ? '#9ccf5a' : '#7fb542' })),
};
/** Cuantos insectos por celda y a que altura sobre el bloque se posan. */
const CUANTOS: Record<TipoPlaga, number> = { chapulin: 3, gusano: 2, mosca: 4, escarabajo: 2, pulgon: 2 };
/** Insectos mas grandes que a escala para que se vean desde la vista normal (dibujo, no tamano real). */
const AUMENTO = 1.8;
const ALTURA: Record<TipoPlaga, number> = { chapulin: 0.28, gusano: 0.22, mosca: 0.5, escarabajo: 0.24, pulgon: 0.34 };
const MORDIDAS = ['#7a4f2a', '#9a6a35', '#6b5a2a'];
/** Tope de insectos dibujados en toda la parcela (rendimiento). */
const TOPE_INSECTOS = 480;

export class PlagasEscena {
  readonly grupo = new THREE.Group();
  private malla: THREE.InstancedMesh | null = null;
  private mordidas: THREE.InstancedMesh | null = null;
  private piezas: Pieza[] = [];
  private insectos: Insecto[] = [];
  private readonly geo = new THREE.BoxGeometry(1, 1, 1);
  private readonly mat = new THREE.MeshLambertMaterial();

  /** Tope de insectos de toda la parcela; lo fija el nivel de graficos. */
  private tope = TOPE_INSECTOS;
  setTope(n: number) { this.tope = Math.max(0, Math.floor(n)); }

  constructor() { this.grupo.name = 'plagas'; }

  /** Rehace los insectos de las celdas atacadas (comiendo = true); las protegidas no llevan nada. */
  construir(apoyos: readonly ApoyoCelda[], plagas: ReadonlyMap<string, PlagaCelda> | null) {
    this.vaciar();
    if (!plagas || plagas.size === 0) return;
    const color = new THREE.Color();
    const piezasColor: string[] = [];
    const mordidas: { p: THREE.Vector3; t: number; c: string }[] = [];
    let n = 0;
    for (const a of apoyos) {
      const plaga = plagas.get(a.celdaId);
      if (!plaga?.comiendo) continue;
      const semilla = [...a.celdaId].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) % 9973;
      for (let k = 0; k < CUANTOS[plaga.tipo] && n < this.tope; k++, n++) {
        const ang = azar(semilla + k * 17) * Math.PI * 2;
        const r = 0.12 + azar(semilla + k * 5) * 0.16;
        const base = v(a.x + Math.cos(ang) * r, a.y + ALTURA[plaga.tipo] + azar(semilla + k) * 0.08, a.z + Math.sin(ang) * r);
        const idx = this.insectos.length;
        this.insectos.push({ tipo: plaga.tipo, base, yaw: azar(semilla + k * 3) * Math.PI * 2, fase: azar(semilla + k * 11) * 10 });
        for (const f of FORMAS[plaga.tipo]) {
          this.piezas.push({ insecto: idx, offset: f.o.clone().multiplyScalar(AUMENTO), rot: f.r ?? SIN_ROT, tam: f.t.clone().multiplyScalar(AUMENTO), segmento: f.seg ?? 0 });
          piezasColor.push(f.c);
        }
      }
      // Hojas mordidas: cubitos cafes en la base de la planta y alguno en el aire.
      for (let k = 0; k < 6; k++) {
        const ang = azar(semilla + 40 + k) * Math.PI * 2;
        const r = 0.08 + azar(semilla + 60 + k) * 0.3;
        const alto = k < 4 ? 0.015 : 0.12 + azar(semilla + 80 + k) * 0.2;
        mordidas.push({ p: v(a.x + Math.cos(ang) * r, a.y + alto, a.z + Math.sin(ang) * r), t: 0.03 + azar(semilla + k) * 0.025, c: MORDIDAS[k % MORDIDAS.length]! });
      }
    }
    if (this.piezas.length > 0) {
      this.malla = new THREE.InstancedMesh(this.geo, this.mat, this.piezas.length);
      this.malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      piezasColor.forEach((c, i) => this.malla!.setColorAt(i, color.set(c)));
      if (this.malla.instanceColor) this.malla.instanceColor.needsUpdate = true;
      this.malla.frustumCulled = false;
      this.malla.name = 'plagas-insectos';
      this.grupo.add(this.malla);
      this.animar(0, false);
    }
    if (mordidas.length > 0) {
      this.mordidas = new THREE.InstancedMesh(this.geo, this.mat, mordidas.length);
      const m = new THREE.Matrix4();
      mordidas.forEach((d, i) => {
        m.compose(d.p, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4 * i, 0.9 * i, 0.2 * i)), v(d.t, d.t * 0.5, d.t));
        this.mordidas!.setMatrixAt(i, m);
        this.mordidas!.setColorAt(i, color.set(d.c));
      });
      this.mordidas.instanceMatrix.needsUpdate = true;
      if (this.mordidas.instanceColor) this.mordidas.instanceColor.needsUpdate = true;
      this.mordidas.computeBoundingSphere();
      this.mordidas.name = 'plagas-mordidas';
      this.grupo.add(this.mordidas);
    }
  }

  /** true si hay insectos que se pueden mover. */
  hayInsectos(): boolean {
    return this.piezas.length > 0;
  }

  /** Coloca cada pieza; con `mover` los insectos se mueven (saltos, ondas, revoloteo). */
  animar(t: number, mover: boolean) {
    const malla = this.malla;
    if (!malla) return;
    const m = new THREE.Matrix4();
    const qIns = new THREE.Quaternion();
    const pieza = new THREE.Matrix4();
    const yUp = v(0, 1, 0);
    const posIns: THREE.Vector3[] = [];
    const rotIns: THREE.Quaternion[] = [];
    for (const ins of this.insectos) {
      const p = ins.base.clone();
      let yaw = ins.yaw;
      if (mover) {
        const f = t + ins.fase;
        if (ins.tipo === 'chapulin') {
          // Saltitos: arco breve cada ~1.6 s, con un pequeno avance.
          const ciclo = (f % 1.6) / 1.6;
          const salto = ciclo < 0.22 ? Math.sin((ciclo / 0.22) * Math.PI) : 0;
          p.y += salto * 0.09;
          p.x += Math.cos(ins.yaw) * salto * 0.03;
          p.z -= Math.sin(ins.yaw) * salto * 0.03;
        } else if (ins.tipo === 'mosca') {
          // Revoloteo alrededor de su punto.
          p.x += Math.cos(f * 3.1) * 0.07;
          p.z += Math.sin(f * 2.3) * 0.07;
          p.y += Math.sin(f * 5.7) * 0.03;
          yaw = -f * 3.1;
        } else if (ins.tipo === 'escarabajo') {
          p.x += Math.cos(f * 0.6) * 0.02;
          p.z += Math.sin(f * 0.6) * 0.02;
          yaw += Math.sin(f * 0.6) * 0.6;
        } else if (ins.tipo === 'gusano') {
          yaw += Math.sin(f * 0.8) * 0.3;
        }
      }
      posIns.push(p);
      rotIns.push(qIns.setFromAxisAngle(yUp, yaw).clone());
    }
    this.piezas.forEach((pz, i) => {
      const ins = this.insectos[pz.insecto]!;
      const o = pz.offset.clone();
      if (mover && ins.tipo === 'gusano') o.y += Math.max(0, Math.sin((t + ins.fase) * 5 - pz.segmento * 0.9)) * 0.025;
      if (mover && ins.tipo === 'pulgon') o.y += Math.sin((t + ins.fase) * 2 + i) * 0.004;
      pieza.compose(o, pz.rot, pz.tam);
      m.compose(posIns[pz.insecto]!, rotIns[pz.insecto]!, v(1, 1, 1)).multiply(pieza);
      malla.setMatrixAt(i, m);
    });
    malla.instanceMatrix.needsUpdate = true;
  }

  private vaciar() {
    this.malla?.removeFromParent();
    this.malla?.dispose();
    this.mordidas?.removeFromParent();
    this.mordidas?.dispose();
    this.malla = null;
    this.mordidas = null;
    this.piezas = [];
    this.insectos = [];
  }

  dispose() {
    this.vaciar();
    this.grupo.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}

/** Duracion de la nube de insecticida (ms). */
export const DURACION_ROCIADO_MS = 1100;

/** Nube breve de insecticida: cubitos blancos y celestes que suben y se desvanecen. */
export class Rociado {
  readonly grupo = new THREE.Group();
  private malla: THREE.InstancedMesh | null = null;
  private inicio = 0;
  private particulas: { p: THREE.Vector3; vel: THREE.Vector3; tam: number }[] = [];
  private readonly geo = new THREE.BoxGeometry(1, 1, 1);
  private readonly mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0.85 });
  private estatico = false;

  constructor() { this.grupo.name = 'rociado'; }

  empezar(apoyos: readonly ApoyoCelda[], ahora: number, reducirMovimiento: boolean) {
    this.terminar();
    const color = new THREE.Color();
    for (const a of apoyos.slice(0, 200)) {
      const s = [...a.celdaId].reduce((x, ch) => x * 31 + ch.charCodeAt(0), 3) % 7919;
      for (let k = 0; k < 14; k++) {
        this.particulas.push({
          p: v(a.x + (azar(s + k) - 0.5) * 0.8, a.y + 0.25 + azar(s + k * 7) * 0.35, a.z + (azar(s + k * 3) - 0.5) * 0.8),
          vel: v((azar(s + k * 5) - 0.5) * 0.25, 0.35 + azar(s + k * 9) * 0.35, (azar(s + k * 11) - 0.5) * 0.25),
          tam: 0.05 + azar(s + k * 13) * 0.06,
        });
      }
    }
    if (!this.particulas.length) return;
    this.malla = new THREE.InstancedMesh(this.geo, this.mat, this.particulas.length);
    this.particulas.forEach((_, i) => this.malla!.setColorAt(i, color.set(i % 3 ? '#e9f6ff' : '#a9d8f2')));
    if (this.malla.instanceColor) this.malla.instanceColor.needsUpdate = true;
    this.malla.frustumCulled = false;
    this.malla.renderOrder = 5;
    this.grupo.add(this.malla);
    this.inicio = ahora;
    this.estatico = reducirMovimiento;
    this.avanzar(ahora);
  }

  /** Avanza la nube; devuelve true mientras siga visible. */
  avanzar(ahora: number): boolean {
    const malla = this.malla;
    if (!malla) return false;
    const t = (ahora - this.inicio) / DURACION_ROCIADO_MS;
    if (t >= 1) { this.terminar(); return false; }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    // Con reducir movimiento: la nube queda quieta y solo se desvanece al final (destello breve).
    const avance = this.estatico ? 0 : t;
    this.particulas.forEach((pt, i) => {
      const p = pt.p.clone().addScaledVector(pt.vel, avance);
      const crece = this.estatico ? 1 : 0.6 + avance * 0.9;
      m.compose(p, q, v(pt.tam * crece, pt.tam * crece, pt.tam * crece));
      malla.setMatrixAt(i, m);
    });
    malla.instanceMatrix.needsUpdate = true;
    this.mat.opacity = this.estatico ? 0.7 : 0.85 * (1 - t * t);
    return true;
  }

  activo(): boolean {
    return !!this.malla;
  }

  terminar() {
    this.malla?.removeFromParent();
    this.malla?.dispose();
    this.malla = null;
    this.particulas = [];
  }

  dispose() {
    this.terminar();
    this.grupo.removeFromParent();
    this.geo.dispose();
    this.mat.dispose();
  }
}
