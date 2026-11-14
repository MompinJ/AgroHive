// Evidencia de la compuerta C2: el motor devuelve resultados por celda con datos reales (paquete de demo A2.4).
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { sumarDias } from '../fechas';
import { resultadoCeldas, simularRotacion, type EntradasMotor } from '../motor';
import { rankear } from '../ranking';
import type { CatalogoCultivos, Parcela, PlanSiembra, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import terrenoDemo from '../../../../datos/demo/respuestas/terreno.json';
import { seriePowerIsla, validadorContrato } from './utiles';

// Parcela de ejemplo (2 ha, 4 celdas) con la elevacion y la pendiente reales del paquete (Terrarium).
const parcela = structuredClone(parcelaEjemplo) as unknown as Parcela;
const terreno = terrenoDemo as unknown as { celdas: { id: string; elevacionM: number | null; pendientePct: number | null }[] };
for (const c of parcela.celdas) {
  const t = terreno.celdas.find((x) => x.id === c.id);
  if (t) {
    c.elevacionM = t.elevacionM;
    c.pendientePct = t.pendientePct;
  }
}
const sueloIsla = sueloDemo as unknown as Suelo;
// Selector manual de respaldo (doc 04), declarado: el usuario elige "franco" mientras el TAW de Isla es NO_EVALUABLE.
const sueloManual: Suelo = {
  meta: { versionContrato: '0.6.0', esEjemplo: false },
  id: 'manual-franco',
  etiqueta: 'SUPUESTO',
  origen: 'selector_manual',
  aviso: 'Tipo de suelo elegido en el selector manual (franco); no es una medicion de la parcela.',
  textura: { estado: 'EVALUABLE', etiqueta: 'SUPUESTO', clase: null, grupo: 'franco' },
  ph: { estado: 'NO_EVALUABLE', motivo: 'Selector manual: sin pH.' },
};

function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: '0.6.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: parcela.id,
    calendarioLocal: { sinCalendarioLocal: true, motivo: 'Calendario de Isla pendiente (A0.6).' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Fecha de prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const milpa = plan('R1', [['maiz', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI'], ['maiz', '2017-06-15', 'PV']]);
const sel = seleccionarEscenarios(seriePowerIsla());
const entradas = (p: PlanSiembra, suelo: Suelo): EntradasMotor => ({
  plan: p,
  parcela,
  suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  escenarios: sel.escenarios,
});

describe('C2 con el paquete de demo (POWER, SoilGrids y Terrarium reales de Isla)', () => {
  it('con el suelo del mapa (franco arcillo arenoso) el TAW es NO_EVALUABLE hasta A2.16: nada se inventa', () => {
    const r = simularRotacion(entradas(milpa, sueloIsla));
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    expect(r.rotacion.porEscenario.seco.pilares.deficitHidrico.motivo).toMatch(/franco_arcillo_arenoso.*A2.16/);
    const celdas = resultadoCeldas(r, 'seco', '2016-08-01')!;
    expect(celdas.registros.every((x) => x.estado === 'NO_EVALUABLE' && x.humedad === null)).toBe(true);
    expect(validadorContrato('resultado-celda')(celdas)).toEqual([]);
  });

  it('con el selector manual declarado: resultados por celda y por rotacion conformes al contrato', () => {
    const r = simularRotacion(entradas(milpa, sueloManual));
    expect(r.rotacion.estado).toBe('EVALUABLE');
    expect(r.rotacion.advertencias.find((a) => a.codigo === 'SUELO_SUPUESTO')?.mensaje).toContain('franco');
    expect(validadorContrato('resultado-rotacion')(r.rotacion)).toEqual([]);
    const validarCeldas = validadorContrato('resultado-celda');
    for (const esc of ['seco', 'habitual', 'lluvioso'] as const) {
      for (let d = 0; d < 400; d += 30) {
        const c = resultadoCeldas(r, esc, sumarDias('2016-06-15', d))!;
        expect(validarCeldas(c)).toEqual([]);
        expect(c.registros).toHaveLength(4);
      }
    }
    expect(r.simulaciones.seco.metodoEt0.penman_monteith_fao56).toBeGreaterThan(0);
    expect(r.exceso.lluvioso!.mm).toBeGreaterThan(r.exceso.seco!.mm);
  });

  it('ranking de tres rotaciones con los mismos anios (criterio A de respaldo mientras no llegue A3.7)', () => {
    const planes = [
      milpa,
      plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]),
      plan('R3', [['frijol', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]),
    ];
    const res = rankear(planes.map((p) => ({ rotacion: simularRotacion(entradas(p, sueloManual)).rotacion, numeroSiembras: p.ciclos.length })));
    expect(res.criterio).toBe('A_exposicion_hidrica_peor_caso');
    expect(res.orden).toHaveLength(3);
    for (const r of res.rotaciones) expect(validadorContrato('resultado-rotacion')(r)).toEqual([]);
  });
});
