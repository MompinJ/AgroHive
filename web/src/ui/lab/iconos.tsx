// Iconos de las herramientas del laboratorio (SVG en linea, trazo de 1.8 px, 20 x 20).
// Decorativos: el boton que los lleva da su nombre con aria-label y el globo (data-tip).
import type { ReactNode } from 'react';

function Icono({ children, tamano = 20 }: { children: ReactNode; tamano?: number }) {
  return <svg viewBox="0 0 24 24" width={tamano} height={tamano} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}

export const IconoBrocha = () => <Icono><path d="M14.5 4.5 19.5 9.5 11 18l-5-5z" /><path d="M6 13c-2 0-3 1.5-3 3.5S2 20 2 20s3 .5 4.5-.5S8 17 8 15" /></Icono>;
export const IconoGoma = () => <Icono><path d="m8 20-4.3-4.3a1.5 1.5 0 0 1 0-2.1L13.6 3.7a1.5 1.5 0 0 1 2.1 0l4.6 4.6a1.5 1.5 0 0 1 0 2.1L10 20" /><path d="M8 20h12M9 11l5 5" /></Icono>;
export const IconoMano = () => <Icono><path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.6 15a1.5 1.5 0 0 1 2.4-1.8L7 14.5V11" /></Icono>;
export const IconoCubeta = () => <Icono><path d="m5 10 7-7 7 7-7 7z" /><path d="M5 10h14" /><path d="M20 15s1.5 2 1.5 3a1.5 1.5 0 0 1-3 0c0-1 1.5-3 1.5-3z" /></Icono>;
export const IconoMas = () => <Icono><path d="M12 5v14M5 12h14" /></Icono>;
export const IconoQuitar = () => <Icono tamano={14}><path d="M6 6l12 12M18 6 6 18" /></Icono>;
export const IconoBasura = () => <Icono><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></Icono>;
export const IconoInfo = () => <Icono tamano={16}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.5" /></Icono>;
export const IconoCalendario = () => <Icono tamano={16}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icono>;
export const IconoDeshacer = () => <Icono><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Icono>;

/** Punto que muestra el tamano de la brocha (1, 2 o 3). */
export function IconoTamano({ nivel }: { nivel: number }) {
  const r = 2.5 + nivel * 2;
  return <Icono><circle cx="12" cy="12" r={r} fill="currentColor" stroke="none" /></Icono>;
}
