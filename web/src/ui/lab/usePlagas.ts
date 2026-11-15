// Plagas registradas cerca de la parcela (GBIF via /api/plagas; la demo usa su paquete) y la
// proteccion con insecticida que el usuario aplica, guardada en el navegador por parcela.
import { useEffect, useState } from 'react';
import { obtenerPlagas } from '../../api/cliente';
import type { PlagaZona, Proteccion } from './plagas';

export function usePlagasZona(centroide: readonly [number, number] | null, esDemo: boolean): PlagaZona[] | null {
  const [plagas, setPlagas] = useState<PlagaZona[] | null>(null);
  const clave = centroide ? `${centroide[0]},${centroide[1]}:${esDemo}` : '';
  useEffect(() => {
    if (!centroide) return;
    const control = new AbortController();
    let activo = true;
    setPlagas(null);
    void (async () => {
      if (esDemo) {
        const p = await import('../../../../datos/demo/respuestas/plagas.json');
        if (activo) setPlagas((p.default as unknown as { plagas: PlagaZona[] }).plagas);
        return;
      }
      const r = await obtenerPlagas(centroide[0], centroide[1], { senal: control.signal });
      if (activo && r.ok) setPlagas(r.datos.plagas as unknown as PlagaZona[]);
    })().catch(() => { /* sin datos de plagas no hay capa de plagas */ });
    return () => { activo = false; control.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  return plagas;
}

const LLAVE = 'agrohive:proteccion:v1:';
function leer(clave: string): Proteccion {
  try {
    const crudo = localStorage.getItem(LLAVE + clave);
    const p = crudo ? (JSON.parse(crudo) as Proteccion) : {};
    return p && typeof p === 'object' ? p : {};
  } catch { return {}; }
}

export function useProteccion(clave: string | null): [Proteccion, (p: Proteccion) => void] {
  const [estado, setEstado] = useState<{ clave: string | null; valor: Proteccion }>(() => ({ clave, valor: clave ? leer(clave) : {} }));
  const valor = estado.clave === clave ? estado.valor : clave ? leer(clave) : {};
  const fijar = (p: Proteccion) => {
    setEstado({ clave, valor: p });
    if (clave) { try { localStorage.setItem(LLAVE + clave, JSON.stringify(p)); } catch { /* sin almacenamiento */ } }
  };
  return [valor, fijar];
}
