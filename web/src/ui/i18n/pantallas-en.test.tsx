// B7: en ingles no quedan textos en espanol en las pantallas de las tomas del trailer (docs/trailer-30s.md, columna EN).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProveedorIdioma } from './Idioma';
import { enEspanol } from './sin-espanol';
import { Terreno } from '../../paginas/Terreno';
import { DibujarParcela } from '../DibujarParcela';
import { SelectorTamanoCelda } from '../SelectorTamanoCelda';
import { koppenEn, mensajeCuadricula } from './textos/terreno';
import { fijarIdiomaActual } from './actual';

const en = (nodo: React.ReactNode) => renderToStaticMarkup(<ProveedorIdioma idiomaInicial="en">{nodo}</ProveedorIdioma>);
const es = (nodo: React.ReactNode) => renderToStaticMarkup(<ProveedorIdioma idiomaInicial="es">{nodo}</ProveedorIdioma>);

describe('B7, Terreno en ingles (T3a y T6g)', () => {
  it('la lista de ejemplos y el dibujo no dejan espanol', () => {
    const html = en(<Terreno polygonMode={false} onElegirEjemplo={() => {}} ejemplo={null} parcela={null} onGuardar={() => {}} />);
    expect(html).toContain('Six places around the world');
    expect(html).toContain('Mexico');
    expect(html).toContain('temperate, dry winter, hot summer climate');
    expect(html).toContain('maize');
    expect(enEspanol(html)).toEqual([]);
    expect(enEspanol(en(<DibujarParcela onGuardar={() => {}} guardada={null} />))).toEqual([]);
    expect(enEspanol(en(<SelectorTamanoCelda valor="auto" onCambio={() => {}} escala={{ pedido: 10, ladoM: 14.1, subido: true } as never} />))).toEqual([]);
  });
  it('en espanol sigue igual', () => {
    const html = es(<Terreno polygonMode={false} onElegirEjemplo={() => {}} ejemplo={null} parcela={null} onGuardar={() => {}} />);
    expect(html).toContain('Seis lugares del mundo');
    expect(html).toContain('clima templado, invierno seco y verano cálido');
    expect(enEspanol(html).length).toBeGreaterThan(5); // el detector si ve el espanol
  });
  it('Koppen y mensajes de la cuadricula', () => {
    expect(koppenEn('Aw')).toBe('tropical, savannah');
    expect(koppenEn('Dfa')).toBe('cold, no dry season, hot summer');
    fijarIdiomaActual('en');
    expect(mensajeCuadricula('Hay vértices repetidos.')).toBe('There are repeated vertices.');
    expect(mensajeCuadricula('La cuadrícula pasa de 200 celdas; elige un tamaño de celda mayor.')).toMatch(/^The grid has more than 200 cells/);
    fijarIdiomaActual('es');
    expect(mensajeCuadricula('Hay vértices repetidos.')).toBe('Hay vértices repetidos.');
  });
});
