// Componente React de la escena 3D (A3.1, A3.2; base de A3.3). Recibe la
// parcela y el resultado del motor tal cual (contratos) y solo los representa.
// Punto de integracion propuesto: ver web/src/escena/INTEGRACION.md.

import { tt } from '../ui/i18n/actual';
import { useIdioma } from '../ui/i18n/Idioma';
import { textoCelda } from '../ui/i18n/textos/terreno';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Advertencia, Parcela, ResultadoCeldas, SerieBalance, SerieClima, Suelo } from '../../../contratos/tipos/contratos';
import { CORTES_LLUVIA, lluviaDelDia, textoLluvia } from './lluvia';
import { describirCelda } from '../geo/escala-celda';
import { climaFondo, epocaRelativa, NOMBRE_CLIMA_FONDO } from './clima-fondo';
import { AJUSTES_GRAFICOS, guardarNivel, leerNivelGuardado, NIVELES_GRAFICOS, NOMBRE_NIVEL_GRAFICOS, type NivelGraficos } from './graficos';
import { construirEscena } from './adaptador';
import type { AvisoDatos } from '../api/datosParcela';
import { CODIGOS_TERRENO } from './avisos-datos';
import { AvisosDatos } from './AvisosDatos';
import { bloqueCentral, fichaBloque, nombreCultivo, vecino } from './ficha';
import { describirBloque, entradasLeyenda, type EntradaLeyenda } from './leyenda';
import { EXAGERACION_VERTICAL_DEFECTO, type BloqueEscena } from './modelo';
import { huellaPincel, type PincelEscena } from './pincel';
import { NOMBRES_PLAGA, type PlagaCelda, type TipoPlaga } from './render/plagas';
import { BIOMA_DEFECTO, type Bioma } from './render/entorno';
import { AGUA_MAX_MM, colorAgua, colorCultivo, coloresBase, detalleVista, NIVELES_VALIDACION, VISTAS_CLIMA, type ContextoVista, type DentroDeVentana, type VistaBase } from './vistas';
import { climaDeLaSemana, colorLuz, grados, LUZ_MAX_MJ, megajoules, NIVELES_TEMPERATURA, type RangoTemperatura } from './clima-vista';
import { problemasPorCultivo } from './problemas';
import { MarcaProblema } from './MarcaProblema';
import { rgbaPlaca } from './placa';
import { EscenaThree, ErrorWebGL } from './render/escena-three';
import { textoEscalaSuelo } from './suelo';
import './escena.css';

export interface EscenaParcelaProps {
  parcela: Parcela;
  /** Resultado del motor para la rotacion, escenario y ciclo elegidos; null si aun no hay. */
  resultado: ResultadoCeldas | null;
  /** Fecha de los registros a mostrar (slider de meses, A5.2). Por defecto, la primera. */
  fecha?: string;
  /** Suelo de la parcela (GET /api/suelo o selector manual): su tipo elige el tono y las losas (A2.12). */
  suelo?: Suelo | null;
  /** Avisos de usarDatosParcela (web/src/api/): clima de respaldo, suelo SUPUESTO, proxima temporada... */
  avisosDatos?: readonly AvisoDatos[];
  /**
   * Serie del balance del motor (cliente.serieBalance) de la misma rotacion y escenario que
   * `resultado`: de ahi sale la lluvia del dia que se dibuja. Sin serie, la escena no llueve.
   */
  serieBalance?: SerieBalance | null;
  /** Lugar de la mascota de Mafer (si existe su modelo). Por defecto, visible. */
  mascota?: boolean;
  className?: string;
  /** Solo para mediciones (vista previa, A5.4): recibe la escena three ya creada. */
  onEscena?: (escena: EscenaThree | null) => void;
  /**
   * 'panel' (por defecto): la escena con sus controles y leyenda en columna.
   * 'fondo': el lienzo cubre la pantalla y los controles van en un panel flotante compacto
   * (laboratorio por pasos). Los valores y la leyenda son los mismos en ambos.
   */
  modo?: 'panel' | 'fondo';
  /** Sin panel flotante (por ejemplo, cuando otra vista ocupa la pantalla). Solo en modo 'fondo'. */
  hud?: boolean;
  /** Brocha (PAINT_BLOCK): con valor, el clic o el dedo pinta en vez de girar. */
  pincel?: PincelEscena | null;
  /** Celdas pintadas que el motor aun no evalua, con el color del cultivo pintado. */
  marcas?: ReadonlyMap<string, string>;
  /** Corrimiento del centro de la vista en px (paneles encima del lienzo). */
  desplazamiento?: { x: number; y: number };
  /** Ventana local de siembra por cultivo y ciclo, para la vista de validacion (modo fondo). */
  dentroDeVentana?: DentroDeVentana | undefined;
  /**
   * Plagas ilustrativas por celda (modo fondo): con `comiendo` se dibujan insectos y hojas
   * mordidas; protegidas, nada. No cambian datos del motor.
   */
  plagas?: ReadonlyMap<string, PlagaCelda> | null | undefined;
  /** Nube de insecticida: se lanza cada vez que cambia `clave`. */
  rociado?: { celdas: readonly string[]; clave: number } | null | undefined;
  /** Nombres de plaga para el globo; por defecto, genericos por tipo. */
  nombresPlaga?: Partial<Record<TipoPlaga, string>> | undefined;
  /** Bioma del entorno decorativo (modo fondo): sale de Koppen-Geiger en el laboratorio; templado si no hay clima evaluable. */
  bioma?: Bioma | undefined;
  /** Serie climatica real de la parcela y rangos de temperatura por cultivo (FAO EcoCrop): con ellas, en el paso Escenarios, hay vistas de luz y temperatura. */
  serieClima?: SerieClima | null | undefined;
  /** Serie del motor solo para ubicar la fecha en el clima real: habilita las vistas de luz y temperatura en pasos donde no hay lluvia ni cielo por clima (Cultivos). */
  serieVistas?: SerieBalance | null | undefined;
  rangosTemperatura?: Readonly<Record<string, RangoTemperatura>> | undefined;
  /** Temperatura media tipica por dia del ano (climatologia de la parcela): con la lluvia del dia decide el color del cielo. */
  tMediaDia?: readonly (number | null)[] | undefined;
}

const NOMBRE_VISTA: Record<VistaBase, string> = {
  get cultivo() { return tt('vista.cultivo'); }, get validacion() { return tt('vista.validacion'); }, get agua() { return tt('vista.agua'); },
  get luz() { return tt('vista.luz'); }, get temperatura() { return tt('vista.temperatura'); },
};
const AYUDA_VISTA: Record<VistaBase, string> = {
  get cultivo() { return tt('vistaAyuda.cultivo'); },
  get validacion() { return tt('vistaAyuda.validacion'); },
  get agua() { return tt('vistaAyuda.agua'); },
  get luz() { return tt('vistaAyuda.luz'); },
  get temperatura() { return tt('vistaAyuda.temperatura'); },
};

const SIN_MARCAS: ReadonlyMap<string, string> = new Map();

function prefiereMenosMovimiento(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function MuestraEstado({ entrada }: { entrada: EntradaLeyenda }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const img = rgbaPlaca(entrada);
    ctx.putImageData(new ImageData(new Uint8ClampedArray(img.datos), img.ancho, img.alto), 0, 0);
  }, [entrada]);
  return <canvas ref={ref} className="escena-muestra" width={32} height={32} aria-hidden="true" />;
}

export function EscenaParcela({ parcela, resultado, fecha, suelo = null, avisosDatos = [], serieBalance = null, mascota = true, className = '', onEscena, modo = 'panel', hud = true, pincel = null, marcas = SIN_MARCAS, desplazamiento, dentroDeVentana, plagas = null, rociado = null, nombresPlaga, bioma = BIOMA_DEFECTO, tMediaDia, serieClima = null, serieVistas = null, rangosTemperatura }: EscenaParcelaProps) {
  useIdioma(); // se vuelve a dibujar el HUD al cambiar de idioma
  const lienzo = useRef<HTMLCanvasElement>(null);
  const escena = useRef<EscenaThree | null>(null);
  const [exageracion, setExageracion] = useState(EXAGERACION_VERTICAL_DEFECTO);
  const [reducirMovimiento, setReducirMovimiento] = useState(prefiereMenosMovimiento);
  const [viento, setViento] = useState(false);

  // Si el sistema pide menos movimiento mientras la escena esta abierta, se respeta al momento.
  useEffect(() => {
    let consulta: MediaQueryList;
    try {
      consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    } catch {
      return;
    }
    const cambio = () => {
      if (consulta.matches) setReducirMovimiento(true);
    };
    consulta.addEventListener('change', cambio);
    return () => consulta.removeEventListener('change', cambio);
  }, []);
  const [seleccion, setSeleccion] = useState<BloqueEscena | null>(null);
  // Nivel de graficos: lo guarda el navegador; cambia resolucion, aves y viento y el tope de insectos, nunca los datos.
  const [nivelGraficos, setNivelGraficos] = useState<NivelGraficos>(leerNivelGuardado);
  const elegirNivel = (n: NivelGraficos) => { setNivelGraficos(n); guardarNivel(n); };
  const [hover, setHover] = useState<{ bloque: BloqueEscena; x: number; y: number } | null>(null);
  const [avisosRender, setAvisosRender] = useState<Advertencia[]>([]);
  const [sinWebGL, setSinWebGL] = useState(false);
  const [contexto, setContexto] = useState<'perdido' | 'restaurado' | null>(null);

  // Si el navegador quita el contexto WebGL y no lo devuelve en 5 s, la escena se rinde
  // y avisa que se use el modo 2D (los valores son los mismos).
  useEffect(() => {
    if (contexto !== 'perdido') return;
    const t = setTimeout(() => setSinWebGL(true), 5000);
    return () => clearTimeout(t);
  }, [contexto]);

  const modelo = useMemo(
    () => construirEscena(parcela, resultado, { exageracionVertical: exageracion, suelo, ...(fecha ? { fecha } : {}) }),
    [parcela, resultado, fecha, exageracion, suelo],
  );
  const leyenda = useMemo(() => entradasLeyenda(modelo), [modelo]);
  // La serie solo vale si es de la misma rotacion y escenario que el resultado que se dibuja.
  const serieValida =
    serieBalance && resultado && serieBalance.rotacionId === resultado.rotacionId && serieBalance.escenario === resultado.escenario ? serieBalance : null;
  const lluvia = useMemo(() => lluviaDelDia(serieValida, modelo.fecha), [serieValida, modelo.fecha]);
  const intensidadLluvia = lluvia?.estado === 'con_dato' ? lluvia.intensidad : 0;
  // Cielo segun el clima de la fecha: lluvia del dia y, sin lluvia, la epoca del ano frente a la propia parcela.
  const climaDelFondo = useMemo(
    () => climaFondo(lluvia?.estado === 'con_dato' ? lluvia.clase : null, epocaRelativa(tMediaDia, modelo.fecha)),
    [lluvia, tMediaDia, modelo.fecha],
  );

  // Luz y temperatura (paso Escenarios): el clima real de la semana que corresponde a la fecha; solo si la escena tiene la serie del escenario.
  const serieDeVistas = serieValida ?? (serieVistas && resultado && serieVistas.rotacionId === resultado.rotacionId && serieVistas.escenario === resultado.escenario ? serieVistas : null);
  const lluviaVistas = useMemo(() => (serieDeVistas === serieValida ? lluvia : lluviaDelDia(serieDeVistas, modelo.fecha)), [serieDeVistas, serieValida, lluvia, modelo.fecha]);
  const tieneClima = modo === 'fondo' && !!serieDeVistas && !!serieClima;
  const climaSemana = useMemo(() => (tieneClima ? climaDeLaSemana(serieClima, lluviaVistas?.estado === 'con_dato' ? lluviaVistas.fechaClima : null) : null), [tieneClima, serieClima, lluviaVistas]);
  const contextoVista = useMemo<ContextoVista>(() => ({ clima: climaSemana, rangos: rangosTemperatura ?? {} }), [climaSemana, rangosTemperatura]);
  // Mini marca por cultivo con problemas (un grupo de celdas de la misma planta = una marca).
  const problemas = useMemo(() => problemasPorCultivo(modelo.bloques.map((b) => ({ cultivo: b.cultivo, ...(b.registro ?? {}) }))), [modelo]);

  // Brocha: el trazo en curso vive aqui; al soltar se entrega al plan (pincel.onTrazo).
  const [trazo, setTrazo] = useState<ReadonlySet<string>>(() => new Set());
  const trazoRef = useRef<Set<string>>(new Set());
  const pincelRef = useRef(pincel);
  const modeloRef = useRef<typeof modelo | null>(null);
  pincelRef.current = pincel;
  const [vista, setVista] = useState<VistaBase | null>(null);
  const [azimut, setAzimut] = useState(45);
  const onPintar = useMemo(
    () => (bloque: BloqueEscena | null, fase: 'inicio' | 'trazo' | 'fin') => {
      const p = pincelRef.current;
      const m = modeloRef.current;
      if (!p || !m) return;
      if (fase === 'inicio') trazoRef.current = new Set();
      if (bloque) for (const id of huellaPincel(m.bloques, bloque, p.tamano)) trazoRef.current.add(id);
      if (fase === 'fin') {
        const celdas = [...trazoRef.current];
        trazoRef.current = new Set();
        setTrazo(new Set());
        if (celdas.length) p.onTrazo(celdas);
      } else {
        setTrazo(new Set(trazoRef.current));
      }
    },
    [],
  );

  const opciones = useMemo(
    () => ({
      reducirMovimiento,
      viento,
      mascota,
      pincel: !!pincel,
      onPintar,
      onAzimut: setAzimut,
      pastoSinCultivo: modo === 'fondo',
      entorno: modo === 'fondo',
      enfocarAlElegir: modo === 'fondo',
      bioma,
      nivelGraficos,
      ...(desplazamiento ? { desplazamiento } : {}),
      onSeleccion: setSeleccion,
      onContexto: (estado: 'perdido' | 'restaurado') => setContexto(estado),
      onHover: (bloque: BloqueEscena | null, x: number, y: number) => setHover(bloque ? { bloque, x, y } : null),
      onAviso: (codigo: string, mensaje: string) =>
        setAvisosRender((prev) => (prev.some((a) => a.mensaje === mensaje) ? prev : [...prev, { codigo, mensaje, severidad: 'aviso' }])),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reducirMovimiento, viento, mascota, !!pincel, onPintar, desplazamiento?.x, desplazamiento?.y, bioma, nivelGraficos],
  );

  useEffect(() => {
    if (!lienzo.current) return;
    try {
      escena.current = new EscenaThree(lienzo.current, opciones);
      onEscena?.(escena.current);
    } catch (e) {
      if (e instanceof ErrorWebGL) setSinWebGL(true);
      else throw e;
    }
    return () => {
      escena.current?.dispose();
      escena.current = null;
      onEscena?.(null);
    };
    // Se crea una sola vez; las opciones se actualizan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    escena.current?.setOpciones(opciones);
  }, [opciones]);

  useEffect(() => {
    modeloRef.current = modelo;
    // La seleccion se conserva si la celda sigue en la escena (otra fecha, ciclo o escenario).
    setSeleccion((prev) => (prev ? (modelo.bloques.find((b) => b.celdaId === prev.celdaId) ?? null) : null));
    setHover(null);
    setAvisosRender([]);
    escena.current?.actualizar(modelo);
  }, [modelo]);

  const elegir = (b: BloqueEscena | null) => {
    setSeleccion(b);
    escena.current?.elegirCelda(b);
  };
  const ficha = seleccion ? fichaBloque(seleccion) : null;
  const noRecomendados = modelo.bloques.filter((b) => b.noRecomendadoEnLugar).length;
  const mover = (dx: number, dz: number) => {
    const actual = seleccion ?? bloqueCentral(modelo.bloques);
    if (actual) elegir(seleccion ? vecino(modelo.bloques, actual, dx, dz) : actual);
  };

  useEffect(() => {
    escena.current?.setLluvia(intensidadLluvia);
  }, [intensidadLluvia, modelo]);

  // Marcas: lo pintado que espera al motor mas el trazo en curso.
  const colorPincel = pincel?.color;
  useEffect(() => {
    if (!marcas.size && !trazo.size) {
      escena.current?.marcarPintura(SIN_MARCAS);
      return;
    }
    const todas = new Map(marcas);
    for (const id of trazo) todas.set(id, colorPincel ?? '#ffffff');
    escena.current?.marcarPintura(todas);
  }, [marcas, trazo, colorPincel, modelo]);

  // Vista de la base: solo en modo fondo; sin vista, el suelo vuelve a su color por humedad.
  const coloresVista = useMemo(() => (modo === 'fondo' && vista ? coloresBase(modelo.bloques, vista, dentroDeVentana, contextoVista) : null), [modo, vista, modelo, dentroDeVentana, contextoVista]);
  // Las vistas de clima solo existen con la serie del escenario: si se pierde (otro paso), se vuelve al suelo por humedad.
  useEffect(() => { if (vista && VISTAS_CLIMA.includes(vista) && !tieneClima) setVista(null); }, [vista, tieneClima]);
  useEffect(() => {
    escena.current?.colorearBase(coloresVista);
  }, [coloresVista]);

  // Plagas ilustrativas y nube de insecticida (solo modo fondo).
  useEffect(() => {
    escena.current?.setPlagas(modo === 'fondo' ? plagas : null);
  }, [plagas, modo]);
  const claveRociado = rociado?.clave;
  useEffect(() => {
    if (modo === 'fondo' && rociado && rociado.celdas.length) escena.current?.rociar(rociado.celdas);
    // Solo cuando cambia la clave: las mismas celdas no se rocian dos veces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveRociado]);

  // Teclado con pincel: Enter o espacio pintan alrededor de la celda elegida.
  const pintarConTeclado = () => {
    const actual = seleccion ?? bloqueCentral(modelo.bloques);
    if (!pincel || !actual) return;
    pincel.onTrazo(huellaPincel(modelo.bloques, actual, pincel.tamano));
  };

  const avisos = [...modelo.avisos, ...avisosRender];
  const criticos = avisos.filter((a) => a.severidad === 'critico');
  // Los avisos del terreno van en la franja de datos, no repetidos en la lista general.
  const otros = avisos.filter((a) => a.severidad !== 'critico' && !CODIGOS_TERRENO.has(a.codigo));
  const fondo = modo === 'fondo';

  const avisosCriticos = criticos.map((a) => (
    <p key={a.codigo + a.mensaje} className="escena-aviso escena-aviso-critico" role="note">
      <strong>{a.codigo === 'DATOS_DE_EJEMPLO' ? tt('esc3d.datosEjemplo') : tt('esc3d.aviso')}:</strong> {a.mensaje}
    </p>
  ));

  const lienzoCaja = (
    <div className="escena-lienzo-caja">
      {sinWebGL ? (
        <div className="escena-sin-webgl" role="alert">
          <strong>{contexto === 'perdido' ? 'Se perdió la escena 3D (el navegador quitó el contexto WebGL).' : 'WebGL no esta disponible.'}</strong>
          <p>La escena 3D no puede dibujarse en este equipo. Usa el modo 2D; los valores son los mismos.</p>
        </div>
      ) : (
        <canvas
          ref={lienzo}
          className={`escena-lienzo${pincel ? ' escena-lienzo-pincel' : ''}`}
          tabIndex={0}
          aria-label={
            pincel
              ? 'Parcela en 3D, modo brocha. Arrastra para pintar celdas; clic derecho o dos dedos para girar, rueda o pellizca para acercar. Teclado: W A S D o flechas desplazan, Q y E giran, mas y menos acercan, Inicio restablece; Enter pinta alrededor de la celda elegida; Mayúsculas y flechas eligen la celda vecina.'
              : 'Parcela en 3D. Arrastra para desplazar, clic derecho o dos dedos para girar, rueda o pellizca para acercar, doble clic para ir a una celda. Teclado: W A S D o flechas desplazan, Q y E giran, mas y menos acercan, Inicio restablece. Toca un bloque o pulsa Enter para ver su estado; Mayúsculas y flechas eligen la celda vecina; Escape quita la seleccion. La lista de celdas permite elegir cualquier celda.'
          }
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && pincel) {
              e.preventDefault();
              pintarConTeclado();
            } else if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              elegir(seleccion ?? bloqueCentral(modelo.bloques));
            } else if (e.key === 'Escape') {
              elegir(null);
            } else if (e.shiftKey && e.key.startsWith('Arrow')) {
              // Mayusculas + flechas: celda vecina (las flechas solas desplazan la camara).
              e.preventDefault();
              e.stopPropagation();
              const d: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
              const [dx, dz] = d[e.key] ?? [0, 0];
              mover(dx, dz);
            }
          }}
        />
      )}
      {lluvia && (
        <p className={`escena-lluvia escena-lluvia-${lluvia.estado === 'con_dato' ? lluvia.clase : 'sin_dato'}`} role="status">
          {textoLluvia(lluvia)}
        </p>
      )}
      {hover && !sinWebGL && !fondo && (
        <div className="escena-globo" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
          <strong>{hover.bloque.celdaId}</strong> {fichaBloque(hover.bloque).resumen}
        </div>
      )}
    </div>
  );

  const controles = (
    <div className="escena-controles">
      <label className="escena-control">
        <span>
          Exageracion vertical: <strong>x{exageracion}</strong>
        </span>
        <input type="range" min={1} max={30} step={1} value={exageracion} onChange={(e) => setExageracion(Number(e.target.value))} />
      </label>
      <label className="escena-control escena-check">
        <input type="checkbox" checked={reducirMovimiento} onChange={(e) => setReducirMovimiento(e.target.checked)} />
        <span>Reducir movimiento</span>
      </label>
      <label className="escena-control escena-check">
        <input type="checkbox" checked={viento && !reducirMovimiento} disabled={reducirMovimiento} onChange={(e) => setViento(e.target.checked)} />
        <span>Viento leve{reducirMovimiento ? ' (apagado: reducir movimiento)' : ''}</span>
      </label>
      <div className="escena-flechas" role="group" aria-label="Girar la vista">
        <button type="button" className="escena-boton" onClick={() => escena.current?.girar(-45)} disabled={sinWebGL} aria-label="Girar a la izquierda (Q)">↺</button>
        <button type="button" className="escena-boton" onClick={() => escena.current?.girar(45)} disabled={sinWebGL} aria-label="Girar a la derecha (E)">↻</button>
      </div>
      <button type="button" className="escena-boton" onClick={() => escena.current?.restablecerVista(true)} disabled={sinWebGL}>
        Restablecer vista
      </button>
      <p className="escena-detalle">Arrastra para desplazar; clic derecho o dos dedos para girar; rueda o pellizco para acercar (la vista se inclina al acercar); doble clic para ir a una celda. Teclado: W A S D, Q y E, + y −, Inicio.</p>
    </div>
  );

  const fichaPanel = (
    <div className="escena-ficha">
      <div className="escena-elegir">
        <label className="escena-control">
          <span>Celda</span>
          <select value={seleccion?.celdaId ?? ''} onChange={(e) => elegir(modelo.bloques.find((b) => b.celdaId === e.target.value) ?? null)}>
            <option value="">Elige una celda</option>
            {modelo.bloques.map((b) => (
              <option key={b.celdaId} value={b.celdaId}>
                {b.celdaId} · {fichaBloque(b).resumen}
              </option>
            ))}
          </select>
        </label>
        <div className="escena-flechas" role="group" aria-label="Moverse a la celda vecina">
          <button type="button" className="escena-boton" onClick={() => mover(0, -1)} aria-label="Celda al norte">N</button>
          <button type="button" className="escena-boton" onClick={() => mover(-1, 0)} aria-label="Celda al oeste">O</button>
          <button type="button" className="escena-boton" onClick={() => mover(1, 0)} aria-label="Celda al este">E</button>
          <button type="button" className="escena-boton" onClick={() => mover(0, 1)} aria-label="Celda al sur">S</button>
        </div>
      </div>
      <div aria-live="polite" className="escena-ficha-cuerpo">
        {ficha ? (
          <>
            <h3>{ficha.titulo}</h3>
            <dl>
              {ficha.filas.map((f) => (
                <div key={f.etiqueta} className={f.faltante ? 'escena-faltante' : undefined}>
                  <dt>{f.etiqueta}</dt>
                  <dd>
                    {f.valor}
                    {f.nota && <span className="escena-detalle">{f.faltante ? `Falta: ${f.nota}` : f.nota}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <p className="escena-detalle">Toca o haz clic en un bloque, o elige una celda en la lista, para ver sus valores.</p>
        )}
      </div>
    </div>
  );

  const leyendaPanel = (
    <div className="escena-leyenda">
      <h3>Leyenda{modelo.fecha ? ` · ${modelo.fecha}` : ''}</h3>
      <ul>
        {leyenda.map((e) => (
          <li key={e.clave}>
            <MuestraEstado entrada={e} />
            <span aria-hidden="true">
              <strong>{e.etiqueta}</strong> <span className="escena-cuenta">({e.celdas})</span>
              <span className="escena-detalle">{e.descripcionPatron}</span>
            </span>
            <span className="sr-only">{e.textoAccesible}</span>
          </li>
        ))}
      </ul>
      {noRecomendados > 0 && (
        <p className="escena-detalle">
          Banderin blanco con borde negro: cultivo no recomendado en el lugar segun la fuente local ({noRecomendados} {noRecomendados === 1 ? 'celda' : 'celdas'}).
        </p>
      )}
      <p className="escena-detalle">
        Cada celda se dibuja como un manchón de plantas en surcos: la densidad es visual, no a escala. La celda elegida muestra el modelo detallado de su planta.
      </p>
      <p className="escena-detalle">{textoEscalaSuelo(modelo.grupoSuelo)}</p>
      <p className="escena-detalle">
        Lluvia del día (serie del motor, mm/día): llovizna desde {CORTES_LLUVIA.minimaMm} mm, moderada desde {CORTES_LLUVIA.moderadaDesdeMm} mm,
        fuerte desde {CORTES_LLUVIA.fuerteDesdeMm} mm; más gotas con más lluvia. Sin dato no se dibuja lluvia.
        {reducirMovimiento ? ' Con reducir movimiento solo se muestra el texto, sin animación.' : ''}
      </p>
    </div>
  );

  const avisosOtros = otros.length > 0 && (
    <ul className="escena-avisos">
      {otros.map((a) => (
        <li key={a.codigo + a.mensaje} className={`escena-aviso escena-aviso-${a.severidad}`}>
          {a.mensaje}
        </li>
      ))}
    </ul>
  );

  const listaCeldas = (
    <details className="escena-lista">
      <summary>Lista de celdas en texto ({modelo.bloques.length})</summary>
      <ul>
        {modelo.bloques.map((b) => (
          <li key={b.celdaId}>{describirBloque(b)}</li>
        ))}
      </ul>
    </details>
  );

  if (fondo) {
    const leyendaCelda = describirCelda(parcela.tamanoCeldaM);
    const presentes = vista === 'cultivo' ? [...new Set(modelo.bloques.map((b) => b.cultivo).filter((c): c is string => !!c))] : [];
    const sinDato = vista ? modelo.bloques.length - (coloresVista?.size ?? 0) : 0;
    const globo = (b: BloqueEscena) => {
      const d = vista ? detalleVista(b, vista, dentroDeVentana, contextoVista) : { titulo: fichaBloque(b).resumen, lineas: [tt('esc3d.celda', { id: b.celdaId })] };
      const plaga = plagas?.get(b.celdaId) as (PlagaCelda & { nombre?: string }) | undefined;
      const lineaPlaga = plaga ? tt('esc3d.plaga', { nombre: plaga.nombre ?? nombresPlaga?.[plaga.tipo] ?? NOMBRES_PLAGA[plaga.tipo], estado: plaga.comiendo ? tt('esc3d.sinTratar') : tt('esc3d.tratada') }) : null;
      return <><strong>{d.titulo}</strong>{d.lineas.map((l) => <span key={l}>{l}</span>)}{lineaPlaga && <span className={plaga!.comiendo ? 'escena-globo-plaga' : undefined}>{lineaPlaga}</span>}</>;
    };
    return (
      <section className={`escena escena-fondo escena-bioma-${bioma} escena-clima-${climaDelFondo} ${className}`} data-clima={NOMBRE_CLIMA_FONDO[climaDelFondo]} aria-label={tt('esc3d.escena')} style={{ '--escena-centro-x': `${desplazamiento?.x ?? 0}px` } as CSSProperties}>
        {lienzoCaja}
        {hover && !sinWebGL && (
          <div className={`escena-globo escena-globo-vista${vista ? ` escena-globo-${vista}` : ''}`} style={{ left: hover.x, top: hover.y }} aria-hidden="true">
            {globo(hover.bloque)}
          </div>
        )}
        {hud && (
          <div className="escena-hud">
            {seleccion && !pincel && (
              <div className="escena-hud-panel escena-hud-ficha" role="region" aria-label={tt('esc3d.celdaElegida')} aria-live="polite">
                <div className="escena-hud-cabeza">
                  <p>{tt('esc3d.celda', { id: seleccion.celdaId })}</p>
                  <button type="button" className="escena-hud-cerrar" onClick={() => elegir(null)} aria-label={tt('esc3d.cerrarFicha')}>×</button>
                </div>
                <div className="escena-hud-globo">{globo(seleccion)}</div>
              </div>
            )}
            {vista && (
              <div className="escena-hud-panel escena-escala" role="region" aria-label={tt('esc3d.escalaVista', { vista: NOMBRE_VISTA[vista] })}>
                <p className="escena-escala-titulo">{NOMBRE_VISTA[vista]}</p>
                {vista === 'cultivo' && (
                  <ul className="escena-escala-lista">
                    {presentes.map((c) => { const pr = problemas.find((x) => x.cultivo === c); return <li key={c}><span className="escena-escala-muestra" style={{ background: colorCultivo(c) }} />{nombreCultivo(c)}{pr && <MarcaProblema problema={pr} nombre={nombreCultivo(c)} />}</li>; })}
                    {presentes.length === 0 && <li>{tt('esc3d.sinCultivos')}</li>}
                  </ul>
                )}
                {vista === 'validacion' && (
                  <>
                    <ul className="escena-escala-pasos">
                      {[...NIVELES_VALIDACION].reverse().map((n) => <li key={n.nivel} style={{ background: n.color }} title={n.etiqueta} />)}
                    </ul>
                    <div className="escena-escala-extremos"><span>{tt('esc3d.muyMalaIdea')}</span><span>{tt('esc3d.muyBuena')}</span></div>
                    <p className="escena-detalle">{tt('esc3d.validacionAyuda')}</p>
                  </>
                )}
                {vista === 'agua' && (
                  <>
                    <div className="escena-escala-degradado" style={{ background: `linear-gradient(90deg, ${colorAgua(0)}, ${colorAgua(AGUA_MAX_MM)})` }} />
                    <div className="escena-escala-extremos"><span>{tt('esc3d.mmDia', { n: 0 })}</span><span>{tt('esc3d.mmDiaMas', { n: AGUA_MAX_MM })}</span></div>
                    <p className="escena-detalle">{tt('esc3d.aguaAyuda')}</p>
                  </>
                )}
                {vista === 'luz' && (
                  <>
                    <div className="escena-escala-degradado" style={{ background: `linear-gradient(90deg, ${colorLuz(0)}, ${colorLuz(LUZ_MAX_MJ)})` }} />
                    <div className="escena-escala-extremos"><span>0</span><span>{tt('esc3d.mjDia', { n: LUZ_MAX_MJ })}</span></div>
                    <p className="escena-detalle">{climaSemana?.radiacionMjM2Dia == null ? tt('esc3d.sinRadiacion') : tt('esc3d.estaSemana', { valor: megajoules(climaSemana.radiacionMjM2Dia) })}{tt('esc3d.luzAyuda')}</p>
                  </>
                )}
                {vista === 'temperatura' && (
                  <>
                    <ul className="escena-escala-pasos">
                      {NIVELES_TEMPERATURA.map((n) => <li key={n.nivel} style={{ background: n.color }} title={n.etiqueta} />)}
                    </ul>
                    <div className="escena-escala-extremos"><span>{tt('esc3d.frio')}</span><span>{tt('esc3d.calor')}</span></div>
                    <p className="escena-detalle">{climaSemana?.tMediaC == null ? tt('esc3d.sinTemperatura') : tt('esc3d.mediaSemana', { valor: grados(climaSemana.tMediaC) })}{tt('esc3d.temperaturaAyuda')}</p>
                  </>
                )}
                {sinDato > 0 && <p className="escena-detalle">{tt('esc3d.sinColor', { n: sinDato, celdas: sinDato === 1 ? tt('esc3d.celdaS') : tt('esc3d.celdasP') })}</p>}
              </div>
            )}
            <div className="escena-hud-graficos" role="radiogroup" aria-label={tt('esc3d.nivelGraficos')}>
              <span>{tt('esc3d.graficos')}</span>
              {NIVELES_GRAFICOS.map((n) => (
                <button key={n} type="button" role="radio" aria-checked={nivelGraficos === n} title={AJUSTES_GRAFICOS[n].detalle} onClick={() => elegirNivel(n)}>{NOMBRE_NIVEL_GRAFICOS[n]}</button>
              ))}
            </div>
            {leyendaCelda && <p className="escena-hud-escala-celda" role="note" aria-label={tt('esc3d.escalaCelda')}>
              <span className="escena-escala-regla" aria-hidden="true" />{textoCelda(leyendaCelda)}
            </p>}
            <div className="escena-hud-barra" role="toolbar" aria-label={tt('esc3d.vistas')}>
              {(tieneClima ? (['cultivo', 'validacion', 'agua', 'luz', 'temperatura'] as const) : (['cultivo', 'validacion', 'agua'] as const)).map((v) => (
                <button key={v} type="button" aria-pressed={vista === v} onClick={() => setVista((a) => (a === v ? null : v))} title={AYUDA_VISTA[v]}>
                  <span className={`escena-vista-icono escena-vista-${v}`} aria-hidden="true" />{NOMBRE_VISTA[v]}
                </button>
              ))}
              <span className="escena-hud-separador" aria-hidden="true" />
              <button type="button" className="escena-brujula" onClick={() => escena.current?.restablecerVista(true)} disabled={sinWebGL} aria-label={tt('esc3d.brujula', { azimut })} title={tt('esc3d.brujulaTitulo')}>
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ transform: `rotate(${azimut}deg)` }}>
                  <path d="M12 3 15.5 12H8.5Z" fill="#b5452f" /><path d="M12 21 8.5 12h7Z" fill="currentColor" opacity=".45" /><circle cx="12" cy="12" r="1.6" fill="#fff" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={`escena ${className}`} aria-label="Escena 3D de la parcela">
      {avisosCriticos}
      <AvisosDatos avisos={avisosDatos} advertenciasParcela={parcela.advertencias ?? []} />
      {lienzoCaja}
      {controles}
      {fichaPanel}
      {leyendaPanel}
      {avisosOtros}
      {listaCeldas}
    </section>
  );
}
