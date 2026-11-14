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
  const [guardado, setEstado] = useState<{ clave: string; valor: EstadoDatosParcela }>({ clave: '', valor: { state: 'loading' } });
  const [intento, setIntento] = useState(0);
  const clave = centroide ? `${centroide[0]},${centroide[1]}` : '';

  useEffect(() => {
    if (!centroide) return;
    const control = new AbortController();
    setEstado({ clave, valor: { state: 'loading' } });
    void cargarDatosParcela(centroide, { senal: control.signal }).then((d) => {
      if (control.signal.aborted) return;
      const falla = fallaObligatoria(d);
      setEstado({ clave, valor: falla ? { state: 'error', ...falla } : { state: 'ready', datos: d, avisos: avisosDe(d) } });
    });
    return () => control.abort('cancelado');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave resume el centroide
  }, [clave, intento]);

  const reintentar = useCallback(() => { setEstado({ clave: '', valor: { state: 'loading' } }); setIntento((n) => n + 1); }, []);
  const estado: EstadoDatosParcela = clave && guardado.clave === clave ? guardado.valor : { state: 'loading' };
  return { ...estado, reintentar };
}
