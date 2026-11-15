import { describe, expect, it } from 'vitest';
import type { BloqueEscena } from './modelo';
import { AGUA_MAX_MM, colorAgua, colorCultivo, coloresBase, detalleVista, validarBloque, VISTAS_CLIMA, type ContextoVista } from './vistas';
import { colorLuz, colorNivelTemperatura } from './clima-vista';

function bloque(cambios: Partial<BloqueEscena> = {}, registro: Record<string, unknown> = {}): BloqueEscena {
  return {
    celdaId: 'c-0-0', i: 0, j: 0, x: 0, z: 0, forma: 'completa', relieve: { tipo: 'medido', alturaEscena: 0 } as BloqueEscena['relieve'], pendientePct: 1,
    fraccionDentro: 1, estadoVisual: 'normal' as BloqueEscena['estadoVisual'], estadoEvaluacion: 'EVALUABLE', motivo: null, cultivo: 'maiz',
    etapa: 'crecimiento', avanceEtapa: 0.5, noRecomendadoEnLugar: false, losa: null,
    registro: { celdaId: 'c-0-0', fecha: '2026-08-01', estado: 'EVALUABLE', ciclo: 1, cultivo: 'maiz', etapa: 'crecimiento', avanceEtapa: 0.5, estadoPlanta: 'normal', humedad: 0.8, deficitMm: 0, excesoMm: 10, etcMm: 4, estresCalor: null, ...registro } as BloqueEscena['registro'],
    ...cambios,
  };
}

describe('vistas de la base', () => {
  it('validacion parte del estado de la planta del motor y baja con cada senal en contra', () => {
    expect(validarBloque(bloque(), () => true).nivel).toBe(4);
    expect(validarBloque(bloque(), () => false).nivel).toBe(3);
    expect(validarBloque(bloque({}, { estadoPlanta: 'estresada' }), () => true).nivel).toBe(2);
    expect(validarBloque(bloque({}, { estadoPlanta: 'podrida' }), () => true).nivel).toBe(0);
    expect(validarBloque(bloque({}, { estresCalor: true }), () => false).nivel).toBe(2);
    expect(validarBloque(bloque({ noRecomendadoEnLugar: true }), () => true).nivel).toBe(1);
    // Sin ventana con fuente no castiga: lo dice.
    const sin = validarBloque(bloque(), () => null);
    expect(sin.nivel).toBe(4);
    expect(sin.motivos.join(' ')).toContain('Sin ventana local');
  });

  it('sin dato del motor no hay nivel ni color', () => {
    expect(validarBloque(bloque({}, { estado: 'NO_EVALUABLE', motivo: 'Falta Kc', estadoPlanta: null })).nivel).toBeNull();
    expect(validarBloque(bloque({ cultivo: null })).nivel).toBeNull();
    expect(colorAgua(null)).toBeNull();
    const sinEtc = bloque({}, { etcMm: null });
    expect(coloresBase([sinEtc], 'agua').size).toBe(0);
  });

  it('agua va de gris a azul marino y se satura en el maximo', () => {
    expect(colorAgua(0)).toBe('#c9cdd1');
    expect(colorAgua(AGUA_MAX_MM)).toBe('#0b2a5b');
    expect(colorAgua(AGUA_MAX_MM * 3)).toBe('#0b2a5b');
  });

  it('cada vista colorea y explica la celda', () => {
    expect(coloresBase([bloque()], 'cultivo').get('c-0-0')).toBe(colorCultivo('maiz'));
    expect(coloresBase([bloque()], 'validacion', () => true).get('c-0-0')).toBe('#2f8a4e');
    expect(detalleVista(bloque(), 'agua').titulo).toContain('4 mm/día');
    expect(detalleVista(bloque(), 'cultivo').titulo).toBe('Maíz');
  });
});

describe('color de cultivo', () => {
  it('los cultivos sin color a mano reciben uno estable y distinto', () => {
    expect(colorCultivo('maiz')).toBe('#d9a62e');
    expect(colorCultivo('tomate')).toBe(colorCultivo('tomate'));
    expect(colorCultivo('tomate')).not.toBe(colorCultivo('papa'));
    expect(colorCultivo('tomate')).toMatch(/^hsl\(/);
  });
});

describe('vistas de luz y temperatura (paso Escenarios)', () => {
  const ctx = (c: Partial<NonNullable<ContextoVista['clima']>> | null = {}): ContextoVista => ({
    clima: c === null ? null : { fechaClima: '2016-08-10', dias: 7, tMediaC: 27, tMaxC: 33, tMinC: 21, radiacionMjM2Dia: 20, ...c },
    rangos: { maiz: { tMinAbsC: 10, tOptMinC: 18, tOptMaxC: 33, tMaxAbsC: 47 }, frijol: { tMinAbsC: 8, tOptMinC: 16, tOptMaxC: 24, tMaxAbsC: 35 } },
  });
  const maiz = bloque({ celdaId: 'c-0-0', cultivo: 'maiz' });
  const frijol = bloque({ celdaId: 'c-0-1', cultivo: 'frijol' });

  it('las vistas de clima se ofrecen aparte de las demas', () => {
    expect(VISTAS_CLIMA).toEqual(['luz', 'temperatura']);
  });
  it('la luz pinta todas las celdas igual: la radiacion es la misma en toda la parcela', () => {
    const c = coloresBase([maiz, frijol], 'luz', undefined, ctx());
    expect(c.get('c-0-0')).toBe(colorLuz(20));
    expect(c.get('c-0-1')).toBe(colorLuz(20));
  });
  it('la temperatura distingue por cultivo con la misma semana: 27 C es ideal para el maiz y calida para el frijol', () => {
    const c = coloresBase([maiz, frijol], 'temperatura', undefined, ctx());
    expect(c.get('c-0-0')).toBe(colorNivelTemperatura('optima'));
    expect(c.get('c-0-1')).toBe(colorNivelTemperatura('calida'));
    expect(coloresBase([maiz, frijol], 'temperatura', undefined, ctx({ tMediaC: 36 })).get('c-0-1')).toBe(colorNivelTemperatura('excesiva'));
  });
  it('sin clima, sin rango o sin cultivo no hay color: nunca se inventa', () => {
    expect(coloresBase([maiz], 'luz', undefined, ctx(null)).size).toBe(0);
    expect(coloresBase([maiz], 'luz', undefined, ctx({ radiacionMjM2Dia: null })).size).toBe(0);
    expect(coloresBase([maiz], 'luz').size).toBe(0); // sin contexto
    expect(coloresBase([maiz], 'temperatura', undefined, ctx({ tMediaC: null })).size).toBe(0);
    expect(coloresBase([bloque({ cultivo: 'amaranto' })], 'temperatura', undefined, ctx()).size).toBe(0); // sin rango con fuente
    expect(coloresBase([bloque({ cultivo: null })], 'temperatura', undefined, ctx()).size).toBe(0);
  });
  it('el globo de la temperatura dice el rango del cultivo, la fuente y el calor del motor', () => {
    const d = detalleVista(bloque({}, { estresCalor: true }), 'temperatura', undefined, ctx());
    expect(d.titulo).toMatch(/ideal/i);
    expect(d.lineas.join(' ')).toContain('FAO EcoCrop');
    expect(d.lineas.join(' ')).toContain('18 °C a 33 °C');
    expect(d.lineas.join(' ')).toContain('calor sobre el umbral');
  });
  it('el globo de la luz dice que es igual para toda la parcela y de donde sale', () => {
    const d = detalleVista(maiz, 'luz', undefined, ctx());
    expect(d.titulo).toContain('20 MJ/m² al día');
    expect(d.lineas.join(' ')).toContain('NASA POWER');
    expect(d.lineas.join(' ')).toContain('misma en toda la parcela');
  });
  it('sin dato los globos lo dicen en vez de mostrar un valor', () => {
    expect(detalleVista(maiz, 'luz', undefined, ctx(null)).titulo).toContain('sin dato');
    expect(detalleVista(maiz, 'temperatura', undefined, ctx({ tMediaC: null })).titulo).toContain('sin dato');
    expect(detalleVista(bloque({ cultivo: 'amaranto' }), 'temperatura', undefined, ctx()).titulo).toContain('sin rango');
    expect(detalleVista(bloque({ cultivo: null }), 'temperatura', undefined, ctx()).titulo).toBe('Sin cultivo');
  });
});
