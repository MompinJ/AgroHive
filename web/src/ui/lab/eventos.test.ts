import { describe, expect, it } from 'vitest';
import { cruzo, eventoCosecha, eventoPlaga, eventosAlAvanzar, fechaLarga, momentoPlaga } from './eventos';

const rango = { desde: '2026-06-15', hasta: '2026-10-17', pasos: 124 };
const maiz = [{ nombre: 'Maíz', celdas: 4 }];
const chapulin = { plaga: 'Chapulín de la milpa', cultivo: 'Maíz', bloques: 4 };

describe('eventos de pantalla completa', () => {
  it('escribe la fecha en espanol y no inventa una si no se puede leer', () => {
    expect(fechaLarga('2026-10-17')).toBe('17 de octubre de 2026');
    expect(fechaLarga('2026-01-05')).toBe('5 de enero de 2026');
    expect(fechaLarga('ayer')).toBe('ayer');
    expect(fechaLarga('2026-13-01')).toBe('2026-13-01');
  });
  it('la plaga cae a la mitad del ciclo; la cosecha, el ultimo dia', () => {
    expect(momentoPlaga(rango)).toBe('2026-08-16'); // dia 62 de 124
  });
  it('solo se cruza una marca avanzando', () => {
    expect(cruzo('2026-10-16', '2026-10-17', '2026-10-17')).toBe(true);
    expect(cruzo('2026-06-15', '2026-10-17', '2026-08-16')).toBe(true); // salto largo
    expect(cruzo('2026-10-17', '2026-10-17', '2026-10-17')).toBe(false); // ya estaba ahi
    expect(cruzo('2026-10-17', '2026-10-10', '2026-10-17')).toBe(false); // retrocede
    expect(cruzo(null, '2026-10-17', '2026-10-17')).toBe(false); // sin fecha anterior (primera carga o cambio de ciclo)
  });
  it('el mensaje de cosecha dice que planta, que dia y cuantas celdas', () => {
    const e = eventoCosecha('2026-10-17', maiz, null, 'R1:1:seco');
    expect(e.tipo).toBe('cosecha');
    expect(e.titulo).toBe('Maíz se cosecha el 17 de octubre de 2026');
    expect(e.detalle).toBe('Se cosechan 4 celdas');
    expect(eventoCosecha('2026-10-17', [{ nombre: 'Maíz', celdas: 1 }], null, 'k').detalle).toBe('Se cosechan 1 celda');
  });
  it('con varios cultivos pintados lista cada uno', () => {
    const e = eventoCosecha('2026-10-17', [{ nombre: 'Maíz', celdas: 3 }, { nombre: 'Frijol', celdas: 1 }], null, 'k');
    expect(e.titulo).toBe('Se cosechan maíz y frijol el 17 de octubre de 2026');
    expect(e.detalle).toBe('Maíz: 3 celdas · Frijol: 1 celda');
  });
  it('la cosecha avisa de los bloques sin insecticida sin prometer cuanto dano hicieron', () => {
    const e = eventoCosecha('2026-10-17', maiz, chapulin, 'k');
    expect(e.detalle).toContain('Quedaron 4 bloques sin insecticida frente a chapulín de la milpa');
    expect(e.detalle).toContain('no un pronóstico de daño');
  });
  it('el mensaje de plaga es una ilustracion y lo dice', () => {
    const e = eventoPlaga('2026-08-16', chapulin, 'k');
    expect(e.tipo).toBe('plaga');
    expect(e.titulo).toBe('Chapulín de la milpa se está comiendo tu maíz');
    expect(e.detalle).toContain('4 bloques sin insecticida');
    expect(e.detalle).toContain('16 de agosto de 2026');
    expect(e.detalle).toContain('Es una ilustración');
    expect(e.detalle).toContain('no se predice');
  });
  it('avanzar al final dispara la cosecha; cruzar la mitad, la plaga; saltar de un extremo al otro, las dos en orden', () => {
    const base = { rango, clave: 'R1:1:seco', cosecha: maiz, plaga: chapulin };
    expect(eventosAlAvanzar({ ...base, anterior: '2026-10-16', actual: '2026-10-17' }).map((e) => e.tipo)).toEqual(['cosecha']);
    expect(eventosAlAvanzar({ ...base, anterior: '2026-08-15', actual: '2026-08-17' }).map((e) => e.tipo)).toEqual(['plaga']);
    expect(eventosAlAvanzar({ ...base, anterior: '2026-06-15', actual: '2026-10-17' }).map((e) => e.tipo)).toEqual(['plaga', 'cosecha']);
    expect(eventosAlAvanzar({ ...base, anterior: '2026-06-15', actual: '2026-07-01' })).toEqual([]);
    expect(eventosAlAvanzar({ ...base, anterior: '2026-10-17', actual: '2026-06-15' })).toEqual([]);
  });
  it('sin plaga sin controlar no hay evento de plaga, y sin cultivos no hay cosecha', () => {
    const base = { rango, clave: 'k', anterior: '2026-06-15', actual: '2026-10-17' };
    expect(eventosAlAvanzar({ ...base, cosecha: maiz, plaga: null }).map((e) => e.tipo)).toEqual(['cosecha']);
    expect(eventosAlAvanzar({ ...base, cosecha: maiz, plaga: { ...chapulin, bloques: 0 } }).map((e) => e.tipo)).toEqual(['cosecha']);
    expect(eventosAlAvanzar({ ...base, cosecha: [], plaga: chapulin }).map((e) => e.tipo)).toEqual(['plaga']);
    expect(eventosAlAvanzar({ ...base, cosecha: maiz, plaga: { ...chapulin, bloques: 0 } })[0]!.detalle).not.toContain('sin insecticida');
  });
});
