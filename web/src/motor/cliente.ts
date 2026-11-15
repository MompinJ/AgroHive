// Cliente del motor para la interfaz: crea el Web Worker y expone promesas. La interfaz no recalcula indicadores:
// solo pide y muestra lo que devuelve el motor.
import type { SeleccionEscenarios } from './escenarios';
import type { IdiomaMotor } from './idioma';
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
  /** A4.2: ranking por robustez de las rotaciones simuladas. Pedirlo de nuevo despues de cada simular.
   * `idioma` ('es' | 'en', por defecto 'es'): idioma de las tarjetas (`explicacion`) y de los motivos de noOrdenadas.
   * Cambiar de idioma solo pide rankear otra vez (no vuelve a simular). */
  rankear(rotacionIds?: string[], opciones?: OpcionesRanking, idioma?: IdiomaMotor): Promise<ResultadoRanking>;
  /** A2.13: valida la banda de proxima temporada y la compara con los escenarios. Nunca devuelve una cifra unica. */
  proxima(proxima: ProximaTemporadaAproximada | null, escenarios: SeleccionEscenarios['escenarios']): Promise<VistaProximaTemporada>;
  /** A4.1: series del balance de agua (diarias y por mes) de una rotacion en un escenario, para el dashboard. */
  serieBalance(rotacionId: string, escenario: Escenario): Promise<SerieBalance>;
  olvidar(rotacionId?: string): Promise<void>;
  terminar(): void;
}

/** Lo que el cliente usa de un Worker (para poder probarlo sin navegador). */
export interface WorkerMotor {
  onmessage: ((ev: MessageEvent<Respuesta>) => void) | null;
  onerror: ((ev: ErrorEvent | Event) => void) | null;
  onmessageerror: ((ev: MessageEvent) => void) | null;
  postMessage(mensaje: unknown): void;
  terminate(): void;
}

const crearWorker = (): WorkerMotor => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerMotor;

export function crearClienteMotor(crear: () => WorkerMotor = crearWorker): ClienteMotor {
  const worker = crear();
  const pendientes = new Map<number, { resolver: (v: unknown) => void; rechazar: (e: Error) => void }>();
  let siguiente = 1;
  // H-M5: si el worker no carga, falla o se termina, ninguna promesa queda pendiente para siempre.
  let caido: string | null = null;
  const rechazarTodo = (motivo: string) => {
    caido = motivo;
    for (const p of pendientes.values()) p.rechazar(new Error(motivo));
    pendientes.clear();
  };
  worker.onmessage = (ev: MessageEvent<Respuesta>) => {
    const d = ev.data as Respuesta | undefined;
    if (!d || typeof d.id !== 'number') return; // respuesta sin id: no es de este protocolo
    const p = pendientes.get(d.id);
    if (!p) return;
    pendientes.delete(d.id);
    if (d.ok) p.resolver(d.resultado);
    else p.rechazar(new Error(d.error));
  };
  worker.onerror = (ev) => {
    const detalle = 'message' in ev && typeof ev.message === 'string' && ev.message ? `: ${ev.message}` : '';
    rechazarTodo(`El motor (Web Worker) fallo${detalle}.`);
  };
  worker.onmessageerror = () => rechazarTodo('El motor (Web Worker) envio un mensaje que no se pudo leer.');
  const pedir = <T>(peticion: SinId<Peticion>): Promise<T> =>
    new Promise<T>((resolver, rechazar) => {
      if (caido) {
        rechazar(new Error(caido));
        return;
      }
      const id = siguiente++;
      pendientes.set(id, { resolver: resolver as (v: unknown) => void, rechazar });
      worker.postMessage({ ...peticion, id });
    });
  return {
    escenarios: (serie) => pedir({ tipo: 'escenarios', serie }),
    simular: (entradas) => pedir({ tipo: 'simular', entradas }),
    celdas: (rotacionId, escenario, fecha) => pedir({ tipo: 'celdas', rotacionId, escenario, fecha }),
    rankear: (rotacionIds, opciones, idioma) =>
      pedir({ tipo: 'rankear', ...(rotacionIds ? { rotacionIds } : {}), ...(opciones ? { opciones } : {}), ...(idioma ? { idioma } : {}) }),
    proxima: (proxima, escenarios) => pedir({ tipo: 'proxima', proxima, escenarios }),
    serieBalance: (rotacionId, escenario) => pedir({ tipo: 'serieBalance', rotacionId, escenario }),
    olvidar: async (rotacionId) => {
      await pedir(rotacionId ? { tipo: 'olvidar', rotacionId } : { tipo: 'olvidar' });
    },
    terminar: () => {
      worker.terminate();
      rechazarTodo('El motor se termino antes de responder.');
    },
  };
}
