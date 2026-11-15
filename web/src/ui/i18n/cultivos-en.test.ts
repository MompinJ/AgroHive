import { describe, expect, it } from 'vitest';
import catalogo from '../../../../datos/catalogos/cultivos.json';
import { NOMBRES_CULTIVO_EN } from './cultivos-en';

describe('nombres de cultivo en ingles', () => {
  it('son los nombreComunEn del catalogo, para los mismos cultivos', () => {
    const delCatalogo = Object.fromEntries((catalogo as { cultivos: { id: string; nombreComunEn?: string }[] }).cultivos.map((c) => [c.id, c.nombreComunEn]));
    expect(NOMBRES_CULTIVO_EN).toEqual(delCatalogo);
  });
});
