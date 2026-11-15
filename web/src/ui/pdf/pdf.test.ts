import { describe, expect, it } from 'vitest';
import { anchoTexto, aWinAnsi, DocumentoPdf, partirLineas } from './pdf';

const aTexto = (b: Uint8Array) => Array.from(b, (x) => String.fromCharCode(x)).join('');
const nuevo = () => new DocumentoPdf({ titulo: 'Prueba', pie: 'Pie de prueba', fecha: new Date(Date.UTC(2026, 10, 15, 18, 30, 5)) });

describe('codificacion', () => {
  it('convierte los acentos y signos del espanol a WinAnsi', () => {
    expect(aWinAnsi('Maíz')).toEqual([77, 97, 0xed, 122]);
    expect(aWinAnsi('año ¿sí?')).toEqual([97, 0xf1, 111, 32, 0xbf, 115, 0xed, 63]);
    expect(aWinAnsi('70 °C × 2 · 3²')).toEqual([55, 48, 32, 0xb0, 67, 32, 0xd7, 32, 50, 32, 0xb7, 32, 51, 0xb2]);
    expect(aWinAnsi('—')).toEqual([0x97]); // raya, en cp1252
    expect(aWinAnsi('•')).toEqual([0x95]);
  });
  it('lo que no existe se sustituye, nunca desaparece', () => {
    expect(aWinAnsi('≈ 5')).toEqual([126, 32, 53]);
    expect(aWinAnsi('a→b')).toEqual([97, 45, 62, 98]);
    expect(aWinAnsi('x😀y')).toEqual([120, 63, 121]);
    expect(aWinAnsi('a\nb')).toEqual([97, 32, 98]);
  });
});

describe('medidas y saltos de linea', () => {
  it('mide mas ancha una m que una i, y la negrita no es mas angosta', () => {
    expect(anchoTexto('m', 10)).toBeGreaterThan(anchoTexto('i', 10));
    expect(anchoTexto('Resumen', 10, true)).toBeGreaterThanOrEqual(anchoTexto('Resumen', 10));
    expect(anchoTexto('é', 10)).toBe(anchoTexto('e', 10)); // el acento no cambia el ancho
    expect(anchoTexto('', 10)).toBe(0);
  });
  it('parte un texto largo en lineas que caben', () => {
    const texto = 'La mejor rotación no es la que más rinde en un buen año sino la que menos sufre en uno malo, según el motor.';
    const lineas = partirLineas(texto, 150, 10);
    expect(lineas.length).toBeGreaterThan(2);
    for (const l of lineas) expect(anchoTexto(l, 10)).toBeLessThanOrEqual(150 + 0.01);
    expect(lineas.join(' ')).toBe(texto); // no pierde ni cambia palabras
  });
  it('corta una palabra mas larga que la linea y respeta los saltos', () => {
    const l = partirLineas('supercalifragilisticoespialidosisimo', 60, 10);
    expect(l.length).toBeGreaterThan(1);
    expect(l.join('')).toBe('supercalifragilisticoespialidosisimo');
    expect(partirLineas('uno\ndos', 500, 10)).toEqual(['uno', 'dos']);
  });
});

describe('archivo PDF', () => {
  function documento() {
    const d = nuevo();
    d.banda('AgroHive', 'Resumen');
    d.titulo('Sección');
    d.parrafo('Maíz se cosecha el 17 de octubre de 2026 (4 celdas).');
    d.lista(['uno', 'dos con (paréntesis) y \\ barra']);
    d.tabla([{ titulo: 'Rotación', ancho: 3 }, { titulo: 'Agua', ancho: 2 }], [['Rotación 1', '7.9 mm'], ['Rotación 2', '12.4 mm']]);
    d.barras([{ etiqueta: 'Seco', valor: 25, texto: '25 mm' }, { etiqueta: 'Normal', valor: null, texto: 'sin dato' }], 50);
    return d.generar();
  }
  it('tiene la estructura de un PDF: cabecera, fin y referencia de inicio', () => {
    const t = aTexto(documento());
    expect(t.startsWith('%PDF-1.4\n')).toBe(true);
    expect(t.endsWith('%%EOF\n')).toBe(true);
    expect(/startxref\n\d+\n%%EOF\n$/.test(t)).toBe(true);
    expect(t).toContain('/BaseFont /Helvetica ');
    expect(t).toContain('/BaseFont /Helvetica-Bold');
    expect(t).toContain('/Title (Prueba)');
    expect(t).toContain('/CreationDate (D:20261115183005Z)');
  });
  it('la tabla de referencias apunta exactamente al inicio de cada objeto', () => {
    const bytes = documento();
    const t = aTexto(bytes);
    const inicio = Number(/startxref\n(\d+)\n/.exec(t)![1]);
    expect(t.slice(inicio, inicio + 4)).toBe('xref');
    const entradas = [...t.slice(inicio).matchAll(/^(\d{10}) (\d{5}) ([nf]) $/gm)];
    expect(entradas.length).toBeGreaterThan(6);
    expect(entradas[0]![3]).toBe('f');
    entradas.slice(1).forEach((e, k) => {
      const desplazamiento = Number(e[1]);
      expect(t.slice(desplazamiento, desplazamiento + `${k + 1} 0 obj`.length), `objeto ${k + 1}`).toBe(`${k + 1} 0 obj`);
    });
    expect(Number(/\/Size (\d+)/.exec(t)![1])).toBe(entradas.length);
  });
  it('el largo declarado de cada contenido es el real', () => {
    const t = aTexto(documento());
    for (const m of t.matchAll(/<< \/Length (\d+) >>\nstream\n([\s\S]*?)\nendstream/g)) expect(m[2]!.length).toBe(Number(m[1]));
  });
  it('escribe el texto con los acentos en WinAnsi y escapa parentesis y barras', () => {
    const t = aTexto(documento());
    expect(t).toContain('(Maíz se cosecha el 17 de octubre de 2026 \\(4 celdas\\).) Tj');
    expect(t).toContain('dos con \\(paréntesis\\) y \\\\ barra');
    expect(t).toContain('(Rotación 1) Tj');
  });
  it('dibuja las barras a escala y no dibuja la de un dato que falta', () => {
    const t = aTexto(documento());
    expect(t).toContain(' re f'); // rectangulos
    expect(t).toContain('(sin dato) Tj');
  });
  it('cuenta las paginas y pone el pie con "Página i de N" en cada una', () => {
    const d = nuevo();
    d.banda('AgroHive', 'Resumen');
    for (let k = 0; k < 120; k++) d.parrafo(`Hecho número ${k}: una línea de texto de prueba que ocupa espacio en la hoja.`);
    const paginas = d.numeroDePaginas();
    expect(paginas).toBeGreaterThan(2);
    const t = aTexto(d.generar());
    expect(/\/Count (\d+)/.exec(t)![1]).toBe(String(paginas));
    expect([...t.matchAll(/\/Type \/Page /g)]).toHaveLength(paginas);
    for (let i = 1; i <= paginas; i++) expect(t).toContain(`(Página ${i} de ${paginas}) Tj`);
    expect([...t.matchAll(/\(Pie de prueba\) Tj/g)]).toHaveLength(paginas);
  });
  it('repite el encabezado de la tabla al pasar de pagina y no parte una fila', () => {
    const d = nuevo();
    d.banda('AgroHive', 'x');
    const filas = Array.from({ length: 90 }, (_, k) => [`Fila ${k}`, 'una explicación un poco larga para que algunas filas ocupen dos renglones en la columna ancha de la tabla']);
    d.tabla([{ titulo: 'Nombre', ancho: 1 }, { titulo: 'Detalle', ancho: 3 }], filas);
    expect(d.numeroDePaginas()).toBeGreaterThan(1);
    const t = aTexto(d.generar());
    expect([...t.matchAll(/\(Nombre\) Tj/g)]).toHaveLength(d.numeroDePaginas());
    for (let k = 0; k < 90; k++) expect(t).toContain(`(Fila ${k}) Tj`); // ninguna fila se pierde
  });
  it('un documento vacio sigue siendo valido', () => {
    const t = aTexto(nuevo().generar());
    expect(t).toContain('/Count 1');
    expect(t.endsWith('%%EOF\n')).toBe(true);
  });
});
