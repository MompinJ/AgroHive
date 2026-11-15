import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PanelHistorial } from './PanelHistorial';
import type { Hecho } from './historial';

const hechos: Hecho[] = [
  { id: 1, tipo: 'siembra', cuando: Date.UTC(2026, 10, 15, 18, 0), celdas: 4, sujeto: 'Frijol', ciclo: 2 },
  { id: 2, tipo: 'cosecha', cuando: Date.UTC(2026, 10, 15, 18, 5), titulo: 'Maíz se cosecha el 17 de octubre de 2026', detalle: 'Se cosechan 4 celdas', fechaSim: '2026-10-17' },
  { id: 3, tipo: 'plaga', cuando: Date.UTC(2026, 10, 15, 18, 6), titulo: 'Chapulín de la milpa se está comiendo tu maíz', fechaSim: '2026-08-16' },
];

describe('panel del historial de hechos', () => {
  it('cerrado solo muestra el boton con cuantos hechos hay', () => {
    const html = renderToStaticMarkup(<PanelHistorial hechos={hechos} onBorrar={() => {}} />);
    expect(html).toContain('Historial');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="3 hechos"');
    expect(html).not.toContain('class="historial"');
  });
  it('sin hechos no muestra numero y, abierto, explica que pasara', () => {
    const html = renderToStaticMarkup(<PanelHistorial hechos={[]} onBorrar={() => {}} abiertoInicial />);
    expect(html).not.toContain('boton-historial-cuenta');
    expect(html).toContain('Aún no hay hechos');
    expect(html).not.toContain('Borrar historial');
  });
  it('abierto lista del mas reciente al mas viejo, con tipo, texto y la fecha de la simulacion', () => {
    const html = renderToStaticMarkup(<PanelHistorial hechos={hechos} onBorrar={() => {}} abiertoInicial />);
    expect(html.indexOf('Chapulín de la milpa')).toBeLessThan(html.indexOf('Maíz se cosecha'));
    expect(html.indexOf('Maíz se cosecha')).toBeLessThan(html.indexOf('Sembraste Frijol en 4 celdas (ciclo 2)'));
    expect(html).toContain('En la simulación: 17 de octubre de 2026');
    expect(html).toContain('En la simulación: 16 de agosto de 2026');
    expect(html).toContain('Se cosechan 4 celdas');
    expect(html).toContain('Borrar historial');
    expect(html).toContain('aria-expanded="true"');
  });
  it('una siembra del usuario no inventa fecha de simulacion', () => {
    const html = renderToStaticMarkup(<PanelHistorial hechos={[hechos[0]!]} onBorrar={() => {}} abiertoInicial />);
    expect(html).not.toContain('En la simulación');
  });
});
