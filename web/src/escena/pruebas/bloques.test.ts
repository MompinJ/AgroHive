import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { leerBbmodel, type ModeloVoxel } from '../voxel/bbmodel';
import { unirCubos } from '../voxel/geometria';
import { decodificarPaletaPng } from '../voxel/paleta-png';

// Modelos LIGEROS de bloque (modelos/cultivos/bloques/): un manchon de 9 plantas simplificadas en surcos, que la
// escena dibuja en cada bloque en lugar de una sola planta detallada. Representacion visual, no a escala.
// Criterios de Mompin (14/11, [DECIDIDO] tras medir la escena): tope fijo de 24 cubos por bloque (9 a 12 plantas de 1 o 2
// cubos mas 3 lomos), SIN cara inferior en ningun cubo (texture null en down), un lomo bajo (1 unidad de alto) por surco,
// huella x/z -8..8, base en y=0 y la misma paleta. Se mide tambien en vertices reales con unirCubos.
const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const carpeta = `${raiz}modelos/cultivos/bloques/`;
const archivos = existsSync(carpeta) ? readdirSync(carpeta).filter((f) => f.endsWith('.bbmodel')).sort() : [];
const UNIDAD = 1 / 16;
const TOPE_CUBOS = 24;
const MIN_CUBOS = 12; // 9 plantas de un cubo y 3 lomos, como minimo
const MIN_LOMOS = 3;

/** Los 25 modelos: 5 cultivos x 5 etapas (los 4 de la milpa y el chile, mas el sorgo). */
const ESPERADOS = ['maiz', 'frijol', 'calabaza', 'chile', 'sorgo'].flatMap((c) => ['siembra', 'brote', 'crecimiento', 'madurez', 'podrida'].map((e) => `${c}_${e}_bloque.bbmodel`));

const paletaDocumentada = [...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| (\d+) \| \S+ \| (#[0-9a-f]{6}) \|/gm)]
  .map((m) => [Number(m[1]), m[2]] as const);

const leer = (ruta: string, nombre: string) => leerBbmodel(JSON.parse(readFileSync(ruta, 'utf8')), nombre);
const opaco = (paleta: Awaited<ReturnType<typeof decodificarPaletaPng>>) => (i: number) => (paleta[i] && paleta[i].alfa > 0 ? ([1, 1, 1] as [number, number, number]) : null);
const geometria = async (m: ModeloVoxel) => unirCubos(m, opaco(await decodificarPaletaPng(m.textura.fuente)));

describe('modelos de bloque de modelos/cultivos/bloques (varias plantas por bloque)', () => {
  it('estan los 25 (5 cultivos x 5 etapas)', () => {
    for (const f of ESPERADOS) expect(archivos, `falta ${f}`).toContain(f);
  });

  for (const f of archivos) {
    describe(f, () => {
      const modelo = leer(carpeta + f, f);

      it('sigue el nombre <cultivo>_<etapa>_bloque', () => {
        expect(f).toMatch(/^(maiz|frijol|calabaza|chile|sorgo)_(siembra|brote|crecimiento|madurez|podrida)_bloque\.bbmodel$/);
      });

      it('su paleta incrustada coincide con modelos/paleta.md', async () => {
        const paleta = await decodificarPaletaPng(modelo.textura.fuente);
        for (const [indice, hex] of paletaDocumentada) expect(paleta[indice]?.hex).toBe(hex);
      });

      it('se apoya en y = 0 y cabe en la huella de una celda (16 x 16)', async () => {
        const g = await geometria(modelo);
        expect(g.vertices).toBeGreaterThan(0);
        expect(g.caja.min[1]).toBeGreaterThanOrEqual(-0.001);
        expect(g.caja.min[1]).toBeLessThan(UNIDAD);
        for (const eje of [0, 2] as const) {
          expect(g.caja.min[eje]).toBeGreaterThanOrEqual(-8 * UNIDAD - 0.001);
          expect(g.caja.max[eje]).toBeLessThanOrEqual(8 * UNIDAD + 0.001);
        }
      });

      it(`respeta el tope de ${TOPE_CUBOS} cubos y trae lo minimo para 9 plantas y sus lomos`, () => {
        expect(modelo.cubos.length).toBeLessThanOrEqual(TOPE_CUBOS);
        expect(modelo.cubos.length).toBeGreaterThanOrEqual(MIN_CUBOS);
      });

      it('ningun cubo lleva cara inferior (texture null en down)', () => {
        const crudo = JSON.parse(readFileSync(carpeta + f, 'utf8')) as { elements: { faces: Record<string, { texture: unknown }> }[] };
        for (const e of crudo.elements) expect(e.faces['down']?.texture ?? null).toBeNull();
      });

      it('tiene un lomo bajo por surco: al menos 3 cajas largas de 1 unidad de alto o menos', () => {
        const lomos = modelo.cubos.filter((c) => {
          const alto = Math.abs(c.hasta[1] - c.desde[1]);
          const largo = Math.max(Math.abs(c.hasta[0] - c.desde[0]), Math.abs(c.hasta[2] - c.desde[2]));
          return alto <= 1.001 && largo >= 8 && Math.min(c.desde[1], c.hasta[1]) <= 0.001;
        });
        expect(lomos.length).toBeGreaterThanOrEqual(MIN_LOMOS);
      });

      it('pesa menos vertices que el maiz detallado en madurez (vertices reales)', async () => {
        const detallado = await geometria(leer(`${raiz}modelos/cultivos/maiz_madurez.bbmodel`, 'maiz_madurez.bbmodel'));
        const g = await geometria(modelo);
        expect(g.vertices).toBeLessThanOrEqual(detallado.vertices);
      });
    });
  }
});
