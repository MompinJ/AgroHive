import { expect, it } from 'vitest';
import { ordenarRotaciones } from './ordenRotaciones';
import type { ResultadoRotacion } from '../../../contratos/tipos/contratos';

it('ordena por posición entregada por el motor, dejando sin ranking al final sin mutar la entrada', () => {
  const filas = [{ rotacionId: 'R1', ranking: { posicion: 2 } }, { rotacionId: 'R2', ranking: null }, { rotacionId: 'R4', ranking: { posicion: 1 } }] as ResultadoRotacion[];
  expect(ordenarRotaciones(filas).map((r) => r.rotacionId)).toEqual(['R4', 'R1', 'R2']);
  expect(filas.map((r) => r.rotacionId)).toEqual(['R1', 'R2', 'R4']);
});
