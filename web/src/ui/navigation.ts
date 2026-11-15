import { useEffect, useState } from 'react';

/** Pasos del flujo, en orden obligatorio (stepper). Inicio y Metodo quedan fuera de la secuencia. */
export const pasos = [
  { path: '/terreno', label: 'Terreno', ayuda: 'Elige tu parcela' },
  { path: '/laboratorio', label: 'Cultivos', ayuda: 'Pinta tus siembras' },
  { path: '/escenarios', label: 'Escenarios', ayuda: 'Años seco a lluvioso' },
  { path: '/comparacion', label: 'Comparación', ayuda: 'La más robusta' },
] as const;

export const pages = [
  { path: '/', label: 'Inicio' },
  ...pasos,
  { path: '/metodo', label: 'Método y fuentes' },
] as const;

/** Indice del paso de una ruta, o -1 si la ruta no es un paso. */
export function indicePaso(path: string): number {
  return pasos.findIndex((p) => p.path === path);
}

function readLocation() {
  const location = new URL(window.location.hash.slice(1) || '/', window.location.origin);
  return { path: location.pathname, mode: location.searchParams.get('modo') };
}

export function usePage() {
  const [location, setLocation] = useState(readLocation);
  useEffect(() => {
    const update = () => setLocation(readLocation());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return location;
}

export function irA(path: string, reemplazar = false) {
  const destino = `#${path}`;
  if (reemplazar) window.location.replace(destino);
  else window.location.hash = path;
}
