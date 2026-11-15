import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { diferenciaColor, VISTAS_COLOR, type VistaColor } from '../daltonismo';

// Iconos 2D de cultivos de modelos/iconos2d/ (encargo de Mompin, 14/11): un sprite por cultivo y etapa para el modo 2D.
// Pixel art de 16 x 16, fondo transparente, solo colores de modelos/paleta.md, legibles a 32 y 64 px (x2 y x4).
// El color no va solo: ademas de una silueta propia, la prueba mide con daltonismo.ts (Machado et al. 2009) que todo par
// de iconos se distinga bajo las tres dicromacias.
const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const carpeta = `${raiz}modelos/iconos2d/`;
const CULTIVOS = ['maiz', 'frijol', 'calabaza', 'chile', 'sorgo', 'sandia', 'camote', 'cacahuate', 'soya', 'caupi', 'haba', 'chicharo', 'lenteja', 'ejote', 'cebada', 'trigo', 'avena', 'maiz_dulce', 'yuca', 'cana', 'ajonjoli', 'girasol', 'algodon', 'cartamo', 'higuerilla', 'tomate', 'papa', 'calabacita'];
const ETAPAS = ['siembra', 'brote', 'crecimiento', 'madurez', 'podrida'];
const NOMBRES = CULTIVOS.flatMap((c) => ETAPAS.map((e) => `${c}_${e}`));
const LADO = 16;
/** Un pixel cuenta como "distinto" si su color cambia al menos esto (dE*ab, CIE76), o si uno es transparente y el otro no. */
const DE_MIN = 15; // el mismo umbral de estilos-estado.ts `[PROPUESTA]`
/** Fraccion minima de los 256 pixeles que debe distinguir a dos iconos cualesquiera, en cada vista `[PROPUESTA]`. */
const DIFERENCIA_MIN = 0.12;

const paletaDocumentada = new Set([...readFileSync(`${raiz}modelos/paleta.md`, 'utf8').matchAll(/^\| \d+ \| \S+ \| (#[0-9a-f]{6}) \|/gm)].map((m) => m[1]));

type Pixeles = (string | null)[];

function leerSvg(nombre: string) {
  const texto = readFileSync(`${carpeta}${nombre}.svg`, 'utf8');
  const pixeles: Pixeles = Array.from({ length: LADO * LADO }, () => null);
  const colores = new Set<string>();
  for (const [, fill, d] of texto.matchAll(/<path fill="(#[0-9a-f]{6})" d="([^"]+)"/g)) {
    colores.add(fill!);
    for (const [, x, y, w] of d!.matchAll(/M(\d+) (\d+)h(\d+)v1H\d+z/g)) {
      for (let i = 0; i < Number(w); i++) pixeles[Number(y) * LADO + Number(x) + i] = fill!;
    }
  }
  return { texto, pixeles, colores };
}

function fraccionDistinta(a: Pixeles, b: Pixeles, vista: VistaColor): number {
  let distintos = 0;
  for (let i = 0; i < a.length; i++) {
    const p = a[i] ?? null;
    const q = b[i] ?? null;
    if (p === null && q === null) continue;
    if (p === null || q === null || diferenciaColor(p, q, vista) >= DE_MIN) distintos++;
  }
  return distintos / a.length;
}

const iconos = new Map(NOMBRES.filter((n) => existsSync(`${carpeta}${n}.svg`)).map((n) => [n, leerSvg(n)] as const));

describe('iconos 2D de modelos/iconos2d', () => {
  it(`estan los ${NOMBRES.length} (${CULTIVOS.length} cultivos x 5 etapas) y el visor`, () => {
    for (const n of NOMBRES) expect(existsSync(`${carpeta}${n}.svg`), `falta ${n}.svg`).toBe(true);
    expect(existsSync(`${carpeta}visor_iconos.html`)).toBe(true);
  });

  for (const nombre of NOMBRES) {
    describe(nombre, () => {
      const icono = iconos.get(nombre);

      it('es un SVG de 16 x 16, nitido, con titulo en espanol y sin scripts ni imagenes externas', () => {
        expect(icono).toBeDefined();
        const { texto } = icono!;
        expect(texto).toContain('viewBox="0 0 16 16"');
        expect(texto).toContain('shape-rendering="crispEdges"');
        expect(texto).toMatch(/role="img"/);
        expect(texto).toMatch(/<title>[^<]{5,}<\/title>/);
        expect(texto).not.toMatch(/<script|<image|href=|on\w+=/i);
        expect(texto.length).toBeLessThan(4000);
      });

      it('usa solo colores de modelos/paleta.md y deja libre al menos la esquina superior', () => {
        const { colores, pixeles } = icono!;
        for (const hex of colores) expect(paletaDocumentada.has(hex), `${hex} no esta en la paleta`).toBe(true);
        expect(pixeles[0]).toBeNull();
        expect(pixeles.filter((p) => p !== null).length).toBeGreaterThanOrEqual(30);
      });

      it('apoya el suelo en las ultimas filas y no toca la fila de arriba si es siembra o brote', () => {
        const { pixeles } = icono!;
        for (let x = 0; x < LADO; x++) expect(pixeles[15 * LADO + x]).not.toBeNull();
        if (nombre.endsWith('_siembra') || nombre.endsWith('_brote')) {
          for (let x = 0; x < LADO; x++) expect(pixeles[x]).toBeNull();
        }
      });
    });
  }

  for (const vista of VISTAS_COLOR) {
    it(`todo par de iconos se distingue en al menos ${DIFERENCIA_MIN * 100} % de los pixeles bajo ${vista}`, () => {
      const peores: string[] = [];
      for (let i = 0; i < NOMBRES.length; i++) {
        for (let j = i + 1; j < NOMBRES.length; j++) {
          const f = fraccionDistinta(iconos.get(NOMBRES[i]!)!.pixeles, iconos.get(NOMBRES[j]!)!.pixeles, vista);
          if (f < DIFERENCIA_MIN) peores.push(`${NOMBRES[i]} / ${NOMBRES[j]}: ${(f * 100).toFixed(1)} %`);
        }
      }
      expect(peores).toEqual([]);
    });
  }
});
