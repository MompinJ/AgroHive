import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { diccionarios, traducir } from './diccionarios';
import { guardarIdioma, leerIdioma } from './preferencia';
import { ProveedorIdioma } from './Idioma';
import { SelectorIdioma } from './SelectorIdioma';
import { Inicio } from '../../paginas/Inicio';
import { BarraPasos } from '../BarraPasos';

describe('B7: idioma de la interfaz', () => {
  it('da prioridad a la eleccion guardada y descarta valores desconocidos', () => {
    expect(leerIdioma({ getItem: () => 'en' }, 'es-MX')).toBe('en');
    expect(leerIdioma({ getItem: () => 'fr' }, 'en-GB')).toBe('en');
    expect(leerIdioma({ getItem: () => null }, 'fr')).toBe('es');
  });
  it('funciona cuando el navegador impide acceder al almacenamiento', () => {
    expect(leerIdioma({ getItem: () => { throw new Error('denegado'); } }, 'en-US')).toBe('en');
    expect(() => guardarIdioma('en', { setItem: () => { throw new Error('lleno'); } })).not.toThrow();
  });
  it('persiste solo la preferencia, sin tocar datos del proyecto', () => {
    const escrituras: string[][] = [];
    guardarIdioma('en', { setItem: (k, v) => { escrituras.push([k, v]); } });
    expect(escrituras).toEqual([['agrohive-idioma', 'en']]);
  });
  it('tiene las mismas claves en ambos idiomas e interpola etiquetas', () => {
    expect(Object.keys(diccionarios.en).sort()).toEqual(Object.keys(diccionarios.es).sort());
    expect(traducir('en', 'pasos.descripcion', { actual: 2, total: 4, nombre: 'Crops' })).toBe('Step 2 of 4: Crops');
    expect(traducir('en', 'estado.NO_EVALUABLE')).toBe('Not evaluable');
  });
  it('renderiza dos banderas con nombre accesible en su idioma y marca la elegida', () => {
    const html = renderToStaticMarkup(<ProveedorIdioma idiomaInicial="en"><SelectorIdioma /></ProveedorIdioma>);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('Language'); // nombre del grupo, solo para lectores de pantalla
    expect(html).toContain('aria-label="Español"');
    expect(html).toContain('aria-label="English"');
    expect(html).toContain('lang="es"');
    expect(html).toContain('lang="en"');
    expect(html).toMatch(/<button[^>]*lang="en"[^>]*aria-checked="true"|<button[^>]*aria-checked="true"[^>]*lang="en"/);
    expect(html).toMatch(/<button[^>]*lang="es"[^>]*aria-checked="false"|<button[^>]*aria-checked="false"[^>]*lang="es"/);
    expect((html.match(/<svg/g) ?? []).length).toBe(2); // una bandera por idioma
    expect(html).not.toContain('<select');
  });
  it('traduce Inicio y la navegacion sin cambiar destinos ni desbloquear pasos', () => {
    const html = renderToStaticMarkup(<ProveedorIdioma idiomaInicial="en"><Inicio /><BarraPasos path="/terreno" progreso={0} /></ProveedorIdioma>);
    expect(html).toContain('Every cycle opens');
    expect(html).toContain('Draw a plot');
    expect(html).toContain('Methods and sources');
    expect(html).toContain('Step 2 of 4: Crops, locked until the previous step is complete');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('href="#/terreno?modo=poligono"');
  });
});
