// Componente React de la escena 3D (A3.1, A3.2; base de A3.3). Recibe la
// parcela y el resultado del motor tal cual (contratos) y solo los representa.
// Punto de integracion propuesto: ver web/src/escena/INTEGRACION.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Advertencia, Parcela, ResultadoCeldas } from '../../../contratos/tipos/contratos';
import { construirEscena } from './adaptador';
import { describirBloque, entradasLeyenda, type EntradaLeyenda } from './leyenda';
import { EXAGERACION_VERTICAL_DEFECTO, type BloqueEscena } from './modelo';
import { rgbaPlaca } from './placa';
import { EscenaThree, ErrorWebGL } from './render/escena-three';
import { TEXTO_ESCALA_SUELO } from './suelo';
import './escena.css';

export interface EscenaParcelaProps {
  parcela: Parcela;
  /** Resultado del motor para la rotacion, escenario y ciclo elegidos; null si aun no hay. */
  resultado: ResultadoCeldas | null;
  /** Fecha de los registros a mostrar (slider de meses, A5.2). Por defecto, la primera. */
  fecha?: string;
  className?: string;
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

export function EscenaParcela({ parcela, resultado, fecha, className = '' }: EscenaParcelaProps) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const escena = useRef<EscenaThree | null>(null);
  const [exageracion, setExageracion] = useState(EXAGERACION_VERTICAL_DEFECTO);
  const [reducirMovimiento, setReducirMovimiento] = useState(prefiereMenosMovimiento);
  const [seleccion, setSeleccion] = useState<BloqueEscena | null>(null);
  const [avisosRender, setAvisosRender] = useState<Advertencia[]>([]);
  const [sinWebGL, setSinWebGL] = useState(false);

  const modelo = useMemo(
    () => construirEscena(parcela, resultado, { exageracionVertical: exageracion, ...(fecha ? { fecha } : {}) }),
    [parcela, resultado, fecha, exageracion],
  );
  const leyenda = useMemo(() => entradasLeyenda(modelo), [modelo]);

  const opciones = useMemo(
    () => ({
      reducirMovimiento,
      onSeleccion: setSeleccion,
      onAviso: (codigo: string, mensaje: string) =>
        setAvisosRender((prev) => (prev.some((a) => a.mensaje === mensaje) ? prev : [...prev, { codigo, mensaje, severidad: 'aviso' }])),
    }),
    [reducirMovimiento],
  );

  useEffect(() => {
    if (!lienzo.current) return;
    try {
      escena.current = new EscenaThree(lienzo.current, opciones);
    } catch (e) {
      if (e instanceof ErrorWebGL) setSinWebGL(true);
      else throw e;
    }
    return () => {
      escena.current?.dispose();
      escena.current = null;
    };
    // Se crea una sola vez; las opciones se actualizan en el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    escena.current?.setOpciones(opciones);
  }, [opciones]);

  useEffect(() => {
    setSeleccion(null);
    setAvisosRender([]);
    escena.current?.actualizar(modelo);
  }, [modelo]);

  const avisos = [...modelo.avisos, ...avisosRender];
  const criticos = avisos.filter((a) => a.severidad === 'critico');
  const otros = avisos.filter((a) => a.severidad !== 'critico');

  return (
    <section className={`escena ${className}`} aria-label="Escena 3D de la parcela">
      {criticos.map((a) => (
        <p key={a.codigo + a.mensaje} className="escena-aviso escena-aviso-critico" role="note">
          <strong>{a.codigo === 'DATOS_DE_EJEMPLO' ? 'Datos de ejemplo' : 'Aviso'}:</strong> {a.mensaje}
        </p>
      ))}

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
            aria-label="Parcela en 3D. Arrastra para girar, rueda o pellizca para acercar, flechas para desplazar. Toca un bloque para ver su estado."
          />
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
        <button type="button" className="escena-boton" onClick={() => escena.current?.restablecerVista()} disabled={sinWebGL}>
          Restablecer vista
        </button>
      </div>

      <p className="escena-seleccion" aria-live="polite">
        {seleccion ? describirBloque(seleccion) : 'Toca o haz clic en un bloque para ver su estado.'}
      </p>

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
        <p className="escena-detalle">{TEXTO_ESCALA_SUELO}</p>
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
