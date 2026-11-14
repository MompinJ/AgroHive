import { describe, expect, it } from 'vitest';
import { avisosDe, cargarDatosParcela, fallaObligatoria } from './datosParcela';

const json = (cuerpo: unknown, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } });
const meta = { versionContrato: '0.9.0', esEjemplo: false };

type Mapa = Partial<Record<'clima' | 'suelo' | 'cultivos' | 'proxima', () => Response>>;
/** API simulada: responde segun la ruta pedida y registra las llamadas. */
function api(mapa: Mapa, llamadas: string[] = []) {
  const por = (ruta: string) => (ruta.includes('/api/clima') ? 'clima' : ruta.includes('/api/suelo') ? 'suelo' : ruta.includes('/api/cultivos') ? 'cultivos' : 'proxima') as keyof Mapa;
  return (async (url: RequestInfo | URL) => {
    llamadas.push(String(url));
    const r = mapa[por(String(url))];
    return r ? r() : json({ estado: 'ERROR_DATOS', motivo: 'sin simular' }, 503);
  }) as typeof fetch;
}
const climaOk = () => json({ meta, estado: 'EVALUABLE', respaldo: false, coordenada: [-95.53, 18.03], fuente: { nombre: 'NASA POWER' }, diario: [], advertencias: [] });
const sueloOk = () => json({ meta, id: 'suelo-1', advertencias: [{ codigo: 'SUELO_SUPUESTO', mensaje: 'estimado por un modelo global', severidad: 'aviso' }] });
const cultivosOk = () => json({ meta, cultivos: [] });
const proximaOk = () => json({ meta, advertencias: [{ codigo: 'SIN_TENDENCIA', mensaje: 'sin tendencia', severidad: 'info' }] });

describe('cargarDatosParcela (A4.6)', () => {
  it('pide clima de la ventana estandar, suelo, cultivos y proxima temporada para el centroide', async () => {
    const llamadas: string[] = [];
    const d = await cargarDatosParcela([-95.53, 18.03], { fetchFn: api({ clima: climaOk, suelo: sueloOk, cultivos: cultivosOk, proxima: proximaOk }, llamadas) });
    expect(Object.values(d).every((r) => r.ok)).toBe(true);
    expect(llamadas).toHaveLength(4);
    expect(llamadas.find((u) => u.includes('/api/clima'))).toContain('desde=2005-10-01&hasta=2025-12-31');
    expect(llamadas.find((u) => u.includes('/api/suelo'))).toContain('lat=18.03&lon=-95.53');
    expect(fallaObligatoria(d)).toBeNull();
  });

  it('si falla un dato obligatorio lo nombra, con el motivo del servidor', async () => {
    const d = await cargarDatosParcela([-95.53, 18.03], {
      fetchFn: api({ clima: climaOk, suelo: () => json({ estado: 'ERROR_DATOS', motivo: 'SoilGrids no respondio' }, 503), cultivos: cultivosOk, proxima: proximaOk }),
    });
    expect(fallaObligatoria(d)).toEqual({ falla: 'suelo', error: { estado: 'ERROR_DATOS', motivo: 'SoilGrids no respondio', codigo: 503 } });
  });

  it('la proxima temporada es opcional: si falla no bloquea, pero se avisa', async () => {
    const d = await cargarDatosParcela([-95.53, 18.03], { fetchFn: api({ clima: climaOk, suelo: sueloOk, cultivos: cultivosOk }) });
    expect(fallaObligatoria(d)).toBeNull();
    expect(avisosDe(d).map((a) => a.codigo)).toContain('PROXIMA_TEMPORADA_NO_DISPONIBLE');
  });

  it('el respaldo del clima y las advertencias de cada respuesta siempre salen en los avisos', async () => {
    const respaldo = () => json({ meta, estado: 'RESPALDO_HISTORICO', respaldo: true, coordenada: [-95.53, 18.03], fuente: { nombre: 'Open-Meteo archivo historico (ERA5)' }, diario: [],
      advertencias: [{ codigo: 'POWER_NO_DISPONIBLE', mensaje: 'NASA POWER no respondio', severidad: 'aviso' }] });
    const d = await cargarDatosParcela([-95.53, 18.03], { fetchFn: api({ clima: respaldo, suelo: sueloOk, cultivos: cultivosOk, proxima: proximaOk }) });
    const codigos = avisosDe(d).map((a) => `${a.origen}:${a.codigo}`);
    expect(codigos).toEqual(expect.arrayContaining(['clima:CLIMA_RESPALDO_HISTORICO', 'clima:POWER_NO_DISPONIBLE', 'suelo:SUELO_SUPUESTO', 'proxima temporada:SIN_TENDENCIA']));
  });

  it('sin red: todos fallan con ERROR_DATOS y no lanza', async () => {
    const d = await cargarDatosParcela([-95.53, 18.03], { fetchFn: (async () => { throw new TypeError('red'); }) as typeof fetch });
    expect(fallaObligatoria(d)?.falla).toBe('clima');
    expect(Object.values(d).every((r) => !r.ok)).toBe(true);
  });
});
