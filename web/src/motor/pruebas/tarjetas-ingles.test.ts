// Tarjetas en ingles ([DECIDIDO] 15/11): mismas cifras y fuentes que en espanol, idioma por defecto 'es', y el idioma
// pasa por el protocolo del Worker y por el cliente como campo opcional.
import { describe, expect, it } from 'vitest';
import { crearClienteMotor, type WorkerMotor } from '../cliente';
import { seleccionarEscenarios } from '../escenarios';
import { idiomaMotor } from '../idioma';
import { simularRotacion, type EntradasMotor } from '../motor';
import { EstadoMotor, type Respuesta } from '../protocolo';
import { rankear } from '../ranking';
import { AVISO_EXPERTO, AVISOS_EXPERTO, conTarjetas, nombreEscenario, ventanasDe } from '../tarjetas';
import type { ResultadoRanking } from '../ranking';
import type { CalendarioLocal, CatalogoCultivos, Fuente, Parcela, PlanSiembra, ResultadoRotacion, Suelo, TablaSuelos } from '../tipos';
import type { IdiomaMotor } from '../idioma';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import calendarioIsla from '../../../../datos/catalogos/calendario-isla.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const sel = seleccionarEscenarios(seriePowerIsla());
function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: '0.10.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: 'parcela-demo-isla',
    calendarioLocal: { calendarioId: 'calendario-isla' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const PLANES = [
  plan('R1', [['maiz', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI'], ['maiz', '2027-06-15', 'PV']]),
  plan('R2', [['maiz', '2026-06-15', 'PV'], ['maiz', '2027-06-15', 'PV']]),
  plan('R4', [['maiz', '2026-06-01', 'PV'], ['frijol', '2026-10-10', 'OI'], ['maiz', '2027-06-01', 'PV']]),
  plan('R5', [['calabaza', '2026-06-15', 'PV'], ['frijol', '2026-10-10', 'OI']]),
  plan('R6', [['quinua', '2026-06-15', 'PV']]),
];
const entradas = (p: PlanSiembra): EntradasMotor => ({
  plan: p,
  parcela: parcela as unknown as Parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  calendario: calendarioIsla as unknown as CalendarioLocal,
  escenarios: sel.escenarios,
});
const motores = Object.fromEntries(PLANES.map((p) => [p.rotacionId, simularRotacion(entradas(p))]));
const ranking = rankear(PLANES.map((p) => ({ rotacion: motores[p.rotacionId]!.rotacion, numeroSiembras: p.ciclos.length })));
function tarjetas(idioma?: IdiomaMotor | 'fr') {
  const ctx = { ranking, motores, catalogo: catalogo as unknown as CatalogoCultivos, calendario: calendarioIsla as unknown as CalendarioLocal, suelo: sueloDemo as unknown as Suelo };
  const rs = conTarjetas(idioma === undefined ? ctx : { ...ctx, idioma: idioma as IdiomaMotor });
  return Object.fromEntries(rs.map((r) => [r.rotacionId, r])) as Record<string, ResultadoRotacion>;
}
const es = tarjetas();
const en = tarjetas('en');

describe('tarjetas en ingles con la demo de Isla', () => {
  it('sin idioma, o con uno que no existe, la tarjeta sale en espanol, igual que antes', () => {
    expect(tarjetas('es')).toEqual(es);
    expect(tarjetas('fr')).toEqual(es);
    expect(idiomaMotor(undefined)).toBe('es');
    expect(es.R4!.explicacion.avisoExperto).toBe(AVISO_EXPERTO);
  });

  it('la ganadora (R4) se explica en ingles con los anios reales, INIFAP y las fechas en ingles', () => {
    const r = en.R4!.explicacion;
    expect(r.porQue).toMatch(/^It is the most robust option of the 3 rotations compared\./);
    expect(r.porQue).toContain('dry year 2023, normal year 2016, wet year 2024');
    expect(r.beneficios).toContain('Dates: every planting falls within the windows recommended by INIFAP for the area.');
    expect(r.avisoExperto).toBe(AVISOS_EXPERTO.en);
    // El nombre del cultivo sale del catalogo (nombreComunEn).
    expect(en.R1!.explicacion.riesgos.some((x) => /^The common bean of cycle 2 is planted on November 1, outside the window recommended by INIFAP \(from September 20 to October 20\)\.$/.test(x))).toBe(true);
  });

  it('mismas cifras y fuentes en la evidencia; nada fuera de la tarjeta cambia', () => {
    for (const id of Object.keys(es)) {
      const a = en[id]!;
      const b = es[id]!;
      expect({ ...a, explicacion: null }).toEqual({ ...b, explicacion: null });
      expect(a.explicacion.evidencia.map((e) => ({ ...e, texto: '' }))).toEqual(b.explicacion.evidencia.map((e) => ({ ...e, texto: '' })));
      expect(a.explicacion.riesgos.length).toBe(b.explicacion.riesgos.length);
      expect(validadorContrato('resultado-rotacion')(a)).toEqual([]);
    }
  });

  it('suelo con su clase USDA en ingles, porcentajes sin espacio y "1 day" en singular', () => {
    expect(en.R4!.explicacion.huecos.some((h) => /^The soil \(sandy clay loam, 122 mm of available water per meter\) is an estimate/.test(h))).toBe(true);
    expect(en.R4!.explicacion.evidencia.some((e) => /\d%/.test(e.texto))).toBe(true);
    expect(en.R4!.explicacion.evidencia.every((e) => !/\b1 days\b/.test(e.texto))).toBe(true);
  });

  it('EXPLORATORIO y NO_EVALUABLE en ingles; el motivo tecnico del motor se cita marcado como espanol', () => {
    expect(en.R5!.explicacion.porQue).toMatch(/^Shown for exploration, but not recommended: /);
    expect(en.R6!.explicacion.porQue).toMatch(/^This rotation cannot be evaluated\. Engine reason \(in Spanish\): .*quinua/);
    expect(en.R6!.explicacion.evidencia).toEqual([]);
  });

  it('nombres del escenario y de quien da la ventana, por idioma', () => {
    expect(nombreEscenario('habitual')).toBe('año normal');
    expect(nombreEscenario('lluvioso', 'en')).toBe('wet year');
    const ggcmi: Fuente = { nombre: 'GGCMI Phase 3 crop calendar v1.01, maize', url: 'https://example.org', consultado: '2026-11-14' };
    expect(ventanasDe([ggcmi], true, 'en')).toBe('the GGCMI Phase 3 crop calendar v1.01 planting window');
    expect(ventanasDe([ggcmi], true)).toBe('la ventana de siembra de GGCMI Phase 3 crop calendar v1.01');
  });
});

describe('el idioma por el Worker y el cliente', () => {
  it("rankear con idioma 'en' da tarjetas y motivos de noOrdenadas en ingles; sin idioma, en espanol", () => {
    const m = new EstadoMotor();
    for (const [i, p] of PLANES.entries()) m.atender({ id: i, tipo: 'simular', entradas: entradas(p) });
    const pedir = (idioma?: IdiomaMotor) => {
      const r = m.atender({ id: 99, tipo: 'rankear', ...(idioma ? { idioma } : {}) }) as Extract<Respuesta, { ok: true }>;
      return r.resultado as ResultadoRanking;
    };
    const ingles = pedir('en');
    const espanol = pedir();
    expect(ingles.rotaciones.find((r) => r.rotacionId === 'R4')!.explicacion.porQue).toMatch(/^It is the most robust option/);
    expect(espanol.rotaciones.find((r) => r.rotacionId === 'R4')!.explicacion.porQue).toMatch(/^Es la opción más robusta/);
    expect(ingles.noOrdenadas.find((x) => x.rotacionId === 'R5')!.motivo).toMatch(/^EXPLORATORIO: shown, but not recommended/);
    expect(espanol.noOrdenadas.find((x) => x.rotacionId === 'R5')!.motivo).toMatch(/^EXPLORATORIO: se muestra/);
    expect(ingles.orden).toEqual(espanol.orden);
  });

  it('el cliente manda idioma solo si se lo pasan (la firma anterior sigue igual)', () => {
    const enviados: unknown[] = [];
    const w: WorkerMotor = { onmessage: null, onerror: null, onmessageerror: null, postMessage: (x) => enviados.push(x), terminate: () => {} };
    const c = crearClienteMotor(() => w);
    void c.rankear(['R1']);
    void c.rankear(['R1'], undefined, 'en');
    expect(enviados[0]).toEqual({ tipo: 'rankear', rotacionIds: ['R1'], id: 1 });
    expect(enviados[1]).toEqual({ tipo: 'rankear', rotacionIds: ['R1'], idioma: 'en', id: 2 });
  });
});
