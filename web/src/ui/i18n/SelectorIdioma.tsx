import { useId, type ReactNode } from 'react';
import { useIdioma } from './Idioma';
import type { Idioma } from './diccionarios';
import './idioma.css';

// Banderas dibujadas (SVG): los emojis de bandera no se ven en Windows. Espanol: bandera de Mexico (el idioma de la demo); ingles: bandera de EE. UU.
function BanderaMexico() {
  return <svg viewBox="0 0 30 20" width="30" height="20" aria-hidden="true" focusable="false">
    <rect width="10" height="20" fill="#006847" /><rect x="10" width="10" height="20" fill="#ffffff" /><rect x="20" width="10" height="20" fill="#ce1126" />
    <circle cx="15" cy="10" r="3" fill="#8c6b2f" opacity=".85" /><circle cx="15" cy="10" r="1.6" fill="#5f8f3a" />
  </svg>;
}
function BanderaEstadosUnidos() {
  return <svg viewBox="0 0 30 20" width="30" height="20" aria-hidden="true" focusable="false">
    <rect width="30" height="20" fill="#ffffff" />
    {[0, 2, 4, 6, 8, 10, 12].map((k) => <rect key={k} y={k * (20 / 13)} width="30" height={20 / 13} fill="#b22234" />)}
    <rect width="13" height={20 * 7 / 13} fill="#3c3b6e" />
    {[[2, 2], [5, 2], [8, 2], [11, 2], [3.5, 4], [6.5, 4], [9.5, 4], [2, 6], [5, 6], [8, 6], [11, 6], [3.5, 8], [6.5, 8], [9.5, 8]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r=".6" fill="#ffffff" />)}
  </svg>;
}

const OPCIONES: readonly { id: Idioma; nombre: string; Bandera: () => ReactNode }[] = [
  { id: 'es', nombre: 'Español', Bandera: BanderaMexico },
  { id: 'en', nombre: 'English', Bandera: BanderaEstadosUnidos },
];

export function SelectorIdioma() {
  const { idioma, cambiarIdioma, t } = useIdioma();
  const id = useId();
  return <div className="selector-idioma" role="radiogroup" aria-labelledby={id}>
    <span id={id} className="sr-only">{t('idioma.etiqueta')}</span>
    {OPCIONES.map(({ id: valor, nombre, Bandera }) => (
      <button key={valor} type="button" role="radio" lang={valor} aria-checked={idioma === valor} aria-label={nombre} title={nombre} className="bandera-idioma" onClick={() => cambiarIdioma(valor)}>
        <Bandera />
      </button>
    ))}
  </div>;
}
