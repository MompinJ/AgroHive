import { describe, expect, it } from 'vitest';
import { DURACION_TRANSICION_MS, escalaInicial, interpolar, saleEncogiendo, suavizar } from '../animacion';

describe('animaciones de la escena (A5.1)', () => {
  it('la curva es suave, empieza en 0 y termina en 1 sin pasarse', () => {
    expect(suavizar(0)).toBe(0);
    expect(suavizar(1)).toBe(1);
    expect(suavizar(0.5)).toBeCloseTo(0.5);
    expect(suavizar(-1)).toBe(0);
    expect(suavizar(2)).toBe(1);
    for (let t = 0; t < 1; t += 0.05) expect(suavizar(t + 0.05)).toBeGreaterThanOrEqual(suavizar(t));
  });

  it('interpola entre dos escalas', () => {
    expect(interpolar(0.85, 1, 0)).toBe(0.85);
    expect(interpolar(0.85, 1, 1)).toBe(1);
  });

  it('misma planta: crece desde su escala anterior; otra etapa: nace desde cero', () => {
    expect(escalaInicial({ clave: 'maiz_brote', escala: 0.9 }, 'maiz_brote', 0.95, true)).toBe(0.9);
    expect(escalaInicial({ clave: 'maiz_brote', escala: 0.9 }, 'maiz_crecimiento', 0.86, true)).toBe(0);
    expect(escalaInicial(undefined, 'maiz_brote', 0.9, true)).toBe(0);
  });

  it('con reducir movimiento no hay animacion: todo aparece en su escala final y lo viejo se va sin encogerse', () => {
    expect(escalaInicial({ clave: 'maiz_brote', escala: 0.9 }, 'maiz_crecimiento', 0.86, false)).toBe(0.86);
    expect(escalaInicial(undefined, 'maiz_brote', 0.9, false)).toBe(0.9);
    expect(saleEncogiendo('maiz_brote', 'maiz_crecimiento', false)).toBe(false);
  });

  it('la planta vieja se encoge solo si su celda cambia de modelo o queda sin planta', () => {
    expect(saleEncogiendo('maiz_brote', 'maiz_crecimiento', true)).toBe(true);
    expect(saleEncogiendo('maiz_madurez', null, true)).toBe(true);
    expect(saleEncogiendo('maiz_brote', 'maiz_brote', true)).toBe(false);
  });

  it('las transiciones son cortas', () => {
    expect(DURACION_TRANSICION_MS).toBeLessThanOrEqual(600);
  });
});
