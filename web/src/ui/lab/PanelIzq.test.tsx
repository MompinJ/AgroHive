import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { PanelIzq } from './PanelIzq';
import { fijarPanelPlegado, panelPlegado } from './panelColapsable';

afterEach(() => fijarPanelPlegado(false));

describe('panel izquierdo plegable', () => {
  it('abierto muestra el contenido y un boton para ocultarlo', () => {
    const html = renderToStaticMarkup(<PanelIzq etiqueta="Cultivos"><p>contenido</p></PanelIzq>);
    expect(html).toContain('contenido');
    expect(html).toContain('aria-label="Ocultar el panel"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).not.toContain('panel-izq-oculto');
  });
  it('plegado se desliza fuera (sigue en el DOM para poder animarse), oculto para lectores y sin foco, y muestra una pestana', () => {
    fijarPanelPlegado(true);
    const html = renderToStaticMarkup(<PanelIzq etiqueta="Escenarios"><p>contenido</p></PanelIzq>);
    expect(html).toContain('panel-izq-oculto');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('inert');
    expect(html).toContain('panel-pestana-visible');
    expect(html).toContain('Escenarios');
  });
  it('el estado es uno solo para los dos paneles', () => {
    expect(panelPlegado()).toBe(false);
    fijarPanelPlegado(true);
    expect(panelPlegado()).toBe(true);
    expect(renderToStaticMarkup(<PanelIzq etiqueta="Cultivos"><i /></PanelIzq>)).toContain('panel-izq-oculto');
  });
});
