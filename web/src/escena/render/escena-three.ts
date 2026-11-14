// Render three.js de la escena (A3.1 terreno + A3.2 plantas). Solo dibuja el
// EscenaModelo que arma el adaptador: no decide etapa, estado ni valores.
// Rendimiento (doc 08): un InstancedMesh por tipo (suelo, huecos, una placa por
// estado, una planta por cultivo + etapa), render bajo demanda (sin bucle
// continuo) y opcion de reducir movimiento.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ESTILO_SIN_ELEVACION, ESTILOS_ESTADO } from '../estilos-estado';
import { GROSOR_BASE, type BloqueEscena, type EscenaModelo, type EstadoVisual } from '../modelo';
import { rgbaPlaca } from '../placa';
import { colorSuelo } from '../suelo';
import type { ModeloVoxel, Vec3 } from '../voxel/bbmodel';
import { agruparPorModelo, escalaPorAvance, giroCelda, modeloRespaldo } from '../voxel/catalogo';
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
  /** Avisos del render (por ejemplo, modelo de respaldo o .bbmodel que no se pudo leer). */
  onAviso?: (codigo: string, mensaje: string) => void;
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
}

/** Hueco de una celda sin elevacion: por debajo del punto mas bajo, nunca "a nivel cero". */
const TOPE_HUECO = -GROSOR_BASE * 0.6;
/** Losas de suelo (A2.12): cuerpo de 2 unidades bajo su cara superior y detalle de hasta 1 unidad encima. */
const CUERPO_LOSA = 2 / 16;
const DETALLE_LOSA = 1 / 16;
const LADO_BLOQUE = 0.96;
const LADO_PLACA_ESCENA = 0.82;

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

export class EscenaThree {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camara: THREE.OrthographicCamera;
  private readonly controles: OrbitControls;
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
  private cuadros = 0;

  constructor(private readonly lienzo: HTMLCanvasElement, opciones: OpcionesRender) {
    if (!soportaWebGL()) throw new ErrorWebGL();
    this.opciones = opciones;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, powerPreference: 'low-power' });
    } catch {
      throw new ErrorWebGL();
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = new THREE.Color('#e9efe6');

    this.camara = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.scene.add(this.raiz);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6b5a45', 1.6));
    const sol = new THREE.DirectionalLight('#ffffff', 1.4);
    sol.position.set(4, 8, 3);
    this.scene.add(sol);

    // Camara casi isometrica, rotacion limitada y zoom (doc 06).
    this.controles = new OrbitControls(this.camara, lienzo);
    this.controles.enablePan = true;
    this.controles.screenSpacePanning = true;
    this.controles.minPolarAngle = THREE.MathUtils.degToRad(20);
    this.controles.maxPolarAngle = THREE.MathUtils.degToRad(70);
    this.controles.minZoom = 0.6;
    this.controles.maxZoom = 6;
    this.controles.keys = { LEFT: 'ArrowLeft', UP: 'ArrowUp', RIGHT: 'ArrowRight', BOTTOM: 'ArrowDown' };
    this.controles.listenToKeyEvents(lienzo);
    this.controles.addEventListener('change', () => this.pedirCuadro());
    this.aplicarMovimiento();

    lienzo.addEventListener('pointerdown', this.alBajarPuntero);
    lienzo.addEventListener('pointerup', this.alSubirPuntero);

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
      inercia: this.controles.enableDamping,
    };
  }

  setOpciones(opciones: OpcionesRender) {
    this.opciones = opciones;
    this.aplicarMovimiento();
  }

  private aplicarMovimiento() {
    // Reducir movimiento: sin inercia al girar ni animaciones.
    this.controles.enableDamping = !this.opciones.reducirMovimiento;
    this.controles.dampingFactor = 0.12;
  }

  /** Vuelve a la vista inicial (casi isometrica, toda la parcela visible). */
  restablecerVista() {
    const d = 20;
    this.camara.position.set(d, d * 0.9, d);
    this.camara.zoom = 1;
    this.controles.target.set(0, 0, 0);
    this.camara.updateProjectionMatrix();
    this.controles.update();
    this.pedirCuadro();
  }

  actualizar(modelo: EscenaModelo) {
    const version = ++this.version;
    this.limpiar();
    // Media altura visible: la parcela mas margen para las plantas altas.
    this.extension = Math.max(modelo.filas, modelo.columnas, 2) * 0.7 + 0.8;
    this.construirTerreno(modelo);
    this.ajustarTamano();
    this.restablecerVista();
    void this.construirLosas(modelo, version);
    void this.construirPlantas(modelo, version);
  }

  dispose() {
    this.version++;
    cancelAnimationFrame(this.cuadroPendiente);
    this.observador.disconnect();
    this.lienzo.removeEventListener('pointerdown', this.alBajarPuntero);
    this.lienzo.removeEventListener('pointerup', this.alSubirPuntero);
    this.controles.dispose();
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
    this.pedirCuadro();
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
      this.pedirCuadro();
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

  private geometriaDe(clave: string, tipo: 'bbmodel' | 'respaldo'): Promise<THREE.BufferGeometry> {
    const llave = `${tipo}:${clave}`;
    let g = this.cacheGeometria.get(llave);
    if (!g) {
      g = (async () => {
        let modelo: ModeloVoxel;
        let paleta: ColorPaleta[] | null;
        if (tipo === 'bbmodel') {
          modelo = await cargarModelo(clave);
          paleta = await decodificarPaletaPng(modelo.textura.fuente);
        } else {
          paleta = await this.obtenerPaleta();
          modelo = modeloRespaldo(clave, { ancho: 16, alto: 16, fuente: '' });
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

  private async construirPlantas(modelo: EscenaModelo, version: number) {
    const grupos = agruparPorModelo(modelo.bloques, MODELOS_DISPONIBLES);
    const mat = this.registrar(new THREE.MeshLambertMaterial({ vertexColors: true }));
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const eje = new THREE.Vector3(0, 1, 0);
    for (const grupo of grupos) {
      let geo: THREE.BufferGeometry;
      let aviso: [string, string] | null = null;
      if (grupo.resolucion.tipo === 'respaldo') {
        aviso = ['MODELO_PROVISIONAL', `Sin modelo ${grupo.clave}.bbmodel: se dibuja una planta provisional.`];
      }
      try {
        geo = await this.geometriaDe(grupo.clave, grupo.resolucion.tipo);
      } catch (e) {
        aviso = ['MODELO_ILEGIBLE', `${grupo.clave}.bbmodel no se pudo leer (${(e as Error).message}); se dibuja una planta provisional.`];
        geo = await this.geometriaDe(grupo.clave, 'respaldo');
      }
      if (version !== this.version) return; // llego otra actualizacion mientras cargaba
      if (aviso) this.opciones.onAviso?.(aviso[0], aviso[1]);
      const plantas = new THREE.InstancedMesh(geo, mat, grupo.bloques.length);
      grupo.bloques.forEach((b, k) => {
        const s = escalaPorAvance(b.avanceEtapa);
        q.setFromAxisAngle(eje, (giroCelda(b.celdaId) * Math.PI) / 2);
        m.compose(new THREE.Vector3(b.x, this.topeDe(b), b.z), q, new THREE.Vector3(s, s, s));
        plantas.setMatrixAt(k, m);
      });
      plantas.instanceMatrix.needsUpdate = true;
      plantas.computeBoundingSphere();
      plantas.name = `planta-${grupo.clave}`;
      this.raiz.add(plantas);
      this.bloquesPorMalla.set(plantas, grupo.bloques);
      this.pedirCuadro();
    }
  }

  // ------------------------------------------------------------------ render y seleccion

  private ajustarTamano() {
    const ancho = this.lienzo.clientWidth || 1;
    const alto = this.lienzo.clientHeight || 1;
    this.renderer.setSize(ancho, alto, false);
    const aspecto = ancho / alto;
    const e = this.extension;
    this.camara.left = -e * aspecto;
    this.camara.right = e * aspecto;
    this.camara.top = e;
    this.camara.bottom = -e;
    this.camara.updateProjectionMatrix();
    this.pedirCuadro();
  }

  private pedirCuadro() {
    if (this.cuadroPendiente) return;
    this.cuadroPendiente = requestAnimationFrame(() => {
      this.cuadroPendiente = 0;
      // Con inercia, update() devuelve true mientras la camara se sigue moviendo.
      const siguioMoviendo = this.controles.enableDamping && this.controles.update();
      const t0 = performance.now();
      this.renderer.render(this.scene, this.camara);
      this.ultimoCuadroMs = performance.now() - t0;
      this.cuadros++;
      if (siguioMoviendo) this.pedirCuadro();
    });
  }

  private readonly alBajarPuntero = (ev: PointerEvent) => {
    this.inicioPuntero = { x: ev.clientX, y: ev.clientY };
  };

  private readonly alSubirPuntero = (ev: PointerEvent) => {
    const inicio = this.inicioPuntero;
    this.inicioPuntero = null;
    if (!inicio || Math.hypot(ev.clientX - inicio.x, ev.clientY - inicio.y) > 5) return; // fue arrastre
    const r = this.lienzo.getBoundingClientRect();
    const ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camara);
    const golpe = this.raycaster
      .intersectObjects([...this.bloquesPorMalla.keys()], false)
      .find((i) => i.instanceId !== undefined);
    const malla = golpe?.object as THREE.InstancedMesh | undefined;
    const bloque = malla && golpe?.instanceId !== undefined ? this.bloquesPorMalla.get(malla)?.[golpe.instanceId] ?? null : null;
    this.opciones.onSeleccion?.(bloque);
  };
}
