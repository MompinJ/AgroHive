import { describe, expect, it } from 'vitest';
import { climaFondo, epocaRelativa } from './clima-fondo';

// Climatologia de juguete: 366 dias, de 20 C (enero) a 30 C (a mitad de ano) y vuelta.
const tMedia = Array.from({ length: 366 }, (_, k) => 25 - 5 * Math.cos((2 * Math.PI * k) / 365));

describe('clima del fondo', () => {
  it('la lluvia del dia manda sobre la epoca', () => {
    expect(climaFondo('llovizna', 'calida')).toBe('llovizna');
    expect(climaFondo('moderada', 'fresca')).toBe('lluvia');
    expect(climaFondo('fuerte', null)).toBe('tormenta');
  });
  it('sin lluvia usa la epoca y sin nada queda despejado', () => {
    expect(climaFondo('sin_lluvia', 'calida')).toBe('calido');
    expect(climaFondo(null, 'fresca')).toBe('fresco');
    expect(climaFondo(null, 'templada')).toBe('despejado');
    expect(climaFondo(undefined, null)).toBe('despejado');
  });
  it('compara la epoca con los percentiles de la propia parcela', () => {
    expect(epocaRelativa(tMedia, '2024-07-02')).toBe('calida'); // dia ~183, el maximo
    expect(epocaRelativa(tMedia, '2024-01-02')).toBe('fresca'); // el minimo
    expect(epocaRelativa(tMedia, '2024-04-01')).toBe('templada'); // a medio camino
  });
  it('no afirma nada con poco dato o fecha invalida', () => {
    expect(epocaRelativa([20, 21, 22], '2024-01-02')).toBeNull();
    expect(epocaRelativa(tMedia, 'ayer')).toBeNull();
    expect(epocaRelativa(null, '2024-01-02')).toBeNull();
    expect(epocaRelativa(tMedia, null)).toBeNull();
    const huecos = tMedia.map((x, k) => (k === 182 ? null : x));
    expect(epocaRelativa(huecos, '2024-07-01')).toBeNull(); // el dia sin dato no se inventa
  });
});
