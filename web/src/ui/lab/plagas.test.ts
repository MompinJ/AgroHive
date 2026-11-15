import { describe, expect, it } from 'vitest';
import { pintarCeldas, planesIniciales } from '../planes';
import { parcelaConTerrenoDemo } from '../../escena/demo-motor';
import { celdasConPlaga, celdasEnRiesgo, cuantasConPlaga, focoDelGrupo, focosDelPlan, firmaMalla, mapaPlagas, plagaDeCultivo, plagasPresentes, proteger, protegidas, riesgosDelPlan, type PlagaZona } from './plagas';
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

  describe('la plaga en el 20 % de cada grupo de cultivo', () => {
    const malla = (n: number) => Array.from({ length: n * n }, (_, k) => ({ id: `c-${Math.floor(k / n)}-${k % n}`, i: Math.floor(k / n), j: k % n }));
    const planGrande = { rotacionId: 'R1', ciclos: [{ ciclo: 1, cultivo: 'maiz', siembra: '2026-06-15' }, { ciclo: 2, cultivo: 'tomate', siembra: '2026-11-01' }], porCelda: null } as unknown as Parameters<typeof celdasConPlaga>[0];

    it('cuenta el 20 % redondeado y al menos una celda si hay grupo', () => {
      expect([0, 1, 2, 4, 5, 10, 11, 25, 100].map((n) => cuantasConPlaga(n))).toEqual([0, 1, 1, 1, 1, 2, 2, 5, 20]);
      expect(cuantasConPlaga(3, 1)).toBe(3); // con 100 % son todas
      expect(cuantasConPlaga(3, 5)).toBe(3); // nunca mas que el grupo
    });
    it('el foco tiene exactamente ese numero de celdas, todas del grupo y sin repetir', () => {
      const grupo = malla(10);
      const f = focoDelGrupo(grupo, 'R1:1:maiz');
      expect(f).toHaveLength(20);
      expect(new Set(f).size).toBe(20);
      for (const id of f) expect(grupo.map((c) => c.id)).toContain(id);
      expect(focoDelGrupo([], 'x')).toEqual([]);
    });
    it('es un foco de celdas contiguas, no celdas sueltas por toda la parcela', () => {
      const grupo = malla(10);
      const f = focoDelGrupo(grupo, 'R1:1:maiz').map((id) => grupo.find((c) => c.id === id)!);
      const alto = Math.max(...f.map((c) => c.i)) - Math.min(...f.map((c) => c.i)) + 1;
      const ancho = Math.max(...f.map((c) => c.j)) - Math.min(...f.map((c) => c.j)) + 1;
      expect(alto).toBeLessThanOrEqual(5);
      expect(ancho).toBeLessThanOrEqual(5);
    });
    it('es estable: mismo grupo y semilla, mismo foco, sin importar el orden en que lleguen las celdas', () => {
      const grupo = malla(8);
      const a = focoDelGrupo(grupo, 'R1:1:maiz');
      expect(focoDelGrupo([...grupo].reverse(), 'R1:1:maiz')).toEqual(a);
      expect(focoDelGrupo(grupo, 'R1:1:maiz')).toEqual(a);
    });
    it('otra semilla puede dar otro foco (cada cultivo y ciclo tiene el suyo)', () => {
      const grupo = malla(10);
      const focos = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((s) => focoDelGrupo(grupo, s).join(',')));
      expect(focos.size).toBeGreaterThan(1);
    });
    it('con 4 celdas, como la demo, la plaga esta en una sola', () => {
      expect(focoDelGrupo(malla(2), 'R1:1:maiz')).toHaveLength(1);
    });
    it('solo hay plaga en los cultivos que una plaga presente ataca, y con todo de un cultivo es el 20 % de la parcela', () => {
      const celdas = malla(10);
      expect(celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 1).size).toBe(20); // maiz: lo ataca el cogollero
      expect(celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 2).size).toBe(0); // tomate: ninguna plaga presente lo ataca
      expect(celdasConPlaga(planGrande, celdas, [], 1).size).toBe(0);
    });
    it('plantar algo nuevo NO mueve la plaga: solo aparece o desaparece en las celdas afectadas', () => {
      const celdas = malla(10);
      const antes = celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 1);
      // Se pintan 30 celdas de tomate (que ninguna plaga ataca) y 10 de frijol (que ataca el chapulin).
      const tomates = celdas.filter((c) => c.i < 3).map((c) => c.id);
      const frijoles = celdas.filter((c) => c.i === 9).map((c) => c.id);
      const nuevo = { ...planGrande, porCelda: { ...Object.fromEntries(tomates.map((id) => [id, [{ ciclo: 1, cultivo: 'tomate' }]])), ...Object.fromEntries(frijoles.map((id) => [id, [{ ciclo: 1, cultivo: 'frijol' }]])) } } as unknown as typeof planGrande;
      const despues = celdasConPlaga(nuevo, celdas, plagasPresentes(zona), 1);
      const intactas = celdas.map((c) => c.id).filter((id) => !tomates.includes(id) && !frijoles.includes(id));
      for (const id of intactas) expect(despues.has(id), id).toBe(antes.has(id)); // las celdas que no se tocaron conservan su plaga
      for (const id of tomates) expect(despues.has(id)).toBe(false); // el tomate no es atacado: la plaga desaparece ahi
      for (const id of antes) if (!tomates.includes(id)) expect(despues.has(id)).toBe(true); // y no se pierde en otro lado
    });
    it('quitar lo pintado devuelve la plaga exactamente donde estaba', () => {
      const celdas = malla(10);
      const base = celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 1);
      const pintado = { ...planGrande, porCelda: { 'c-0-0': [{ ciclo: 1, cultivo: 'tomate' }] } } as unknown as typeof planGrande;
      celdasConPlaga(pintado, celdas, plagasPresentes(zona), 1);
      expect(celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 1)).toEqual(base);
    });
    it('el aviso de riesgos cuenta solo las celdas del foco, y proteger el foco lo deja en cero', () => {
      const celdas = malla(10);
      const focos = focosDelPlan(planGrande, celdas, plagasPresentes(zona));
      const ids = celdas.map((c) => c.id);
      const sin = riesgosDelPlan(planGrande, ids, plagasPresentes(zona), {}, focos).filter((r) => r.ciclo === 1);
      expect(sin).toHaveLength(1);
      expect(sin[0]!.sinProteger).toHaveLength(20);
      expect(new Set(sin[0]!.sinProteger)).toEqual(new Set(focos(1)));
      const protegido = proteger({}, 'R1', 1, [...focos(1)]);
      expect(riesgosDelPlan(planGrande, ids, plagasPresentes(zona), protegido, focos).filter((r) => r.ciclo === 1)).toEqual([]);
      // Sin focos (comportamiento anterior), la plaga cuenta todas las celdas.
      expect(riesgosDelPlan(planGrande, ids, plagasPresentes(zona), {}).find((r) => r.ciclo === 1)!.sinProteger).toHaveLength(100);
    });
    it('los insectos de la escena salen solo de las celdas con plaga', () => {
      const celdas = malla(10);
      const foco = celdasConPlaga(planGrande, celdas, plagasPresentes(zona), 1);
      const registros = celdas.map((c) => ({ celdaId: c.id, cultivo: 'maiz', ciclo: 1 }));
      const mapa = mapaPlagas(registros.filter((r) => foco.has(r.celdaId)), plagasPresentes(zona), {}, 'R1');
      expect(mapa.size).toBe(20);
    });
  });
});
