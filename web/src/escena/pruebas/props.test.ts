import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leerBbmodel } from '../voxel/bbmodel';
import { unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng } from '../voxel/paleta-png';

// Props de modelos/props/ (A3.9): personajes y objetos que no van en una celda. Hoy solo la mascota
// (elote con cara feliz). A diferencia de las plantas, no llevan el lomo de surco: se apoyan en y = 0.
const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const carpeta = `${raiz}modelos/props/`;
const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.bbmodel')).sort();
const UNIDAD = 1 / 16;

const paletaDocumentada = [...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| (\d+) \| \S+ \| (#[0-9a-f]{6}) \|/gm)]
  .map((m) => [Number(m[1]), m[2]] as const);

describe('props de modelos/props (A3.9)', () => {
  it('esta la mascota, el elote feliz', () => {
    expect(archivos).toContain('mascota_feliz.bbmodel');
  });

  for (const f of archivos) {
    describe(f, () => {
      const modelo = leerBbmodel(JSON.parse(readFileSync(carpeta + f, 'utf8')), f);

      it('su paleta incrustada coincide con modelos/paleta.md', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        for (const [indice, hex] of paletaDocumentada) expect(paleta[indice]?.hex).toBe(hex);
      });

      it('se apoya en y = 0 y cabe en la huella de una celda (16 x 16)', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        const g = unirCubos(modelo, (i) => (paleta[i] && paleta[i].alfa > 0 ? [1, 1, 1] : null));
        expect(g.vertices).toBeGreaterThan(0);
        expect(g.caja.min[1]).toBeGreaterThanOrEqual(-0.001);
        expect(g.caja.min[1]).toBeLessThan(UNIDAD); // apoyado en el suelo, no flotando
        for (const eje of [0, 2] as const) {
          expect(g.caja.min[eje]).toBeGreaterThanOrEqual(-8 * UNIDAD - 0.001);
          expect(g.caja.max[eje]).toBeLessThanOrEqual(8 * UNIDAD + 0.001);
        }
      });
    });
  }

  it('la mascota es mas alta que una planta joven pero cabe en 30 unidades', async () => {
    const modelo = leerBbmodel(JSON.parse(readFileSync(`${carpeta}mascota_feliz.bbmodel`, 'utf8')), 'mascota_feliz.bbmodel');
    const paleta = await decodificarPaletaPng(modelo.textura.fuente);
    const g = unirCubos(modelo, (i) => (paleta[i] && paleta[i].alfa > 0 ? [1, 1, 1] : null));
    const alto = (g.caja.max[1] - g.caja.min[1]) / UNIDAD;
    expect(alto).toBeGreaterThanOrEqual(20);
    expect(alto).toBeLessThanOrEqual(30);
  });
});
