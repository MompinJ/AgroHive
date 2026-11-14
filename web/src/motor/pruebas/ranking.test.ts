// A4.2: ranking por robustez, criterio B (puntaje + arrepentimiento minimax, desempate por promedio) y respaldo A.
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { anioDe } from '../fechas';
import { simularRotacion, type EntradasMotor } from '../motor';
import { rankear, SIN_OPCION_ROBUSTA, type RotacionParaRanking } from '../ranking';
import type { CalendarioLocal, CatalogoCultivos, Escenario, Parcela, PlanSiembra, ResultadoRotacion, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import calendario from '../../../../contratos/ejemplos/calendario-local.ejemplo.json';
import { serieSintetica, validadorContrato } from './utiles';

const validar = validadorContrato('resultado-rotacion');
const ESC: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const suelo: Suelo = {
  meta: { versionContrato: '0.5.0', esEjemplo: false },
  id: 'manual-arena-franca',
  etiqueta: 'SUPUESTO',
  origen: 'selector_manual',
  aviso: 'Tipo de suelo elegido por el usuario.',
  textura: { estado: 'EVALUABLE', etiqueta: 'SUPUESTO', clase: 'arena_franca', grupo: 'arenoso' },
  ph: { estado: 'NO_EVALUABLE', motivo: 'Selector manual.' },
};
const base = seleccionarEscenarios({
  ...serieSintetica('2000-01-01', '2021-12-31', (f) => 0.3 + 0.4 * (anioDe(f) - 2000)),
  meta: { versionContrato: '0.5.0', esEjemplo: false },
});

function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][], conCalendario = false): PlanSiembra {
  return {
    meta: { versionContrato: '0.5.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: 'parcela-demo-isla',
    calendarioLocal: conCalendario ? { calendarioId: 'calendario-demo-isla' } : { sinCalendarioLocal: true, motivo: 'Pendiente A0.6.' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
function simular(p: PlanSiembra): RotacionParaRanking {
  const e: EntradasMotor = {
    plan: p,
    parcela: parcela as unknown as Parcela,
    suelo,
    tablaSuelos: tabla as unknown as TablaSuelos,
    catalogo: catalogo as unknown as CatalogoCultivos,
    calendario: calendario as unknown as CalendarioLocal,
    escenarios: base.escenarios,
  };
  return { rotacion: simularRotacion(e).rotacion, numeroSiembras: p.ciclos.length };
}

const R1 = simular(plan('R1', [['maiz', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]));
const R2 = simular(plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]));
const R3 = simular(plan('R3', [['frijol', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']]));
const R4 = simular(plan('R4', [['calabaza', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI']], true));
const R5 = simular(plan('R5', [['cultivo_sin_parametros', '2016-06-15', 'PV']]));

type ConExceso = { excesoHidrico?: { fraccionLluviaPercolada: number | null } };
const sinExceso = (x: RotacionParaRanking): RotacionParaRanking => {
  const r = structuredClone(x.rotacion);
  for (const e of ESC) delete (r.porEscenario[e].pilares as ConExceso).excesoHidrico;
  return { rotacion: r, numeroSiembras: x.numeroSiembras };
};
/** Solo el pilar de deficit con numero (para el respaldo A). */
const soloDeficit = (x: RotacionParaRanking): RotacionParaRanking => {
  const r = sinExceso(x).rotacion;
  for (const e of ESC) r.porEscenario[e].pilares.proteccionSuelo = { estado: 'NO_EVALUABLE', motivo: 'Prueba.', indiceErosionRelativo: null, diasSueloDesnudo: null };
  return { rotacion: r, numeroSiembras: x.numeroSiembras };
};
const diasAnio = (t: number) => (Date.UTC(t, 8, 30) - Date.UTC(t - 1, 9, 1)) / 86400000 + 1;

describe('A4.2 con los pilares de hoy: B con deficit, exceso y proteccion del suelo (A3.7)', () => {
  const res = rankear([R1, R2, R3, R4, R5]);
  it('entra al criterio B con pesos iguales SUPUESTO; sin calendario la compatibilidad queda fuera', () => {
    expect(res.criterio).toBe('B_minimax_arrepentimiento');
    expect(res.ponderacion).toMatchObject({ etiqueta: 'SUPUESTO', pesos: { deficitHidrico: 0.3333, excesoHidrico: 0.3333, proteccionSuelo: 0.3333 } });
    expect(res.ponderacion?.pilaresExcluidos).toEqual(['compatibilidadCiclo', 'riesgoCalor', 'aporteIndirecto']);
    expect(res.ponderacion?.nota).toMatch(/SUPUESTO/);
  });
  it('orden por minimax de arrepentimiento, calculado a mano desde los pilares', () => {
    const punt = (x: RotacionParaRanking, e: Escenario) => {
      const p = x.rotacion.porEscenario[e].pilares;
      const t = x.rotacion.porEscenario[e].anioReal!;
      return (
        (1 - p.deficitHidrico.proporcionDemandaNoCubierta!) +
        (1 - (p as ConExceso).excesoHidrico!.fraccionLluviaPercolada!) +
        (1 - p.proteccionSuelo!.diasSueloDesnudo! / diasAnio(t))
      ) / 3;
    };
    const ord = [R1, R2, R3];
    const mejor = Object.fromEntries(ESC.map((e) => [e, Math.max(...ord.map((x) => punt(x, e)))])) as Record<Escenario, number>;
    const arrep = (x: RotacionParaRanking) => Math.max(...ESC.map((e) => mejor[e] - punt(x, e)));
    const prom = (x: RotacionParaRanking) => ESC.reduce((s, e) => s + punt(x, e), 0) / 3;
    const esperado = [...ord].sort((a, b) => arrep(a) - arrep(b) || prom(b) - prom(a)).map((x) => x.rotacion.rotacionId);
    expect(res.orden.map((f) => f.rotacionId)).toEqual(esperado);
    for (const f of res.orden) expect(f.arrepentimiento).toBeCloseTo(arrep(ord.find((x) => x.rotacion.rotacionId === f.rotacionId)!), 4);
  });
  it('la exploratoria (calabaza no registrada) tiene puntaje y peor caso pero no posicion; la no evaluable queda fuera', () => {
    const r4 = res.rotaciones.find((r) => r.rotacionId === 'R4')!;
    expect(r4.estado).toBe('EXPLORATORIO');
    expect(r4.peorCaso?.criterio).toBe('B_minimax_arrepentimiento');
    expect(typeof r4.arrepentimiento).toBe('number');
    expect(r4.ranking).toBeNull();
    expect(res.rotaciones.find((r) => r.rotacionId === 'R5')!.peorCaso).toBeNull();
    expect(res.noOrdenadas.map((x) => x.rotacionId)).toEqual(['R4', 'R5']);
  });
  it('cada rotacion cumple el contrato y explica su posicion', () => {
    for (const r of res.rotaciones) expect(validar(r)).toEqual([]);
    const primera = res.rotaciones.find((r) => r.ranking?.posicion === 1)!;
    expect(primera.ranking).toMatchObject({ de: 3, criterio: 'B_minimax_arrepentimiento' });
    expect(primera.peorCaso?.metrica).toBe('puntaje');
    expect(primera.explicacion.porQue).toMatch(/^Posicion 1 de 3/);
  });
  it('no modifica la entrada y es determinista', () => {
    expect(R1.rotacion.ranking).toBeNull();
    expect(rankear([R3, R2, R1, R5, R4]).orden).toEqual(res.orden);
  });
  it('sin rotaciones evaluables: no hay opcion mas robusta', () => {
    const r = rankear([R4, R5]);
    expect(r.orden).toEqual([]);
    expect(r.mensaje).toBe(SIN_OPCION_ROBUSTA);
  });
});

describe('A4.2 respaldo A: solo el pilar de deficit tiene numero', () => {
  const res = rankear([R1, R2, R3].map(soloDeficit));
  it('ordena por menor demanda no cubierta en el peor escenario, sin puntaje ni pesos', () => {
    expect(res.criterio).toBe('A_exposicion_hidrica_peor_caso');
    expect(res.ponderacion).toBeNull();
    const peor = (r: RotacionParaRanking) => Math.max(...ESC.map((e) => r.rotacion.porEscenario[e].pilares.deficitHidrico.proporcionDemandaNoCubierta!));
    expect(res.orden.map((f) => f.rotacionId)).toEqual([R1, R2, R3].sort((a, b) => peor(a) - peor(b)).map((r) => r.rotacion.rotacionId));
    for (const r of res.rotaciones) {
      expect(r.porEscenario.seco.puntaje).toBeNull();
      expect(r.arrepentimiento).toBeNull();
      expect(r.advertencias.some((a) => a.codigo === 'RANKING_RESPALDO_A')).toBe(true);
    }
  });
});

// Rotaciones con los pilares 2 y 3 ya calculados (como los dara A3.7), con valores elegidos para revisar a mano.
function conPilares(id: string, prop: number[], fuera: number, erosion: number): RotacionParaRanking {
  const r: ResultadoRotacion = sinExceso(R1).rotacion;
  r.rotacionId = id;
  ESC.forEach((e, i) => {
    const p = r.porEscenario[e].pilares;
    p.deficitHidrico.proporcionDemandaNoCubierta = prop[i]!;
    p.compatibilidadCiclo = { estado: 'EVALUABLE', siembrasFueraDeVentana: fuera };
    p.proteccionSuelo = { estado: 'EVALUABLE', indiceErosionRelativo: erosion, diasSueloDesnudo: 30 };
  });
  return { rotacion: r, numeroSiembras: 2 };
}

describe('A4.2 criterio B con los pilares 2 y 3 (sin exceso, para revisar a mano)', () => {
  // Subpuntajes: hidrico = 1 - prop; compatibilidad = 1 - fuera/2; suelo = 1 - erosion; pesos iguales (1/3).
  const A = conPilares('R1', [0.2, 0.1, 0], 0, 0.3); // puntajes 0.8333, 0.8667, 0.9
  const B = conPilares('R2', [0.1, 0.1, 0.1], 1, 0.1); // 0.7667 en los tres
  const C = conPilares('R3', [0.3, 0, 0], 0, 0.2); // 0.8333, 0.9333, 0.9333
  const res = rankear([A, B, C]);
  it('pesos iguales SUPUESTO entre los tres pilares con numero; calor y aporte excluidos', () => {
    expect(res.criterio).toBe('B_minimax_arrepentimiento');
    expect(res.ponderacion).toMatchObject({
      etiqueta: 'SUPUESTO',
      pesos: { deficitHidrico: 0.3333, compatibilidadCiclo: 0.3333, proteccionSuelo: 0.3333 },
      pilaresExcluidos: ['excesoHidrico', 'riesgoCalor', 'aporteIndirecto'],
    });
  });
  it('puntajes, peor caso y arrepentimiento calculados a mano', () => {
    const r1 = res.rotaciones.find((r) => r.rotacionId === 'R1')!;
    expect([r1.porEscenario.seco.puntaje, r1.porEscenario.habitual.puntaje, r1.porEscenario.lluvioso.puntaje]).toEqual([0.8333, 0.8667, 0.9]);
    expect(r1.peorCaso).toEqual({ escenario: 'seco', criterio: 'B_minimax_arrepentimiento', metrica: 'puntaje', valor: 0.8333 });
    expect(r1.arrepentimiento).toBeCloseTo(0.0667, 4);
    expect(res.rotaciones.find((r) => r.rotacionId === 'R2')!.arrepentimiento).toBeCloseTo(0.1667, 4);
    expect(res.rotaciones.find((r) => r.rotacionId === 'R3')!.arrepentimiento).toBe(0);
  });
  it('orden por menor arrepentimiento maximo y salida conforme al contrato', () => {
    expect(res.orden.map((f) => f.rotacionId)).toEqual(['R3', 'R1', 'R2']);
    for (const r of res.rotaciones) {
      expect(validar(r)).toEqual([]);
      expect(r.ponderacion).not.toBeNull();
    }
  });
  it('empate de arrepentimiento maximo: gana el mayor promedio; pesos del usuario se renormalizan', () => {
    // Solo el pilar hidrico (pesos del usuario): puntaje = 1 - prop.
    const x = conPilares('R7', [0.2, 0.1, 0.1], 0, 0); // 0.80, 0.90, 0.90 -> arrep 0.05, promedio 0.8667
    const y = conPilares('R8', [0.15, 0.15, 0.05], 0, 0); // 0.85, 0.85, 0.95 -> arrep 0.05, promedio 0.8833
    const z = conPilares('R9', [0.15, 0.1, 0.05], 0, 0); // mejor en todo -> arrep 0
    const r = rankear([x, y, z], { pesos: { deficitHidrico: 2, compatibilidadCiclo: 0, proteccionSuelo: 0, riesgoCalor: 1 } });
    expect(r.ponderacion).toMatchObject({ etiqueta: 'USUARIO', pesos: { deficitHidrico: 1, compatibilidadCiclo: 0, proteccionSuelo: 0 } });
    expect(r.ponderacion?.nota).toContain('riesgoCalor');
    expect(r.orden.map((f) => [f.rotacionId, f.arrepentimiento])).toEqual([['R9', 0], ['R8', 0.05], ['R7', 0.05]]);
  });
});
