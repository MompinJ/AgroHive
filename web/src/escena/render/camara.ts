// Camara de la escena al estilo de los juegos de granja y colonias en 3D (Timberborn, Anno,
// Townscaper; Hay Day en movil): arrastrar desplaza sobre el suelo, el boton derecho o dos
// dedos giran, la rueda o el pellizco acercan hacia el cursor y la inclinacion va ligada al
// zoom (lejos, casi desde arriba; cerca, mas de lado). Teclado: WASD o flechas desplazan,
// Q y E giran 45 grados, + y - acercan, Inicio restablece. Solo mueve la camara: no decide
// nada de lo que se dibuja.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 5;
/** Inclinacion (desde la vertical) con el zoom minimo y con el maximo `[PROPUESTA]`. */
const POLAR_LEJOS = THREE.MathUtils.degToRad(42);
const POLAR_CERCA = THREE.MathUtils.degToRad(66);
const AZIMUT_INICIAL = Math.PI / 4;
const DISTANCIA = 30;
const DURACION_MS = 420;
/** Celdas por segundo al desplazar con teclado, con zoom 1. */
const VELOCIDAD_TECLADO = 6;

const TECLAS_MOVER: Record<string, [number, number]> = {
  w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
  a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0],
};

/** Inclinacion desde la vertical para un zoom (interpolada en escala logaritmica). */
export function polarDeZoom(zoom: number): number {
  const t = THREE.MathUtils.clamp((Math.log(zoom) - Math.log(ZOOM_MIN)) / (Math.log(ZOOM_MAX) - Math.log(ZOOM_MIN)), 0, 1);
  return POLAR_LEJOS + (POLAR_CERCA - POLAR_LEJOS) * t;
}

/** Diferencia angular mas corta de a hacia b, en radianes. */
function diferenciaAngular(a: number, b: number): number {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}
const suave = (t: number) => 1 - Math.pow(1 - t, 3);

interface Vuelo {
  inicio: number;
  desdeObjetivo: THREE.Vector3; haciaObjetivo: THREE.Vector3;
  desdeAzimut: number; deltaAzimut: number;
  desdeZoom: number; haciaZoom: number;
}

export class CamaraGranja {
  readonly controles: OrbitControls;
  private readonly teclas = new Set<string>();
  /** Vista de antes de enfocar una celda (para volver al salir) y marca de cambio propio. */
  private vistaGuardada: { objetivo: THREE.Vector3; azimut: number; zoom: number } | null = null;
  private propio = false;
  private vuelo: Vuelo | null = null;
  private ultimoPaso = 0;
  private limites = { x: 4, z: 4 };
  private reducirMovimiento = false;
  private ultimoAzimutAvisado = Number.NaN;

  constructor(
    private readonly camara: THREE.OrthographicCamera,
    private readonly lienzo: HTMLCanvasElement,
    private readonly pedirCuadro: () => void,
    private readonly onAzimut?: (grados: number) => void,
  ) {
    this.controles = new OrbitControls(camara, lienzo);
    this.controles.enablePan = true;
    // Desplazar sobre el suelo (plano XZ), no en el plano de la pantalla.
    this.controles.screenSpacePanning = false;
    this.controles.zoomToCursor = true;
    this.controles.minZoom = ZOOM_MIN;
    this.controles.maxZoom = ZOOM_MAX;
    this.controles.zoomSpeed = 0.9;
    this.controles.rotateSpeed = 0.7;
    this.fijarInclinacion();
    // Un cambio que no viene de un vuelo propio es del usuario: olvida la vista guardada para no
    // jalarlo de regreso de sorpresa al salir de una celda.
    this.controles.addEventListener('change', () => {
      if (!this.propio) this.vistaGuardada = null;
      this.pedirCuadro();
    });
    lienzo.addEventListener('keydown', this.alBajarTecla);
    lienzo.addEventListener('keyup', this.alSubirTecla);
    lienzo.addEventListener('blur', this.alPerderFoco);
  }

  /** Movimiento reducido: sin inercia ni vuelos animados. Pincel: el boton principal pinta. */
  configurar({ reducirMovimiento, pincel }: { reducirMovimiento: boolean; pincel: boolean }) {
    this.reducirMovimiento = reducirMovimiento;
    this.controles.enableDamping = !reducirMovimiento;
    this.controles.dampingFactor = 0.12;
    if (pincel) {
      this.controles.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE };
      this.controles.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };
    } else {
      this.controles.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE };
      this.controles.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    }
    if (reducirMovimiento && this.vuelo) this.terminarVuelo();
  }

  /** Limites del desplazamiento: la parcela (en celdas) mas un margen. */
  fijarLimites(columnas: number, filas: number) {
    this.limites = { x: columnas / 2 + 1, z: filas / 2 + 1 };
    this.acotar();
  }

  azimut(): number {
    return this.controles.getAzimuthalAngle();
  }

  /** Vista inicial: parcela al centro, casi isometrica, norte al fondo. */
  restablecer(animar = true) {
    this.vistaGuardada = null;
    this.volar(new THREE.Vector3(0, 0, 0), AZIMUT_INICIAL, 1, animar);
  }

  /** Gira alrededor del punto que se mira (positivo = contra reloj visto desde arriba). */
  girar(grados: number, animar = true) {
    this.vistaGuardada = null;
    const destino = this.vuelo ? this.vuelo.desdeAzimut + this.vuelo.deltaAzimut : this.azimut();
    this.volar(this.vuelo?.haciaObjetivo ?? this.controles.target.clone(), destino + THREE.MathUtils.degToRad(grados), this.vuelo?.haciaZoom ?? this.camara.zoom, animar);
  }

  acercar(factor: number, animar = true) {
    this.vistaGuardada = null;
    const zoom = THREE.MathUtils.clamp((this.vuelo?.haciaZoom ?? this.camara.zoom) * factor, ZOOM_MIN, ZOOM_MAX);
    this.volar(this.vuelo?.haciaObjetivo ?? this.controles.target.clone(), this.vuelo ? this.vuelo.desdeAzimut + this.vuelo.deltaAzimut : this.azimut(), zoom, animar);
  }

  /** Vuela hacia un punto (doble clic en una celda) y acerca si estaba lejos. */
  enfocar(punto: THREE.Vector3, zoomMinimo = 2.4) {
    this.volar(punto.clone(), this.azimut(), Math.max(this.camara.zoom, zoomMinimo), true);
  }

  /**
   * Enfoca una celda elegida guardando la vista de antes (solo la primera vez: al pasar de una
   * celda a otra se conserva la vista original). volverVista() regresa a ella.
   */
  enfocarCelda(punto: THREE.Vector3, zoomMinimo = 2.4) {
    if (!this.vistaGuardada) {
      this.vistaGuardada = {
        objetivo: (this.vuelo?.haciaObjetivo ?? this.controles.target).clone(),
        azimut: this.vuelo ? this.vuelo.desdeAzimut + this.vuelo.deltaAzimut : this.azimut(),
        zoom: this.vuelo?.haciaZoom ?? this.camara.zoom,
      };
    }
    const azimut = this.vuelo ? this.vuelo.desdeAzimut + this.vuelo.deltaAzimut : this.azimut();
    this.volar(punto.clone(), azimut, Math.max(this.vistaGuardada.zoom, zoomMinimo), true);
  }

  /** Regresa a la vista de antes del primer enfoque; false si no habia (o el usuario se movio). */
  volverVista(): boolean {
    const v = this.vistaGuardada;
    if (!v) return false;
    this.vistaGuardada = null;
    this.volar(v.objetivo.clone(), v.azimut, v.zoom, true);
    return true;
  }

  /** Hay una vista guardada a la que volver. */
  tieneVistaGuardada(): boolean {
    return this.vistaGuardada !== null;
  }

  /**
   * Un paso por cuadro: teclado, vuelo, inclinacion segun zoom, inercia y limites.
   * Devuelve true si la camara se sigue moviendo (render bajo demanda).
   */
  paso(ahora: number): boolean {
    const dt = this.ultimoPaso ? Math.min(0.05, (ahora - this.ultimoPaso) / 1000) : 0;
    this.ultimoPaso = ahora;
    let moviendo = false;

    // Teclado: desplazamiento continuo relativo a hacia donde mira la camara.
    let dx = 0; let dz = 0;
    for (const t of this.teclas) { const v = TECLAS_MOVER[t]; if (v) { dx += v[0]; dz += v[1]; } }
    if (dx || dz) {
      const a = this.azimut();
      const paso = (VELOCIDAD_TECLADO * dt) / this.camara.zoom;
      const adelante = new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a));
      const derecha = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
      const d = adelante.multiplyScalar(dz).add(derecha.multiplyScalar(dx)).normalize().multiplyScalar(paso);
      this.controles.target.add(d);
      this.camara.position.add(d);
      this.vuelo = null;
      moviendo = true;
    }

    const enVuelo = !!this.vuelo;
    if (this.vuelo) {
      const v = this.vuelo;
      const t = Math.min(1, (ahora - v.inicio) / DURACION_MS);
      const k = suave(t);
      this.colocar(
        v.desdeObjetivo.clone().lerp(v.haciaObjetivo, k),
        v.desdeAzimut + v.deltaAzimut * k,
        THREE.MathUtils.lerp(v.desdeZoom, v.haciaZoom, k),
      );
      if (t >= 1) this.vuelo = null; else moviendo = true;
    }

    this.fijarInclinacion();
    this.propio = enVuelo;
    const inercia = this.controles.update();
    this.propio = false;
    this.acotar();
    this.avisarAzimut();
    return moviendo || (this.controles.enableDamping && inercia);
  }

  dispose() {
    this.lienzo.removeEventListener('keydown', this.alBajarTecla);
    this.lienzo.removeEventListener('keyup', this.alSubirTecla);
    this.lienzo.removeEventListener('blur', this.alPerderFoco);
    this.controles.dispose();
  }

  // ------------------------------------------------------------------ interno

  private volar(objetivo: THREE.Vector3, azimut: number, zoom: number, animar: boolean) {
    objetivo.x = THREE.MathUtils.clamp(objetivo.x, -this.limites.x, this.limites.x);
    objetivo.z = THREE.MathUtils.clamp(objetivo.z, -this.limites.z, this.limites.z);
    zoom = THREE.MathUtils.clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    if (!animar || this.reducirMovimiento) {
      this.vuelo = null;
      this.colocar(objetivo, azimut, zoom);
      this.propio = true;
      this.controles.update();
      this.propio = false;
      this.avisarAzimut();
      this.pedirCuadro();
      return;
    }
    const desde = this.azimut();
    this.vuelo = {
      inicio: performance.now(),
      desdeObjetivo: this.controles.target.clone(), haciaObjetivo: objetivo,
      desdeAzimut: desde, deltaAzimut: diferenciaAngular(desde, azimut),
      desdeZoom: this.camara.zoom, haciaZoom: zoom,
    };
    this.pedirCuadro();
  }

  private terminarVuelo() {
    const v = this.vuelo;
    if (!v) return;
    this.vuelo = null;
    this.colocar(v.haciaObjetivo, v.desdeAzimut + v.deltaAzimut, v.haciaZoom);
  }

  /** Pone la camara mirando `objetivo` desde el azimut dado, con la inclinacion de su zoom. */
  private colocar(objetivo: THREE.Vector3, azimut: number, zoom: number) {
    const polar = polarDeZoom(zoom);
    this.controles.target.copy(objetivo);
    this.camara.position.set(
      objetivo.x + DISTANCIA * Math.sin(polar) * Math.sin(azimut),
      objetivo.y + DISTANCIA * Math.cos(polar),
      objetivo.z + DISTANCIA * Math.sin(polar) * Math.cos(azimut),
    );
    this.camara.zoom = zoom;
    this.camara.updateProjectionMatrix();
    this.fijarInclinacion();
  }

  /** La inclinacion no se arrastra: sigue al zoom, como en los juegos de granja. */
  private fijarInclinacion() {
    const polar = polarDeZoom(this.camara.zoom);
    this.controles.minPolarAngle = polar;
    this.controles.maxPolarAngle = polar;
  }

  /** Mantiene el punto que se mira sobre la parcela; la camara se corre lo mismo. */
  private acotar() {
    const t = this.controles.target;
    const x = THREE.MathUtils.clamp(t.x, -this.limites.x, this.limites.x);
    const z = THREE.MathUtils.clamp(t.z, -this.limites.z, this.limites.z);
    if (x === t.x && z === t.z) return;
    this.camara.position.x += x - t.x;
    this.camara.position.z += z - t.z;
    t.x = x; t.z = z;
  }

  private avisarAzimut() {
    if (!this.onAzimut) return;
    const grados = Math.round(THREE.MathUtils.radToDeg(this.azimut()));
    if (grados !== this.ultimoAzimutAvisado) {
      this.ultimoAzimutAvisado = grados;
      this.onAzimut(grados);
    }
  }

  private readonly alBajarTecla = (ev: KeyboardEvent) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const k = ev.key.toLowerCase();
    // Mayusculas + flechas eligen la celda vecina (EscenaParcela), no mueven la camara.
    if (ev.shiftKey && k.startsWith('arrow')) return;
    if (TECLAS_MOVER[k]) {
      ev.preventDefault();
      if (!this.teclas.has(k)) { this.teclas.add(k); this.ultimoPaso = 0; this.pedirCuadro(); }
      return;
    }
    if (ev.repeat) return;
    const acciones: Record<string, () => void> = {
      q: () => this.girar(-45), e: () => this.girar(45),
      '+': () => this.acercar(1.4), '=': () => this.acercar(1.4), '-': () => this.acercar(1 / 1.4),
      home: () => this.restablecer(),
    };
    const accion = acciones[k];
    if (accion) { ev.preventDefault(); accion(); }
  };

  private readonly alSubirTecla = (ev: KeyboardEvent) => {
    this.teclas.delete(ev.key.toLowerCase());
  };

  private readonly alPerderFoco = () => {
    this.teclas.clear();
  };
}
