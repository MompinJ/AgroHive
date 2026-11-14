// Cliente de la API de AgroHive (A4.6). Los datos usan los tipos de contratos/ (fuente de verdad); el cliente generado
// desde OpenAPI (api/cliente/api.d.ts) solo describe las llamadas HTTP: la entrada y la respuesta de /api/elevacion.
import type { CatalogoCultivos, ProximaTemporadaAproximada, SerieClima, Suelo } from '../../../contratos/tipos/contratos';
import type { components } from '../../../api/cliente/api';

export type TerrenoEntrada = components['schemas']['TerrenoEntrada'];
export type TerrenoRespuesta = components['schemas']['TerrenoRespuesta'];

/** Falla visible: ninguna llamada inventa datos. `codigo` es el HTTP si lo hubo; sin el, no hubo respuesta (red o tiempo). */
export type ErrorApi = { estado: 'ERROR_DATOS'; motivo: string; codigo?: number };
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: ErrorApi };

/**
 * Ventana estandar de clima (docs/04, A2.4): 20 anios agricolas completos. El front debe pedir EXACTAMENTE estas fechas: el
 * paquete de demo sin internet de la API solo responde a ellas y al centroide de la parcela demo.
 */
export const VENTANA_ESTANDAR = { desde: '2005-10-01', hasta: '2025-12-31' } as const;

const API_PUBLICA = 'https://64-23-143-102.sslip.io';
/** En produccion el front y la API comparten origen (''); en desarrollo se usa la API publica, que acepta 127.0.0.1:5173 y localhost. */
export function urlBase(): string {
  const configurada = import.meta.env['VITE_API_URL'] as string | undefined;
  if (configurada !== undefined) return configurada.replace(/\/$/, '');
  return import.meta.env.DEV ? API_PUBLICA : '';
}

const TIEMPO_MS = 90_000; // la primera consulta de suelo en frio llega a unos 12 s

type Opciones = { senal?: AbortSignal; tiempoMs?: number; fetchFn?: typeof fetch };

function error(motivo: string, codigo?: number): { ok: false; error: ErrorApi } {
  return { ok: false, error: codigo === undefined ? { estado: 'ERROR_DATOS', motivo } : { estado: 'ERROR_DATOS', motivo, codigo } };
}

function motivoDe(cuerpo: unknown): string | undefined {
  if (typeof cuerpo !== 'object' || cuerpo === null) return undefined;
  const c = cuerpo as { motivo?: unknown; detail?: unknown };
  if (typeof c.motivo === 'string') return c.motivo; // 503: { estado: 'ERROR_DATOS', motivo }
  if (typeof c.detail === 'string') return c.detail; // 422 de periodo o coordenada invalida
  if (Array.isArray(c.detail)) return c.detail.map((d) => (d as { msg?: string }).msg ?? '').filter(Boolean).join('; ') || undefined;
  return undefined;
}

export async function pedir<T>(ruta: string, init: RequestInit = {}, opciones: Opciones = {}): Promise<Resultado<T>> {
  const control = new AbortController();
  const cancelarPorTiempo = setTimeout(() => control.abort('tiempo'), opciones.tiempoMs ?? TIEMPO_MS);
  const cancelarPorUsuario = () => control.abort('cancelado');
  opciones.senal?.addEventListener('abort', cancelarPorUsuario);
  try {
    const respuesta = await (opciones.fetchFn ?? fetch)(`${urlBase()}${ruta}`, { ...init, signal: control.signal });
    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      return error(`El servidor respondio ${respuesta.status} con un cuerpo que no es JSON.`, respuesta.status);
    }
    if (respuesta.ok) return { ok: true, datos: cuerpo as T };
    return error(motivoDe(cuerpo) ?? `El servidor respondio ${respuesta.status}.`, respuesta.status);
  } catch (e) {
    if (control.signal.reason === 'cancelado') return error('Consulta cancelada.');
    if (control.signal.reason === 'tiempo') return error('El servidor de datos tardo demasiado en responder.');
    return error('Sin conexion con el servidor de datos.');
  } finally {
    clearTimeout(cancelarPorTiempo);
    opciones.senal?.removeEventListener('abort', cancelarPorUsuario);
  }
}

const consulta = (parametros: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(parametros).map(([k, v]) => [k, String(v)])).toString();

export type ConsultaClima = { lat: number; lon: number; desde: string; hasta: string };

/** Serie diaria de NASA POWER (respaldo Open-Meteo con estado RESPALDO_HISTORICO). */
export const obtenerClima = (c: ConsultaClima, o?: Opciones) => pedir<SerieClima>(`/api/clima?${consulta({ ...c })}`, {}, o);
/** Clima de la ventana estandar para el centroide de la parcela (lo que usa el motor y el paquete de demo). */
export const obtenerClimaEstandar = (lon: number, lat: number, o?: Opciones) => obtenerClima({ lat, lon, ...VENTANA_ESTANDAR }, o);
export const obtenerSuelo = (lon: number, lat: number, o?: Opciones) => pedir<Suelo>(`/api/suelo?${consulta({ lat, lon })}`, {}, o);
export const obtenerProximaTemporada = (lon: number, lat: number, o?: Opciones) =>
  pedir<ProximaTemporadaAproximada>(`/api/proxima-temporada?${consulta({ lat, lon })}`, {}, o);
export const obtenerCultivos = (o?: Opciones) => pedir<CatalogoCultivos>('/api/cultivos', {}, o);
/** Elevacion y pendiente de una cuadricula ya generada por el front (tope 1600 celdas). */
export const obtenerTerreno = (entrada: TerrenoEntrada, o?: Opciones) =>
  pedir<TerrenoRespuesta>('/api/elevacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) }, o);
export const obtenerSalud = (o?: Opciones) =>
  pedir<{ status: string; servicio: string; version: string; versionContrato?: string; commit?: string | null }>('/health', {}, o);
