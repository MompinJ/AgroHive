import { describe, expect, it } from 'vitest';
import {
  diferenciaColor,
  labDeLineal,
  MATRICES_DICROMACIA,
  rgbLinealVisto,
  VISTAS_COLOR,
  type TipoDaltonismo,
} from '../daltonismo';
import { ESTILO_SIN_ELEVACION, ESTILOS_ESTADO, ORDEN_ESTADOS } from '../estilos-estado';
import { mascaraIcono, mascaraPatron, type Mascara } from '../patrones';

const TIPOS: TipoDaltonismo[] = ['protanopia', 'deuteranopia', 'tritanopia'];

/** Umbrales del equipo `[PROPUESTA]` (A3.3); no son valores de una norma. */
const DE_MIN_ESTADOS = 15; // dE*ab minimo entre dos estados, en cualquier vista
const PIXELES_MIN_ICONOS = 16; // de 64
const PIXELES_MIN_PATRONES = 48; // de 256

const diferentes = (a: Mascara, b: Mascara): number => a.pixeles.reduce((s, v, k) => s + (v !== b.pixeles[k] ? 1 : 0), 0);

describe('simulacion de daltonismo (Machado, Oliveira y Fernandes, 2009, Tabla 1, severidad 1.0)', () => {
  for (const tipo of TIPOS) {
    it(`${tipo}: cada fila de la matriz suma 1 (el blanco y los grises se conservan)`, () => {
      for (const fila of MATRICES_DICROMACIA[tipo]) expect(fila[0] + fila[1] + fila[2]).toBeCloseTo(1, 5);
    });

    it(`${tipo}: negro, gris y blanco no cambian`, () => {
      for (const gris of ['#000000', '#808080', '#ffffff']) {
        const normal = rgbLinealVisto(gris, 'normal');
        const visto = rgbLinealVisto(gris, tipo);
        for (let k = 0; k < 3; k++) expect(visto[k]!).toBeCloseTo(normal[k]!, 5);
      }
    });
  }

  it('rojo puro bajo protanopia: es la primera columna de la matriz, con el negativo recortado a 0', () => {
    const [r, g, b] = rgbLinealVisto('#ff0000', 'protanopia');
    expect(r).toBeCloseTo(0.152286, 6);
    expect(g).toBeCloseTo(0.114503, 6);
    expect(b).toBe(0);
  });

  it('CIELAB: blanco L* = 100 y negro L* = 0; dE entre ambos = 100', () => {
    expect(labDeLineal([1, 1, 1])[0]).toBeCloseTo(100, 3);
    expect(labDeLineal([0, 0, 0])[0]).toBeCloseTo(0, 6);
    expect(diferenciaColor('#000000', '#ffffff')).toBeCloseTo(100, 3);
  });

  it('un color contra si mismo no tiene diferencia', () => {
    for (const vista of VISTAS_COLOR) expect(diferenciaColor('#cc79a7', '#cc79a7', vista)).toBe(0);
  });
});

describe('los estados se distinguen sin depender del color (A3.3)', () => {
  const estilos = [
    ...ORDEN_ESTADOS.map((e) => [e, ESTILOS_ESTADO[e]] as const),
    ['sin_elevacion', ESTILO_SIN_ELEVACION] as const,
  ];

  for (const vista of VISTAS_COLOR) {
    it(`visto con ${vista === 'normal' ? 'vision normal' : vista}: ningun par de estados baja de dE ${DE_MIN_ESTADOS}`, () => {
      for (let a = 0; a < estilos.length; a++) {
        for (let b = a + 1; b < estilos.length; b++) {
          const [na, ea] = estilos[a]!;
          const [nb, eb] = estilos[b]!;
          // Sin elevacion repite a NO_EVALUABLE a proposito (mismo color, patron e icono: ambos son "hueco").
          if (na === 'NO_EVALUABLE' && nb === 'sin_elevacion') continue;
          expect(diferenciaColor(ea.color, eb.color, vista), `${na} / ${nb}`).toBeGreaterThanOrEqual(DE_MIN_ESTADOS);
        }
      }
    });
  }

  it(`los iconos de dos estados difieren en al menos ${PIXELES_MIN_ICONOS} de 64 pixeles`, () => {
    const m = ORDEN_ESTADOS.map((e) => [e, mascaraIcono(ESTILOS_ESTADO[e].icono)] as const);
    for (let a = 0; a < m.length; a++) {
      for (let b = a + 1; b < m.length; b++) {
        expect(diferentes(m[a]![1], m[b]![1]), `${m[a]![0]} / ${m[b]![0]}`).toBeGreaterThanOrEqual(PIXELES_MIN_ICONOS);
      }
    }
  });

  it(`los patrones de dos estados difieren en al menos ${PIXELES_MIN_PATRONES} de 256 pixeles`, () => {
    const m = ORDEN_ESTADOS.map((e) => [e, mascaraPatron(ESTILOS_ESTADO[e].patron)] as const);
    for (let a = 0; a < m.length; a++) {
      for (let b = a + 1; b < m.length; b++) {
        expect(diferentes(m[a]![1], m[b]![1]), `${m[a]![0]} / ${m[b]![0]}`).toBeGreaterThanOrEqual(PIXELES_MIN_PATRONES);
      }
    }
  });
});
