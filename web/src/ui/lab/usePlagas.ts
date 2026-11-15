// Plagas registradas cerca de la parcela (GBIF via /api/plagas; un ejemplo trae las suyas grabadas) y la
// proteccion con insecticida que el usuario aplica, guardada en el navegador por parcela.
import { useEffect, useState } from 'react';
import { obtenerPlagas } from '../../api/cliente';
import type { Plagas } from '../../../../contratos/tipos/contratos';
import type { PlagaZona, Proteccion } from './plagas';

/** `grabadas`: las de un ejemplo (undefined en una parcela dibujada; null si el ejemplo no las pudo grabar). */
export function usePlagasZona(centroide: readonly [number, number] | null, grabadas?: Plagas | null): PlagaZona[] | null {
  const [plagas, setPlagas] = useState<PlagaZona[] | null>(null);
  const clave = centroide ? `${centroide[0]},${centroide[1]}:${grabadas === undefined ? 'viva' : 'grabada'}` : '';
  useEffect(() => {
    if (!centroide) return;
    const control = new AbortController();
    let activo = true;
    setPlagas(null);
    void (async () => {
      if (grabadas !== undefined) {
        if (activo) setPlagas(grabadas ? (grabadas.plagas as unknown as PlagaZona[]) : null);
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
