import { describe, expect, it } from 'vitest';
import { VENTANA_ESTANDAR, obtenerClimaEstandar, obtenerCultivos, obtenerSuelo, obtenerTerreno, pedir, urlBase } from './cliente';

const json = (cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
const simular = (respuesta: () => Response | Promise<Response>, llamadas: string[] = []) =>
  (async (url: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push(`${init?.method ?? 'GET'} ${String(url)}`);
    return respuesta();
  }) as typeof fetch;

describe('cliente de la API (A4.6)', () => {
  it('la ventana estandar es la que pide el motor y el paquete de demo', () => {
    expect(VENTANA_ESTANDAR).toEqual({ desde: '2005-10-01', hasta: '2025-12-31' });
  });

  it('en pruebas (desarrollo) usa la API publica y VITE_API_URL la reemplaza', () => {
    expect(urlBase()).toBe('https://64-23-143-102.sslip.io');
  });

  it('clima de la ventana estandar: arma la URL con lat, lon y fechas exactas', async () => {
    const llamadas: string[] = [];
    const r = await obtenerClimaEstandar(-95.53, 18.03, { fetchFn: simular(() => json({ estado: 'EVALUABLE', diario: [] }), llamadas) });
    expect(r).toEqual({ ok: true, datos: { estado: 'EVALUABLE', diario: [] } });
    expect(llamadas).toEqual(['GET https://64-23-143-102.sslip.io/api/clima?lat=18.03&lon=-95.53&desde=2005-10-01&hasta=2025-12-31']);
  });

  it('503 ERROR_DATOS: devuelve el motivo del servidor, sin inventar datos', async () => {
    const r = await obtenerSuelo(-95.53, 18.03, { fetchFn: simular(() => json({ estado: 'ERROR_DATOS', motivo: 'SoilGrids no respondio' }, 503)) });
    expect(r).toEqual({ ok: false, error: { estado: 'ERROR_DATOS', motivo: 'SoilGrids no respondio', codigo: 503 } });
  });

  it('422: muestra el detalle de la peticion invalida', async () => {
    const texto = await pedir('/api/clima', {}, { fetchFn: simular(() => json({ detail: 'Periodo invalido: desde >= 1981-01-01' }, 422)) });
    expect(texto).toEqual({ ok: false, error: { estado: 'ERROR_DATOS', motivo: 'Periodo invalido: desde >= 1981-01-01', codigo: 422 } });
    const lista = await pedir('/api/suelo', {}, { fetchFn: simular(() => json({ detail: [{ msg: 'Input should be <= 90' }] }, 422)) });
    expect(lista).toMatchObject({ ok: false, error: { motivo: 'Input should be <= 90', codigo: 422 } });
  });

  it('red caida: ERROR_DATOS sin codigo HTTP', async () => {
    const r = await obtenerCultivos({ fetchFn: (async () => { throw new TypeError('fallo de red'); }) as typeof fetch });
    expect(r).toEqual({ ok: false, error: { estado: 'ERROR_DATOS', motivo: 'Sin conexion con el servidor de datos.' } });
  });

  it('cuerpo que no es JSON (por ejemplo una pagina de error de nginx)', async () => {
    const r = await obtenerCultivos({ fetchFn: simular(() => new Response('<html>502</html>', { status: 502 })) });
    expect(r).toMatchObject({ ok: false, error: { codigo: 502 } });
  });

  it('tiempo agotado: avisa que tardo demasiado y cancela la peticion', async () => {
    let cancelada = false;
    const lenta = ((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, rechazar) => init?.signal?.addEventListener('abort', () => { cancelada = true; rechazar(new DOMException('abort', 'AbortError')); }))) as typeof fetch;
    const r = await pedir('/api/clima', {}, { fetchFn: lenta, tiempoMs: 20 });
    expect(r).toEqual({ ok: false, error: { estado: 'ERROR_DATOS', motivo: 'El servidor de datos tardo demasiado en responder.' } });
    expect(cancelada).toBe(true);
  });

  it('el usuario puede cancelar (cambio de pantalla): no es un error del servidor', async () => {
    const control = new AbortController();
    const lenta = ((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, rechazar) => init?.signal?.addEventListener('abort', () => rechazar(new DOMException('abort', 'AbortError')))) ) as typeof fetch;
    const promesa = pedir('/api/clima', {}, { fetchFn: lenta, senal: control.signal });
    control.abort();
    expect(await promesa).toEqual({ ok: false, error: { estado: 'ERROR_DATOS', motivo: 'Consulta cancelada.' } });
  });

  it('terreno: POST con la cuadricula en JSON', async () => {
    const llamadas: string[] = [];
    let cuerpo = '';
    const f = (async (url: RequestInfo | URL, init?: RequestInit) => {
      llamadas.push(`${init?.method} ${String(url)}`);
      cuerpo = String(init?.body);
      return json({ celdas: [] });
    }) as typeof fetch;
    const entrada = { tamanoCeldaM: 20, celdas: [{ id: 'c-0-0', i: 0, j: 0, centro: [-95.53, 18.03] as [number, number] }] };
    const r = await obtenerTerreno(entrada, { fetchFn: f });
    expect(r.ok).toBe(true);
    expect(llamadas).toEqual(['POST https://64-23-143-102.sslip.io/api/elevacion']);
    expect(JSON.parse(cuerpo)).toEqual(entrada);
  });
});
