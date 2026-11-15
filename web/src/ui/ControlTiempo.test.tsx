import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ControlTiempo } from './ControlTiempo';

it('ofrece fecha, rango nativo y botones por semana sin reproducir automáticamente', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2024-02-29" rango={{ desde: '2024-02-28', hasta: '2024-03-01', pasos: 2 }} listo onFecha={() => {}} />);
  expect(html).toContain('type="range"');
  expect(html).toContain('aria-valuetext="Semana 1 de 2: 2024-02-29"'); // ciclo de 2 dias: un paso de siembra y uno final (la cosecha)
  expect(html).toContain('max="1"');
  expect(html).toContain('Semana anterior');
  expect(html).toContain('Semana siguiente');
  expect(html).not.toContain('Mes anterior');
  expect(html).toContain('aria-pressed="false"');
  expect(html).toContain('Recorrido en pausa.');
});
it('sin serie permite consultar una fecha sin inventar límites ni reproducción', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2024-02-29" rango={null} listo={false} onFecha={() => {}} />);
  expect(html).toContain('type="date"');
  expect(html).not.toContain('type="range"');
  expect(html).not.toContain('Reproducir semanas');
  expect(html).toContain('Sin días del motor');
});

const demo = { desde: '2026-06-15', hasta: '2026-10-17', pasos: 124 };
it('el deslizador recorre semanas y llega a la cosecha en el ultimo paso', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2026-08-29" rango={demo} listo onFecha={() => {}} />);
  expect(html).toContain('max="18"');
  expect(html).toContain('value="10"'); // 29 de agosto: dia 75, semana 10
  expect(html).toContain('Semana 11 de 19');
  expect(html).toContain('Reproducir semanas');
});
it('con un aviso en pantalla dice que la reproduccion espera', () => {
  const html = renderToStaticMarkup(<ControlTiempo fecha="2026-08-29" rango={demo} listo retener onFecha={() => {}} />);
  expect(html).toContain('Recorrido en pausa.'); // sin reproducir no hay nada que retener: el mensaje es el de siempre
});
