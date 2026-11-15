// E10: el laboratorio arranca con las parcelas de ejemplo mundiales (demo/ejemplos.ts). Rotaciones de
// arranque con los cultivos sugeridos y las ventanas del calendario de cada lugar, y el texto de la referencia
// de siembra sin municipio fuera de Mexico.
import { describe, expect, it } from 'vitest';
import { cargarEjemplo, listarEjemplos } from '../demo/ejemplos';
import { conflictosPlan, explicarFecha, fechaEnVentana, lugarDelCalendario, planesIniciales } from './planes';
import { validadorContrato } from '../motor/pruebas/utiles';

const validarPlan = validadorContrato('plan-siembra');

describe('rotaciones de arranque de los ejemplos', () => {
  it.each(listarEjemplos().map((e) => [e.id]))('%s: cultivos sugeridos, sin choques y con contrato válido', async (id) => {
    const d = await cargarEjemplo(id);
    const planes = planesIniciales(d.parcela, d.calendario, { sugeridos: d.ejemplo.cultivosSugeridos, catalogo: d.catalogo });
    expect(planes.length).toBeGreaterThanOrEqual(2);
    for (const p of planes) {
      expect(validarPlan(p)).toEqual([]);
      expect(conflictosPlan(p, d.catalogo)).toEqual([]);
      for (const c of p.ciclos) expect(d.ejemplo.cultivosSugeridos).toContain(c.cultivo);
    }
    expect(planes[0]!.ciclos[0]!.cultivo).toBe(d.ejemplo.cultivosSugeridos[0]);
  });

  it('Sorriso siembra soya en octubre y maíz de segunda en febrero (ventanas del calendario)', async () => {
    const d = await cargarEjemplo('mato-grosso-sorriso');
    const [r1] = planesIniciales(d.parcela, d.calendario, { sugeridos: d.ejemplo.cultivosSugeridos, catalogo: d.catalogo });
    expect(r1!.ciclos.map((c) => [c.cultivo, c.siembra.slice(5, 7)])).toEqual([['soya', '10'], ['maiz', '02'], ['soya', '10']]);
  });

  it('sin sugeridos (parcela dibujada) se conservan las rotaciones de maíz y frijol', async () => {
    const d = await cargarEjemplo('bajio-guanajuato');
    expect(planesIniciales(d.parcela, d.calendario).map((p) => p.rotacionId)).toEqual(['R1', 'R2', 'R3']);
  });
});

describe('fecha dentro de la ventana', () => {
  it('toma la fecha si ya cae en la ventana; si no, el siguiente inicio; sin ventana, la misma fecha', async () => {
    const d = await cargarEjemplo('uasin-gishu-kenia');
    expect(fechaEnVentana('trigo', '2026-08-14', d.calendario)).toMatchObject({ fecha: '2026-08-14', enVentana: true });
    expect(fechaEnVentana('maiz', '2026-05-01', d.calendario)).toMatchObject({ fecha: '2027-04-10', enVentana: true });
    expect(fechaEnVentana('cafe', '2026-05-01', d.calendario)).toMatchObject({ fecha: '2026-05-01', enVentana: false });
  });
});

describe('referencia de siembra fuera de México', () => {
  it('usa el municipio en México y el país en español fuera (nunca "undefined" ni la celda GGCMI)', async () => {
    const mx = await cargarEjemplo('bajio-guanajuato');
    const ke = await cargarEjemplo('uasin-gishu-kenia');
    expect(lugarDelCalendario(mx.calendario!)).toBe('Jaral del Progreso, Guanajuato');
    expect(lugarDelCalendario(ke.calendario!)).toBe('esta zona de Kenia');
    const texto = explicarFecha({ cultivo: 'maiz', temporada: 'PV' }, ke.calendario).texto;
    expect(texto).toMatch(/^Referencia para esta zona de Kenia, PV: 10\/4/);
    expect(texto).not.toMatch(/undefined|celda/);
  });
});
