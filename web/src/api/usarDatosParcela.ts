// Hook de React sobre cargarDatosParcela: un solo estado (loading | ready | error) para el laboratorio.
import { useCallback, useEffect, useState } from 'react';
import { avisosDe, cargarDatosParcela, fallaObligatoria, type AvisoDatos, type DatosParcela, type Obligatorio } from './datosParcela';
import type { ErrorApi } from './cliente';

export type EstadoDatosParcela =
  | { state: 'loading' }
  | { state: 'ready'; datos: DatosParcela; avisos: AvisoDatos[] }
  | { state: 'error'; falla: Obligatorio; error: ErrorApi };

/** Carga al montar y cuando cambia el centroide; `centroide` null espera (por ejemplo, mientras no hay parcela). */
export function usarDatosParcela(centroide: readonly [number, number] | null): EstadoDatosParcela & { reintentar: () => void } {
  const [estado, setEstado] = useState<EstadoDatosParcela>({ state: 'loading' });
  const [intento, setIntento] = useState(0);
  const clave = centroide ? `${centroide[0]},${centroide[1]}` : '';

  useEffect(() => {
    if (!centroide) return;
    const control = new AbortController();
    setEstado({ state: 'loading' });
    void cargarDatosParcela(centroide, { senal: control.signal }).then((d) => {
      if (control.signal.aborted) return;
      const falla = fallaObligatoria(d);
      setEstado(falla ? { state: 'error', ...falla } : { state: 'ready', datos: d, avisos: avisosDe(d) });
    });
    return () => control.abort('cancelado');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume el centroide
  }, [clave, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);
  return { ...estado, reintentar };
}
