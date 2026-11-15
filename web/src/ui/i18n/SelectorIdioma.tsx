import { useId } from 'react';
import { useIdioma } from './Idioma';
import { esIdioma } from './preferencia';
import './idioma.css';

export function SelectorIdioma() {
  const { idioma, cambiarIdioma, t } = useIdioma();
  const id = useId();
  return <div className="selector-idioma">
    <label htmlFor={id}>{t('idioma.etiqueta')}</label>
    <span className="selector-idioma-campo"><select id={id} value={idioma} onChange={(e) => { if (esIdioma(e.currentTarget.value)) cambiarIdioma(e.currentTarget.value); }}>
      <option value="es" lang="es">Español</option>
      <option value="en" lang="en">English</option>
    </select><svg className="selector-idioma-flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></span>
  </div>;
}
