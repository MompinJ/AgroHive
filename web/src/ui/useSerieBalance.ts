import { useEffect, useState } from 'react';
import type { Escenario, SerieBalance } from '../../../contratos/tipos/contratos';
import type { ClienteMotor } from '../motor/cliente';
import { conLimite } from './useLaboratorio';

export function useSerieBalance(cliente: ClienteMotor | undefined, revision: string | undefined, rotacion: string | undefined, escenario: Escenario, habilitado: boolean) {
  const [respuesta, setRespuesta] = useState<{ clave: string; datos: SerieBalance } | null>(null);
  const [error, setError] = useState<{ clave: string; motivo: string } | null>(null);
  const [intento, setIntento] = useState(0);
  const clave = `${revision}:${rotacion}:${escenario}:${intento}`;
  useEffect(() => {
    if (!cliente || !rotacion || !habilitado) return;
    // Volver de comparación o abrir las gráficas reutiliza la respuesta vigente.
    if (respuesta?.clave === clave) return;
    let activo = true;
    setError(null);
    void conLimite(cliente.serieBalance(rotacion, escenario)).then((datos) => {
      if (activo) { setRespuesta({ clave, datos }); setError(null); }
    }).catch((e: unknown) => { if (activo) setError({ clave, motivo: e instanceof Error ? e.message : 'No se pudo leer la serie.' }); });
    return () => { activo = false; };
  }, [cliente, clave, rotacion, escenario, habilitado]);
  return { datos: respuesta?.clave === clave ? respuesta.datos : null,
    error: error?.clave === clave ? error.motivo : '', reintentar: () => setIntento((n) => n + 1) };
}
export type EstadoSerieBalance = ReturnType<typeof useSerieBalance>;
