// Panel de la izquierda del laboratorio con boton para plegarlo. Es un solo elemento que se DESLIZA hacia la izquierda (transicion en CSS) y, plegado,
// deja una pestana con el titulo; la barra de herramientas y el control de tiempo se mueven con el, y la escena se recentra. Sin animacion con "reducir movimiento".
import type { ReactNode } from 'react';
import { fijarPanelPlegado, usePanelPlegado } from './panelColapsable';

export function PanelIzq({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const plegado = usePanelPlegado();
  return <>
    <aside className={`panel panel-izq${plegado ? ' panel-izq-oculto' : ''}`} aria-label={etiqueta} aria-hidden={plegado || undefined} inert={plegado || undefined}>
      <button type="button" className="panel-plegar panel-plegar-esquina" aria-expanded={!plegado} tabIndex={plegado ? -1 : 0} onClick={() => fijarPanelPlegado(true)} aria-label="Ocultar el panel" title="Ocultar el panel">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" /></svg>
      </button>
      {children}
    </aside>
    <button type="button" className={`panel-pestana${plegado ? ' panel-pestana-visible' : ''}`} aria-expanded={!plegado} tabIndex={plegado ? 0 : -1} aria-hidden={!plegado || undefined} onClick={() => fijarPanelPlegado(false)} title={`Mostrar el panel: ${etiqueta}`}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>
      <span>{etiqueta}</span>
    </button>
  </>;
}
