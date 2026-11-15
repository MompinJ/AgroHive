import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SelectorTamanoCelda } from './SelectorTamanoCelda';
import { claseMedia2D } from '../escena/media-2d';

it('ofrece automático y los tamaños decididos, con el tope a la vista', () => {
  const html = renderToStaticMarkup(<SelectorTamanoCelda valor="auto" onCambio={() => {}} />);
  for (const t of ['auto', '10', '20', '30', '50', '100']) expect(html).toContain(`value="${t}"`);
  expect(html).toContain('Automático');
  expect(html).toContain('200 celdas');
});

it('avisa cuando el tamaño pedido se subió para no pasar del tope', () => {
  const html = renderToStaticMarkup(<SelectorTamanoCelda valor={10} onCambio={() => {}} escala={{ pedido: 10, ladoM: 549.6, subido: true }} />);
  expect(html).toContain('Pediste 10 m: se usan 549.6 m para no pasar del tope.');
});

it('la vista 2D marca el medio cuadrado con una clase por orientación', () => {
  expect(claseMedia2D('completa')).toBe('');
  expect(claseMedia2D('SO')).toBe(' parcela2d-media parcela2d-media-so');
  expect(claseMedia2D('NE')).toContain('parcela2d-media-ne');
});
