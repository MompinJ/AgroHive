import { describe, expect, it } from 'vitest';
import { fuentesDe } from './fuentes';

describe('fuentes de la sesión', () => {
  it('extrae citas anidadas y elimina duplicados sin confundir nombres de cultivos', () => {
    const fuente = { nombre: 'Fuente de prueba', url: 'https://example.org', nota: 'Prueba' };
    expect(fuentesDe({ nombre: 'No es una fuente', cultivos: [{ nombre: 'Tampoco', dato: { fuente } }], fuentes: [fuente] })).toEqual([fuente]);
  });
  it('no completa campos faltantes ni produce fuentes desde valores inválidos', () => {
    expect(fuentesDe({ fuente: null, fuentes: [null, { nombre: 10 }, 'sin fuente'] })).toEqual([]);
    expect(fuentesDe({ fuente: { nombre: 'Solo nombre' } })).toEqual([{ nombre: 'Solo nombre' }]);
  });
  it('conserva citas distintas del mismo servicio', () => {
    expect(fuentesDe({ fuentes: [{ nombre: 'Servicio', cita: 'Tabla 1' }, { nombre: 'Servicio', cita: 'Tabla 2' }] })).toHaveLength(2);
  });
});
