import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leerBbmodel } from '../voxel/bbmodel';
import { unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng } from '../voxel/paleta-png';

// Losas de suelo de modelos/suelos/ (A2.12): una por tipo de suelo del selector y por
// nivel de humedad de la escala de suelo.ts. Cada una se pone ENCIMA de la columna de la
// celda: cuerpo de 2 unidades bajo y = 0 y detalle de a lo mas 1 unidad por encima.
const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const carpeta = `${raiz}modelos/suelos/`;
const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.bbmodel')).sort();

const TIPOS = ['arenoso', 'franco', 'arcilloso'];
const HUMEDADES = ['seco', 'medio', 'humedo'];
const ESPERADOS = TIPOS.flatMap((t) => HUMEDADES.map((h) => `suelo_${t}_${h}.bbmodel`)).sort();
const UNIDAD = 1 / 16;

const paletaDocumentada = [...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| (\d+) \| \S+ \| (#[0-9a-f]{6}) \|/gm)]
  .map((m) => [Number(m[1]), m[2]] as const);

describe('losas de suelo de modelos/suelos (A2.12)', () => {
  it('hay exactamente una por tipo (arenoso, franco, arcilloso) y humedad (seco, medio, humedo)', () => {
    expect(archivos).toEqual(ESPERADOS);
  });

  for (const f of archivos) {
    describe(f, () => {
      const modelo = leerBbmodel(JSON.parse(readFileSync(carpeta + f, 'utf8')), f);

      it('su paleta incrustada coincide con modelos/paleta.md', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        for (const [indice, hex] of paletaDocumentada) expect(paleta[indice]?.hex).toBe(hex);
      });

      it('llena la celda (16 x 16), con el cuerpo en y = -2 y el detalle a lo mas en y = 1', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        const g = unirCubos(modelo, (i) => (paleta[i] && paleta[i].alfa > 0 ? [1, 1, 1] : null));
        const eps = 0.001;
        expect(g.caja.min[0]).toBeCloseTo(-8 * UNIDAD, 2);
        expect(g.caja.max[0]).toBeCloseTo(8 * UNIDAD, 2);
        expect(g.caja.min[2]).toBeCloseTo(-8 * UNIDAD, 2);
        expect(g.caja.max[2]).toBeCloseTo(8 * UNIDAD, 2);
        expect(g.caja.min[1]).toBeCloseTo(-2 * UNIDAD, 2);
        expect(g.caja.max[1]).toBeLessThanOrEqual(UNIDAD + eps);
        expect(g.caja.max[1]).toBeGreaterThan(0);
      });
    });
  }
});
