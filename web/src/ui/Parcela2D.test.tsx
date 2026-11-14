import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { Parcela, ResultadoCeldas } from '../../../contratos/tipos/contratos';
import parcelaEjemplo from '../../../contratos/ejemplos/parcela.ejemplo.json';
import resultadoEjemplo from '../../../contratos/ejemplos/resultado-celda.ejemplo.json';
import { Parcela2D } from './Parcela2D';

it('representa las celdas del contrato, conserva huecos y explica el dato original sin WebGL', () => {
  const parcela = structuredClone(parcelaEjemplo) as Parcela;
  const resultado = structuredClone(resultadoEjemplo) as ResultadoCeldas;
  // Una sola celda permite comprobar la ficha inicial sin depender del orden de selección.
  parcela.celdas = [parcela.celdas[0]];
  parcela.celdas[0].elevacionM = null;
  resultado.registros = [{ ...resultado.registros[0]!, celdaId: parcela.celdas[0].id,
    estado: 'NO_EVALUABLE', motivo: 'Falta el parámetro verificado de prueba',
    humedad: null, deficitMm: null, excesoMm: null, riesgoErosion: null }];
  const html = renderToStaticMarkup(<Parcela2D parcela={parcela} resultado={resultado} fecha={resultado.registros[0]!.fecha} />);
  expect(html).toContain('Falta el parámetro verificado de prueba');
  expect(html).toContain('NO_EVALUABLE');
  expect(html).toContain('Elevacion no obtenida');
  expect(html).toContain('aria-pressed="true"');
  expect(html).not.toContain('<canvas');
  expect(html).not.toContain('Relieve exagerado');
});

it('no presenta registros de otra parcela como valores de esta', () => {
  const resultado = { ...resultadoEjemplo, parcelaId: 'otra-parcela' } as ResultadoCeldas;
  const html = renderToStaticMarkup(<Parcela2D parcela={parcelaEjemplo as Parcela} resultado={resultado} />);
  expect(html).toContain('Sin resultado');
  expect(html).toContain('no entregó resultado');
});

it('mantiene las 1600 celdas y orienta al norte una cuadrícula cuyo índice crece hacia el norte', () => {
  const parcela = structuredClone(parcelaEjemplo) as Parcela;
  const base = parcela.celdas[0]!;
  parcela.celdas = Array.from({ length: 1600 }, (_, n) => {
    const i = Math.floor(n / 40), j = n % 40;
    return { ...base, id: `prueba-${i}-${j}`, i, j, centro: [-95 + j / 1000, 18 + i / 1000] };
  }) as Parcela['celdas'];
  const html = renderToStaticMarkup(<Parcela2D parcela={parcela} resultado={null} />);
  expect(html.match(/class="parcela2d-celda"/g)).toHaveLength(1600);
  expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  expect(html.indexOf('aria-label="Celda prueba-39-0,')).toBeLessThan(html.indexOf('aria-label="Celda prueba-0-0,'));
  expect(html).toContain('grid-column:40;grid-row:40');
});
