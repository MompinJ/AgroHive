import { describe, expect, it } from 'vitest';
import { huellaPincel } from './pincel';

const rejilla = [-1, 0, 1].flatMap((z) => [-1, 0, 1].map((x) => ({ celdaId: `c-${x}-${z}`, x, z })));

describe('huella de la brocha', () => {
  it('fina pinta una celda, media un cuadrado de 3 x 3 recortado a la parcela', () => {
    expect(huellaPincel(rejilla, { x: 0, z: 0 }, 1)).toEqual(['c-0-0']);
    expect(huellaPincel(rejilla, { x: 0, z: 0 }, 2)).toHaveLength(9);
    expect(huellaPincel(rejilla, { x: 1, z: 1 }, 2).sort()).toEqual(['c-0-0', 'c-0-1', 'c-1-0', 'c-1-1']);
  });
});
