import { afterEach, describe, expect, it, vi } from 'vitest';
import { buscarLugares, interpretarLugares } from './lugares';

afterEach(() => vi.unstubAllGlobals());
describe('busqueda de lugares para navegar, sin editar la parcela', () => {
  it('descarta coordenadas ausentes, texto numerico, infinitas o fuera de la proyeccion del mapa', () => {
    expect(interpretarLugares({ results: [
      { id: 1, name: 'Veracruz', latitude: 19.18, longitude: -96.14, admin1: 'Veracruz', country: 'México' },
      { id: 2, name: 'Sin coordenadas' }, { id: 3, name: 'Invalido', latitude: '1', longitude: 2 },
      { id: 4, name: 'Polo', latitude: 89, longitude: 2 }, { id: 5, name: 'Infinito', latitude: 1, longitude: Infinity },
    ] })).toEqual([{ id: 1, nombre: 'Veracruz', detalle: 'Veracruz · México', centro: [-96.14, 19.18] }]);
  });
  it('acepta respuestas vacias y rechaza respuestas no reconocidas', () => {
    expect(interpretarLugares({})).toEqual([]);
    expect(() => interpretarLugares({ results: 'error' })).toThrow();
  });
  it('no consulta hasta tener al menos dos caracteres', async () => {
    const fetchFn = vi.fn(); vi.stubGlobal('fetch', fetchFn);
    await expect(buscarLugares(' a ', 'es', new AbortController().signal)).resolves.toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });
  it('envia la consulta y el idioma, conserva la senal y no inventa resultados en un error HTTP', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response('{}', { status: 503 })); vi.stubGlobal('fetch', fetchFn);
    const signal = new AbortController().signal;
    await expect(buscarLugares('Mérida', 'es', signal)).rejects.toThrow();
    const [url, opts] = fetchFn.mock.calls[0]!;
    expect(new URL(url).searchParams.get('name')).toBe('Mérida');
    expect(new URL(url).searchParams.get('language')).toBe('es');
    expect(opts.signal).toBe(signal);
  });
  it('reutiliza consultas iguales sin pedir mas datos', async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [{ id: 10, name: 'Nairobi', latitude: -1.28, longitude: 36.81 }] }))); vi.stubGlobal('fetch', fetchFn);
    const signal = new AbortController().signal;
    const lugares = await buscarLugares('Nairobi', 'en', signal);
    expect(lugares[0]?.centro).toEqual([36.81, -1.28]);
    expect(await buscarLugares('  nairobi ', 'en', signal)).toEqual(lugares);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
