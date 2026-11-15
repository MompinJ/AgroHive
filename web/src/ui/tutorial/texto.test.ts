import { describe, expect, it } from 'vitest';
import { largo, NOMBRES_ICONO, partes, recortar, textoPlano } from './texto';

describe('texto de Esquilote con iconos', () => {
  it('convierte {brocha} en un icono y deja el resto como texto', () => {
    expect(partes('Pinta con la brocha {brocha} (B).')).toEqual([
      { tipo: 'texto', valor: 'Pinta con la brocha ' }, { tipo: 'icono', nombre: 'brocha' }, { tipo: 'texto', valor: ' (B).' },
    ]);
    expect(partes('sin iconos')).toEqual([{ tipo: 'texto', valor: 'sin iconos' }]);
    expect(partes('')).toEqual([]);
  });
  it('un nombre desconocido no inventa un icono: queda como texto', () => {
    expect(partes('mira {cohete} ahi')).toEqual([{ tipo: 'texto', valor: 'mira {cohete} ahi' }]);
    expect(partes('{goma}{mover}').map((p) => (p.tipo === 'icono' ? p.nombre : '?'))).toEqual(['goma', 'mover']);
  });
  it('cada nombre valido tiene su token', () => {
    for (const n of NOMBRES_ICONO) expect(partes(`{${n}}`)).toEqual([{ tipo: 'icono', nombre: n }]);
  });
  it('cuenta y recorta para el efecto de escritura: un icono aparece entero o no aparece', () => {
    const ps = partes('ab{brocha}cd');
    expect(largo(ps)).toBe(5);
    expect(recortar(ps, 0)).toEqual([]);
    expect(recortar(ps, 1)).toEqual([{ tipo: 'texto', valor: 'a' }]);
    expect(recortar(ps, 3)).toEqual([{ tipo: 'texto', valor: 'ab' }, { tipo: 'icono', nombre: 'brocha' }]);
    expect(recortar(ps, 99)).toEqual(ps);
    expect(recortar(ps, -4)).toEqual([]);
  });
  it('el texto plano no deja llaves ni dobles espacios', () => {
    expect(textoPlano('Usa el insecticida {insecticida} (I) o la goma {goma}.')).toBe('Usa el insecticida (I) o la goma.');
  });
});
