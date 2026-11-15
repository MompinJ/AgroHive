import { describe, expect, it } from 'vitest';
import { problemasPorCultivo, textoProblema, type RegistroProblema } from './problemas';

const r = (cultivo: string, estadoPlanta: string | null, extra: Partial<RegistroProblema> = {}): RegistroProblema => ({ cultivo, estado: 'EVALUABLE', estadoPlanta, estresCalor: false, ...extra });

describe('problemas por cultivo', () => {
  it('da UNA entrada por cultivo, no una por celda', () => {
    const regs = [r('maiz', 'estresada'), r('maiz', 'estresada'), r('maiz', 'normal'), r('maiz', 'marchita'), r('frijol', 'normal')];
    const p = problemasPorCultivo(regs);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ cultivo: 'maiz', celdas: 4, conProblema: 3, gravedad: 'alto', estados: { estresada: 2, marchita: 1 }, calor: 0 });
  });
  it('un cultivo sano no aparece aunque tenga celdas', () => {
    expect(problemasPorCultivo([r('frijol', 'normal'), r('frijol', 'normal')])).toEqual([]);
    expect(problemasPorCultivo([])).toEqual([]);
  });
  it('la gravedad es la del peor estado del grupo', () => {
    expect(problemasPorCultivo([r('a', 'estresada')])[0]!.gravedad).toBe('aviso');
    expect(problemasPorCultivo([r('a', 'estresada'), r('a', 'marchita')])[0]!.gravedad).toBe('alto');
    expect(problemasPorCultivo([r('a', 'estresada'), r('a', 'podrida'), r('a', 'marchita')])[0]!.gravedad).toBe('critico');
  });
  it('el calor sobre el umbral cuenta como problema aunque la planta se vea normal', () => {
    const p = problemasPorCultivo([r('maiz', 'normal', { estresCalor: true }), r('maiz', 'normal')]);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatchObject({ conProblema: 1, calor: 1, gravedad: 'aviso', estados: {} });
  });
  it('lo no evaluable no es un problema: es falta de dato', () => {
    const p = problemasPorCultivo([r('maiz', 'marchita', { estado: 'NO_EVALUABLE' }), r('maiz', null, { estado: 'NO_EVALUABLE', estresCalor: true })]);
    expect(p).toEqual([]);
  });
  it('ignora celdas sin cultivo y ordena del mas grave al menos grave', () => {
    const regs = [r('a', 'estresada'), r('a', 'estresada'), r('b', 'podrida'), { cultivo: null, estado: 'EVALUABLE', estadoPlanta: 'marchita' } as RegistroProblema, r('c', 'marchita')];
    expect(problemasPorCultivo(regs).map((x) => x.cultivo)).toEqual(['b', 'c', 'a']);
  });
  it('escribe el texto con singular y plural y sin inventar tipos', () => {
    const [p] = problemasPorCultivo([r('maiz', 'estresada'), r('maiz', 'estresada'), r('maiz', 'marchita'), r('maiz', 'normal')]);
    expect(textoProblema(p!, 'Maíz')).toBe('Maíz: 3 de 4 celdas con problemas (1 marchita, 2 estresadas)');
    const [q] = problemasPorCultivo([r('frijol', 'normal', { estresCalor: true })]);
    expect(textoProblema(q!, 'Frijol')).toBe('Frijol: 1 de 1 celda con problemas (calor sobre el umbral en 1)');
  });
});
