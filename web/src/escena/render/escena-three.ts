// Render three.js de la escena (A3.1 terreno + A3.2 plantas). Solo dibuja el
// EscenaModelo que arma el adaptador: no decide etapa, estado ni valores.
// Rendimiento (doc 08): un InstancedMesh por tipo (suelo, huecos, una placa por
// estado, una planta por cultivo + etapa), render bajo demanda (sin bucle
// continuo) y opcion de reducir movimiento.

import * as THREE from 'three';
import { CamaraGranja } from './camara';
import { ESTILO_SIN_ELEVACION, ESTILOS_ESTADO } from '../estilos-estado';
import { GROSOR_BASE, type BloqueEscena, type EscenaModelo, type EstadoVisual } from '../modelo';
import { rgbaPlaca } from '../placa';
import { colorSuelo } from '../suelo';
import type { ModeloVoxel, Vec3 } from '../voxel/bbmodel';
import { AMPLITUD_VIENTO, DURACION_TRANSICION_MS, escalaInicial, interpolar, saleEncogiendo, type PlantaPrevia } from '../animacion';
import { agruparPorModelo, claveModelo, escalaPorAvance, giroCelda, giroSurcos, modeloRespaldo } from '../voxel/catalogo';
import { bloqueProvisional, claveBloque } from '../voxel/bloque';
import { cargarModelo, MODELOS_DISPONIBLES } from '../voxel/fuente-modelos';
import { unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng, type ColorPaleta } from '../voxel/paleta-png';

export class ErrorWebGL extends Error {
  constructor() {
    super('WebGL no esta disponible en este navegador o equipo.');
    this.name = 'ErrorWebGL';
  }
}

export interface OpcionesRender {
  reducirMovimiento: boolean;
  onSeleccion?: (bloque: BloqueEscena | null) => void;
  /** Perdida y recuperacion del contexto WebGL (el navegador puede quitarlo con poca memoria). */
  onContexto?: (estado: 'perdido' | 'restaurado') => void;
  /** Viento leve en las plantas (A5.1, deseable). Nunca con reducirMovimiento. */
  viento?: boolean;
  /** Lugar de la mascota (modelos/props/mascota_feliz.bbmodel); apagado si no existe el modelo. */
  mascota?: boolean;
  /** Al pasar el cursor (solo raton): bloque bajo el cursor y su posicion dentro del lienzo, en px. */
  onHover?: (bloque: BloqueEscena | null, x: number, y: number) => void;
  /** Avisos del render (por ejemplo, modelo de respaldo o .bbmodel que no se pudo leer). */
  onAviso?: (codigo: string, mensaje: string) => void;
  /**
   * Brocha (PAINT_BLOCK, doc 06): con el pincel activo, el boton principal (o un dedo) pinta
   * en vez de girar; girar pasa al boton derecho (o a dos dedos). Solo informa que bloques
   * toco el trazo: quien decide el cultivo de cada celda es el plan, y el motor lo evalua.
   */
  pincel?: boolean;
  /**
   * Corrimiento del centro de la vista, en px de pantalla (paneles flotantes encima del lienzo):
   * x positivo mueve la parcela a la derecha, y positivo la sube. Por defecto, centrada.
   */
  desplazamiento?: { x: number; y: number };
  /** Azimut de la camara en grados (para la brujula); se avisa solo cuando cambia. */
  onAzimut?: (grados: number) => void;
  onPintar?: (bloque: BloqueEscena | null, fase: 'inicio' | 'trazo' | 'fin') => void;
}

export interface EstadisticasRender {
  /** Draw calls del ultimo cuadro (uno por InstancedMesh visible). */
  drawCalls: number;
  triangulos: number;
  mallas: number;
  instancias: number;
  /** Cuadros dibujados desde que se creo la escena (render bajo demanda: no crece en reposo). */
  cuadros: number;
  ultimoCuadroMs: number;
  /** false con "reducir movimiento": la camara no sigue moviendose al soltar. */
  inercia: boolean;
  /** Transiciones de plantas en curso (A5.1). */
  transiciones: number;
  viento: boolean;
  /** Lluvia animandose ahora; gotas dibujadas. */
  lluvia: boolean;
  gotas: number;
  mascota: boolean;
  contextoPerdido: boolean;
  /** Desglose acumulado: cuadros dibujados por cada motivo que los pidio (un cuadro puede tener varios). */
  cuadrosPorMotivo: Partial<Record<MotivoCuadro, number>>;
  solicitudesPorMotivo: Partial<Record<MotivoCuadro, number>>;
}

export type MotivoCuadro =
  | 'visible'
  | 'controles'
  | 'opciones'
  | 'vista'
  | 'seleccion'
  | 'terreno'
  | 'losas'
  | 'plantas'
  | 'mascota'
  | 'pestana'
  | 'contexto'
  | 'lluvia'
  | 'tamano'
  | 'inercia'
  | 'transicion'
  | 'viento'
  | 'lluvia-animada'
  | 'pintura'
  | 'camara';

/** Hueco de una celda sin elevacion: por debajo del punto mas bajo, nunca "a nivel cero". */
const TOPE_HUECO = -GROSOR_BASE * 0.6;
/** Losas de suelo (A2.12): cuerpo de 2 unidades bajo su cara superior y detalle de hasta 1 unidad encima. */
const CUERPO_LOSA = 2 / 16;
/** Altura maxima del detallado en la celda elegida, en veces la del manchon `[PROPUESTA]`. */
const FACTOR_ALTO_DETALLE = 1.6;
const DETALLE_LOSA = 1 / 16;
const LADO_BLOQUE = 0.96;
/**
 * Lado de la placa de estado en celdas `[DECIDIDO]` (Mompin, 14/11): 0.6 para que alrededor
 * se vea la losa de suelo y su humedad. La textura no cambia (mismos iconos y patrones, con
 * los minimos de daltonismo.ts y el contraste verificado); solo ocupa menos de la cara.
 */
const LADO_PLACA_ESCENA = 0.6;

function texturaDe(estilo: Parameters<typeof rgbaPlaca>[0]): THREE.DataTexture {
  const img = rgbaPlaca(estilo);
  // DataTexture pone la primera fila abajo (v = 0): se invierten las filas.
  const fila = img.ancho * 4;
  const datos = new Uint8Array(img.datos.length);
  for (let y = 0; y < img.alto; y++) datos.set(img.datos.subarray(y * fila, (y + 1) * fila), (img.alto - 1 - y) * fila);
  const t = new THREE.DataTexture(datos, img.ancho, img.alto, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

function soportaWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}

interface MetaPlantas {
  clave: string;
  /** Modelo detallado que se muestra en la celda elegida. */
  tipoDetallado: 'bbmodel' | 'respaldo';
  celdas: string[];
  pos: THREE.Vector3[];
  rot: THREE.Quaternion[];
}

interface Transicion {
  mesh: THREE.InstancedMesh;
  meta: MetaPlantas;
  desde: number[];
  hasta: number[];
  inicio: number;
  /** true: planta que sale (se encoge y se elimina al terminar). */
  sale: boolean;
}

/**
 * Material de las plantas con viento leve en el shader (A5.1): cada instancia se mece con
 * una fase segun su posicion, mas arriba mas, y nada con amplitud 0 (reducir movimiento).
 */
function crearMaterialPlantas(uniformes: { uTiempo: { value: number }; uAmplitud: { value: number } }): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms['uTiempo'] = uniformes.uTiempo;
    shader.uniforms['uAmplitud'] = uniformes.uAmplitud;
    shader.vertexShader = 'uniform float uTiempo;\nuniform float uAmplitud;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float fase = instanceMatrix[3][0] * 1.7 + instanceMatrix[3][2] * 2.3;
        float alto = max(transformed.y, 0.0);
        transformed.x += sin(uTiempo * 1.6 + fase) * uAmplitud * alto * alto;
        transformed.z += cos(uTiempo * 1.3 + fase) * uAmplitud * 0.6 * alto * alto;
      #endif`,
    );
  };
  return mat;
}

/** Gotas maximas con la lluvia mas fuerte (intensidad 1). */
const GOTAS_MAXIMAS = 1800;

/**
 * Lluvia en un solo LineSegments: cada gota es un segmento cuya caida calcula el shader
 * con uTiempo (sin tocar memoria en cada cuadro). La caja se ajusta a la parcela.
 */
function crearLluvia() {
  const n = GOTAS_MAXIMAS;
  const semillas = new Float32Array(n * 2 * 3);
  const extremos = new Float32Array(n * 2);
  let azar = 12345;
  const aleatorio = () => ((azar = (azar * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < n; k++) {
    const sx = aleatorio() - 0.5;
    const sy = aleatorio();
    const sz = aleatorio() - 0.5;
    for (let e = 0; e < 2; e++) {
      semillas.set([sx, sy, sz], (k * 2 + e) * 3);
      extremos[k * 2 + e] = e;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3));
  geo.setAttribute('aSemilla', new THREE.BufferAttribute(semillas, 3));
  geo.setAttribute('aExtremo', new THREE.BufferAttribute(extremos, 1));
  geo.setDrawRange(0, 0);
  const uniformes = { uTiempo: { value: 0 }, uCaja: { value: new THREE.Vector3(2, 3, 2) } };
  const mat = new THREE.ShaderMaterial({
    uniforms: uniformes,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      uniform float uTiempo;
      uniform vec3 uCaja;
      attribute vec3 aSemilla;
      attribute float aExtremo;
      void main() {
        float largo = 0.18;
        float y = mod(aSemilla.y * uCaja.y - uTiempo * uCaja.y * 0.9, uCaja.y);
        vec3 p = vec3(aSemilla.x * uCaja.x + aExtremo * largo * 0.15, y + aExtremo * largo, aSemilla.z * uCaja.z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: `
      void main() { gl_FragColor = vec4(0.17, 0.36, 0.62, 0.75); }`,
  });
  const objeto = new THREE.LineSegments(geo, mat);
  objeto.frustumCulled = false;
  objeto.visible = false;
  objeto.name = 'lluvia';
  return {
    objeto,
    uniformes,
    caja(ancho: number, alto: number, fondo: number) {
      uniformes.uCaja.value.set(ancho, alto, fondo);
    },
    cantidad(intensidad: number) {
      const gotas = intensidad > 0 ? Math.max(40, Math.round(intensidad * n)) : 0;
      geo.setDrawRange(0, gotas * 2);
    },
  };
}

/** Banderin (asta negra y bandera blanca con borde negro) en unidades de .bbmodel, unido en una geometria. */
function geometriaBanderin(): THREE.BufferGeometry {
  const caras = (i: number) => ({ north: i, south: i, east: i, west: i, up: i, down: i });
  const modelo: ModeloVoxel = {
    nombre: 'banderin',
    textura: { ancho: 16, alto: 16, fuente: '' },
    cubos: [
      { nombre: 'asta', desde: [-0.4, 0, -0.4], hasta: [0.4, 8, 0.4], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(0) },
      { nombre: 'borde', desde: [0.4, 4.5, -0.25], hasta: [5, 8, 0.25], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(0) },
      { nombre: 'bandera', desde: [0.4, 5, -0.35], hasta: [4.5, 7.5, 0.35], origen: [0, 0, 0], rotacion: [0, 0, 0], caras: caras(1) },
    ],
  };
  const g = unirCubos(modelo, (i) => (i === 0 ? [0, 0, 0] : [1, 1, 1]));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(g.posiciones, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(g.normales, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(g.colores, 3));
  geo.computeBoundingSphere();
  return geo;
}

/** Marco cuadrado de seleccion: anillo exterior negro y anillo interior blanco (se ve sobre cualquier suelo). */
function crearMarco([material]: THREE.MeshBasicMaterial[]): THREE.Group {
  // Las 8 cajas de los dos anillos van unidas en una geometria: un solo draw call.
  const cubos: ModeloVoxel['cubos'] = [];
  const anillo = (lado: number, grosor: number, alto: number, color: number) => {
    const m = lado / 2;
    for (const [x, z, ancho, fondo] of [
      [0, -m + grosor / 2, lado, grosor],
      [0, m - grosor / 2, lado, grosor],
      [-m + grosor / 2, 0, grosor, lado - 2 * grosor],
      [m - grosor / 2, 0, grosor, lado - 2 * grosor],
    ] as const) {
      const caras = { north: color, south: color, east: color, west: color, up: color, down: null };
      cubos.push({ nombre: 'marco', desde: [x - ancho / 2, 0, z - fondo / 2], hasta: [x + ancho / 2, alto, z + fondo / 2], origen: [0, 0, 0], rotacion: [0, 0, 0], caras });
    }
  };
  anillo(1.04, 0.07, 0.05, 0);
  anillo(0.92, 0.05, 0.06, 1);
  const unida = unirCubos({ nombre: 'marco', textura: { ancho: 16, alto: 16, fuente: '' }, cubos }, (i) => (i === 0 ? [0, 0, 0] : [1, 1, 1]), 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(unida.posiciones, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(unida.normales, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(unida.colores, 3));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, material));
  g.visible = false;
  g.renderOrder = 2;
  return g;
}

export class EscenaThree {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camara: THREE.OrthographicCamera;
  private readonly camaraGranja: CamaraGranja;
  private readonly raiz = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly observador: ResizeObserver;
  private readonly recursos: { dispose(): void }[] = [];
  private readonly cacheGeometria = new Map<string, Promise<THREE.BufferGeometry>>();
  private paleta: Promise<ColorPaleta[] | null> | null = null;
  /** Para cada malla seleccionable, el bloque de cada instancia. */
  private readonly bloquesPorMalla = new Map<THREE.InstancedMesh, BloqueEscena[]>();
  private version = 0;
  private cuadroPendiente = 0;
  private extension = 4;
  private opciones: OpcionesRender;
  private inicioPuntero: { x: number; y: number } | null = null;
  private ultimoCuadroMs = 0;
  private readonly solicitudes: Partial<Record<MotivoCuadro, number>> = {};
  private readonly cuadrosPorMotivo: Partial<Record<MotivoCuadro, number>> = {};
  private readonly motivosPendientes = new Set<MotivoCuadro>();
  private seleccionId: string | null = null;
  private ultimoPuntero: { x: number; y: number } | null = null;
  private cuadroHover = 0;
  private readonly materialesMarco = [new THREE.MeshBasicMaterial({ vertexColors: true })];
  private readonly marco = crearMarco(this.materialesMarco);
  // A5.1: material de plantas que vive toda la escena (las plantas que salen lo siguen usando)
  // y lleva el viento en el shader; transiciones en curso y escala actual por celda.
  private readonly uniformesViento = { uTiempo: { value: 0 }, uAmplitud: { value: 0 } };
  private readonly materialPlantas = crearMaterialPlantas(this.uniformesViento);
  private readonly materialMascota = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly salida = new THREE.Group();
  private transiciones: Transicion[] = [];
  private readonly metaPlantas = new Map<THREE.InstancedMesh, MetaPlantas>();
  private plantasActuales = new Map<string, PlantaPrevia>();
  private claveVista = '';
  private detalle: THREE.Mesh | null = null;
  private oculta: { mesh: THREE.InstancedMesh; k: number; meta: MetaPlantas } | null = null;
  private tokenDetalle = 0;
  private modeloActual: EscenaModelo | null = null;
  private enPantalla = true;
  private readonly observadorVisible: IntersectionObserver | null = null;
  // Lluvia del dia (dato del motor): un solo LineSegments con shader, oculto sin lluvia.
  private readonly lluvia = crearLluvia();
  private intensidadLluvia = 0;
  private cuadros = 0;
  // Brocha: trazo en curso y marcas de lo pintado que el motor aun no evalua (solo entrada del usuario).
  private pintando = false;
  private cuadroPintura = 0;
  private marcas: THREE.InstancedMesh | null = null;
  private marcasActuales: ReadonlyMap<string, string> = new Map();
  // Vista de la base (por cultivo, validacion o agua): color por celda o null (suelo por humedad).
  private coloresBase: ReadonlyMap<string, string> | null = null;
  private azulejosBase: THREE.InstancedMesh | null = null;

  constructor(private readonly lienzo: HTMLCanvasElement, opciones: OpcionesRender) {
    if (!soportaWebGL()) throw new ErrorWebGL();
    this.opciones = opciones;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'low-power' });
    } catch {
      throw new ErrorWebGL();
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Fondo desde la variable --escena-lienzo de escena.css (un solo lugar para cambiar el tema).
    const fondo = getComputedStyle(lienzo).getPropertyValue('--escena-lienzo').trim();
    this.scene.background = new THREE.Color(fondo || '#e9efe6');

    this.camara = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.scene.add(this.raiz);
    this.scene.add(this.salida);
    this.scene.add(this.lluvia.objeto);
    // El viento solo corre con la escena a la vista y la pestana visible.
    if (typeof IntersectionObserver !== 'undefined') {
      this.observadorVisible = new IntersectionObserver((e) => {
        this.enPantalla = e.some((x) => x.isIntersecting);
        this.pedirCuadro('visible');
      });
      this.observadorVisible.observe(lienzo);
    }
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6b5a45', 1.6));
    const sol = new THREE.DirectionalLight('#ffffff', 1.4);
    sol.position.set(4, 8, 3);
    this.scene.add(sol);

    // Camara de juego de granja (camara.ts): desplazar, girar en pasos, zoom con inclinacion.
    this.camaraGranja = new CamaraGranja(this.camara, lienzo, () => this.pedirCuadro('controles'), (g) => this.opciones.onAzimut?.(g));
    this.aplicarMovimiento();
    lienzo.addEventListener('dblclick', this.alDobleClic);

    lienzo.addEventListener('webglcontextlost', this.alPerderContexto);
    lienzo.addEventListener('webglcontextrestored', this.alRestaurarContexto);
    lienzo.addEventListener('pointerdown', this.alBajarPuntero);
    lienzo.addEventListener('pointerup', this.alSubirPuntero);
    lienzo.addEventListener('pointermove', this.alMoverPuntero);
    lienzo.addEventListener('pointerleave', this.alSalirPuntero);

    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(lienzo);
    this.ajustarTamano();
  }

  /** Medicion de rendimiento (A5.4) y verificacion de reducir movimiento. */
  estadisticas(): EstadisticasRender {
    const info = this.renderer.info.render;
    let instancias = 0;
    let mallas = 0;
    for (const m of this.bloquesPorMalla.keys()) {
      mallas++;
      instancias += m.count;
    }
    return {
      drawCalls: info.calls,
      triangulos: info.triangles,
      mallas,
      instancias,
      cuadros: this.cuadros,
      ultimoCuadroMs: this.ultimoCuadroMs,
      inercia: this.camaraGranja.controles.enableDamping,
      transiciones: this.transiciones.length,
      viento: this.vientoActivo(),
      lluvia: this.lluviaActiva(),
      gotas: this.lluvia.objeto.visible ? this.lluvia.objeto.geometry.drawRange.count / 2 : 0,
      mascota: !!this.raiz.getObjectByName('mascota'),
      contextoPerdido: this.contextoPerdido,
      cuadrosPorMotivo: { ...this.cuadrosPorMotivo },
      solicitudesPorMotivo: { ...this.solicitudes },
    };
  }

  setOpciones(opciones: OpcionesRender) {
    const mascotaAntes = this.opciones.mascota;
    const desplazamientoAntes = this.opciones.desplazamiento;
    this.opciones = opciones;
    if (desplazamientoAntes?.x !== opciones.desplazamiento?.x || desplazamientoAntes?.y !== opciones.desplazamiento?.y) this.ajustarTamano();
    this.aplicarMovimiento();
    if (opciones.reducirMovimiento) this.terminarTransiciones();
    if (mascotaAntes !== opciones.mascota && this.modeloActual) void this.construirMascota(this.modeloActual, this.version);
    this.pedirCuadro('opciones');
  }

  private aplicarMovimiento() {
    // Reducir movimiento: sin inercia ni vuelos de camara. Con pincel, el boton principal y un
    // dedo pintan; girar queda en el derecho y en dos dedos.
    this.camaraGranja.configurar({ reducirMovimiento: this.opciones.reducirMovimiento, pincel: !!this.opciones.pincel });
    if (!this.opciones.pincel) this.pintando = false;
  }

  /**
   * Marcas de pintura: un azulejo translucido del color del cultivo pintado sobre cada celda,
   * mientras el motor no entrega su resultado. Es la entrada del usuario, no un resultado.
   */
  marcarPintura(marcas: ReadonlyMap<string, string>) {
    this.marcasActuales = marcas;
    if (this.marcas) {
      this.marcas.removeFromParent();
      this.marcas.geometry.dispose();
      (this.marcas.material as THREE.Material).dispose();
      this.marcas.dispose();
      this.marcas = null;
    }
    const modelo = this.modeloActual;
    const bloques = modelo ? modelo.bloques.filter((b) => marcas.has(b.celdaId)) : [];
    if (bloques.length > 0) {
      const geo = new THREE.BoxGeometry(LADO_BLOQUE * 0.94, 0.03, LADO_BLOQUE * 0.94);
      const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.62, depthWrite: false });
      const malla = new THREE.InstancedMesh(geo, mat, bloques.length);
      const m = new THREE.Matrix4();
      const color = new THREE.Color();
      bloques.forEach((b, k) => {
        const y = this.topeDe(b) + (this.losaDe(b) ? DETALLE_LOSA : 0) + 0.02;
        m.makeTranslation(b.x, y, b.z);
        malla.setMatrixAt(k, m);
        malla.setColorAt(k, color.set(marcas.get(b.celdaId) ?? '#ffffff'));
      });
      malla.renderOrder = 3;
      malla.name = 'marcas-pintura';
      this.scene.add(malla);
      this.marcas = malla;
    }
    this.pedirCuadro('pintura');
  }

  /** Vuelve a la vista inicial (casi isometrica, toda la parcela visible). */
  restablecerVista(animar = false) {
    this.camaraGranja.restablecer(animar);
    this.pedirCuadro('vista');
  }

  /** Gira la vista en pasos (botones de la brujula, Q y E). Positivo = contra reloj desde arriba. */
  girar(grados: number) {
    this.camaraGranja.girar(grados);
    this.pedirCuadro('camara');
  }

  acercar(factor: number) {
    this.camaraGranja.acercar(factor);
    this.pedirCuadro('camara');
  }

  actualizar(modelo: EscenaModelo) {
    const version = ++this.version;
    const animar = !this.opciones.reducirMovimiento;
    // A5.1: las plantas actuales salen (encogiendose si su celda cambia de modelo) y las
    // nuevas parten de la escala que habia. Lo que estaba animandose se corta aqui.
    const previas = this.prepararSalida(modelo, animar);
    this.limpiar();
    this.detalle = null;
    this.oculta = null;
    this.modeloActual = modelo;
    // Media altura visible: la parcela mas margen para las plantas altas.
    this.extension = Math.max(modelo.filas, modelo.columnas, 2) * 0.6 + 0.6;
    this.lluvia.caja(modelo.columnas, Math.max(modelo.filas, modelo.columnas) * 0.8 + 2, modelo.filas);
    this.construirTerreno(modelo);
    this.camaraGranja.fijarLimites(modelo.columnas, modelo.filas);
    this.ajustarTamano();
    // La camara solo vuelve a la vista inicial si cambia la parcela, no al cambiar fecha o escenario.
    const claveVista = `${modelo.parcelaId}:${modelo.filas}x${modelo.columnas}`;
    if (claveVista !== this.claveVista) {
      this.claveVista = claveVista;
      this.restablecerVista();
    }
    void this.construirLosas(modelo, version);
    void this.construirPlantas(modelo, version, previas, animar);
    void this.construirMascota(modelo, version);
    // Conserva la seleccion si la celda sigue existiendo (cambio de fecha, ciclo o escenario).
    this.seleccionar(this.seleccionId ? (modelo.bloques.find((b) => b.celdaId === this.seleccionId) ?? null) : null);
    if (this.marcasActuales.size > 0) this.marcarPintura(this.marcasActuales);
    if (this.coloresBase) this.colorearBase(this.coloresBase);
  }

  /**
   * Vistas de la base: pinta la columna de cada bloque y un azulejo encima con el color de la
   * vista, y oculta las placas de estado (su informacion pasa al globo). null vuelve al suelo
   * coloreado por humedad del motor. Las celdas que no estan en el mapa conservan su suelo.
   */
  colorearBase(colores: ReadonlyMap<string, string> | null) {
    this.coloresBase = colores;
    const modelo = this.modeloActual;
    if (this.azulejosBase) {
      this.azulejosBase.removeFromParent();
      this.azulejosBase.geometry.dispose();
      (this.azulejosBase.material as THREE.Material).dispose();
      this.azulejosBase.dispose();
      this.azulejosBase = null;
    }
    const color = new THREE.Color();
    for (const hijo of this.raiz.children) {
      if (hijo.name.startsWith('placa-')) hijo.visible = !colores;
      if (hijo.name !== 'suelo' || !(hijo instanceof THREE.InstancedMesh) || !modelo) continue;
      const bloques = this.bloquesPorMalla.get(hijo) ?? [];
      bloques.forEach((b, k) => {
        const propio = colores?.get(b.celdaId);
        if (propio) color.set(propio);
        else {
          const [r, g, bl] = colorSuelo(b.registro?.humedad ?? null, modelo.grupoSuelo);
          color.setRGB(r / 255, g / 255, bl / 255, THREE.SRGBColorSpace);
        }
        hijo.setColorAt(k, color);
      });
      if (hijo.instanceColor) hijo.instanceColor.needsUpdate = true;
    }
    const conColor = colores && modelo ? modelo.bloques.filter((b) => colores.has(b.celdaId)) : [];
    if (conColor.length > 0) {
      const geo = new THREE.BoxGeometry(LADO_BLOQUE, 0.04, LADO_BLOQUE);
      const mat = new THREE.MeshLambertMaterial();
      const malla = new THREE.InstancedMesh(geo, mat, conColor.length);
      const m = new THREE.Matrix4();
      conColor.forEach((b, k) => {
        m.makeTranslation(b.x, this.topeDe(b) + (this.losaDe(b) ? DETALLE_LOSA : 0) + 0.02, b.z);
        malla.setMatrixAt(k, m);
        malla.setColorAt(k, color.set(colores!.get(b.celdaId)!));
      });
      malla.name = 'base-vista';
      this.scene.add(malla);
      this.azulejosBase = malla;
    }
    this.pedirCuadro('terreno');
  }

  /**
   * Marca la celda elegida (clic, toque o teclado) con un marco blanco y negro fijo:
   * sin parpadeo ni animacion, asi respeta reducir movimiento.
   */
  seleccionar(bloque: BloqueEscena | null) {
    this.seleccionId = bloque?.celdaId ?? null;
    if (!this.marco.parent) this.scene.add(this.marco);
    this.marco.visible = bloque !== null;
    if (bloque) {
      const y = this.topeDe(bloque) + (this.losaDe(bloque) ? DETALLE_LOSA : 0) + 0.004;
      this.marco.position.set(bloque.x, y, bloque.z);
    }
    void this.aplicarDetalle();
    this.pedirCuadro('seleccion');
  }

  /**
   * Celda elegida: oculta su manchon y pone en su lugar el modelo detallado de esa planta
   * (misma posicion, giro y escala). Al cambiar la seleccion, el manchon vuelve.
   */
  private async aplicarDetalle() {
    const token = ++this.tokenDetalle;
    // Devolver el manchon que estaba oculto.
    if (this.oculta && this.oculta.mesh.parent) {
      const { mesh, k, meta } = this.oculta;
      const e = this.plantasActuales.get(meta.celdas[k]!)?.escala ?? 1;
      mesh.setMatrixAt(k, new THREE.Matrix4().compose(meta.pos[k]!, meta.rot[k]!, new THREE.Vector3(e, e, e)));
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.oculta = null;
    this.detalle?.removeFromParent();
    this.detalle = null;
    const id = this.seleccionId;
    if (!id) return this.pedirCuadro('seleccion');
    for (const hijo of this.raiz.children) {
      const meta = hijo instanceof THREE.InstancedMesh ? this.metaPlantas.get(hijo) : undefined;
      const k = meta ? meta.celdas.indexOf(id) : -1;
      if (!meta || k < 0) continue;
      const mesh = hijo as THREE.InstancedMesh;
      mesh.setMatrixAt(k, new THREE.Matrix4().compose(meta.pos[k]!, meta.rot[k]!, new THREE.Vector3(0, 0, 0)));
      mesh.instanceMatrix.needsUpdate = true;
      this.oculta = { mesh, k, meta };
      let geo: THREE.BufferGeometry;
      try {
        geo = await this.geometriaDe(meta.clave, meta.tipoDetallado);
      } catch {
        geo = await this.geometriaDe(meta.clave, 'respaldo');
      }
      if (token !== this.tokenDetalle) return; // la seleccion cambio mientras cargaba
      const detalle = new THREE.Mesh(geo, this.materialMascota);
      // El detallado no debe sobresalir demasiado del manchon (los bloques son mas bajos a
      // proposito): como mucho 1.6 veces la altura del bloque. Ambos son visuales, no a escala.
      if (!geo.boundingBox) geo.computeBoundingBox();
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const altoDetalle = geo.boundingBox!.max.y;
      const altoBloque = mesh.geometry.boundingBox!.max.y;
      const ajuste = altoDetalle > 0 ? Math.min(1, (altoBloque * FACTOR_ALTO_DETALLE) / altoDetalle) : 1;
      const e = (this.plantasActuales.get(id)?.escala ?? 1) * ajuste;
      detalle.position.copy(meta.pos[k]!);
      detalle.quaternion.copy(meta.rot[k]!);
      detalle.scale.setScalar(e);
      detalle.name = 'detalle';
      this.raiz.add(detalle);
      this.detalle = detalle;
      break;
    }
    this.pedirCuadro('seleccion');
  }

  dispose() {
    this.version++;
    cancelAnimationFrame(this.cuadroPendiente);
    this.observador.disconnect();
    this.lienzo.removeEventListener('webglcontextlost', this.alPerderContexto);
    this.lienzo.removeEventListener('webglcontextrestored', this.alRestaurarContexto);
    this.lienzo.removeEventListener('pointerdown', this.alBajarPuntero);
    this.lienzo.removeEventListener('pointerup', this.alSubirPuntero);
    this.lienzo.removeEventListener('pointermove', this.alMoverPuntero);
    this.lienzo.removeEventListener('pointerleave', this.alSalirPuntero);
    cancelAnimationFrame(this.cuadroHover);
    cancelAnimationFrame(this.cuadroPintura);
    this.marcarPintura(new Map());
    this.colorearBase(null);
    this.observadorVisible?.disconnect();
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.terminarTransiciones();
    this.materialPlantas.dispose();
    this.lluvia.objeto.geometry.dispose();
    (this.lluvia.objeto.material as THREE.Material).dispose();
    this.materialMascota.dispose();
    this.marco.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
    this.materialesMarco.forEach((m) => m.dispose());
    this.lienzo.removeEventListener('dblclick', this.alDobleClic);
    this.camaraGranja.dispose();
    this.limpiar();
    for (const g of this.cacheGeometria.values()) void g.then((x) => x.dispose());
    this.cacheGeometria.clear();
    this.renderer.dispose();
  }

  // ------------------------------------------------------------------ terreno

  private registrar<T extends { dispose(): void }>(r: T): T {
    this.recursos.push(r);
    return r;
  }

  private limpiar() {
    for (const hijo of this.raiz.children) if (hijo instanceof THREE.InstancedMesh) hijo.dispose();
    this.raiz.clear();
    this.bloquesPorMalla.clear();
    for (const r of this.recursos.splice(0)) r.dispose();
  }

  private construirTerreno(modelo: EscenaModelo) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();

    const medidos = modelo.bloques.filter((b) => b.relieve.tipo === 'medido');
    const huecos = modelo.bloques.filter((b) => b.relieve.tipo === 'sin_elevacion');

    // Bloques de suelo: caja de base en y = 0, escalada hasta su altura; color por humedad del motor.
    const caja = this.registrar(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
    if (medidos.length > 0) {
      const mat = this.registrar(new THREE.MeshLambertMaterial());
      const suelo = new THREE.InstancedMesh(caja, mat, medidos.length);
      medidos.forEach((b, k) => {
        // Con losa, la columna baja lo que mide el cuerpo de la losa: la cara superior de la losa
        // queda a la altura del relieve y no se encima con la de la columna.
        const tope = (b.relieve.tipo === 'medido' ? b.relieve.alturaEscena : 0) - (this.losaDe(b) ? CUERPO_LOSA : 0);
        m.compose(new THREE.Vector3(b.x, -GROSOR_BASE, b.z), q, new THREE.Vector3(LADO_BLOQUE, tope + GROSOR_BASE, LADO_BLOQUE));
        suelo.setMatrixAt(k, m);
        const [r, g, bl] = colorSuelo(b.registro?.humedad ?? null, modelo.grupoSuelo);
        suelo.setColorAt(k, color.setRGB(r / 255, g / 255, bl / 255, THREE.SRGBColorSpace));
      });
      suelo.instanceMatrix.needsUpdate = true;
      if (suelo.instanceColor) suelo.instanceColor.needsUpdate = true;
      suelo.computeBoundingSphere();
      suelo.name = 'suelo';
      this.raiz.add(suelo);
      this.bloquesPorMalla.set(suelo, medidos);
    }

    // Huecos sin elevacion: bloque hundido con cruces, no a nivel cero.
    if (huecos.length > 0) {
      const tex = this.registrar(texturaDe(ESTILO_SIN_ELEVACION));
      const mat = this.registrar(new THREE.MeshBasicMaterial({ map: tex }));
      const hueco = new THREE.InstancedMesh(caja, mat, huecos.length);
      huecos.forEach((b, k) => {
        m.compose(new THREE.Vector3(b.x, -GROSOR_BASE, b.z), q, new THREE.Vector3(LADO_BLOQUE, GROSOR_BASE + TOPE_HUECO, LADO_BLOQUE));
        hueco.setMatrixAt(k, m);
      });
      hueco.instanceMatrix.needsUpdate = true;
      hueco.computeBoundingSphere();
      this.raiz.add(hueco);
      this.bloquesPorMalla.set(hueco, huecos);
    }

    // Placas de estado: una malla por estado presente (color + patron + icono).
    const plano = this.registrar(new THREE.PlaneGeometry(LADO_PLACA_ESCENA, LADO_PLACA_ESCENA).rotateX(-Math.PI / 2));
    const porEstado = new Map<EstadoVisual, BloqueEscena[]>();
    for (const b of modelo.bloques) {
      const lista = porEstado.get(b.estadoVisual) ?? [];
      lista.push(b);
      porEstado.set(b.estadoVisual, lista);
    }
    for (const [estado, lista] of porEstado) {
      const tex = this.registrar(texturaDe(ESTILOS_ESTADO[estado]));
      // MeshBasicMaterial: los colores no cambian con la luz, asi el contraste verificado se mantiene.
      const mat = this.registrar(new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1 }));
      const placa = new THREE.InstancedMesh(plano, mat, lista.length);
      lista.forEach((b, k) => {
        // Sobre la losa, la placa va por encima de su detalle para que no la tape.
        m.compose(new THREE.Vector3(b.x, this.topeDe(b) + (this.losaDe(b) ? DETALLE_LOSA : 0) + 0.002, b.z), q, new THREE.Vector3(1, 1, 1));
        placa.setMatrixAt(k, m);
      });
      placa.instanceMatrix.needsUpdate = true;
      placa.computeBoundingSphere();
      placa.name = `placa-${estado}`;
      this.raiz.add(placa);
      this.bloquesPorMalla.set(placa, lista);
    }

    // Banderin en la esquina noroeste de las celdas con cultivo no recomendado en el lugar
    // (el motor lo marca con noRecomendadoEnLugar y su fuente): forma, no solo color.
    const noRecomendados = modelo.bloques.filter((b) => b.noRecomendadoEnLugar);
    if (noRecomendados.length > 0) {
      const geo = this.registrar(geometriaBanderin());
      const mat = this.registrar(new THREE.MeshBasicMaterial({ vertexColors: true }));
      const banderas = new THREE.InstancedMesh(geo, mat, noRecomendados.length);
      noRecomendados.forEach((b, k) => {
        m.compose(new THREE.Vector3(b.x - 0.42, this.topeDe(b) + (this.losaDe(b) ? DETALLE_LOSA : 0), b.z - 0.42), q, new THREE.Vector3(1, 1, 1));
        banderas.setMatrixAt(k, m);
      });
      banderas.instanceMatrix.needsUpdate = true;
      banderas.computeBoundingSphere();
      banderas.name = 'banderin-no-recomendado';
      this.raiz.add(banderas);
      this.bloquesPorMalla.set(banderas, noRecomendados);
    }
    this.pedirCuadro('terreno');
  }

  private topeDe(b: BloqueEscena): number {
    return b.relieve.tipo === 'medido' ? b.relieve.alturaEscena : TOPE_HUECO;
  }

  /** Losa que lleva el bloque: solo con relieve medido y si el .bbmodel existe. */
  private losaDe(b: BloqueEscena): string | null {
    return b.relieve.tipo === 'medido' && b.losa && MODELOS_DISPONIBLES.has(b.losa) ? b.losa : null;
  }

  /** Losas de suelo (A2.12): un InstancedMesh por losa, con giro de 90 grados estable por celda. */
  private async construirLosas(modelo: EscenaModelo, version: number) {
    const porLosa = new Map<string, BloqueEscena[]>();
    for (const b of modelo.bloques) {
      const clave = this.losaDe(b);
      if (!clave) continue;
      porLosa.set(clave, [...(porLosa.get(clave) ?? []), b]);
    }
    if (porLosa.size === 0) return;
    const mat = this.registrar(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eje = new THREE.Vector3(0, 1, 0);
    const uno = new THREE.Vector3(1, 1, 1);
    for (const [clave, lista] of [...porLosa].sort(([a], [b]) => a.localeCompare(b))) {
      let geo: THREE.BufferGeometry;
      try {
        geo = await this.geometriaDe(clave, 'bbmodel');
      } catch (e) {
        this.opciones.onAviso?.('LOSA_ILEGIBLE', `${clave}.bbmodel no se pudo leer (${(e as Error).message}); esas celdas quedan sin losa.`);
        continue;
      }
      if (version !== this.version) return;
      const losas = new THREE.InstancedMesh(geo, mat, lista.length);
      lista.forEach((b, k) => {
        q.setFromAxisAngle(eje, (giroCelda(b.celdaId) * Math.PI) / 2);
        m.compose(new THREE.Vector3(b.x, this.topeDe(b), b.z), q, uno);
        losas.setMatrixAt(k, m);
      });
      losas.instanceMatrix.needsUpdate = true;
      losas.computeBoundingSphere();
      losas.name = `losa-${clave}`;
      this.raiz.add(losas);
      this.bloquesPorMalla.set(losas, lista);
      this.pedirCuadro('losas');
    }
  }

  // ------------------------------------------------------------------ plantas (A3.2)

  private obtenerPaleta(): Promise<ColorPaleta[] | null> {
    if (!this.paleta) {
      const primera = [...MODELOS_DISPONIBLES][0];
      this.paleta = primera
        ? cargarModelo(primera).then((mod) => decodificarPaletaPng(mod.textura.fuente)).catch(() => null)
        : Promise.resolve(null);
    }
    return this.paleta;
  }

  /**
   * Geometria unida de un modelo. 'bloque': el manchon de plantas de la celda; usa
   * <clave>_bloque.bbmodel si existe y si no, uno provisional hecho del detallado.
   */
  private geometriaDe(clave: string, tipo: 'bbmodel' | 'respaldo' | 'bloque', detalladoTipo: 'bbmodel' | 'respaldo' = 'bbmodel'): Promise<THREE.BufferGeometry> {
    const llave = `${tipo}:${detalladoTipo}:${clave}`;
    let g = this.cacheGeometria.get(llave);
    if (!g) {
      g = (async () => {
        let modelo: ModeloVoxel;
        let paleta: ColorPaleta[] | null;
        const detallado = async (t: 'bbmodel' | 'respaldo') => {
          if (t === 'bbmodel') {
            const m = await cargarModelo(clave);
            return { modelo: m, paleta: await decodificarPaletaPng(m.textura.fuente) };
          }
          return { modelo: modeloRespaldo(clave, { ancho: 16, alto: 16, fuente: '' }), paleta: await this.obtenerPaleta() };
        };
        if (tipo === 'bloque') {
          if (MODELOS_DISPONIBLES.has(claveBloque(clave))) {
            modelo = await cargarModelo(claveBloque(clave));
            paleta = await decodificarPaletaPng(modelo.textura.fuente);
          } else {
            const d = await detallado(detalladoTipo);
            modelo = bloqueProvisional(d.modelo);
            paleta = d.paleta;
            this.opciones.onAviso?.('BLOQUE_PROVISIONAL', 'Manchones de plantas provisionales (hechos en código) mientras llegan los modelos de bloque de modelos/cultivos/bloques/.');
          }
        } else {
          ({ modelo, paleta } = await detallado(tipo));
        }
        const c = new THREE.Color();
        const unida = unirCubos(modelo, (i) => {
          const p = paleta?.[i];
          if (paleta && (!p || p.alfa === 0)) return null;
          // Sin paleta (no hay ningun .bbmodel): verde neutro para el respaldo.
          c.setStyle(p?.hex ?? '#4aa33a', THREE.SRGBColorSpace);
          return [c.r, c.g, c.b] as Vec3;
        });
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(unida.posiciones, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(unida.normales, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(unida.colores, 3));
        geo.computeBoundingSphere();
        return geo;
      })();
      this.cacheGeometria.set(llave, g);
    }
    return g;
  }

  private async construirPlantas(modelo: EscenaModelo, version: number, previas: Map<string, PlantaPrevia>, animar: boolean) {
    const grupos = agruparPorModelo(modelo.bloques, MODELOS_DISPONIBLES);
    const m = new THREE.Matrix4();
    const eje = new THREE.Vector3(0, 1, 0);
    for (const grupo of grupos) {
      let geo: THREE.BufferGeometry;
      let aviso: [string, string] | null = null;
      if (grupo.resolucion.tipo === 'respaldo') {
        aviso = ['MODELO_PROVISIONAL', `Sin modelo ${grupo.clave}.bbmodel: se dibuja una planta provisional.`];
      }
      // Cada celda lleva el manchon de plantas (bloque); el detallado va solo en la celda elegida.
      let tipoDetallado: 'bbmodel' | 'respaldo' = grupo.resolucion.tipo;
      try {
        geo = await this.geometriaDe(grupo.clave, 'bloque', tipoDetallado);
      } catch (e) {
        aviso = ['MODELO_ILEGIBLE', `${grupo.clave}.bbmodel no se pudo leer (${(e as Error).message}); se dibuja una planta provisional.`];
        tipoDetallado = 'respaldo';
        geo = await this.geometriaDe(grupo.clave, 'bloque', 'respaldo');
      }
      if (version !== this.version) return; // llego otra actualizacion mientras cargaba
      if (aviso) this.opciones.onAviso?.(aviso[0], aviso[1]);
      const plantas = new THREE.InstancedMesh(geo, this.materialPlantas, grupo.bloques.length);
      plantas.frustumCulled = false; // su tamano cambia durante la transicion
      const meta: MetaPlantas = { clave: grupo.clave, tipoDetallado, celdas: [], pos: [], rot: [] };
      const desde: number[] = [];
      const hasta: number[] = [];
      grupo.bloques.forEach((b, k) => {
        const final = escalaPorAvance(b.avanceEtapa);
        const inicio = escalaInicial(previas.get(b.celdaId), grupo.clave, final, animar);
        const pos = new THREE.Vector3(b.x, this.topeDe(b), b.z);
        const rot = new THREE.Quaternion().setFromAxisAngle(eje, (giroSurcos(b.celdaId) * Math.PI) / 2);
        meta.celdas.push(b.celdaId);
        meta.pos.push(pos);
        meta.rot.push(rot);
        desde.push(inicio);
        hasta.push(final);
        m.compose(pos, rot, new THREE.Vector3(inicio, inicio, inicio));
        plantas.setMatrixAt(k, m);
        this.plantasActuales.set(b.celdaId, { clave: grupo.clave, escala: inicio });
      });
      plantas.instanceMatrix.needsUpdate = true;
      plantas.computeBoundingSphere();
      plantas.name = `planta-${grupo.clave}`;
      this.raiz.add(plantas);
      this.metaPlantas.set(plantas, meta);
      this.bloquesPorMalla.set(plantas, grupo.bloques);
      if (desde.some((d, k) => d !== hasta[k])) {
        this.transiciones.push({ mesh: plantas, meta, desde, hasta, inicio: performance.now(), sale: false });
      }
      if (this.seleccionId && meta.celdas.includes(this.seleccionId)) void this.aplicarDetalle();
      this.pedirCuadro('plantas');
    }
  }

  /** Saca las plantas actuales de la escena antes de reconstruirla (A5.1). Devuelve lo que habia por celda. */
  private prepararSalida(modelo: EscenaModelo, animar: boolean): Map<string, PlantaPrevia> {
    // No acumular: lo que ya estaba saliendo desaparece; lo que crecia se queda en su escala actual.
    for (const t of this.transiciones.filter((x) => x.sale)) this.quitarSaliente(t.mesh);
    this.transiciones = [];
    const previas = this.plantasActuales;
    this.plantasActuales = new Map();
    const nuevas = new Map<string, string | null>(modelo.bloques.map((b) => [b.celdaId, claveModelo(b)]));
    const m = new THREE.Matrix4();
    for (const hijo of [...this.raiz.children]) {
      const meta = hijo instanceof THREE.InstancedMesh ? this.metaPlantas.get(hijo) : undefined;
      if (!meta) continue;
      const mesh = hijo as THREE.InstancedMesh;
      this.raiz.remove(mesh);
      this.metaPlantas.delete(mesh);
      const desde = meta.celdas.map((c) => (saleEncogiendo(meta.clave, nuevas.get(c) ?? null, animar) ? (previas.get(c)?.escala ?? 0) : 0));
      if (!desde.some((d) => d > 0)) {
        mesh.dispose();
        continue;
      }
      desde.forEach((d, k) => {
        m.compose(meta.pos[k]!, meta.rot[k]!, new THREE.Vector3(d, d, d));
        mesh.setMatrixAt(k, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      this.salida.add(mesh);
      this.transiciones.push({ mesh, meta, desde, hasta: desde.map(() => 0), inicio: performance.now(), sale: true });
    }
    return previas;
  }

  private quitarSaliente(mesh: THREE.InstancedMesh) {
    this.salida.remove(mesh);
    mesh.dispose();
  }

  /** Lleva todas las transiciones a su final de inmediato (reducir movimiento o cierre). */
  private terminarTransiciones() {
    for (const t of this.transiciones) this.avanzarTransicion(t, 1);
    this.transiciones = [];
  }

  /** Pone la transicion en el tiempo t (0 a 1). Devuelve true si termino. */
  private avanzarTransicion(t: Transicion, avance: number): boolean {
    const m = new THREE.Matrix4();
    t.desde.forEach((d, k) => {
      const e = interpolar(d, t.hasta[k]!, avance);
      // La celda elegida muestra el detallado: su manchon queda oculto.
      const v = !t.sale && t.meta.celdas[k] === this.seleccionId ? 0 : e;
      m.compose(t.meta.pos[k]!, t.meta.rot[k]!, new THREE.Vector3(v, v, v));
      t.mesh.setMatrixAt(k, m);
      if (!t.sale) this.plantasActuales.set(t.meta.celdas[k]!, { clave: t.meta.clave, escala: e });
    });
    t.mesh.instanceMatrix.needsUpdate = true;
    if (avance < 1) return false;
    if (t.sale) this.quitarSaliente(t.mesh);
    else t.mesh.computeBoundingSphere();
    return true;
  }

  /** Lugar de la mascota (modelos/props/mascota_feliz.bbmodel): fuera de la parcela, en la esquina noreste. */
  private async construirMascota(modelo: EscenaModelo, version: number) {
    this.raiz.getObjectByName('mascota')?.removeFromParent();
    if (this.mascotaApagada() || !MODELOS_DISPONIBLES.has('mascota_feliz') || modelo.bloques.length === 0) {
      this.pedirCuadro('mascota');
      return;
    }
    let geo: THREE.BufferGeometry;
    try {
      geo = await this.geometriaDe('mascota_feliz', 'bbmodel');
    } catch {
      return; // sin modelo legible, sin mascota: es un extra
    }
    if (version !== this.version || this.mascotaApagada()) return; // cambio mientras cargaba
    const mascota = new THREE.Mesh(geo, this.materialMascota);
    mascota.name = 'mascota';
    const xMax = Math.max(...modelo.bloques.map((b) => b.x));
    const zMin = Math.min(...modelo.bloques.map((b) => b.z));
    mascota.position.set(xMax + 1, 0, zMin);
    mascota.rotation.y = Math.PI / 4; // mira hacia la camara
    mascota.scale.setScalar(0.6); // acompana sin competir con los datos de la parcela
    this.raiz.add(mascota);
    this.pedirCuadro('mascota');
  }

  private mascotaApagada(): boolean {
    return this.opciones.mascota === false;
  }

  private readonly alCambiarVisibilidad = () => this.pedirCuadro('pestana');

  private contextoPerdido = false;

  // three.js ya llama preventDefault al perder el contexto (asi el navegador puede devolverlo).
  private readonly alPerderContexto = () => {
    this.contextoPerdido = true;
    cancelAnimationFrame(this.cuadroPendiente);
    this.cuadroPendiente = 0;
    this.opciones.onContexto?.('perdido');
  };

  // Al volver el contexto se reconstruye la escena (geometrias y texturas se suben de nuevo).
  private readonly alRestaurarContexto = () => {
    this.contextoPerdido = false;
    this.cacheGeometria.clear();
    if (this.modeloActual) this.actualizar(this.modeloActual);
    this.opciones.onContexto?.('restaurado');
    this.pedirCuadro('contexto');
  };

  /**
   * Prueba de perdida de contexto (A5.4): lo pierde con WEBGL_lose_context, espera y lo
   * restaura. Devuelve si el navegador ofrece la extension y si la escena volvio a dibujar.
   */
  async probarPerdidaContexto(esperaMs = 1500): Promise<{ extension: boolean; perdido: boolean; restaurado: boolean; cuadrosTras: number; triangulosTras: number }> {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return { extension: false, perdido: false, restaurado: false, cuadrosTras: 0, triangulosTras: 0 };
    ext.loseContext();
    await new Promise((r) => setTimeout(r, esperaMs));
    const perdido = this.contextoPerdido;
    ext.restoreContext();
    await new Promise((r) => setTimeout(r, esperaMs));
    const antes = this.cuadros;
    this.pedirCuadro('contexto');
    await new Promise((r) => setTimeout(r, 500));
    return { extension: true, perdido, restaurado: !this.contextoPerdido && !gl.isContextLost(), cuadrosTras: this.cuadros - antes, triangulosTras: this.renderer.info.render.triangles };
  }

  private vientoActivo(): boolean {
    return !!this.opciones.viento && !this.opciones.reducirMovimiento && this.enPantalla && document.visibilityState === 'visible';
  }

  /**
   * Lluvia del dia (0 = no llueve o sin dato). La cantidad de gotas es proporcional a la
   * intensidad; con reducir movimiento no se dibuja (la escena muestra un indicador fijo).
   */
  setLluvia(intensidad: number) {
    this.intensidadLluvia = Math.min(1, Math.max(0, intensidad));
    this.lluvia.cantidad(this.intensidadLluvia);
    this.pedirCuadro('lluvia');
  }

  /** Intensidad de lluvia que se esta dibujando (0 a 1). */
  intensidadLluviaActual(): number {
    return this.intensidadLluvia;
  }

  private lluviaActiva(): boolean {
    return this.intensidadLluvia > 0 && !this.opciones.reducirMovimiento && this.enPantalla && document.visibilityState === 'visible';
  }

  // ------------------------------------------------------------------ render y seleccion

  private ajustarTamano() {
    const ancho = this.lienzo.clientWidth || 1;
    const alto = this.lienzo.clientHeight || 1;
    this.renderer.setSize(ancho, alto, false);
    const aspecto = ancho / alto;
    // En pantallas verticales manda el ancho: la parcela entera cabe de lado a lado.
    const e = aspecto < 1 ? this.extension / aspecto : this.extension;
    this.camara.left = -e * aspecto;
    this.camara.right = e * aspecto;
    this.camara.top = e;
    this.camara.bottom = -e;
    const d = this.opciones.desplazamiento;
    if (d && (d.x || d.y)) this.camara.setViewOffset(ancho, alto, -d.x, d.y, ancho, alto);
    else this.camara.clearViewOffset();
    this.camara.updateProjectionMatrix();
    this.pedirCuadro('tamano');
  }

  /**
   * Pide un cuadro (render bajo demanda). `motivo` solo sirve para el desglose de A5.4:
   * cuantos pedidos y cuantos cuadros dibujados hubo por cada motivo (estadisticas()).
   */
  private pedirCuadro(motivo: MotivoCuadro) {
    this.solicitudes[motivo] = (this.solicitudes[motivo] ?? 0) + 1;
    this.motivosPendientes.add(motivo);
    if (this.cuadroPendiente || this.contextoPerdido) return;
    this.cuadroPendiente = requestAnimationFrame(() => {
      this.cuadroPendiente = 0;
      for (const m of this.motivosPendientes) this.cuadrosPorMotivo[m] = (this.cuadrosPorMotivo[m] ?? 0) + 1;
      this.motivosPendientes.clear();
      // La camara avanza teclado, vuelos e inercia; true mientras se sigue moviendo.
      const ahora = performance.now();
      const siguioMoviendo = this.camaraGranja.paso(ahora);
      if (this.transiciones.length > 0) {
        this.transiciones = this.transiciones.filter((t) => !this.avanzarTransicion(t, (ahora - t.inicio) / DURACION_TRANSICION_MS));
      }
      const viento = this.vientoActivo();
      const lloviendo = this.lluviaActiva();
      this.lluvia.objeto.visible = this.intensidadLluvia > 0 && !this.opciones.reducirMovimiento;
      if (lloviendo) this.lluvia.uniformes.uTiempo.value = ahora / 1000;
      this.uniformesViento.uAmplitud.value = viento ? AMPLITUD_VIENTO : 0;
      if (viento) this.uniformesViento.uTiempo.value = ahora / 1000;
      const t0 = performance.now();
      this.renderer.render(this.scene, this.camara);
      this.ultimoCuadroMs = performance.now() - t0;
      this.cuadros++;
      // Render bajo demanda: solo se sigue dibujando mientras algo se mueve.
      if (siguioMoviendo) this.pedirCuadro('inercia');
      if (this.transiciones.length > 0) this.pedirCuadro('transicion');
      if (viento) this.pedirCuadro('viento');
      if (lloviendo) this.pedirCuadro('lluvia-animada');
    });
  }

  private readonly alBajarPuntero = (ev: PointerEvent) => {
    if (this.opciones.pincel && ev.button === 0 && ev.isPrimary) {
      this.pintando = true;
      this.inicioPuntero = null;
      this.opciones.onPintar?.(this.bloqueEn(ev.clientX, ev.clientY), 'inicio');
      return;
    }
    this.inicioPuntero = { x: ev.clientX, y: ev.clientY };
  };

  private readonly alSubirPuntero = (ev: PointerEvent) => {
    if (this.pintando) {
      this.pintando = false;
      cancelAnimationFrame(this.cuadroPintura);
      this.cuadroPintura = 0;
      this.opciones.onPintar?.(this.bloqueEn(ev.clientX, ev.clientY), 'fin');
      return;
    }
    const inicio = this.inicioPuntero;
    this.inicioPuntero = null;
    if (!inicio || Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 5) return; // fue arrastre
    const bloque = this.bloqueEn(ev.clientX, ev.clientY);
    this.seleccionar(bloque);
    this.opciones.onSeleccion?.(bloque);
  };

  // Doble clic: volar hacia la celda (con pincel el doble clic pinta, no mueve la camara).
  private readonly alDobleClic = (ev: MouseEvent) => {
    if (this.opciones.pincel) return;
    const b = this.bloqueEn(ev.clientX, ev.clientY);
    if (!b) return;
    this.camaraGranja.enfocar(new THREE.Vector3(b.x, this.topeDe(b), b.z));
    this.pedirCuadro('camara');
  };

  private bloqueEn(clientX: number, clientY: number): BloqueEscena | null {
    const r = this.lienzo.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camara);
    const golpe = this.raycaster
      .intersectObjects([...this.bloquesPorMalla.keys()], false)
      .find((i) => i.instanceId !== undefined);
    const malla = golpe?.object as THREE.InstancedMesh | undefined;
    return malla && golpe?.instanceId !== undefined ? (this.bloquesPorMalla.get(malla)?.[golpe.instanceId] ?? null) : null;
  }

  // Globo al pasar el cursor: solo con raton (en tactil se usa el toque) y como mucho una vez por cuadro.
  private readonly alMoverPuntero = (ev: PointerEvent) => {
    if (this.pintando && ev.isPrimary) {
      // Como mucho un bloque por cuadro durante el trazo.
      this.ultimoPuntero = { x: ev.clientX, y: ev.clientY };
      if (this.cuadroPintura) return;
      this.cuadroPintura = requestAnimationFrame(() => {
        this.cuadroPintura = 0;
        const p = this.ultimoPuntero;
        if (p && this.pintando) this.opciones.onPintar?.(this.bloqueEn(p.x, p.y), 'trazo');
      });
      return;
    }
    if (ev.pointerType !== 'mouse' || !this.opciones.onHover || ev.buttons !== 0) return;
    this.ultimoPuntero = { x: ev.clientX, y: ev.clientY };
    if (this.cuadroHover) return;
    this.cuadroHover = requestAnimationFrame(() => {
      this.cuadroHover = 0;
      const p = this.ultimoPuntero;
      if (!p) return;
      const r = this.lienzo.getBoundingClientRect();
      this.opciones.onHover?.(this.bloqueEn(p.x, p.y), p.x - r.left, p.y - r.top);
    });
  };

  private readonly alSalirPuntero = () => {
    if (this.pintando) {
      this.pintando = false;
      this.opciones.onPintar?.(null, 'fin');
    }
    this.ultimoPuntero = null;
    this.opciones.onHover?.(null, 0, 0);
  };
}
