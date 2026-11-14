// A2.13, parte del motor: la banda de proxima temporada se valida y se compara con los escenarios, sin cifra unica.
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { mesEnEscenario, vistaProximaTemporada } from '../proxima';
import type { ProximaTemporadaAproximada } from '../../../../contratos/tipos/contratos';
import proximaDemo from '../../../../datos/demo/respuestas/proxima-temporada.json';
import { seriePowerIsla } from './utiles';

const doc = proximaDemo as unknown as ProximaTemporadaAproximada;
const sel = seleccionarEscenarios(seriePowerIsla());

describe('proxima temporada con el paquete de demo (emitido 2026-11-14, nov 2026 a abr 2027)', () => {
  const v = vistaProximaTemporada(doc, sel.escenarios);
  it('se queda EXPLORATORIO, sin prediccion, con 6 meses y la banda tal cual llega de la API', () => {
    expect(v.estado).toBe('EXPLORATORIO');
    expect(v.esPrediccion).toBe(false);
    expect(v.meses).toHaveLength(6);
    expect(v.meses[0]?.lluviaMm).toEqual(doc.meses[0]?.lluviaMm);
    expect(v.advertencias.some((a) => a.codigo === 'NO_ES_PREDICCION')).toBe(true);
    // Ningun campo de cifra unica.
    expect(JSON.stringify(v)).not.toMatch(/"valor"|"pronostico"/);
  });
  it('compara cada mes con la lluvia real del mismo mes en el anio agricola de cada escenario', () => {
    expect(mesEnEscenario('2026-11', 2023)).toBe('2022-11');
    expect(mesEnEscenario('2027-04', 2023)).toBe('2023-04');
    const nov = v.meses[0]!.escenarios.seco!;
    expect(nov).toMatchObject({ anioReal: 2023, mesReal: '2022-11' });
    const diario = sel.escenarios.seco!.diario.filter((d) => d.fecha.startsWith('2022-11'));
    expect(nov.lluviaMm).toBeCloseTo(diario.reduce((s, d) => s + (d.lluviaMm as number), 0), 1);
    const { inferior, superior } = v.meses[0]!.lluviaMm;
    const esperada = nov.lluviaMm! < inferior! ? 'debajo' : nov.lluviaMm! > superior! ? 'encima' : 'dentro';
    expect(nov.posicion).toBe(esperada);
    for (const e of ['seco', 'habitual', 'lluvioso'] as const) expect(v.coincidencias[e]?.deMeses).toBe(6);
  });
});

describe('capa invalida o ausente => NO_EVALUABLE, nunca se rellena', () => {
  it('sin documento', () => {
    expect(vistaProximaTemporada(null, sel.escenarios)).toMatchObject({ estado: 'NO_EVALUABLE', meses: [] });
  });
  it('banda invertida, siete meses o esPrediccion distinto de false', () => {
    const invertida = structuredClone(doc);
    invertida.meses[0]!.lluviaMm = { inferior: 200, superior: 10 };
    expect(vistaProximaTemporada(invertida, sel.escenarios).motivo).toMatch(/invertida/);
    const siete = structuredClone(doc) as unknown as { meses: unknown[] };
    siete.meses.push(structuredClone(doc.meses[0]));
    expect(vistaProximaTemporada(siete as unknown as ProximaTemporadaAproximada, sel.escenarios).estado).toBe('NO_EVALUABLE');
    const pred = { ...doc, esPrediccion: true } as unknown as ProximaTemporadaAproximada;
    expect(vistaProximaTemporada(pred, sel.escenarios).estado).toBe('NO_EVALUABLE');
  });
  it('ERROR_DATOS de la API se conserva', () => {
    expect(vistaProximaTemporada({ ...doc, estado: 'ERROR_DATOS', meses: [] }, sel.escenarios).estado).toBe('ERROR_DATOS');
  });
  it('sin escenarios: la banda se muestra igual, sin comparacion', () => {
    const v = vistaProximaTemporada(doc, {});
    expect(v.estado).toBe('EXPLORATORIO');
    expect(v.meses[0]?.escenarios.seco).toBeNull();
    expect(v.coincidencias.seco).toBeNull();
  });
});
