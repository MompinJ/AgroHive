// Panel de la izquierda del laboratorio con boton para plegarlo: plegado deja solo una pestana con el titulo y la parcela se ve completa.
import type { ReactNode } from 'react';
import { fijarPanelPlegado, usePanelPlegado } from './panelColapsable';
import { useIdioma } from '../i18n/Idioma';

export function PanelIzq({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const plegado = usePanelPlegado();
  const { t } = useIdioma();
  if (plegado) {
    return <aside className="panel panel-izq panel-plegado" aria-label={etiqueta}>
      <button type="button" className="panel-plegar" aria-expanded={false} onClick={() => fijarPanelPlegado(false)} title={t('panel.mostrar', { etiqueta })}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M9 6l6 6-6 6" /></svg>
        <span>{etiqueta}</span>
      </button>
    </aside>;
  }
  return <aside className="panel panel-izq" aria-label={etiqueta}>
    <button type="button" className="panel-plegar panel-plegar-esquina" aria-expanded={true} onClick={() => fijarPanelPlegado(true)} aria-label={t('panel.ocultar')} title={t('panel.ocultar')}>
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="M15 6l-6 6 6 6" /></svg>
    </button>
    {children}
  </aside>;
}
