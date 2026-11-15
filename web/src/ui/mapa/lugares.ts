import type { LonLat } from '../../../../contratos/tipos/contratos';
import type { Idioma } from '../i18n/diccionarios';

export interface LugarMapa { id: number; nombre: string; detalle: string; centro: LonLat }
const cache = new Map<string, LugarMapa[]>();
const objeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null;

export function interpretarLugares(valor: unknown): LugarMapa[] {
  if (!objeto(valor) || (valor.results !== undefined && !Array.isArray(valor.results))) throw new Error('Respuesta de lugares no reconocida.');
  if (!Array.isArray(valor.results)) return [];
  return valor.results.flatMap((r: unknown) => {
    if (!objeto(r) || typeof r.id !== 'number' || typeof r.name !== 'string' || !r.name.trim()
      || typeof r.longitude !== 'number' || typeof r.latitude !== 'number'
      || !Number.isFinite(r.longitude) || !Number.isFinite(r.latitude)
      || Math.abs(r.longitude) > 180 || Math.abs(r.latitude) >= 85) return [];
    return [{ id: r.id, nombre: r.name, detalle: [r.admin1, r.country].filter((x): x is string => typeof x === 'string' && x.length > 0).join(' · '), centro: [r.longitude, r.latitude] as LonLat }];
  });
}

export async function buscarLugares(consulta: string, idioma: Idioma, signal: AbortSignal): Promise<LugarMapa[]> {
  const nombre = consulta.trim();
  if (nombre.length < 2) return [];
  const clave = `${idioma}:${nombre.toLocaleLowerCase()}`;
  if (cache.has(clave)) return cache.get(clave)!;
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.search = new URLSearchParams({ name: nombre, language: idioma, count: '5', format: 'json' }).toString();
  const respuesta = await fetch(url, { signal });
  if (!respuesta.ok) throw new Error('El servicio de lugares no responde.');
  const lugares = interpretarLugares(await respuesta.json());
  if (cache.size >= 50) cache.clear();
  cache.set(clave, lugares);
  return lugares;
}
