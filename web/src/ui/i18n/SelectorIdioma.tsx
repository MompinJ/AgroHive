import { useId } from 'react';
import { useIdioma } from './Idioma';
import { esIdioma } from './preferencia';
import './idioma.css';

export function SelectorIdioma() {
  const { idioma, cambiarIdioma, t } = useIdioma();
  const id = useId();
  return <div className="selector-idioma">
    <label htmlFor={id}>{t('idioma.etiqueta')}</label>
    <select id={id} value={idioma} onChange={(e) => { if (esIdioma(e.currentTarget.value)) cambiarIdioma(e.currentTarget.value); }}>
      <option value="es" lang="es">Español</option>
      <option value="en" lang="en">English</option>
    </select>
  </div>;
}
