import { useEffect, useState } from 'react';

export const pages = [
  { path: '/', label: 'Inicio', step: '01' },
  { path: '/terreno', label: 'Terreno', step: '02' },
  { path: '/laboratorio', label: 'Laboratorio', step: '03' },
  { path: '/comparacion', label: 'Comparación', step: '04' },
] as const;

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
