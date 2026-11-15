import { describe, expect, it } from 'vitest';
import { calendarioIsla, pintarCeldas, planesIniciales } from '../planes';
import { parcelaConTerrenoDemo } from '../../escena/demo-motor';
import { mapaPlagas, plagaDeCultivo, plagasPresentes, proteger, protegidas, riesgosDelPlan, type PlagaZona } from './plagas';

const zona: PlagaZona[] = [
  { id: 'cogollero', nombreComun: 'Gusano cogollero', tipoVisual: 'gusano', estado: 'presente', registros: 40, cultivos: ['maiz', 'sorgo'] },
  { id: 'chapulin', nombreComun: 'Chapulín', tipoVisual: 'chapulin', estado: 'presente', registros: 5, cultivos: ['maiz', 'frijol'] },
  { id: 'mosca', nombreComun: 'Mosca blanca', tipoVisual: 'mosca', estado: 'sin_registros', registros: 0, cultivos: ['tomate'] },
];
const parcela = parcelaConTerrenoDemo();
const celdas = parcela.celdas.map((c) => c.id);
const plan = planesIniciales(parcela, calendarioIsla)[0]!;

describe('plagas en el simulador', () => {
  it('solo cuenta las presentes, de la mas registrada a la menos', () => {
    const p = plagasPresentes(zona);
    expect(p.map((x) => x.id)).toEqual(['cogollero', 'chapulin']);
    expect(plagaDeCultivo(p, 'maiz')?.id).toBe('cogollero');
    expect(plagaDeCultivo(p, 'frijol')?.id).toBe('chapulin');
    expect(plagaDeCultivo(p, 'tomate')).toBeUndefined();
  });

  it('el insecticida protege por rotacion y ciclo, y se puede quitar', () => {
    let pr = proteger({}, 'R1', 1, [celdas[0]!, celdas[1]!]);
    expect(protegidas(pr, 'R1', 1).has(celdas[0]!)).toBe(true);
    expect(protegidas(pr, 'R1', 2).size).toBe(0);
    expect(protegidas(pr, 'R2', 1).size).toBe(0);
    pr = proteger(pr, 'R1', 1, [celdas[0]!], true);
    expect([...protegidas(pr, 'R1', 1)]).toEqual([celdas[1]]);
  });

  it('las celdas sin insecticida con cultivo atacado van a la escena comiendo', () => {
    const registros = celdas.map((celdaId) => ({ celdaId, cultivo: 'maiz', ciclo: 1 }));
    const pr = proteger({}, 'R1', 1, [celdas[0]!]);
    const mapa = mapaPlagas([...registros, { celdaId: 'x', cultivo: null, ciclo: null }], plagasPresentes(zona), pr, 'R1');
    expect(mapa.has(celdas[0]!)).toBe(false);
    expect(mapa.get(celdas[1]!)).toEqual({ tipo: 'gusano', comiendo: true, nombre: 'Gusano cogollero' });
    expect(mapa.has('x')).toBe(false);
  });

  it('cuenta por ciclo los bloques sin proteger, tambien con cultivos pintados', () => {
    const pintado = pintarCeldas(plan, parcela, 1, [celdas[0]!], 'frijol', calendarioIsla);
    const r = riesgosDelPlan(pintado, celdas, plagasPresentes(zona), proteger({}, 'R1', 1, [celdas[1]!]));
    const c1 = r.filter((x) => x.ciclo === 1);
    expect(c1.find((x) => x.cultivo === 'maiz')!.sinProteger).toHaveLength(celdas.length - 2);
    expect(c1.find((x) => x.cultivo === 'frijol')!.plaga.id).toBe('chapulin');
    // Ciclo 2 es frijol en todo: chapulin en todas las celdas.
    expect(r.find((x) => x.ciclo === 2)!.sinProteger).toHaveLength(celdas.length);
  });
});
