import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leerBbmodel } from '../voxel/bbmodel';
import { bloqueProvisional, claveBloque, TOPE_CUBOS_BLOQUE } from '../voxel/bloque';
import { unirCubos } from '../voxel/geometria';

const carpeta = fileURLToPath(new URL('../../../../modelos/cultivos/', import.meta.url));
const modelos = readdirSync(carpeta).filter((f) => f.endsWith('.bbmodel'));

describe('manchon de plantas por celda (bloque provisional)', () => {
  it('la clave del bloque sigue la convencion de Mafer', () => {
    expect(claveBloque('maiz_madurez')).toBe('maiz_madurez_bloque');
  });

  for (const f of modelos) {
    it(`${f}: 3 surcos con lomo y 9 plantas dentro de la celda, apoyadas en el suelo y mas ligero que 9 detallados`, () => {
      const detallado = leerBbmodel(JSON.parse(readFileSync(carpeta + f, 'utf8')), f);
      const bloque = bloqueProvisional(detallado);
      expect(bloque.cubos).toHaveLength(21);
      expect(bloque.cubos.length).toBeLessThanOrEqual(TOPE_CUBOS_BLOQUE);
      // Un lomo bajo de 1 cubo de alto por surco.
      const lomos = bloque.cubos.filter((c) => c.nombre.startsWith('lomo'));
      expect(lomos).toHaveLength(3);
      expect(lomos.every((c) => c.hasta[1] - c.desde[1] === 1 && c.desde[1] === 0)).toBe(true);
      expect(bloque.cubos.every((c) => c.caras.down === null)).toBe(true);
      const g = unirCubos(bloque, () => [1, 1, 1]);
      const d = unirCubos(detallado, () => [1, 1, 1]);
      expect(g.caja.min[1]).toBeGreaterThanOrEqual(0);
      expect(g.caja.min[0]).toBeGreaterThanOrEqual(-0.5);
      expect(g.caja.max[0]).toBeLessThanOrEqual(0.5);
      expect(g.caja.min[2]).toBeGreaterThanOrEqual(-0.5);
      expect(g.caja.max[2]).toBeLessThanOrEqual(0.5);
      // Mas bajo que la planta detallada (las plantas del manchon son mas pequenas).
      expect(g.caja.max[1]).toBeLessThanOrEqual(Math.max(d.caja.max[1], 2.5 / 16) + 1e-9);
      expect(g.vertices).toBeLessThan(d.vertices * 9);
      // Colores tomados del detallado.
      const usados = new Set(detallado.cubos.flatMap((c) => Object.values(c.caras)));
      expect(bloque.cubos.every((c) => usados.has(c.caras.up) || [0, 3, 4].includes(c.caras.up ?? -1))).toBe(true);
    });
  }
});
