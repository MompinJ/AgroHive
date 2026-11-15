import { describe, expect, it } from 'vitest';
import { areaConSigno, areaDentro, celdasQueTocan, contornoForma, dentroEstricto, formaCelda, type Punto } from './forma-celda';

// Celda unidad [0, 1] x [0, 1]; x al este, y al norte.
const cuadrado = (x0: number, y0: number, x1: number, y1: number): Punto[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

describe('forma de una celda de borde', () => {
  it('celda llena, fuera o tocando solo por la orilla', () => {
    expect(formaCelda(cuadrado(-1, -1, 2, 2), 0, 0, 1)).toBe('completa');
    expect(formaCelda(cuadrado(3, 3, 5, 5), 0, 0, 1)).toBe('fuera');
    // Comparte solo la orilla x = 1: no tiene area dentro.
    expect(formaCelda(cuadrado(1, 0, 2, 1), 0, 0, 1)).toBe('fuera');
  });

  it('una orilla a 45 grados que pasa por dos esquinas da el triangulo exacto, en las 4 orientaciones', () => {
    // x + y <= 1: se queda la mitad suroeste.
    expect(formaCelda([[-5, -5], [6, -5], [-5, 6]], 0, 0, 1)).toBe('SO');
    // x + y >= 1: mitad noreste.
    expect(formaCelda([[6, -5], [6, 6], [-5, 6]], 0, 0, 1)).toBe('NE');
    // y <= x: mitad sureste.
    expect(formaCelda([[-5, -5], [6, -5], [6, 6]], 0, 0, 1)).toBe('SE');
    // y >= x: mitad noroeste.
    expect(formaCelda([[-5, -5], [6, 6], [-5, 6]], 0, 0, 1)).toBe('NO');
  });

  it('orillas rectas (norte-sur o este-oeste) quedan completas, sin dientes de sierra', () => {
    // Franja que cubre el 30 % sur de la celda: dos esquinas dentro.
    expect(formaCelda(cuadrado(-5, -5, 6, 0.3), 0, 0, 1)).toBe('completa');
    expect(formaCelda(cuadrado(0.6, -5, 6, 6), 0, 0, 1)).toBe('completa');
  });

  it('orilla diagonal desplazada: la esquina dentro da su triangulo, la casi llena queda completa', () => {
    // x + y <= 1.5: la celda (0,0) tiene 3 esquinas dentro; la (1,0), solo la SO.
    const pol: Punto[] = [[-5, -5], [6.5, -5], [-5, 6.5]];
    expect(formaCelda(pol, 0, 0, 1)).toBe('completa');
    expect(formaCelda(pol, 1, 0, 1)).toBe('SO');
    expect(formaCelda(pol, 0, 1, 1)).toBe('SO');
  });

  it('una punta que entra sin tocar esquinas usa el triangulo que la contiene; si no cabe, completa', () => {
    // Punta en la mitad noreste, lejos de las esquinas.
    expect(formaCelda([[0.6, 0.7], [0.9, 0.6], [5, 5]], 0, 0, 1)).toBe('NE');
    // Poligono chico en el centro: cruza las dos diagonales.
    expect(formaCelda(cuadrado(0.4, 0.4, 0.6, 0.6), 0, 0, 1)).toBe('completa');
  });

  it('el contorno de cada forma tiene el area esperada y va antihorario', () => {
    expect(areaConSigno(contornoForma('completa', 2, 3, 10))).toBeCloseTo(100);
    for (const t of ['SO', 'SE', 'NE', 'NO'] as const) {
      const c = contornoForma(t, 2, 3, 10);
      expect(areaConSigno(c)).toBeCloseTo(50);
      // El triangulo contiene la esquina que lo nombra.
      const esquina = ({ SO: [2, 3], SE: [12, 3], NE: [12, 13], NO: [2, 13] } as Record<typeof t, Punto>)[t];
      expect(c.some((p) => p[0] === esquina[0] && p[1] === esquina[1])).toBe(true);
    }
  });

  it('el area recortada de un poligono concavo es correcta', () => {
    // L: [0,2]x[0,1] mas [0,1]x[1,2] = 3; dentro de [0.5,1.5]x[0.5,1.5] quedan 0.75.
    const ele: Punto[] = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]];
    expect(areaDentro(ele, cuadrado(0.5, 0.5, 1.5, 1.5))).toBeCloseTo(0.75);
    expect(dentroEstricto([1.5, 1.5], ele, 1e-9)).toBe(false);
    expect(dentroEstricto([0.5, 0.5], ele, 1e-9)).toBe(true);
    expect(dentroEstricto([1, 0.5], ele, 1e-9)).toBe(true);
    // Sobre la orilla cuenta como fuera.
    expect(dentroEstricto([2, 0.5], ele, 1e-9)).toBe(false);
  });
});

describe('celdas que tocan el contorno', () => {
  it('un triangulo rectangulo a 45 grados da triangulos en la hipotenusa y completas dentro', () => {
    // x + y <= 4 en celdas de 1: diagonal exacta por las esquinas.
    const celdas = celdasQueTocan([[0, 0], [4, 0], [0, 4]], 1, 4, 4);
    expect(celdas).toHaveLength(10);
    const diag = celdas.filter((c) => c.i + c.j === 3);
    expect(diag).toHaveLength(4);
    expect(diag.every((c) => c.forma === 'SO')).toBe(true);
    expect(celdas.filter((c) => c.i + c.j < 3).every((c) => c.forma === 'completa')).toBe(true);
    const total = celdas.reduce((s, c) => s + c.areaDentro, 0);
    expect(total).toBeCloseTo(8);
  });

  it('una franja larga y diagonal no recorre toda su caja envolvente', () => {
    const franja: Punto[] = [[0, 0], [1, 0], [1000, 999], [1000, 1000], [999, 1000], [0, 1]];
    const celdas = celdasQueTocan(franja, 1, 1000, 1000);
    expect(celdas.length).toBeLessThan(4000);
    expect(celdas.length).toBeGreaterThan(1000);
  });
});
