// Historial de hechos guardado en el navegador, por parcela (como la proteccion con insecticida). Ver historial.ts.
import { useCallback, useState } from 'react';
import { leerHechos, registrar, type Hecho } from './historial';

const LLAVE = 'agrohive:historial:v1:';
const leer = (clave: string): Hecho[] => { try { return leerHechos(localStorage.getItem(LLAVE + clave)); } catch { return []; } };
const guardar = (clave: string, hechos: Hecho[]) => { try { localStorage.setItem(LLAVE + clave, JSON.stringify(hechos)); } catch { /* sin almacenamiento */ } };

export function useHistorial(clave: string | null): { hechos: Hecho[]; agregar: (nuevo: Omit<Hecho, 'id' | 'cuando'>) => void; borrar: () => void } {
  const [estado, setEstado] = useState<{ clave: string | null; hechos: Hecho[] }>(() => ({ clave, hechos: clave ? leer(clave) : [] }));
  const hechos = estado.clave === clave ? estado.hechos : clave ? leer(clave) : [];
  const agregar = useCallback((nuevo: Omit<Hecho, 'id' | 'cuando'>) => {
    if (!clave) return;
    setEstado((prev) => {
      const base = prev.clave === clave ? prev.hechos : leer(clave);
      const siguiente = registrar(base, { ...nuevo, cuando: Date.now() });
      guardar(clave, siguiente);
      return { clave, hechos: siguiente };
    });
  }, [clave]);
  const borrar = useCallback(() => {
    if (!clave) return;
    guardar(clave, []);
    setEstado({ clave, hechos: [] });
  }, [clave]);
  return { hechos, agregar, borrar };
}
