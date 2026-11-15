import { describe, expect, it } from 'vitest';
import type { CatalogoCultivos, SerieClima } from '../../../contratos/tipos/contratos';
import { climaDeLaSemana, colorLuz, LUZ_MAX_MJ, nivelTemperatura, NIVELES_TEMPERATURA, rangosTemperatura, type RangoTemperatura } from './clima-vista';

type Dia = SerieClima['diario'][number];
const dia = (fecha: string, o: Partial<Dia> = {}): Dia => ({ fecha, lluviaMm: 0, tMaxC: 32, tMinC: 22, tMediaC: 27, radiacionMjM2Dia: 20, ...o }) as Dia;
const serieDe = (n: number, f: (k: number) => Partial<Dia> = () => ({})): SerieClima => ({
  diario: Array.from({ length: n }, (_, k) => dia(new Date(Date.UTC(2016, 7, 1) + k * 86400000).toISOString().slice(0, 10), f(k))),
}) as unknown as SerieClima;

describe('clima de la semana', () => {
  it('promedia los 7 dias que terminan en la fecha del clima real', () => {
    const s = serieDe(20, (k) => ({ tMediaC: 20 + k, radiacionMjM2Dia: 10 + k, tMaxC: 30 + k, tMinC: 10 + k }));
    const c = climaDeLaSemana(s, '2016-08-10')!; // dias 4..9 (agosto 5 a 10 es k=4..9) y el 4 ago
    expect(c.fechaClima).toBe('2016-08-10');
    expect(c.dias).toBe(7);
    expect(c.tMediaC).toBeCloseTo(20 + (3 + 4 + 5 + 6 + 7 + 8 + 9) / 7, 6);
    expect(c.radiacionMjM2Dia).toBeCloseTo(10 + 6, 6);
    expect(c.tMaxC).toBe(39);
    expect(c.tMinC).toBe(13);
  });
  it('no afirma nada con menos de 4 dias con dato', () => {
    const s = serieDe(20, (k) => (k < 15 ? { tMediaC: null, tMaxC: null, tMinC: null, radiacionMjM2Dia: null } : {}));
    const c = climaDeLaSemana(s, '2016-08-17')!; // solo 3 dias con dato (k 15 a 16 en la ventana)
    expect(c.tMediaC).toBeNull();
    expect(c.radiacionMjM2Dia).toBeNull();
  });
  it('si falta la media usa el promedio de maxima y minima, y no inventa si falta alguna', () => {
    const s = serieDe(10, () => ({ tMediaC: null, tMaxC: 30, tMinC: 20 }));
    expect(climaDeLaSemana(s, '2016-08-09')!.tMediaC).toBe(25);
    const s2 = serieDe(10, () => ({ tMediaC: null, tMaxC: 30, tMinC: null }));
    expect(climaDeLaSemana(s2, '2016-08-09')!.tMediaC).toBeNull();
  });
  it('sin serie o con una fecha invalida devuelve null; una fecha fuera de la serie, sin datos', () => {
    expect(climaDeLaSemana(null, '2016-08-09')).toBeNull();
    expect(climaDeLaSemana(serieDe(5), null)).toBeNull();
    expect(climaDeLaSemana(serieDe(5), 'ayer')).toBeNull();
    const fuera = climaDeLaSemana(serieDe(5), '2030-01-01')!;
    expect(fuera.dias).toBe(0);
    expect(fuera.tMediaC).toBeNull();
  });
});

describe('temperatura por cultivo', () => {
  const maiz: RangoTemperatura = { tMinAbsC: 10, tOptMinC: 18, tOptMaxC: 33, tMaxAbsC: 47 };
  it('clasifica la media frente al rango del cultivo, con limites incluidos en el nivel de adentro', () => {
    expect(nivelTemperatura(5, maiz)).toBe('helada');
    expect(nivelTemperatura(10, maiz)).toBe('fresca');
    expect(nivelTemperatura(17.9, maiz)).toBe('fresca');
    expect(nivelTemperatura(18, maiz)).toBe('optima');
    expect(nivelTemperatura(33, maiz)).toBe('optima');
    expect(nivelTemperatura(33.1, maiz)).toBe('calida');
    expect(nivelTemperatura(47, maiz)).toBe('calida');
    expect(nivelTemperatura(47.1, maiz)).toBe('excesiva');
  });
  it('los cinco niveles tienen color y etiqueta distintos', () => {
    expect(new Set(NIVELES_TEMPERATURA.map((n) => n.color)).size).toBe(5);
    expect(new Set(NIVELES_TEMPERATURA.map((n) => n.etiqueta)).size).toBe(5);
  });
  it('toma los rangos del catalogo real: los 40 cultivos tienen los cuatro valores con fuente', async () => {
    const cat = (await import('../../../datos/catalogos/cultivos.json')).default as unknown as CatalogoCultivos;
    const r = rangosTemperatura(cat);
    expect(Object.keys(r)).toHaveLength(cat.cultivos.length);
    expect(r['maiz']).toEqual(maiz);
  });
  it('no incluye un cultivo con un valor sin evaluar o fuera de orden', () => {
    const u = (v: Record<string, unknown>) => ({ umbrales: v });
    const ok = { tMinAbsC: { estado: 'EVALUABLE', valor: 5 }, tOptMinC: { estado: 'EVALUABLE', valor: 15 }, tOptMaxC: { estado: 'EVALUABLE', valor: 28 }, tMaxAbsC: { estado: 'EVALUABLE', valor: 40 } };
    const cat = { cultivos: [
      { id: 'a', ...u(ok) }, { id: 'sin', ...u({ ...ok, tMaxAbsC: { estado: 'NO_EVALUABLE', motivo: 'x' } }) },
      { id: 'desorden', ...u({ ...ok, tOptMinC: { estado: 'EVALUABLE', valor: 30 } }) },
    ] } as unknown as CatalogoCultivos;
    expect(Object.keys(rangosTemperatura(cat))).toEqual(['a']);
    expect(rangosTemperatura(null)).toEqual({});
  });
});

describe('color de la luz', () => {
  it('va de azul pizarra (poca) a amarillo (mucha) y sin dato no pinta', () => {
    expect(colorLuz(0)).toBe('#4a5d78');
    expect(colorLuz(LUZ_MAX_MJ)).toBe('#ffd447');
    expect(colorLuz(LUZ_MAX_MJ * 5)).toBe('#ffd447'); // mas alla se queda en el tope
    expect(colorLuz(-3)).toBe('#4a5d78');
    expect(colorLuz(null)).toBeNull();
    expect(colorLuz(NaN)).toBeNull();
    expect(colorLuz(15)).not.toBe(colorLuz(25));
  });
});
