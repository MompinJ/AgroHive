import { describe, expect, it } from 'vitest';
import parcelaEjemplo from '../../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import type { Parcela, ResultadoCeldas } from '../../../../contratos/tipos/contratos';
import { construirEscena } from '../adaptador';
import { CONTRASTE_MIN_TEXTO, hexARgb, razonContraste, tintaSobre } from '../contraste';
import { LADO_PLACA, rgbaPlaca } from '../placa';
import { colorSuelo, SUELO_HUMEDO, SUELO_SECO, SUELO_SIN_HUMEDAD } from '../suelo';
import { ESTILO_SIN_ELEVACION, ESTILOS_ESTADO, ORDEN_ESTADOS } from '../estilos-estado';
import { describirBloque, entradasLeyenda } from '../leyenda';
import { mascaraIcono, mascaraPatron, mascarasIguales } from '../patrones';

const estilos = ORDEN_ESTADOS.map((e) => [e, ESTILOS_ESTADO[e]] as const);

describe('contraste (WCAG 2.2)', () => {
  it('valores de referencia', () => {
    expect(razonContraste('#000000', '#ffffff')).toBeCloseTo(21, 6);
    expect(razonContraste('#777777', '#777777')).toBeCloseTo(1, 6);
    expect(tintaSobre('#000000')).toBe('#ffffff');
    expect(tintaSobre('#ffffff')).toBe('#000000');
  });

  for (const [estado, estilo] of [...estilos, ['sin_elevacion', ESTILO_SIN_ELEVACION] as const]) {
    it(`${estado}: la tinta de patron, icono y texto llega a 4.5:1 sobre su color`, () => {
      expect(razonContraste(estilo.tinta, estilo.color)).toBeGreaterThanOrEqual(CONTRASTE_MIN_TEXTO);
    });
  }
});

describe('no depender solo del color', () => {
  it('cada estado tiene un patron propio', () => {
    const patrones = estilos.map(([, e]) => e.patron);
    expect(new Set(patrones).size).toBe(patrones.length);
  });

  it('cada estado tiene un icono propio', () => {
    const iconos = estilos.map(([, e]) => e.icono);
    expect(new Set(iconos).size).toBe(iconos.length);
  });

  it('las mascaras de patron son distintas entre si y solo "liso" esta vacia', () => {
    const m = estilos.map(([, e]) => mascaraPatron(e.patron));
    for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) expect(mascarasIguales(m[a]!, m[b]!)).toBe(false);
    for (const [, e] of estilos) {
      const tinta = mascaraPatron(e.patron).pixeles.reduce((s, v) => s + v, 0);
      if (e.patron === 'liso') expect(tinta).toBe(0);
      else expect(tinta).toBeGreaterThan(0);
    }
  });

  it('los patrones se repiten sin cortes al teselar (borde izquierdo = continuacion del derecho)', () => {
    for (const [, e] of estilos) {
      const { lado, pixeles } = mascaraPatron(e.patron);
      const doble = mascaraPatron(e.patron, lado * 2);
      for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
        expect(doble.pixeles[(y + lado) * lado * 2 + x + lado]).toBe(pixeles[y * lado + x]);
      }
    }
  });

  it('los iconos son de 8 x 8 y distintos entre si', () => {
    const m = estilos.map(([, e]) => mascaraIcono(e.icono));
    for (const x of m) expect(x.lado).toBe(8);
    for (let a = 0; a < m.length; a++) for (let b = a + 1; b < m.length; b++) expect(mascarasIguales(m[a]!, m[b]!)).toBe(false);
  });

  it('cada estado tiene etiqueta y descripcion de patron en texto', () => {
    for (const [, e] of estilos) {
      expect(e.etiqueta.length).toBeGreaterThan(0);
      expect(e.descripcionPatron.length).toBeGreaterThan(0);
    }
  });
});

describe('leyenda con los ejemplos de contratos', () => {
  const escena = construirEscena(structuredClone(parcelaEjemplo) as Parcela, structuredClone(resultadoEjemplo) as ResultadoCeldas);

  it('lista solo los estados presentes, en orden fijo, con su cuenta de celdas', () => {
    const e = entradasLeyenda(escena);
    expect(e.map((x) => [x.clave, x.celdas])).toEqual([
      ['normal', 1],
      ['estresada', 1],
      ['marchita', 1],
      ['NO_EVALUABLE', 1],
      ['sin_elevacion', 1],
    ]);
    expect(e[1]?.textoAccesible).toMatch(/^Estresada: puntos .* 1 celda\.$/);
  });

  it('con todas: true lista todos los estados aunque no haya celdas', () => {
    expect(entradasLeyenda(escena, { todas: true })).toHaveLength(ORDEN_ESTADOS.length + 1);
  });

  it('la descripcion de un bloque sin datos dice NO_EVALUABLE, nunca cero', () => {
    const b = escena.bloques.find((x) => x.celdaId === 'c-1-1')!;
    const t = describirBloque(b);
    expect(t).toContain('elevacion NO_EVALUABLE');
    expect(t).toContain('pendiente NO_EVALUABLE');
    expect(t).toContain('no recomendado');
    expect(t).not.toMatch(/\b0 m\b|\b0 %/);
  });
});

describe('placa de estado y color del suelo', () => {
  it('la placa usa solo el color del estado, su tinta y el opuesto de la tinta (borde)', () => {
    for (const [, e] of estilos) {
      const img = rgbaPlaca(e);
      expect(img.datos).toHaveLength(LADO_PLACA * LADO_PLACA * 4);
      const opuesto = e.tinta === '#000000' ? '#ffffff' : '#000000';
      const permitidos = new Set([hexARgb(e.color).join(','), hexARgb(e.tinta).join(','), hexARgb(opuesto).join(',')]);
      for (let k = 0; k < img.datos.length; k += 4) {
        expect(permitidos.has(`${img.datos[k]},${img.datos[k + 1]},${img.datos[k + 2]}`)).toBe(true);
      }
    }
  });

  it('la placa se distingue del suelo (3:1) con cualquier humedad, por su color o por su borde doble', () => {
    const suelos = [SUELO_SECO, SUELO_HUMEDO, SUELO_SIN_HUMEDAD, ...[0.25, 0.5, 0.75].map((h) => '#' + colorSuelo(h).map((n) => n.toString(16).padStart(2, '0')).join(''))];
    for (const [, e] of [...estilos, ['sin_elevacion', ESTILO_SIN_ELEVACION] as const]) {
      for (const suelo of suelos) {
        const mejor = Math.max(...[e.color, '#000000', '#ffffff'].map((c) => razonContraste(c, suelo)));
        expect(mejor).toBeGreaterThanOrEqual(3);
      }
      const img = rgbaPlaca(e);
      const esquina = `${img.datos[0]},${img.datos[1]},${img.datos[2]}`;
      const segundo = (LADO_PLACA + 1) * 4;
      const anillo1 = `${img.datos[segundo]},${img.datos[segundo + 1]},${img.datos[segundo + 2]}`;
      expect(new Set([esquina, anillo1])).toEqual(new Set(['0,0,0', '255,255,255']));
    }
  });

  it('las placas de estados distintos no son iguales', () => {
    const firmas = estilos.map(([, e]) => Array.from(rgbaPlaca(e).datos).join(','));
    expect(new Set(firmas).size).toBe(firmas.length);
  });

  it('el suelo sin humedad es gris fuera de la escala, no humedad media ni cero', () => {
    expect(colorSuelo(null)).toEqual(hexARgb(SUELO_SIN_HUMEDAD));
    expect(colorSuelo(0)).toEqual(hexARgb(SUELO_SECO));
    expect(colorSuelo(1)).toEqual(hexARgb(SUELO_HUMEDO));
    expect(colorSuelo(0.5)).not.toEqual(colorSuelo(null));
  });
});
