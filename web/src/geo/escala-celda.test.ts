import { describe, expect, it } from 'vitest';
import { celdasPorHectarea, describirCelda } from './escala-celda';

describe('leyenda de escala de la celda', () => {
  it('describe la celda de la demo de Isla: 70.71 m, unas 0.50 ha', () => {
    const d = describirCelda(70.71)!;
    expect(d.lado).toBe('70.7 m');
    expect(d.superficie).toBe('0.50 ha');
    expect(d.texto).toBe('1 celda = 70.7 m × 70.7 m (≈ 0.50 ha)');
  });
  it('usa metros cuadrados cuando la celda es menor a un cuarto de hectarea', () => {
    expect(describirCelda(10)!.texto).toBe('1 celda = 10.0 m × 10.0 m (≈ 100 m²)');
    expect(describirCelda(30)!.superficie).toBe('900 m²');
    expect(describirCelda(50)!.superficie).toBe('0.25 ha');
    expect(describirCelda(100)!.texto).toBe('1 celda = 100 m × 100 m (≈ 1.00 ha)');
  });
  it('no inventa una leyenda con un lado invalido', () => {
    for (const malo of [0, -5, NaN, Infinity]) expect(describirCelda(malo)).toBeNull();
    expect(celdasPorHectarea(0)).toBeNull();
  });
  it('celdas por hectarea', () => {
    expect(celdasPorHectarea(100)).toBe(1);
    expect(celdasPorHectarea(50)).toBe(4);
  });
});
