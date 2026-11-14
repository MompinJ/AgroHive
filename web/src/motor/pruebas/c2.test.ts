// Evidencia de la compuerta C2: el motor devuelve resultados por celda con datos reales (paquete de demo A2.4).
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { sumarDias } from '../fechas';
import { resultadoCeldas, simularRotacion, type EntradasMotor } from '../motor';
import { rankear } from '../ranking';
import type { CalendarioLocal, CatalogoCultivos, Parcela, PlanSiembra, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import terrenoDemo from '../../../../datos/demo/respuestas/terreno.json';
import calendarioIsla from '../../../../datos/catalogos/calendario-isla.json';
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
    calendarioLocal: { calendarioId: 'calendario-isla' },
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
  calendario: calendarioIsla as unknown as CalendarioLocal,
  escenarios: sel.escenarios,
});

describe('C2 con el paquete de demo (POWER, SoilGrids con Saxton y Rawls y Terrarium reales de Isla)', () => {
  it('con el suelo real de Isla (Saxton y Rawls, A2.16): EVALUABLE y arranque con la humedad de POWER', () => {
    const r = simularRotacion(entradas(milpa, sueloIsla));
    expect(r.rotacion.estado).toBe('EVALUABLE');
    expect(r.rotacion.advertencias.some((a) => a.codigo === 'CONDICION_INICIAL_GWETROOT')).toBe(true);
    for (const c of r.simulaciones.seco.ciclos.values()) expect(c.condicionInicial).toBe('gwetroot');
    const seco = r.rotacion.porEscenario.seco.pilares;
    expect(seco.deficitHidrico).toMatchObject({ estado: 'EVALUABLE', diasDeficit: 46, deficitTotalMm: 25.3, excesoTotalMm: 1052.8 });
    expect(seco.deficitHidrico.proporcionDemandaNoCubierta).toBeCloseTo(0.0238, 4);
    expect(validadorContrato('resultado-rotacion')(r.rotacion)).toEqual([]);
    const validarCeldas = validadorContrato('resultado-celda');
    for (const esc of ['seco', 'habitual', 'lluvioso'] as const) {
      for (let d = 0; d < 400; d += 30) expect(validarCeldas(resultadoCeldas(r, esc, sumarDias('2016-06-15', d)))).toEqual([]);
    }
  });

  it('un suelo sin TAW sigue siendo NO_EVALUABLE: nada se inventa', () => {
    const sinTaw: Suelo = { ...sueloIsla, agua: { tawMmPorM: { estado: 'NO_EVALUABLE', motivo: 'Sin TAW (prueba).' } } };
    const r = simularRotacion(entradas(milpa, sinTaw));
    expect(r.rotacion.estado).toBe('NO_EVALUABLE');
    expect(r.rotacion.porEscenario.seco.pilares.deficitHidrico.motivo).toMatch(/franco_arcillo_arenoso/);
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

  const R2 = plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]);
  const R3 = plan('R3', [['frijol', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]);
  // Milpa con todas las siembras dentro de las ventanas de INIFAP (maiz PV 1 jun a 15 jul; frijol OI 20 sep a 20 oct).
  const R4 = plan('R4', [['maiz', '2016-06-01', 'PV'], ['frijol', '2016-10-10', 'OI'], ['maiz', '2017-06-01', 'PV']]);
  const rk = (planes: PlanSiembra[]) =>
    rankear(planes.map((p) => ({ rotacion: simularRotacion(entradas(p, sueloIsla)).rotacion, numeroSiembras: p.ciclos.length })));

  it('A3.7 con el calendario de Isla: compatibilidad de ciclo y dias de suelo desnudo del anio agricola', () => {
    const p1 = simularRotacion(entradas(milpa, sueloIsla)).rotacion;
    expect(p1.porEscenario.seco.pilares.compatibilidadCiclo).toEqual({ estado: 'EVALUABLE', siembrasFueraDeVentana: 1 }); // frijol el 1 de nov
    expect(p1.filtroClima).toBe(true);
    expect(p1.porEscenario.seco.pilares.proteccionSuelo).toMatchObject({ estado: 'EVALUABLE', indiceErosionRelativo: null, diasSueloDesnudo: 162 });
    const p3 = simularRotacion(entradas(R3, sueloIsla)).rotacion;
    expect(p3.porEscenario.seco.pilares.compatibilidadCiclo?.estado).toBe('NO_EVALUABLE'); // frijol PV sin ventana con fuente
    expect(p3.filtroClima).toBeNull();
    expect(simularRotacion(entradas(R2, sueloIsla)).rotacion.porEscenario.seco.pilares.proteccionSuelo?.diasSueloDesnudo).toBe(257);
  });

  it('ranking de tres rotaciones con el suelo real: la compatibilidad queda fuera porque el frijol PV no tiene ventana', () => {
    const res = rk([milpa, R2, R3]);
    expect(res.criterio).toBe('B_minimax_arrepentimiento');
    expect(res.ponderacion?.pesos).toEqual({ deficitHidrico: 0.3333, excesoHidrico: 0.3333, proteccionSuelo: 0.3333 });
    expect(res.ponderacion?.pilaresExcluidos).toContain('compatibilidadCiclo');
    expect(res.orden.map((f) => [f.rotacionId, f.arrepentimiento])).toEqual([['R1', 0], ['R3', 0.0467], ['R2', 0.0909]]);
    for (const r of res.rotaciones) expect(validadorContrato('resultado-rotacion')(r)).toEqual([]);
  });

  it('con los cuatro pilares (todas las siembras con ventana): gana la milpa sembrada dentro de ventana', () => {
    const res = rk([milpa, R2, R4]);
    expect(res.ponderacion?.pesos).toEqual({ deficitHidrico: 0.25, excesoHidrico: 0.25, compatibilidadCiclo: 0.25, proteccionSuelo: 0.25 });
    expect(res.orden.map((f) => [f.rotacionId, f.arrepentimiento])).toEqual([['R4', 0], ['R2', 0.0766], ['R1', 0.0993]]);
    for (const r of res.rotaciones) expect(validadorContrato('resultado-rotacion')(r)).toEqual([]);
  });

  it('robustez: el orden no cambia con el TAW de la sensibilidad del factor de materia organica (1.724 / 2.0 / 2.5)', () => {
    for (const taw of [122.3, 124.1, 127.4]) {
      const suelo = structuredClone(sueloIsla);
      (suelo.agua!.tawMmPorM as { valor: number }).valor = taw;
      const res = rankear([milpa, R2, R4].map((p) => ({ rotacion: simularRotacion(entradas(p, suelo)).rotacion, numeroSiembras: p.ciclos.length })));
      expect(res.orden.map((f) => f.rotacionId)).toEqual(['R4', 'R2', 'R1']);
    }
  });

  it('con el calendario real de Isla (A0.6): la calabaza, que SIAP no registra, se muestra pero no se ordena', () => {
    const conCalabaza = plan('R4', [['calabaza', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]);
    const r = simularRotacion(entradas(conCalabaza, sueloManual)).rotacion;
    expect(r.estado).toBe('EXPLORATORIO');
    expect(r.cultivosNoRecomendados?.[0]).toMatchObject({ cultivo: 'calabaza', calendarioId: 'calendario-isla' });
    const res = rankear([{ rotacion: simularRotacion(entradas(milpa, sueloManual)).rotacion, numeroSiembras: 3 }, { rotacion: r, numeroSiembras: 2 }]);
    expect(res.orden.map((f) => f.rotacionId)).toEqual(['R1']);
    expect(validadorContrato('resultado-rotacion')(res.rotaciones[1])).toEqual([]);
  });
});
