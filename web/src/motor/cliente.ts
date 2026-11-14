// Cliente del motor para la interfaz: crea el Web Worker y expone promesas. La interfaz no recalcula indicadores:
// solo pide y muestra lo que devuelve el motor.
import type { SeleccionEscenarios } from './escenarios';
import type { EntradasMotor } from './motor';
import type { Peticion, Respuesta } from './protocolo';
import type { VistaProximaTemporada } from './proxima';
import type { OpcionesRanking, ResultadoRanking } from './ranking';
import type { ProximaTemporadaAproximada } from '../../../contratos/tipos/contratos';
import type { Escenario, ResultadoCeldas, ResultadoRotacion, SerieBalance, SerieClima } from './tipos';

type SinId<T> = T extends unknown ? Omit<T, 'id'> : never;

export interface ClienteMotor {
  /** A2.5: anios seco / habitual / lluvioso desde la serie de GET /api/clima. */
  escenarios(serie: SerieClima): Promise<SeleccionEscenarios>;
  /** A2.6 y A2.7: pilares de la rotacion en los tres escenarios. Reemplaza el resultado anterior de esa rotacion. */
  simular(entradas: EntradasMotor): Promise<ResultadoRotacion>;
  /** resultado-celda de todas las celdas en una fecha del plan (para la escena 3D, el 2D y los tooltips). */
  celdas(rotacionId: string, escenario: Escenario, fecha: string): Promise<ResultadoCeldas>;
  /** A4.2: ranking por robustez de las rotaciones simuladas. Pedirlo de nuevo despues de cada simular. */
  rankear(rotacionIds?: string[], opciones?: OpcionesRanking): Promise<ResultadoRanking>;
  /** A2.13: valida la banda de proxima temporada y la compara con los escenarios. Nunca devuelve una cifra unica. */
  proxima(proxima: ProximaTemporadaAproximada | null, escenarios: SeleccionEscenarios['escenarios']): Promise<VistaProximaTemporada>;
  /** A4.1: series del balance de agua (diarias y por mes) de una rotacion en un escenario, para el dashboard. */
  serieBalance(rotacionId: string, escenario: Escenario): Promise<SerieBalance>;
  olvidar(rotacionId?: string): Promise<void>;
  terminar(): void;
}

export function crearClienteMotor(): ClienteMotor {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pendientes = new Map<number, { resolver: (v: unknown) => void; rechazar: (e: Error) => void }>();
  let siguiente = 1;
  worker.onmessage = (ev: MessageEvent<Respuesta>) => {
    const p = pendientes.get(ev.data.id);
    if (!p) return;
    pendientes.delete(ev.data.id);
    if (ev.data.ok) p.resolver(ev.data.resultado);
    else p.rechazar(new Error(ev.data.error));
  };
  const pedir = <T>(peticion: SinId<Peticion>): Promise<T> =>
    new Promise<T>((resolver, rechazar) => {
      const id = siguiente++;
      pendientes.set(id, { resolver: resolver as (v: unknown) => void, rechazar });
      worker.postMessage({ ...peticion, id });
    });
  return {
    escenarios: (serie) => pedir({ tipo: 'escenarios', serie }),
    simular: (entradas) => pedir({ tipo: 'simular', entradas }),
    celdas: (rotacionId, escenario, fecha) => pedir({ tipo: 'celdas', rotacionId, escenario, fecha }),
    rankear: (rotacionIds, opciones) =>
      pedir({ tipo: 'rankear', ...(rotacionIds ? { rotacionIds } : {}), ...(opciones ? { opciones } : {}) }),
    proxima: (proxima, escenarios) => pedir({ tipo: 'proxima', proxima, escenarios }),
    serieBalance: (rotacionId, escenario) => pedir({ tipo: 'serieBalance', rotacionId, escenario }),
    olvidar: async (rotacionId) => {
      await pedir(rotacionId ? { tipo: 'olvidar', rotacionId } : { tipo: 'olvidar' });
    },
    terminar: () => worker.terminate(),
  };
}
