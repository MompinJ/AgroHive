import { describe, expect, it } from 'vitest';
import { lluviaPorAnioAgricola, percentilTipo7, seleccionarEscenarios } from '../escenarios';
import { anioDe } from '../fechas';
import { seriePowerIsla, serieSintetica, validadorContrato } from './utiles';

describe('percentilTipo7 (Hyndman y Fan, definicion 7)', () => {
  it('coincide con la interpolacion lineal de R/NumPy', () => {
    expect(percentilTipo7([1, 2, 3, 4], 50)).toBeCloseTo(2.5);
    expect(percentilTipo7([10, 20, 30, 40, 50], 10)).toBeCloseTo(14);
    expect(percentilTipo7([10, 20, 30, 40, 50], 90)).toBeCloseTo(46);
    expect(percentilTipo7([7], 90)).toBe(7);
  });
});

describe('lluvia por anio agricola SIAP', () => {
  it('suma OI (oct t-1 a mar t) y PV (abr a sep t) y excluye anios con dias faltantes', () => {
    const serie = serieSintetica('2010-01-01', '2012-12-31', (f) => (f === '2011-05-10' ? null : 1));
    const anios = lluviaPorAnioAgricola(serie.diario);
    const a2011 = anios.find((a) => a.anio === 2011);
    const a2012 = anios.find((a) => a.anio === 2012);
    expect(a2011?.temporadasMm).toBeNull();
    expect(a2011?.diasFaltantes).toBe(1);
    // OI 2012 = 1 oct 2011 a 31 mar 2012 (183 dias, 2012 bisiesto); PV 2012 = 183 dias.
    expect(a2012?.oiMm).toBe(183);
    expect(a2012?.pvMm).toBe(183);
    expect(a2012?.temporadasMm).toBe(366);
  });
});

describe('A2.5 con la serie real de NASA POWER de la celda demo (2006 a 2025)', () => {
  const sel = seleccionarEscenarios(seriePowerIsla());

  it('elige anios reales reproducibles: 2023 seco, 2016 habitual, 2024 lluvioso', () => {
    expect(sel.estado).toBe('EVALUABLE');
    expect(sel.escenarios.seco?.anioReal).toBe(2023);
    expect(sel.escenarios.habitual?.anioReal).toBe(2016);
    expect(sel.escenarios.lluvioso?.anioReal).toBe(2024);
    // 2006 no es candidato: su OI empieza en octubre de 2005, fuera de la serie.
    expect(sel.anios.find((a) => a.anio === 2006)?.temporadasMm).toBeNull();
    expect(sel.anios.filter((a) => a.temporadasMm !== null)).toHaveLength(19);
  });

  it('es determinista', () => {
    expect(seleccionarEscenarios(seriePowerIsla())).toEqual(sel);
  });

  it('declara el anio cercano (2025 esta a 2 mm de 2024 en el p90)', () => {
    const adv = sel.escenarios.lluvioso?.advertencias?.find((a) => a.codigo === 'ANIO_CERCANO');
    expect(adv?.mensaje).toContain('2025');
  });

  it('cada escenario cumple el contrato clima-escenario y cubre los 18 meses del anio agricola', () => {
    const validar = validadorContrato('clima-escenario');
    for (const esc of Object.values(sel.escenarios)) {
      expect(validar(esc)).toEqual([]);
      const t = esc.anioReal;
      expect(esc.diario[0]?.fecha).toBe(`${t - 1}-10-01`);
      expect(esc.diario[esc.diario.length - 1]?.fecha).toBe(`${t + 1}-03-31`);
      expect(esc.seleccion.criterio).toContain('PV + OI');
    }
  });
});

describe('estados de la seleccion', () => {
  it('menos de 10 anios completos => NO_EVALUABLE, sin anios inventados', () => {
    const sel = seleccionarEscenarios(serieSintetica('2015-01-01', '2020-12-31', () => 3));
    expect(sel.estado).toBe('NO_EVALUABLE');
    expect(sel.motivo).toMatch(/al menos 10/);
    expect(sel.escenarios).toEqual({});
  });

  it('serie ERROR_DATOS => ERROR_DATOS', () => {
    const serie = { ...serieSintetica('2000-01-01', '2020-12-31', () => 3), estado: 'ERROR_DATOS' as const };
    expect(seleccionarEscenarios(serie).estado).toBe('ERROR_DATOS');
  });

  it('respaldo de Open-Meteo => los escenarios quedan RESPALDO_HISTORICO', () => {
    const base = serieSintetica('2000-01-01', '2020-12-31', (f) => (anioDe(f) % 7) + 1);
    const sel = seleccionarEscenarios({ ...base, estado: 'RESPALDO_HISTORICO', respaldo: true });
    expect(sel.escenarios.seco?.estado).toBe('RESPALDO_HISTORICO');
    expect(sel.escenarios.seco?.respaldo).toBe(true);
  });

  it('empate exacto => gana el anio mas antiguo', () => {
    // Misma lluvia diaria todos los dias: los anios agricolas no bisiestos empatan; gana el mas antiguo.
    const serie = serieSintetica('2000-01-01', '2020-12-31', () => 2);
    const sel = seleccionarEscenarios(serie);
    expect(sel.escenarios.habitual?.anioReal).toBe(2001);
  });
});
