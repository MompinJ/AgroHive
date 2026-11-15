import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EventoPantalla } from './EventoPantalla';
import { eventoCosecha, eventoPlaga } from './eventos';

const noop = () => {};
const cosecha = eventoCosecha('2026-10-17', [{ nombre: 'Maíz', celdas: 4, fecha: '2026-10-17' }], null, 'R1:1:seco');
const plaga = eventoPlaga('2026-08-16', { plaga: 'Chapulín de la milpa', cultivo: 'Maíz', bloques: 4 }, 'R1:1:seco');

describe('animacion a pantalla completa', () => {
  it('sin evento no dibuja nada', () => {
    expect(renderToStaticMarkup(<EventoPantalla evento={null} onTerminar={noop} />)).toBe('');
  });
  it('la cosecha lleva guadana, estela, briznas y el mensaje de que planta se cosecha y que dia', () => {
    const html = renderToStaticMarkup(<EventoPantalla evento={cosecha} onTerminar={noop} />);
    expect(html).toContain('evento-cosecha');
    expect(html).toContain('evento-guadana');
    expect(html).toContain('evento-estela');
    expect((html.match(/class="evento-brizna/g) ?? []).length).toBeGreaterThanOrEqual(20);
    expect(html).toContain('Maíz se cosecha el 17 de octubre de 2026');
    expect(html).not.toContain('evento-bicho');
  });
  it('la plaga lleva un enjambre y el mensaje deja claro que es una ilustracion', () => {
    const html = renderToStaticMarkup(<EventoPantalla evento={plaga} onTerminar={noop} />);
    expect(html).toContain('evento-plaga');
    expect((html.match(/class="evento-bicho"/g) ?? []).length).toBeGreaterThanOrEqual(12);
    expect(html).toContain('Chapulín de la milpa se está comiendo tu maíz');
    expect(html).toContain('Es una ilustración');
    expect(html).not.toContain('evento-guadana');
  });
  it('el aviso se anuncia a los lectores de pantalla y la animacion no', () => {
    const html = renderToStaticMarkup(<EventoPantalla evento={cosecha} onTerminar={noop} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toMatch(/class="evento-escena" aria-hidden="true"/);
  });
});
