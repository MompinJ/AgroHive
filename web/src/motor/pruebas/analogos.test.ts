// A2.13: escenario "proxima temporada" con anios analogos reales ([DECIDIDO] 14/11). EXPLORATORIO, sin ranking.
import { describe, expect, it } from 'vitest';
import { AVISO_ANALOGOS, candidatosAnalogos, proximaTemporadaRotacion, simularRotacionCompleta } from '../analogos';
import { seleccionarEscenarios } from '../escenarios';
import type { EntradasMotor } from '../motor';
import { rankear } from '../ranking';
import type { CatalogoCultivos, Parcela, PlanSiembra, ProximaTemporadaAproximada, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import capaDemo from '../../../../datos/demo/respuestas/proxima-temporada.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const capa = capaDemo as unknown as ProximaTemporadaAproximada;
const serie = seriePowerIsla();
const sel = seleccionarEscenarios(serie);
const validar = validadorContrato('resultado-rotacion');

function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: '0.9.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: 'parcela-demo-isla',
    calendarioLocal: { sinCalendarioLocal: true, motivo: 'Prueba.' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const milpa = plan('R1', [['maiz', '2016-06-15', 'PV'], ['frijol', '2016-11-01', 'OI'], ['maiz', '2017-06-15', 'PV']]);
const entradas = (p: PlanSiembra, extra: Partial<EntradasMotor> = {}): EntradasMotor => ({
  plan: p,
  parcela: parcela as unknown as Parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  escenarios: sel.escenarios,
  ...extra,
});

describe('anios analogos con el paquete de demo (horizonte noviembre de 2026 a abril de 2027)', () => {
  const b = proximaTemporadaRotacion(entradas(milpa), capa, serie)!;
  it('elige los anios que caen dentro de la banda de lluvia en los 6 meses', () => {
    expect(b.estado).toBe('EXPLORATORIO');
    expect(b.esPrediccion).toBe(false);
    expect(b.aviso).toContain(AVISO_ANALOGOS);
    const todos = candidatosAnalogos(capa, serie.diario).filter((c) => c.mesesDentro === 6).map((c) => c.anio);
    expect(b.aniosAnalogos.map((a) => a.anioReal)).toEqual(todos);
    expect(todos).toEqual([2006, 2008, 2013, 2019, 2022, 2025]);
    expect(b.criterioAnalogos).toMatch(/en los 6 meses/);
    expect(b.horizonte).toEqual({ desde: '2026-11', hasta: '2027-04' });
  });
  it('solo simula los ciclos sembrados dentro del horizonte (el frijol OI) y declara los demas', () => {
    expect(b.ciclosEvaluados).toEqual([2]);
    expect(b.ciclosFuera?.map((c) => c.ciclo)).toEqual([1, 3]);
  });
  it('da un rango entre los anios analogos, nunca una cifra, y cada anio es EXPLORATORIO', () => {
    const props = b.aniosAnalogos.map((a) => a.deficitHidrico.proporcionDemandaNoCubierta as number);
    expect(b.rango.proporcionDemandaNoCubierta).toEqual({ inferior: Math.min(...props), superior: Math.max(...props) });
    expect(b.rango.fraccionLluviaPercolada.inferior!).toBeLessThanOrEqual(b.rango.fraccionLluviaPercolada.superior!);
    for (const a of b.aniosAnalogos) {
      expect(a.estado).toBe('EXPLORATORIO');
      expect(a.deficitHidrico.estado).toBe('EXPLORATORIO');
      expect(a.excesoHidrico.estado).toBe('EXPLORATORIO');
    }
  });
  it('va en resultado-rotacion (contratos 0.8.0), conforme al contrato, y no cambia estado ni ranking', () => {
    const conBloque = simularRotacionCompleta(entradas(milpa, { proximaTemporada: { capa, serie } })).rotacion;
    const sinBloque = simularRotacionCompleta(entradas(milpa)).rotacion;
    expect(conBloque.proximaTemporada?.estado).toBe('EXPLORATORIO');
    expect(sinBloque.proximaTemporada).toBeUndefined();
    expect(conBloque.estado).toBe(sinBloque.estado);
    expect(conBloque.porEscenario).toEqual(sinBloque.porEscenario);
    expect(validar(conBloque)).toEqual([]);
    const mono = simularRotacionCompleta(entradas(plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]), { proximaTemporada: { capa, serie } })).rotacion;
    const conR = rankear([{ rotacion: conBloque, numeroSiembras: 3 }, { rotacion: mono, numeroSiembras: 2 }]);
    const sinR = rankear([{ rotacion: sinBloque, numeroSiembras: 3 }, { rotacion: simularRotacionCompleta(entradas(plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]))).rotacion, numeroSiembras: 2 }]);
    expect(conR.orden).toEqual(sinR.orden);
    for (const r of conR.rotaciones) expect(validar(r)).toEqual([]);
  });
});

describe('casos sin resultado o con criterio de respaldo', () => {
  it('sin capa no se emite el bloque (no hay fecha ni horizonte que declarar): solo una advertencia', () => {
    const r = simularRotacionCompleta(entradas(milpa, { proximaTemporada: { capa: null, serie } })).rotacion;
    expect(r.proximaTemporada).toBeUndefined();
    expect(r.advertencias.some((a) => a.codigo === 'PROXIMA_TEMPORADA_NO_DISPONIBLE')).toBe(true);
    expect(validar(r)).toEqual([]);
  });
  it('capa invalida (banda invertida) => NO_EVALUABLE con motivo, conforme al contrato', () => {
    const mala = structuredClone(capa);
    mala.meses[0]!.lluviaMm = { inferior: 300, superior: 10 };
    const r = simularRotacionCompleta(entradas(milpa, { proximaTemporada: { capa: mala, serie } })).rotacion;
    expect(r.proximaTemporada).toMatchObject({ estado: 'NO_EVALUABLE', aniosAnalogos: [] });
    expect(r.proximaTemporada?.motivo).toMatch(/invertida/);
    expect(validar(r)).toEqual([]);
  });
  it('ningun ciclo en el horizonte => NO_EVALUABLE', () => {
    const mono = plan('R2', [['maiz', '2016-06-15', 'PV'], ['maiz', '2017-06-15', 'PV']]);
    const b = proximaTemporadaRotacion(entradas(mono), capa, serie)!;
    expect(b.estado).toBe('NO_EVALUABLE');
    expect(b.motivo).toMatch(/horizonte/);
    expect(b.rango.proporcionDemandaNoCubierta).toEqual({ inferior: null, superior: null });
  });
  it('si ningun anio cae en todos los meses, usa los que caen en mas meses y lo declara', () => {
    const angosta = structuredClone(capa);
    // Banda de un solo punto en enero: casi ningun anio cae ahi, asi que nadie cumple los 6 meses.
    angosta.meses[2]!.lluviaMm = { inferior: 1000, superior: 1001 };
    const b = proximaTemporadaRotacion(entradas(milpa), angosta, serie)!;
    expect(b.estado).toBe('EXPLORATORIO');
    expect(b.criterioAnalogos).toMatch(/Ningun anio cae dentro de la banda en los 6 meses/);
    expect(b.aniosAnalogos.every((a) => a.mesesDentro === 5)).toBe(true);
  });
});
