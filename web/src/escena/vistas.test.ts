import { describe, expect, it } from 'vitest';
import type { BloqueEscena } from './modelo';
import { AGUA_MAX_MM, colorAgua, colorCultivo, coloresBase, detalleVista, validarBloque } from './vistas';

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
