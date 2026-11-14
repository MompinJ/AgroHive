// Patrones e iconos como mascaras de pixeles (1 = tinta, 0 = color del estado).
// Puros: la escena 3D los vuelve textura (DataTexture) y el modo 2D o la leyenda
// pueden dibujarlos en canvas o SVG con los mismos pixeles. Los iconos son
// provisionales `[PROPUESTA]` para A3.3: se reemplazan aqui sin tocar la escena.

import type { Icono, Patron } from './estilos-estado';

export const LADO_PATRON = 16;

export interface Mascara {
  lado: number;
  /** lado * lado valores 0 o 1, por filas (y hacia abajo). */
  pixeles: Uint8Array;
}

const REGLAS: Record<Patron, (x: number, y: number) => boolean> = {
  liso: () => false,
  puntos: (x, y) => x % 4 < 2 && y % 4 < 2,
  rayas: (x, y) => (x + y) % 8 < 2,
  rayas_densas: (x, y) => (x + y) % 4 < 2,
  verticales: (x) => x % 4 === 0,
  cruces: (x, y) => (x + y) % 8 === 0 || (((x - y) % 8) + 8) % 8 === 0,
  cuadros: (x, y) => (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0,
  horizontales: (_x, y) => y % 4 === 0,
};

export function mascaraPatron(patron: Patron, lado = LADO_PATRON): Mascara {
  const regla = REGLAS[patron];
  const pixeles = new Uint8Array(lado * lado);
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) pixeles[y * lado + x] = regla(x, y) ? 1 : 0;
  return { lado, pixeles };
}

// Iconos de 8 x 8. '#' = tinta. Dibujos simples y distintos entre si.
const DIBUJOS: Record<Icono, string[]> = {
  hoja: [
    '........',
    '....###.',
    '...####.',
    '..#####.',
    '..####..',
    '.#.##...',
    '.#......',
    '#.......',
  ],
  gota_tachada: [
    '#...#...',
    '.#.###..',
    '..#####.',
    '.###.##.',
    '.####.#.',
    '.#####..',
    '..###.#.',
    '.......#',
  ],
  hoja_caida: [
    '#.......',
    '.#......',
    '.##.....',
    '.####...',
    '..#####.',
    '...#####',
    '.....##.',
    '........',
  ],
  moho: [
    '.#...#..',
    '###.###.',
    '.#...#..',
    '...#....',
    '..###.#.',
    '...#.###',
    '.#....#.',
    '###.....',
  ],
  surco: [
    '........',
    '........',
    '#..#..#.',
    '##.##.##',
    '########',
    '........',
    '........',
    '........',
  ],
  interrogacion: [
    '..####..',
    '.##..##.',
    '.....##.',
    '....##..',
    '...##...',
    '...##...',
    '........',
    '...##...',
  ],
  alerta: [
    '...##...',
    '...##...',
    '..####..',
    '..#..#..',
    '.##..##.',
    '.######.',
    '##.##.##',
    '########',
  ],
  vacio: [
    '..####..',
    '.#....#.',
    '#......#',
    '#......#',
    '#......#',
    '#......#',
    '.#....#.',
    '..####..',
  ],
};

export function mascaraIcono(icono: Icono): Mascara {
  const filas = DIBUJOS[icono];
  const lado = filas.length;
  const pixeles = new Uint8Array(lado * lado);
  filas.forEach((fila, y) => {
    for (let x = 0; x < lado; x++) pixeles[y * lado + x] = fila[x] === '#' ? 1 : 0;
  });
  return { lado, pixeles };
}

export function mascarasIguales(a: Mascara, b: Mascara): boolean {
  return a.lado === b.lado && a.pixeles.every((v, k) => v === b.pixeles[k]);
}
