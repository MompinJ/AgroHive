import { describe, expect, it } from 'vitest';
import { leerHechos, masRecientesPrimero, registrar, textoHecho, TOPE_HECHOS, VENTANA_AGRUPAR_MS, type Hecho } from './historial';

const siembra = (cuando: number, celdas: number, extra: Partial<Hecho> = {}) => ({ tipo: 'siembra' as const, cuando, celdas, sujeto: 'Frijol', ciclo: 2, clave: 'R1:2:frijol', ...extra });

describe('historial de hechos', () => {
  it('registra en orden con ids que crecen', () => {
    let l = registrar([], siembra(1000, 3));
    l = registrar(l, { tipo: 'cosecha', cuando: 2000, titulo: 'Maíz se cosecha el 17 de octubre de 2026', fechaSim: '2026-10-17' });
    expect(l.map((h) => h.id)).toEqual([1, 2]);
    expect(l[1]!.fechaSim).toBe('2026-10-17');
  });
  it('agrupa los trazos seguidos del mismo cultivo y ciclo en un solo hecho', () => {
    let l = registrar([], siembra(1000, 3));
    l = registrar(l, siembra(1000 + VENTANA_AGRUPAR_MS - 1, 2));
    l = registrar(l, siembra(1000 + VENTANA_AGRUPAR_MS + 2, 4)); // el agrupado se actualizo a "cuando" del ultimo trazo: sigue dentro de la ventana
    expect(l).toHaveLength(1);
    expect(l[0]!.celdas).toBe(9);
    expect(textoHecho(l[0]!)).toBe('Sembraste Frijol en 9 celdas (ciclo 2)');
  });
  it('no agrupa si cambia el cultivo, el ciclo, el tipo o pasa mucho tiempo', () => {
    const base = registrar([], siembra(1000, 3));
    expect(registrar(base, siembra(1500, 2, { sujeto: 'Maíz', clave: 'R1:2:maiz' }))).toHaveLength(2);
    expect(registrar(base, siembra(1500, 2, { ciclo: 3, clave: 'R1:3:frijol' }))).toHaveLength(2);
    expect(registrar(base, { tipo: 'insecticida', cuando: 1500, celdas: 2, clave: 'R1:2:frijol' })).toHaveLength(2);
    expect(registrar(base, siembra(1000 + VENTANA_AGRUPAR_MS + 5000, 2))).toHaveLength(2);
  });
  it('la cosecha, la plaga y el problema nunca se agrupan: cada uno es un suceso', () => {
    let l = registrar([], { tipo: 'cosecha', cuando: 1, titulo: 'a', clave: 'k' });
    l = registrar(l, { tipo: 'cosecha', cuando: 2, titulo: 'b', clave: 'k' });
    expect(l).toHaveLength(2);
  });
  it('escribe los textos con singular y plural', () => {
    expect(textoHecho({ id: 1, tipo: 'siembra', cuando: 0, celdas: 1, sujeto: 'Maíz', ciclo: 1 })).toBe('Sembraste Maíz en 1 celda (ciclo 1)');
    expect(textoHecho({ id: 1, tipo: 'siembra', cuando: 0, celdas: 2, sujeto: null, ciclo: 3 })).toBe('Devolviste 2 celdas al cultivo general (ciclo 3)');
    expect(textoHecho({ id: 1, tipo: 'insecticida', cuando: 0, celdas: 1 })).toBe('Aplicaste insecticida en 1 bloque');
    expect(textoHecho({ id: 1, tipo: 'insecticida', cuando: 0, celdas: 4, ciclo: 1 })).toBe('Aplicaste insecticida en 4 bloques (ciclo 1)');
    expect(textoHecho({ id: 1, tipo: 'plaga', cuando: 0, titulo: 'Chapulín se está comiendo tu maíz' })).toBe('Chapulín se está comiendo tu maíz');
    expect(textoHecho({ id: 1, tipo: 'problema', cuando: 0 })).toBe('Problema'); // sin titulo, el nombre del tipo: no inventa texto
  });
  it('guarda como mucho 200 hechos: se van los mas viejos', () => {
    let l: Hecho[] = [];
    for (let k = 0; k < TOPE_HECHOS + 25; k++) l = registrar(l, { tipo: 'cosecha', cuando: k * 10000, titulo: `h${k}` });
    expect(l).toHaveLength(TOPE_HECHOS);
    expect(l[0]!.titulo).toBe('h25');
    expect(l.at(-1)!.titulo).toBe(`h${TOPE_HECHOS + 24}`);
    expect(new Set(l.map((h) => h.id)).size).toBe(TOPE_HECHOS); // ids unicos aunque se descarten los viejos
  });
  it('muestra del mas reciente al mas viejo sin tocar la lista original', () => {
    const l = registrar(registrar([], { tipo: 'cosecha', cuando: 1, titulo: 'a' }), { tipo: 'plaga', cuando: 2, titulo: 'b' });
    expect(masRecientesPrimero(l).map((h) => h.titulo)).toEqual(['b', 'a']);
    expect(l.map((h) => h.titulo)).toEqual(['a', 'b']);
  });
  it('lee lo guardado sin confiar en el', () => {
    expect(leerHechos(null)).toEqual([]);
    expect(leerHechos('esto no es json')).toEqual([]);
    expect(leerHechos('{"a":1}')).toEqual([]);
    const bueno = { id: 1, tipo: 'cosecha', cuando: 5, titulo: 'x' };
    expect(leerHechos(JSON.stringify([bueno, { id: 'z', tipo: 'cosecha', cuando: 1 }, { id: 2, tipo: 'volcan', cuando: 1 }, null, 7]))).toEqual([bueno]);
  });
});
