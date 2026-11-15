import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TRIANGULOS } from '../../geo/forma-celda';
import { leerBbmodel, type CuboVoxel, type ModeloVoxel } from '../voxel/bbmodel';
import { unirCubos, type GeometriaUnida } from '../voxel/geometria';
import { SEMIPLANO, unirCubosMedia } from '../voxel/media';

// Medio cuadrado por recorte en el render (bordes diagonales): sirve para cualquier .bbmodel
// con las convenciones de doc 07, sin configurarlo por cultivo. Se prueba con todos los
// bloques y losas del repo, asi un cultivo nuevo entra solo a esta prueba.
const raiz = fileURLToPath(new URL('../../../../', import.meta.url));
const listar = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.bbmodel')).sort().map((f) => dir + f) : []);
const reales = [...listar(`${raiz}modelos/cultivos/bloques/`), ...listar(`${raiz}modelos/suelos/`)];
const leer = (ruta: string) => leerBbmodel(JSON.parse(readFileSync(ruta, 'utf8')), ruta);
const blanco = () => [1, 1, 1] as [number, number, number];

const caras = { north: 1, south: 2, east: 3, west: 4, up: 5, down: null };
const cubo = (desde: [number, number, number], hasta: [number, number, number], rotacion: [number, number, number] = [0, 0, 0]): CuboVoxel =>
  ({ nombre: 'c', desde, hasta, origen: [0, 0, 0], rotacion, caras });
const modelo = (cubos: CuboVoxel[]): ModeloVoxel => ({ nombre: 'm', cubos, textura: { ancho: 16, alto: 16, fuente: '' } });

/** Area proyectada hacia arriba (suma de triangulos con normal +y), en celdas^2. */
function areaArriba(g: GeometriaUnida): number {
  let s = 0;
  for (let k = 0; k < g.vertices; k += 3) {
    if (g.normales[k * 3 + 1]! < 0.99) continue;
    const p = (i: number) => [g.posiciones[(k + i) * 3]!, g.posiciones[(k + i) * 3 + 2]!] as const;
    const [a, b, c] = [p(0), p(1), p(2)];
    s += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  }
  return s;
}

/** Cada triangulo gira hacia su normal (visto desde fuera) y queda del lado que se conserva. */
function revisar(g: GeometriaUnida, forma: (typeof TRIANGULOS)[number]) {
  const [a, c] = SEMIPLANO[forma];
  for (let k = 0; k < g.vertices; k++) {
    expect(a * g.posiciones[k * 3]! + c * g.posiciones[k * 3 + 2]!).toBeLessThanOrEqual(1e-6);
  }
  for (let k = 0; k < g.vertices; k += 3) {
    const v = (i: number) => [0, 1, 2].map((e) => g.posiciones[(k + i) * 3 + e]!);
    const [p0, p1, p2] = [v(0), v(1), v(2)];
    const u = p1.map((x, e) => x - p0[e]!);
    const w = p2.map((x, e) => x - p0[e]!);
    const n = [u[1]! * w[2]! - u[2]! * w[1]!, u[2]! * w[0]! - u[0]! * w[2]!, u[0]! * w[1]! - u[1]! * w[0]!];
    const largo = Math.hypot(...n);
    if (largo < 1e-12) continue;
    const dot = (n[0]! * g.normales[k * 3]! + n[1]! * g.normales[k * 3 + 1]! + n[2]! * g.normales[k * 3 + 2]!) / largo;
    expect(dot).toBeGreaterThan(0.99);
  }
}

describe('medio cuadrado de un modelo voxel', () => {
  it('una losa que llena la celda queda en la mitad exacta, con su tapa en el corte', () => {
    const losa = modelo([cubo([-8, -2, -8], [8, 0, 8])]);
    const entera = unirCubos(losa, blanco);
    expect(areaArriba(entera)).toBeCloseTo(1);
    for (const t of TRIANGULOS) {
      const g = unirCubosMedia(losa, blanco, t);
      expect(areaArriba(g)).toBeCloseTo(0.5);
      revisar(g, t);
      // Tapa vertical en la diagonal: normal horizontal a 45 grados.
      const [a, c] = SEMIPLANO[t];
      const tapa = [...Array(g.vertices).keys()].some((k) =>
        Math.abs(g.normales[k * 3]! - a / Math.SQRT2) < 1e-6 && Math.abs(g.normales[k * 3 + 2]! - c / Math.SQRT2) < 1e-6);
      expect(tapa, t).toBe(true);
    }
  });

  it('descarta lo que cae del otro lado y deja entero lo que no toca la diagonal', () => {
    // Un cubo en la esquina NE y otro en la SO.
    const m = modelo([cubo([4, 0, -7], [7, 3, -4]), cubo([-7, 0, 4], [-4, 3, 7])]);
    const so = unirCubosMedia(m, blanco, 'SO');
    expect(so.cubos).toBe(1);
    expect(so.vertices).toBe(unirCubos(modelo([m.cubos[1]!]), blanco).vertices);
    expect(unirCubosMedia(m, blanco, 'NE').cubos).toBe(1);
    expect(unirCubosMedia(m, blanco, 'NO').cubos).toBe(2);
  });

  it('corta cubos girados sin dejar huecos ni caras al reves', () => {
    const m = modelo([cubo([-3, 0, -1], [3, 6, 1], [0, 30, 15])]);
    for (const t of TRIANGULOS) revisar(unirCubosMedia(m, blanco, t), t);
  });

  it(`sirve para todos los bloques y losas del repo (${reales.length})`, () => {
    expect(reales.length).toBeGreaterThan(0);
    for (const ruta of reales) {
      const m = leer(ruta);
      const entera = unirCubos(m, blanco);
      for (const t of TRIANGULOS) {
        const g = unirCubosMedia(m, blanco, t);
        revisar(g, t);
        expect(g.vertices, ruta).toBeGreaterThan(0);
        // Presupuesto: la mitad nunca pesa mas que el modelo entero mas sus tapas.
        expect(g.vertices, ruta).toBeLessThanOrEqual(entera.vertices + m.cubos.length * 6);
      }
    }
    // Recorre todos los .bbmodel del repo (crece con cada cultivo): con la suite en
    // paralelo pasa de los 5 s por defecto aunque sola tarde unos 2 s.
  }, 60_000);
});
