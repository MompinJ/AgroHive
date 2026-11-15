import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Parcela, ResultadoCeldas, Suelo } from '../../../contratos/tipos/contratos';
import type { AvisoDatos } from '../api/datosParcela';
import { construirEscena } from '../escena/adaptador';
import { AvisosDatos } from '../escena/AvisosDatos';
import { bloqueCentral, fichaBloque, vecino } from '../escena/ficha';
import { describirBloque, entradasLeyenda } from '../escena/leyenda';
import { ESTILOS_ESTADO, ESTILO_SIN_ELEVACION, type EstiloEstado } from '../escena/estilos-estado';
import { rgbaPlaca } from '../escena/placa';
import type { BloqueEscena } from '../escena/modelo';
import { iconoCultivo2D } from './iconosCultivo2D';
import './parcela2d.css';

// Los mismos píxeles de las placas 3D, en símbolos SVG compartidos por todas las
// celdas. No requiere canvas, WebGL, texturas, modelos ni importar Three.js.
function caminosPlaca(estilo: EstiloEstado) {
  const imagen = rgbaPlaca(estilo);
  const caminos = new Map<string, string>();
  for (let y = 0; y < imagen.alto; y++) {
    for (let x = 0; x < imagen.ancho;) {
      const colorEn = (col: number) => {
        const k = (y * imagen.ancho + col) * 4;
        return `rgb(${imagen.datos[k]},${imagen.datos[k + 1]},${imagen.datos[k + 2]})`;
      };
      const color = colorEn(x);
      let fin = x + 1;
      while (fin < imagen.ancho && colorEn(fin) === color) fin++;
      caminos.set(color, (caminos.get(color) ?? '') + `M${x} ${y}h${fin - x}v1H${x}z`);
      x = fin;
    }
  }
  return [...caminos];
}
const placas = Object.entries({ ...ESTILOS_ESTADO, sin_elevacion: ESTILO_SIN_ELEVACION }).map(([estado, estilo]) => ({ estado, caminos: caminosPlaca(estilo) }));

export function Parcela2D({ parcela, resultado, fecha, suelo = null, avisosDatos = [] }: {
  parcela: Parcela; resultado: ResultadoCeldas | null; fecha?: string;
  suelo?: Suelo | null; avisosDatos?: readonly AvisoDatos[];
}) {
  const id = useId();
  const modelo = useMemo(() => construirEscena(parcela, resultado, { ...(fecha ? { fecha } : {}), suelo }), [parcela, resultado, fecha, suelo]);
  const [elegida, setElegida] = useState<string | null>(null);
  const botones = useRef(new Map<string, HTMLButtonElement>());
  const bloques = useMemo(() => [...modelo.bloques].sort((a, b) => a.z - b.z || a.x - b.x), [modelo]);
  const actual = bloques.find((b) => b.celdaId === elegida) ?? bloqueCentral(bloques);
  const ficha = actual ? fichaBloque(actual) : null;
  const leyenda = entradasLeyenda(modelo);
  function elegir(b: BloqueEscena, enfocar = false) {
    setElegida(b.celdaId);
    if (enfocar) {
      const boton = botones.current.get(b.celdaId);
      boton?.focus({ preventScroll: true });
      boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }
  function tecla(e: KeyboardEvent<HTMLButtonElement>, b: BloqueEscena) {
    const direccion: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = direccion[e.key];
    if (delta) { e.preventDefault(); elegir(vecino(bloques, b, ...delta), true); }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      const destino = e.key === 'Home' ? bloques[0] : bloques.at(-1);
      if (destino) elegir(destino, true);
    }
  }
  const muestra = (estado: string) => <svg viewBox="0 0 32 32" aria-hidden="true" className="parcela2d-placa"><use href={`#${id}-${estado}`} /></svg>;
  return <section className="parcela2d" aria-label="Vista 2D de la parcela">
    <svg width="0" height="0" aria-hidden="true" className="parcela2d-defs"><defs>{placas.map((p) => <symbol id={`${id}-${p.estado}`} key={p.estado} viewBox="0 0 32 32">{p.caminos.map(([color, d]) => <path key={color} fill={color} d={d} />)}</symbol>)}</defs></svg>
    <p className="quiet-note">Vista desde arriba · Norte ↑ · {modelo.fecha ?? 'Sin fecha de resultado'}</p>
    <AvisosDatos avisos={avisosDatos} advertenciasParcela={parcela.advertencias ?? []} />
    {modelo.avisos.filter((a) => a.codigo !== 'ESCENA_EXAGERACION_VERTICAL').map((a, i) => <p className="quiet-note" key={`${a.codigo}-${i}`}>{a.mensaje}</p>)}
    {actual && <><label htmlFor={`${id}-celda`}>Celda que quieres consultar</label><select id={`${id}-celda`} value={actual.celdaId} onChange={(e) => {
      const b = bloques.find((b) => b.celdaId === e.target.value);
      if (b) {
        elegir(b);
        botones.current.get(b.celdaId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }}>{bloques.map((b) => <option key={b.celdaId} value={b.celdaId}>{b.celdaId} · {ESTILOS_ESTADO[b.estadoVisual].etiqueta}</option>)}</select></>}
    <p id={`${id}-ayuda`} className="quiet-note">El dibujo superior indica cultivo y etapa; la placa inferior indica su estado. Toca una celda para ver su ficha. Con teclado: flechas para moverte, Inicio y Fin para ir a los extremos. Desplaza la cuadrícula para ver toda la parcela; también puedes elegir una celda en la lista.</p>
    {bloques.length > 0 && <div className="parcela2d-ventana" role="region" aria-label="Cuadrícula de celdas, norte arriba" aria-describedby={`${id}-ayuda`}>
      <div className="parcela2d-cuadricula" style={{ gridTemplateColumns: `repeat(${modelo.columnas}, 80px)`, gridTemplateRows: `repeat(${modelo.filas}, 80px)` }}>
        {bloques.map((b) => {
          const icono = iconoCultivo2D(b);
          return <button key={b.celdaId} type="button" className="parcela2d-celda" ref={(n) => { if (n) botones.current.set(b.celdaId, n); else botones.current.delete(b.celdaId); }}
          style={{ gridColumn: Math.round(b.x + (modelo.columnas - 1) / 2) + 1, gridRow: Math.round(b.z + (modelo.filas - 1) / 2) + 1 }}
          tabIndex={actual?.celdaId === b.celdaId ? 0 : -1} aria-pressed={actual?.celdaId === b.celdaId}
          aria-label={describirBloque(b)} title={describirBloque(b)} onFocus={() => elegir(b)} onClick={() => elegir(b)} onKeyDown={(e) => tecla(e, b)}>
          <span className="parcela2d-visual">{icono && <img className="parcela2d-cultivo" data-icono={icono.clave} src={icono.url} width={32} height={32} alt="" loading="lazy" decoding="async" />}{muestra(b.estadoVisual)}</span>
          {b.relieve.tipo === 'sin_elevacion' && <span className="parcela2d-hueco" aria-hidden="true">?</span>}
        </button>;
        })}
      </div>
    </div>}
    <ul className="parcela2d-leyenda" aria-label="Leyenda de estados">{leyenda.map((e) => <li key={e.clave}>{muestra(e.clave)}<span>{e.etiqueta} · {e.celdas} celdas<span className="quiet-note">{e.descripcion}</span></span></li>)}</ul>
    {ficha && <div className="parcela2d-ficha" aria-live="polite" aria-atomic="true"><h3>{ficha.titulo}</h3><p>{ficha.resumen}</p><dl>{ficha.filas.map((f) => <div key={f.etiqueta}><dt>{f.etiqueta}</dt><dd>{f.valor}{f.nota && <span className="quiet-note">{f.nota}</span>}</dd></div>)}</dl></div>}
  </section>;
}
