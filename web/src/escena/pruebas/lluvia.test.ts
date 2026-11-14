import { describe, expect, it } from 'vitest';
import serieDemo from '../../../../datos/demo/respuestas/serie-clima.json';
import type { SerieBalance, SerieClima } from '../../../../contratos/tipos/contratos';
import { seleccionarEscenarios } from '../../motor/escenarios';
import { simularRotacion } from '../../motor/motor';
import { serieBalance } from '../../motor/series';
import { entradasDemo } from '../demo-motor';
import { claseLluvia, CORTES_LLUVIA, intensidadLluvia, lluviaDelDia, textoLluvia } from '../lluvia';

const escenarios = seleccionarEscenarios(structuredClone(serieDemo) as unknown as SerieClima).escenarios;
const serie = serieBalance(simularRotacion({ ...entradasDemo('mapa'), escenarios }), 'lluvioso')!;

describe('lluvia del dia en la escena', () => {
  it('cortes declarados e intensidad proporcional a los mm', () => {
    expect([0, 0.05, 0.1, 4.9, 5, 19.9, 20, 80].map(claseLluvia)).toEqual(['sin_lluvia', 'sin_lluvia', 'llovizna', 'llovizna', 'moderada', 'moderada', 'fuerte', 'fuerte']);
    expect(intensidadLluvia(0)).toBe(0);
    expect(intensidadLluvia(10)).toBeCloseTo(10 / CORTES_LLUVIA.saturaEnMm);
    expect(intensidadLluvia(25)).toBeGreaterThan(intensidadLluvia(10));
    expect(intensidadLluvia(500)).toBe(1);
  });

  it('toma la lluvia del dia de la serie del motor, con su dia de clima y su fuente', () => {
    const c = serie.ciclos[0]!;
    const i = c.dias.lluviaMm.findIndex((v) => v !== null && v > 20);
    expect(i).toBeGreaterThanOrEqual(0);
    const fecha = new Date(Date.parse(c.desde) + i * 86400000).toISOString().slice(0, 10);
    const l = lluviaDelDia(serie, fecha)!;
    expect(l.estado).toBe('con_dato');
    if (l.estado !== 'con_dato') return;
    expect(l.mm).toBe(c.dias.lluviaMm[i]);
    expect(l.clase).toBe('fuerte');
    expect(l.fechaClima).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(l.fuente?.nombre).toMatch(/POWER/);
    expect(textoLluvia(l)).toMatch(/^Lluvia: [\d.,]+ mm, lluvia fuerte, el \d{4}-\d{2}-\d{2} \(clima real del \d{4}-\d{2}-\d{2}\)\. Fuente: .*POWER/);
  });

  it('un dia sin lluvia no llueve y lo dice', () => {
    const c = serie.ciclos.find((x) => x.dias.lluviaMm.some((v) => v !== null && v < 0.1))!;
    const i = c.dias.lluviaMm.findIndex((v) => v !== null && v < 0.1);
    const fecha = new Date(Date.parse(c.desde) + i * 86400000).toISOString().slice(0, 10);
    const l = lluviaDelDia(serie, fecha)!;
    expect(l).toMatchObject({ estado: 'con_dato', clase: 'sin_lluvia', intensidad: 0 });
    expect(textoLluvia(l)).toMatch(/^Sin lluvia/);
  });

  it('dato faltante: sin lluvia y sin fingirla, con motivo', () => {
    const s = structuredClone(serie) as SerieBalance;
    s.ciclos[0]!.dias.lluviaMm[3] = null;
    const fecha = new Date(Date.parse(s.ciclos[0]!.desde) + 3 * 86400000).toISOString().slice(0, 10);
    const l = lluviaDelDia(s, fecha)!;
    expect(l.estado).toBe('sin_dato');
    expect(textoLluvia(l)).toMatch(/NO_EVALUABLE/);
  });

  it('fuera de los ciclos de la serie: sin dato (no se supone seco)', () => {
    const l = lluviaDelDia(serie, '2001-01-01')!;
    expect(l.estado).toBe('sin_dato');
    if (l.estado === 'sin_dato') expect(l.motivo).toMatch(/fuera/);
  });

  it('sin serie o sin fecha no hay lluvia que mostrar', () => {
    expect(lluviaDelDia(null, '2026-07-01')).toBeNull();
    expect(lluviaDelDia(serie, null)).toBeNull();
  });
});
