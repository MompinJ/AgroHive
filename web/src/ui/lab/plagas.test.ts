import { describe, expect, it } from 'vitest';
import { pintarCeldas, planesIniciales } from '../planes';
import { parcelaConTerrenoDemo } from '../../escena/demo-motor';
import { celdaCentral, celdasEnRadio, celdasEnRiesgo, firmaMalla, mapaPlagas, plagaDeCultivo, plagasPresentes, proteger, protegidas, riesgosDelPlan, type PlagaZona } from './plagas';
import calendarioJson from '../../../../datos/catalogos/calendario-isla.json';
import type { CalendarioLocal as CalendarioPrueba } from '../../../../contratos/tipos/contratos';
/** Calendario SIAP/INIFAP de Isla: fixture de prueba (la app ya no lo usa como demo). */
const calendarioIsla = calendarioJson as unknown as CalendarioPrueba;

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

  it('la firma de la malla cambia con el tamano de celda o con los ids, y no con el orden de llamada', () => {
    const a = firmaMalla(['c-0-0', 'c-0-1'], 70.71);
    expect(firmaMalla(['c-0-0', 'c-0-1'], 70.71)).toBe(a);
    expect(firmaMalla(['c-0-0', 'c-0-1'], 35)).not.toBe(a);
    expect(firmaMalla(['c-0-0', 'c-0-2'], 70.71)).not.toBe(a);
  });

  it('proteger el riesgo cubre solo los bloques atacados, sin repetir ni tocar el resto', () => {
    const pintado = pintarCeldas(plan, parcela, 1, [celdas[0]!], 'frijol', calendarioIsla);
    const r = riesgosDelPlan(pintado, celdas, plagasPresentes(zona), {}).filter((x) => x.ciclo === 1);
    const enRiesgo = celdasEnRiesgo(r);
    expect(enRiesgo).toHaveLength(celdas.length); // maiz y frijol: el chapulin ataca ambos
    expect(celdasEnRiesgo([{ sinProteger: [celdas[1]!, celdas[1]!] }])).toEqual([celdas[1]]);
    expect(celdasEnRiesgo([])).toEqual([]);
  });

  describe('zona de plagas por radio', () => {
    const malla = Array.from({ length: 9 * 9 }, (_, n) => ({ id: `c-${Math.floor(n / 9)}-${n % 9}`, i: Math.floor(n / 9), j: n % 9 }));
    it('la celda central de una malla de 9 x 9 es la del medio', () => {
      expect(celdaCentral(malla)).toBe('c-4-4');
      expect(celdaCentral([])).toBeNull();
    });
    it('el radio cubre un circulo de celdas alrededor de la elegida', () => {
      expect([...celdasEnRadio(malla, 'c-4-4', 1)].sort()).toHaveLength(9); // 3 x 3
      const r2 = celdasEnRadio(malla, 'c-4-4', 2);
      expect(r2.size).toBe(21); // circulo, no cuadrado de 25
      expect(r2.has('c-2-3')).toBe(true);
      expect(r2.has('c-2-2')).toBe(false); // la esquina queda fuera
      expect(celdasEnRadio(malla, 'c-4-4', 3).size).toBeGreaterThan(r2.size);
    });
    it('sin celda elegida usa la central, y una elegida que ya no existe tambien', () => {
      expect(celdasEnRadio(malla, null, 1).has('c-4-4')).toBe(true);
      expect(celdasEnRadio(malla, 'c-99-99', 1).has('c-4-4')).toBe(true);
    });
    it('en una esquina la zona se recorta a la parcela y toda la parcela es radio null', () => {
      expect(celdasEnRadio(malla, 'c-0-0', 1).size).toBe(4);
      expect(celdasEnRadio(malla, 'c-0-0', null).size).toBe(81);
      expect(celdasEnRadio([], null, 2).size).toBe(0);
    });
    it('la zona reduce los bloques con plaga dibujados', () => {
      const todas = celdas.map((id) => ({ celdaId: id, cultivo: 'maiz', ciclo: 1 }));
      const dentro = new Set([celdas[0]!]);
      const mapa = mapaPlagas(todas.filter((r) => dentro.has(r.celdaId)), plagasPresentes(zona), {}, 'R1');
      expect(mapa.size).toBe(1);
    });
  });
});
