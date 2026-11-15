import { useEffect, useRef } from 'react';
import { AVISO_EJEMPLOS, listarEjemplos } from '../demo/ejemplos';
import { nombresCultivos } from '../ui/planes';
import { fotoPorEjemplo, fotosEjemplos } from '../ui/fotosEjemplos';
import type { Parcela } from '../../../contratos/tipos/contratos';
import { DibujarParcela } from '../ui/DibujarParcela';
import hero from '../ui/assets/terreno-hero-v1.png';
import '../ui/terreno.css';

const ejemplos = listarEjemplos();
const nombreCultivo = (id: string) => (nombresCultivos[id] ?? id).toLowerCase();

/** Baja a una seccion y le da el foco (sin animar si se pide menos movimiento). */
function bajarA(seccion: HTMLElement | null) {
  if (!seccion) return;
  const reducir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  seccion.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  seccion.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

/** Baja al editor del contorno y le da el foco (sin animar si se pide menos movimiento). */
function irAlEditor(editor: HTMLElement | null) {
  if (!editor) return;
  const reducir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  editor.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  editor.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export function Terreno({ polygonMode, onElegirEjemplo, ejemplo, parcela, onGuardar }: { polygonMode: boolean; onElegirEjemplo: (id: string) => void; ejemplo: string | null; parcela: Parcela | null; onGuardar: (p: Parcela) => void }) {
  const editor = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLElement>(null);
  // Al entrar en modo poligono, despues de que App sube la pagina y enfoca el h1 al cambiar de ruta.
  useEffect(() => {
    if (!polygonMode) return;
    const t = setTimeout(() => irAlEditor(editor.current), 60);
    return () => clearTimeout(t);
  }, [polygonMode]);
  return <div className="terrain-page">
    <section className="terrain-hero" aria-labelledby="terreno-titulo">
      <div className="terrain-copy">
        <h1 id="terreno-titulo" tabIndex={-1}>Empieza por<br />un terreno.</h1>
        <p className="terrain-intro">Abre una parcela de ejemplo en otro lugar del mundo o dibuja el contorno de la tuya.</p>
        <div className="terrain-actions">
          <button type="button" className="terrain-button" onClick={() => bajarA(lista.current)}>Ver ejemplos</button>
          <a className="terrain-button terrain-button-secondary" href="#/terreno?modo=poligono" aria-current={polygonMode ? 'location' : undefined} onClick={() => { if (polygonMode) irAlEditor(editor.current); }}>Dibujar mi parcela</a>
        </div>
      </div>
      <div className="terrain-art" aria-hidden="true">
        <img src={hero} alt="" width="1774" height="887" fetchPriority="high" />
      </div>
    </section>
    <div className="terrain-options">
      <section ref={lista} className="terrain-option terrain-option-demo terrain-ejemplos" aria-labelledby="demo-titulo">
        <div className="terrain-option-copy">
          <p className="terrain-eyebrow">Parcelas de ejemplo</p>
          <h2 id="demo-titulo" tabIndex={-1}>Seis lugares del mundo</h2>
          <ul className="terrain-ejemplos-lista">
            {ejemplos.map((e) => <li key={e.id}>
              <a className="terrain-ejemplo" href="#/laboratorio" aria-current={ejemplo === e.id ? 'true' : undefined} onClick={() => onElegirEjemplo(e.id)}>
                <span className="terrain-ejemplo-texto">
                <strong>{e.nombre}</strong>
                <span className="terrain-ejemplo-lugar">{e.pais}{e.clima ? ` · clima ${e.clima.descripcion}` : ''}</span>
                <span className="terrain-ejemplo-cultivos">{e.cultivosSugeridos.map(nombreCultivo).join(', ')}</span>
                </span>
                {fotoPorEjemplo[e.id] && <span className="terrain-ejemplo-imagen"><img src={fotoPorEjemplo[e.id]!.src} alt={fotoPorEjemplo[e.id]!.alt} width="500" height="375" loading="lazy" decoding="async" /></span>}
              </a>
            </li>)}
          </ul>
          <p className="terrain-ejemplos-aviso">{AVISO_EJEMPLOS}</p>
          <details className="terrain-foto-creditos">
            <summary>Créditos de fotografías</summary>
            <p>Fotografías de las zonas de referencia; no representan las parcelas de ejemplo. Se muestran recortadas para adaptarse a las tarjetas.</p>
            <ul>{fotosEjemplos.map((foto) => <li key={foto.id}><a href={foto.fuente} target="_blank" rel="noreferrer">{foto.alt}</a> {foto.autor} · <a href={foto.licenciaUrl} target="_blank" rel="noreferrer">{foto.licencia}</a>.</li>)}</ul>
          </details>
        </div>
      </section>
    </div>
    <div ref={editor} className="terrain-editor">{polygonMode && <DibujarParcela onGuardar={onGuardar} guardada={parcela} />}</div>
  </div>;
}
