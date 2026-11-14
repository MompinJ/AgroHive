import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ControlTiempo } from './ControlTiempo';

it('ofrece fecha, rango nativo y alternativa mensual sin reproducir automáticamente', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2024-02-29" rango={{ desde: '2024-02-28', hasta: '2024-03-01', pasos: 2 }} listo onFecha={() => {}} />);
  expect(html).toContain('type="range"');
  expect(html).toContain('aria-valuetext="2024-02-29"');
  expect(html).toContain('Mes anterior');
  expect(html).toContain('Mes siguiente');
  expect(html).toContain('aria-pressed="false"');
  expect(html).toContain('Recorrido en pausa.');
});
it('sin serie permite consultar una fecha sin inventar límites ni reproducción', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2024-02-29" rango={null} listo={false} onFecha={() => {}} />);
  expect(html).toContain('type="date"');
  expect(html).not.toContain('type="range"');
  expect(html).not.toContain('Reproducir meses');
  expect(html).toContain('Sin días del motor');
});
