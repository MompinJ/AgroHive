import { describe, expect, it } from 'vitest';
import type { Ndvi, Smap } from '../../../../contratos/tipos/contratos';
import { calendarioIsla, planesIniciales } from '../planes';
import { parcelaConTerrenoDemo } from '../../escena/demo-motor';
import ndviDemo from '../../../../datos/demo/respuestas/ndvi.json';
import { consejos, ndviDelAnio, nivelNdvi, nivelSmap, ultimaHumedad, ultimoNdvi } from './consejos';

const plan = planesIniciales(parcelaConTerrenoDemo(), calendarioIsla)[0]!;
const base = { plan, ciclo: 1, calendario: calendarioIsla, escenario: 'seco' as const, resultado: null, ordenadas: [], nombreRotacion: (id: string) => `Rotación ${id.slice(1)}`, leguminosas: new Set(['frijol']), ndvi: null, smap: null };

describe('consejos de la mascota', () => {
  it('pone palabras a NDVI y SMAP sin inventar valores', () => {
    expect(nivelNdvi(0.1)).toBe('casi sin vegetación');
    expect(nivelNdvi(0.7)).toBe('vegetación densa');
    expect(nivelSmap(0.1)).toBe('seco');
    expect(nivelSmap(0.35)).toBe('húmedo');
    const n = ndviDemo as unknown as Ndvi;
    expect(ultimoNdvi(n)?.valor).toBeGreaterThan(0);
    expect(ndviDelAnio(n, 2016)).not.toBeNull();
    expect(ndviDelAnio(n, 1990)).toBeNull();
    const smap = { dias: [{ fecha: '2026-11-01', estado: 'EVALUABLE', humedadM3M3: 0.21 }, { fecha: '2026-11-02', estado: 'NO_EVALUABLE', humedadM3M3: null }] } as unknown as Smap;
    expect(ultimaHumedad(smap)).toEqual({ fecha: '2026-11-01', valor: 0.21 });
  });

  it('en cultivos da la mejor epoca del calendario y omite lo que no tiene dato', () => {
    const lista = consejos({ ...base, paso: 'cultivos' });
    expect(lista.some((c) => c.id === 'ventana' && c.texto.includes('1 jun'))).toBe(true);
    expect(lista.some((c) => c.id === 'smap' || c.id === 'ndvi')).toBe(false);
    expect(lista.some((c) => c.id === 'leguminosa')).toBe(false);
    const conDatos = consejos({ ...base, paso: 'cultivos', ndvi: ndviDemo as unknown as Ndvi });
    expect(conDatos.some((c) => c.id === 'ndvi')).toBe(true);
  });

  it('sin leguminosa en la rotacion sugiere comparar con una', () => {
    const soloMaiz = { ...plan, ciclos: plan.ciclos.map((c) => ({ ...c, cultivo: 'maiz' })) } as typeof plan;
    expect(consejos({ ...base, paso: 'cultivos', plan: soloMaiz }).some((c) => c.id === 'leguminosa')).toBe(true);
  });
});
