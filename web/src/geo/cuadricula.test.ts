import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readdirSync, readFileSync } from 'node:fs';
import { area, polygon } from '@turf/turf';
import type { LonLat } from '../../../contratos/tipos/contratos';
import { generarCuadricula } from './cuadricula';
import { elegirLado, ladoAutomatico, TAMANOS_CELDA_M, TOPE_CELDAS } from './tamano-celda';

const requireContratos = createRequire(new URL('../../../contratos/package.json', import.meta.url));
const Ajv = requireContratos('ajv/dist/2020').default;
const addFormats = requireContratos('ajv-formats').default;
const ajv = new Ajv({ strict: false });
addFormats(ajv);
const directorio = new URL('../../../contratos/', import.meta.url);
for (const archivo of readdirSync(directorio).filter((n) => n.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(readFileSync(new URL(archivo, directorio), 'utf8')));
}
const validar = ajv.getSchema('https://agrohive.example/contratos/parcela.schema.json');

// Rombo de unos 105 m de lado (150 m de diagonal), todo en diagonal (como una parcela girada 45 grados).
const rombo: LonLat[] = [[-95.530, 18.0293], [-95.5293, 18.030], [-95.530, 18.0307], [-95.5307, 18.030]];
const grande: LonLat[] = [[-95.6, 18], [-95.4, 18], [-95.4, 18.2], [-95.6, 18.2]];

describe('cuadrícula con bordes diagonales', () => {
  it('marca triángulos en las orillas diagonales y la parcela es válida contra el contrato', () => {
    const { parcela, contornos: bordes } = generarCuadricula(rombo);
    expect(validar(parcela), JSON.stringify(validar.errors)).toBe(true);
    const formas = new Set(parcela.celdas.map((c) => c.forma));
    for (const t of ['SO', 'SE', 'NE', 'NO']) expect(formas.has(t as never)).toBe(true);
    // Los triángulos se dibujan con 3 vértices (anillo cerrado de 4 puntos).
    parcela.celdas.forEach((c, k) => expect(bordes[k]!.length).toBe(c.forma === 'completa' ? 5 : 4));
  });

  it('el dibujo con triángulos sigue mejor el contorno que los cuadrados', () => {
    const { parcela, contornos: bordes } = generarCuadricula(rombo);
    const real = parcela.areaHa * 10000;
    const dibujada = bordes.reduce((s, b) => s + area(polygon([b])), 0);
    const lado = parcela.tamanoCeldaM;
    const cuadrados = parcela.celdas.length * lado * lado;
    // Con cubierta hacia afuera el dibujo sigue un poco mas grande que el contorno, pero el error
    // baja casi a la mitad (medido: 1528 m2 contra 2978 m2 con cuadrados en este rombo).
    expect(Math.abs(dibujada - real)).toBeLessThan(Math.abs(cuadrados - real) * 0.6);
  });

  it('fraccionDentro no cambia: es lo que pesa en el motor', () => {
    const { parcela } = generarCuadricula(rombo);
    const lado = parcela.tamanoCeldaM;
    const suma = parcela.celdas.reduce((s, c) => s + c.fraccionDentro! * lado * lado, 0);
    expect(suma / (parcela.areaHa * 10000)).toBeCloseTo(1, 2);
  });

  it('automático conserva la regla de siempre', () => {
    const { parcela, escala } = generarCuadricula(rombo);
    expect(escala).toMatchObject({ pedido: 'auto', subido: false });
    expect(parcela.tamanoCeldaM).toBe(10);
    expect(parcela.advertencias).toBeUndefined();
  });

  it('un tamaño pedido que cabe se usa tal cual', () => {
    for (const t of TAMANOS_CELDA_M) {
      const { parcela, escala } = generarCuadricula(rombo, { tamanoCeldaM: t });
      expect(escala.ladoM).toBe(t);
      expect(parcela.tamanoCeldaM).toBe(t);
      expect(validar(parcela), JSON.stringify(validar.errors)).toBe(true);
    }
  });

  it('un tamaño que rebasa el tope se sube lo justo y avisa', () => {
    const { parcela, escala } = generarCuadricula(grande, { tamanoCeldaM: 10 });
    expect(escala.subido).toBe(true);
    expect(parcela.celdas.length).toBeLessThanOrEqual(TOPE_CELDAS);
    expect(parcela.celdas.length).toBeGreaterThan(150); // sube el lado lo justo: se queda cerca del tope, no muy por debajo
    expect(parcela.tamanoCeldaM).toBeGreaterThan(10);
    expect(parcela.advertencias?.[0]?.codigo).toBe('TAMANO_CELDA_AJUSTADO');
    expect(validar(parcela), JSON.stringify(validar.errors)).toBe(true);
  });

  it('elegirLado empieza desde la cota de área y rechaza tamaños inválidos', () => {
    let llamadas = 0;
    const r = elegirLado(1, 1000, 1000, 1e6, (l) => { llamadas++; return Math.ceil(1000 / l) ** 2; }, 1600);
    expect(r.ladoM).toBe(25);
    expect(llamadas).toBe(1);
    expect(() => elegirLado(0, 10, 10, 100, () => 1)).toThrow();
    expect(ladoAutomatico(4000, 100)).toBe(100);
  });

  it('el tope es de 200 celdas y tambien lo respeta el modo automatico, sin avisar', () => {
    expect(TOPE_CELDAS).toBe(200);
    const contar = (l: number) => Math.ceil(1000 / l) ** 2;
    const pedido = elegirLado(10, 1000, 1000, 1e6, contar);
    expect(contar(pedido.ladoM)).toBeLessThanOrEqual(200);
    expect(pedido.subido).toBe(true);
    const auto = elegirLado('auto', 1000, 1000, 1e6, contar);
    expect(contar(auto.ladoM)).toBeLessThanOrEqual(200);
    expect(auto.ladoM).toBeGreaterThan(ladoAutomatico(1000, 1000)); // el automatico solo (25 m) daria 1600 celdas
    expect(auto.subido).toBe(false);
    // Una parcela chica no se toca: 4 celdas siguen en 70.71 m como la demo.
    expect(elegirLado('auto', 100, 100, 1e4, (l) => Math.ceil(100 / l) ** 2).ladoM).toBe(ladoAutomatico(100, 100));
  });
});
