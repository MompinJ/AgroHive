// Componente React de la escena 3D (A3.1, A3.2; base de A3.3). Recibe la
// parcela y el resultado del motor tal cual (contratos) y solo los representa.
// Punto de integracion propuesto: ver web/src/escena/INTEGRACION.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Advertencia, Parcela, ResultadoCeldas, SerieBalance, Suelo } from '../../../contratos/tipos/contratos';
import { CORTES_LLUVIA, lluviaDelDia, textoLluvia } from './lluvia';
import { construirEscena } from './adaptador';
import type { AvisoDatos } from '../api/datosParcela';
import { CODIGOS_TERRENO } from './avisos-datos';
import { AvisosDatos } from './AvisosDatos';
import { bloqueCentral, fichaBloque, vecino } from './ficha';
import { describirBloque, entradasLeyenda, type EntradaLeyenda } from './leyenda';
import { EXAGERACION_VERTICAL_DEFECTO, type BloqueEscena } from './modelo';
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
}

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

export function EscenaParcela({ parcela, resultado, fecha, suelo = null, avisosDatos = [], serieBalance = null, mascota = true, className = '', onEscena }: EscenaParcelaProps) {
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
  const [hover, setHover] = useState<{ bloque: BloqueEscena; x: number; y: number } | null>(null);
  const [avisosRender, setAvisosRender] = useState<Advertencia[]>([]);
  const [sinWebGL, setSinWebGL] = useState(false);

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

  const opciones = useMemo(
    () => ({
      reducirMovimiento,
      viento,
      mascota,
      onSeleccion: setSeleccion,
      onHover: (bloque: BloqueEscena | null, x: number, y: number) => setHover(bloque ? { bloque, x, y } : null),
      onAviso: (codigo: string, mensaje: string) =>
        setAvisosRender((prev) => (prev.some((a) => a.mensaje === mensaje) ? prev : [...prev, { codigo, mensaje, severidad: 'aviso' }])),
    }),
    [reducirMovimiento, viento, mascota],
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
    // La seleccion se conserva si la celda sigue en la escena (otra fecha, ciclo o escenario).
    setSeleccion((prev) => (prev ? (modelo.bloques.find((b) => b.celdaId === prev.celdaId) ?? null) : null));
    setHover(null);
    setAvisosRender([]);
    escena.current?.actualizar(modelo);
  }, [modelo]);

  const elegir = (b: BloqueEscena | null) => {
    setSeleccion(b);
    escena.current?.seleccionar(b);
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

  const avisos = [...modelo.avisos, ...avisosRender];
  const criticos = avisos.filter((a) => a.severidad === 'critico');
  // Los avisos del terreno van en la franja de datos, no repetidos en la lista general.
  const otros = avisos.filter((a) => a.severidad !== 'critico' && !CODIGOS_TERRENO.has(a.codigo));

  return (
    <section className={`escena ${className}`} aria-label="Escena 3D de la parcela">
      {criticos.map((a) => (
        <p key={a.codigo + a.mensaje} className="escena-aviso escena-aviso-critico" role="note">
          <strong>{a.codigo === 'DATOS_DE_EJEMPLO' ? 'Datos de ejemplo' : 'Aviso'}:</strong> {a.mensaje}
        </p>
      ))}

      <AvisosDatos avisos={avisosDatos} advertenciasParcela={parcela.advertencias ?? []} />

      <div className="escena-lienzo-caja">
        {sinWebGL ? (
          <div className="escena-sin-webgl" role="alert">
            <strong>WebGL no esta disponible.</strong>
            <p>La escena 3D no puede dibujarse en este equipo. Usa el modo 2D; los valores son los mismos.</p>
          </div>
        ) : (
          <canvas
            ref={lienzo}
            className="escena-lienzo"
            tabIndex={0}
            aria-label="Parcela en 3D. Arrastra para girar, rueda o pellizca para acercar, flechas para desplazar. Toca un bloque o pulsa Enter para ver su estado; Escape quita la seleccion. La lista de celdas de abajo permite elegir cualquier celda."
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elegir(seleccion ?? bloqueCentral(modelo.bloques));
              } else if (e.key === 'Escape') {
                elegir(null);
              }
            }}
          />
        )}
        {lluvia && (
          <p className={`escena-lluvia escena-lluvia-${lluvia.estado === 'con_dato' ? lluvia.clase : 'sin_dato'}`} role="status">
            {textoLluvia(lluvia)}
          </p>
        )}
        {hover && !sinWebGL && (
          <div className="escena-globo" style={{ left: hover.x, top: hover.y }} aria-hidden="true">
            <strong>{hover.bloque.celdaId}</strong> {fichaBloque(hover.bloque).resumen}
          </div>
        )}
      </div>

      <div className="escena-controles">
        <label className="escena-control">
          <span>
            Exageracion vertical: <strong>x{exageracion}</strong>
          </span>
          <input
            type="range"
            min={1}
            max={30}
            step={1}
            value={exageracion}
            onChange={(e) => setExageracion(Number(e.target.value))}
          />
        </label>
        <label className="escena-control escena-check">
          <input type="checkbox" checked={reducirMovimiento} onChange={(e) => setReducirMovimiento(e.target.checked)} />
          <span>Reducir movimiento</span>
        </label>
        <label className="escena-control escena-check">
          <input type="checkbox" checked={viento && !reducirMovimiento} disabled={reducirMovimiento} onChange={(e) => setViento(e.target.checked)} />
          <span>Viento leve{reducirMovimiento ? ' (apagado: reducir movimiento)' : ''}</span>
        </label>
        <button type="button" className="escena-boton" onClick={() => escena.current?.restablecerVista()} disabled={sinWebGL}>
          Restablecer vista
        </button>
      </div>

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

      {otros.length > 0 && (
        <ul className="escena-avisos">
          {otros.map((a) => (
            <li key={a.codigo + a.mensaje} className={`escena-aviso escena-aviso-${a.severidad}`}>
              {a.mensaje}
            </li>
          ))}
        </ul>
      )}

      <details className="escena-lista">
        <summary>Lista de celdas en texto ({modelo.bloques.length})</summary>
        <ul>
          {modelo.bloques.map((b) => (
            <li key={b.celdaId}>{describirBloque(b)}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
