import { describe, expect, it } from 'vitest';
import { area, polygon } from '@turf/turf';
import { generarCuadricula } from './cuadricula';
import type { LonLat } from '../../../contratos/tipos/contratos';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';

const requireContratos = createRequire(new URL('../../../contratos/package.json', import.meta.url));
const Ajv = requireContratos('ajv/dist/2020').default;
const addFormats = requireContratos('ajv-formats').default;
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const directorio = new URL('../../../contratos/', import.meta.url);
for (const archivo of readdirSync(directorio).filter((n) => n.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(archivo, directorio), 'utf8')));
}

const rectangulo: LonLat[] = [[-95.531, 18.029], [-95.529, 18.029], [-95.529, 18.031], [-95.531, 18.031]];
describe('cuadrícula de parcela', () => {
  it('entrega una parcela válida contra el JSON Schema compartido', () => {
    const validar = ajv.getSchema('https://agrohive.example/contratos/parcela.schema.json');
    expect(validar(generarCuadricula(rectangulo).parcela), JSON.stringify(validar.errors)).toBe(true);
  });
  it('cierra el anillo, conserva área y deja los datos no consultados como null', () => {
    const { parcela, bordes } = generarCuadricula(rectangulo);
    expect(parcela.poligono.at(-1)).toEqual(rectangulo[0]);
    expect(rectangulo).toHaveLength(4);
    expect(parcela.celdas.length).toBe(bordes.length);
    expect(parcela.celdas.every((c) => c.elevacionM === null && c.pendientePct === null)).toBe(true);
    const suma = bordes.reduce((s, b, i) => s + area(polygon([b])) * parcela.celdas[i]!.fraccionDentro!, 0);
    expect(suma / (parcela.areaHa * 10000)).toBeCloseTo(1, 6);
  });
  it('respeta 1600 celdas sin recortar ni perder área', () => {
    const grande: LonLat[] = [[-95.6, 18], [-95.4, 18], [-95.4, 18.2], [-95.6, 18.2]];
    const { parcela } = generarCuadricula(grande);
    expect(parcela.celdas.length).toBeLessThanOrEqual(1600);
    expect(new Set(parcela.celdas.map((c) => c.id)).size).toBe(parcela.celdas.length);
  });
  it('incluye fracciones de borde de un contorno cóncavo', () => {
    const { parcela } = generarCuadricula([[-95.531, 18.029], [-95.529, 18.029], [-95.530, 18.030], [-95.529, 18.031], [-95.531, 18.031]]);
    expect(parcela.celdas.some((c) => c.fraccionDentro! > 0 && c.fraccionDentro! < 0.99)).toBe(true);
  });
  it.each([
    [[0, 0], [1, 1]],
    [[0, 0], [1, 1], [0, 1], [1, 0]],
    [[0, 0], [1, 0], [0, 0]],
    [[0, 86], [1, 86], [1, 87]],
    [[0, 0], [NaN, 0], [1, 1]],
    [[0, 0], [5, 0], [5, 5]],
  ])('rechaza contornos inválidos o fuera del límite local: %j', (...puntos) => {
    expect(() => generarCuadricula(puntos.map((p) => [p[0]!, p[1]!] as LonLat))).toThrow();
  });
});
