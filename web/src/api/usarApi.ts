// Hook para consumir el cliente desde la interfaz con los estados que ya entiende <DataState> (loading | error).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorApi, Resultado } from './cliente';

export type EstadoApi<T> =
  | { state: 'loading' }
  | { state: 'ready'; datos: T }
  | { state: 'error'; error: ErrorApi };

/** Ejecuta `consulta` al montar y cada vez que cambia `clave`; ignora respuestas viejas y cancela al desmontar. */
export function usarApi<T>(consulta: (senal: AbortSignal) => Promise<Resultado<T>>, clave: string): EstadoApi<T> & { reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoApi<T>>({ state: 'loading' });
  const [intento, setIntento] = useState(0);
  const ultima = useRef(consulta);
  ultima.current = consulta;

  useEffect(() => {
    const control = new AbortController();
    setEstado({ state: 'loading' });
    void ultima.current(control.signal).then((r) => {
      if (control.signal.aborted) return; // otra consulta o el desmontaje ya tomo su lugar
      setEstado(r.ok ? { state: 'ready', datos: r.datos } : { state: 'error', error: r.error });
    });
    return () => control.abort('cancelado');
  }, [clave, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reintentar };
}
