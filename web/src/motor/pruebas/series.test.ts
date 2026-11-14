// A4.1 (parte del motor): series del balance de agua para el dashboard. Cuadran con los pilares y entre si.
import { describe, expect, it } from 'vitest';
import { seleccionarEscenarios } from '../escenarios';
import { simularRotacion, type EntradasMotor } from '../motor';
import { EstadoMotor } from '../protocolo';
import { serieBalance } from '../series';
import { siembraEnEscenario } from '../temporadas';
import type { CalendarioLocal, CatalogoCultivos, Parcela, PlanSiembra, SerieBalance, Suelo, TablaSuelos } from '../tipos';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import tabla from '../../../../datos/catalogos/suelos.json';
import calendarioIsla from '../../../../datos/catalogos/calendario-isla.json';
import parcela from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import sueloDemo from '../../../../datos/demo/respuestas/suelo.json';
import { seriePowerIsla, validadorContrato } from './utiles';

const sel = seleccionarEscenarios(seriePowerIsla());
function plan(id: string, ciclos: [string, string, 'PV' | 'OI'][]): PlanSiembra {
  return {
    meta: { versionContrato: '0.10.0', esEjemplo: false },
    rotacionId: id,
    parcelaId: 'parcela-demo-isla',
    calendarioLocal: { calendarioId: 'calendario-isla' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Prueba.' })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}
const R4 = plan('R4', [['maiz', '2026-06-01', 'PV'], ['frijol', '2026-10-10', 'OI'], ['maiz', '2027-06-01', 'PV']]);
const entradas = (p: PlanSiembra, extra: Partial<EntradasMotor> = {}): EntradasMotor => ({
  plan: p,
  parcela: parcela as unknown as Parcela,
  suelo: sueloDemo as unknown as Suelo,
  tablaSuelos: tabla as unknown as TablaSuelos,
  catalogo: catalogo as unknown as CatalogoCultivos,
  calendario: calendarioIsla as unknown as CalendarioLocal,
  escenarios: sel.escenarios,
  ...extra,
});
const suma = (xs: (number | null)[]) => xs.reduce((a: number, b) => a + (b ?? 0), 0);
const validarSchema = validadorContrato('serie-balance');
/** Lo mismo que CHEQUEOS_EXTRA de contratos/validar.mjs: columnas del mismo largo y suma de mensual[].dias igual al largo. */
function validar(doc: SerieBalance): string[] {
  const errores = validarSchema(doc);
  doc.ciclos.forEach((c, i) => {
    const largos = Object.values(c.dias).map((v) => v.length);
    if (new Set(largos).size > 1) errores.push(`/ciclos/${i}/dias columnas de largo distinto`);
    const meses = c.mensual.reduce((a, m) => a + m.dias, 0);
    if (c.mensual.length && meses !== (largos[0] ?? 0)) errores.push(`/ciclos/${i}/mensual suma de dias distinta del largo`);
  });
  return errores;
}

describe('serie-balance de R4 en los tres escenarios (paquete de demo, suelo real)', () => {
  const res = simularRotacion(entradas(R4));
  for (const esc of ['seco', 'habitual', 'lluvioso'] as const) {
    const s = serieBalance(res, esc) as SerieBalance;
    it(`${esc}: cumple serie-balance (schema y chequeo de largos de contratos/)`, () => {
      expect(validar(s)).toEqual([]);
    });
    it(`${esc}: columnas del largo del ciclo, humedad 0 a 1 y fechas del clima segun la temporada`, () => {
      expect(s.anioReal).toBe(res.rotacion.porEscenario[esc].anioReal);
      expect(s.ciclos.map((c) => [c.ciclo, c.cultivo])).toEqual([[1, 'maiz'], [2, 'frijol'], [3, 'maiz']]);
      for (const c of s.ciclos) {
        const largo = c.cultivo === 'maiz' ? 125 : 95;
        for (const col of Object.values(c.dias)) expect(col).toHaveLength(largo);
        expect(c.dias.humedad.every((h) => h !== null && h >= 0 && h <= 1)).toBe(true);
        const p = R4.ciclos.find((x) => x.ciclo === c.ciclo)!;
        expect(c.fechaClima).toBe(siembraEnEscenario(p.siembra, p.temporada, s.anioReal).fecha);
        expect(c.celdas).toHaveLength(4);
      }
    });
    it(`${esc}: las sumas mensuales cuadran con las diarias y con los pilares de la rotacion`, () => {
      let def = 0;
      let dp = 0;
      for (const c of s.ciclos) {
        expect(suma(c.mensual.map((m) => m.dias))).toBe(c.dias.lluviaMm.length);
        expect(suma(c.mensual.map((m) => m.lluviaMm))).toBeCloseTo(suma(c.dias.lluviaMm), 0);
        expect(suma(c.mensual.map((m) => m.deficitMm))).toBeCloseTo(suma(c.dias.deficitMm), 0);
        def += suma(c.dias.deficitMm);
        dp += suma(c.dias.percolacionMm);
      }
      const h = res.rotacion.porEscenario[esc].pilares.deficitHidrico;
      expect(def).toBeCloseTo(h.deficitTotalMm!, 0);
      expect(dp).toBeCloseTo(h.excesoTotalMm!, 0);
    });
  }
});

describe('estados y Worker', () => {
  it('un ciclo sin parametros va sin series y con motivo; sin anio real no hay documento', () => {
    const r = simularRotacion(entradas(plan('R6', [['sorgo', '2026-06-15', 'PV']])));
    const s = serieBalance(r, 'seco')!;
    expect(s.ciclos[0]).toMatchObject({ estado: 'NO_EVALUABLE', tawMm: null, fechaClima: null, mensual: [] });
    expect(s.ciclos[0]!.dias.deficitMm).toEqual([]);
    expect(s.ciclos[0]!.motivo).toMatch(/sorgo/);
    expect(s.motivo).toBeTruthy();
    expect(validar(s)).toEqual([]);
    const sinClima = simularRotacion(entradas(R4, { escenarios: { seco: sel.escenarios.seco! } }));
    expect(serieBalance(sinClima, 'lluvioso')).toBeNull();
  });
  it('el Worker la entrega bajo demanda y avisa si la rotacion no esta calculada', () => {
    const m = new EstadoMotor();
    expect(m.atender({ id: 1, tipo: 'serieBalance', rotacionId: 'R4', escenario: 'seco' }).ok).toBe(false);
    m.atender({ id: 2, tipo: 'simular', entradas: entradas(R4) });
    const r = m.atender({ id: 3, tipo: 'serieBalance', rotacionId: 'R4', escenario: 'seco' });
    expect(r.ok).toBe(true);
    const s = (r as { resultado: SerieBalance }).resultado;
    expect(s.unidades.humedad).toBe('fraccion de TAW (0 a 1)');
    expect(validar(s)).toEqual([]);
    expect(JSON.stringify(s).length).toBeLessThan(40_000);
  });
});
