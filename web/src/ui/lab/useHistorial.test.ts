import { describe, expect, it } from 'vitest';
import { crearAlmacenHistorial } from './useHistorial';
import { VENTANA_AGRUPAR_MS } from './historial';

const memoria = (inicial: Record<string, string> = {}) => { const d = { ...inicial }; return { getItem: (k: string) => d[k] ?? null, setItem: (k: string, v: string) => { d[k] = v; }, datos: d }; };
const insecticida = (celdas: number) => ({ tipo: 'insecticida' as const, celdas, ciclo: 1, clave: 'R1:1:insecticida' });

describe('almacen del historial', () => {
  it('UN clic guarda UNA vez: 4 bloques son 4 bloques, no 8', () => {
    const m = memoria();
    const a = crearAlmacenHistorial('p1', m, () => 1000);
    a.agregar(insecticida(4));
    expect(a.instantanea()).toHaveLength(1);
    expect(a.instantanea()[0]!.celdas).toBe(4);
    expect(JSON.parse(m.datos['agrohive:historial:v1:p1']!)[0].celdas).toBe(4);
  });
  it('dos clics seguidos del mismo tipo si se suman, como un trazo largo de la brocha', () => {
    let reloj = 1000;
    const a = crearAlmacenHistorial('p1', memoria(), () => reloj);
    a.agregar(insecticida(4));
    reloj += 500;
    a.agregar(insecticida(2));
    expect(a.instantanea()).toHaveLength(1);
    expect(a.instantanea()[0]!.celdas).toBe(6);
    reloj += VENTANA_AGRUPAR_MS + 1;
    a.agregar(insecticida(1));
    expect(a.instantanea()).toHaveLength(2);
  });
  it('lo guardado vuelve al crear otro almacen de la misma parcela, y cada parcela tiene el suyo', () => {
    const m = memoria();
    const a = crearAlmacenHistorial('p1', m, () => 1);
    a.agregar({ tipo: 'cosecha', titulo: 'Maíz se cosecha', fechaSim: '2026-10-17' });
    expect(crearAlmacenHistorial('p1', m).instantanea().map((h) => h.titulo)).toEqual(['Maíz se cosecha']);
    expect(crearAlmacenHistorial('p2', m).instantanea()).toEqual([]);
  });
  it('crear el almacen varias veces (como hace React al renderizar dos veces) no duplica ni escribe nada', () => {
    const m = memoria();
    crearAlmacenHistorial('p1', m); crearAlmacenHistorial('p1', m);
    expect(Object.keys(m.datos)).toEqual([]);
  });
  it('borrar vacia la lista y lo guardado', () => {
    const m = memoria();
    const a = crearAlmacenHistorial('p1', m, () => 1);
    a.agregar({ tipo: 'plaga', titulo: 'x' });
    a.borrar();
    expect(a.instantanea()).toEqual([]);
    expect(m.datos['agrohive:historial:v1:p1']).toBe('[]');
  });
  it('avisa a quien escucha en cada cambio y deja de avisar al desuscribirse', () => {
    const a = crearAlmacenHistorial('p1', memoria(), () => 1);
    let veces = 0;
    const quitar = a.suscribir(() => { veces += 1; });
    a.agregar({ tipo: 'plaga', titulo: 'a' }); a.borrar();
    expect(veces).toBe(2);
    quitar(); a.agregar({ tipo: 'plaga', titulo: 'b' });
    expect(veces).toBe(2);
  });
  it('sin parcela cargada no guarda nada, y un almacenamiento roto no impide registrar', () => {
    const sin = crearAlmacenHistorial(null, memoria());
    sin.agregar({ tipo: 'plaga', titulo: 'x' });
    expect(sin.instantanea()).toEqual([]);
    const roto = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('lleno'); } };
    const a = crearAlmacenHistorial('p1', roto, () => 1);
    a.agregar({ tipo: 'plaga', titulo: 'x' });
    expect(a.instantanea()).toHaveLength(1); // queda en memoria
  });
  it('el mismo arreglo se devuelve mientras nada cambia (requisito de useSyncExternalStore)', () => {
    const a = crearAlmacenHistorial('p1', memoria(), () => 1);
    a.agregar({ tipo: 'plaga', titulo: 'x' });
    expect(a.instantanea()).toBe(a.instantanea());
  });
});
