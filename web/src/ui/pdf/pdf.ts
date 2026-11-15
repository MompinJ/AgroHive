// Generador minimo de PDF, sin dependencias: texto con las fuentes estandar de PDF (Helvetica y Helvetica-Bold, sin incrustar),
// acentos del espanol (codificacion WinAnsi), parrafos con salto de linea, tablas, barras y paginacion con pie en cada pagina.
// No comprime el contenido: los resumenes son cortos y asi el archivo es facil de revisar. Puro: devuelve los bytes.

export type Color = readonly [number, number, number];
const A4 = { ancho: 595.28, alto: 841.89 };
const MARGEN = 48;
const PIE_Y = 26;
export const VERDE: Color = [0.122, 0.302, 0.22];
export const TINTA: Color = [0.11, 0.17, 0.13];
export const GRIS: Color = [0.38, 0.42, 0.39];
const GRIS_CLARO: Color = [0.93, 0.95, 0.93];

// ---- Codificacion: de texto a bytes WinAnsi (cp1252); lo que no existe se sustituye, nunca se pierde en silencio

const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b,
  0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98, 0x2122: 0x99,
  0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0x9f,
};
const SUSTITUTOS: Record<string, string> = { '≈': '~', '→': '->', '←': '<-', '−': '-', '≤': '<=', '≥': '>=', ' ': ' ', '\t': ' ', '\n': ' ' };

/** Bytes WinAnsi de un texto. Un caracter sin equivalente sale como "?". */
export function aWinAnsi(texto: string): number[] {
  const salida: number[] = [];
  for (const ch of texto) {
    const sust = SUSTITUTOS[ch];
    if (sust !== undefined) { salida.push(...aWinAnsi(sust)); continue; }
    const c = ch.codePointAt(0)!;
    if (c >= 0x20 && c < 0x7f) salida.push(c);
    else if (c >= 0xa0 && c <= 0xff) salida.push(c);
    else if (CP1252[c] !== undefined) salida.push(CP1252[c]!);
    else salida.push(0x3f);
  }
  return salida;
}
const comoCadena = (texto: string) => aWinAnsi(texto).map((b) => String.fromCharCode(b)).join('');
const escapar = (cadena: string) => cadena.replace(/[\\()]/g, (m) => `\\${m}`);

// ---- Anchos de Helvetica (milesimas de em), ASCII 32 a 126

const REGULAR = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const NEGRITA = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975,
  722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333,
  556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
const SIMBOLOS: Record<string, number> = { '×': 584, '°': 400, '²': 333, '³': 333, '·': 278, '¿': 611, '¡': 333, '—': 1000, '–': 556, '•': 350, '…': 1000, '‘': 222, '’': 222, '“': 333, '”': 333, '«': 556, '»': 556, '€': 556, '%': 889 };

/** Ancho aproximado del texto en puntos. Las letras con acento miden lo mismo que su letra base. */
export function anchoTexto(texto: string, tam: number, negrita = false): number {
  const tabla = negrita ? NEGRITA : REGULAR;
  let u = 0;
  for (const ch of texto) {
    const c = ch.codePointAt(0)!;
    if (c >= 32 && c < 127) { u += tabla[c - 32]!; continue; }
    const s = SIMBOLOS[ch];
    if (s !== undefined) { u += s; continue; }
    const base = ch.normalize('NFD')[0]!;
    const cb = base.codePointAt(0)!;
    u += cb >= 32 && cb < 127 ? tabla[cb - 32]! : 556;
  }
  return (u / 1000) * tam;
}

/** Parte un texto en lineas que no pasan de `maximo` puntos; una palabra mas larga que la linea se corta. */
export function partirLineas(texto: string, maximo: number, tam: number, negrita = false): string[] {
  const salida: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (anchoTexto(prueba, tam, negrita) <= maximo) { linea = prueba; continue; }
      if (linea) { salida.push(linea); linea = ''; }
      let resto = palabra;
      while (anchoTexto(resto, tam, negrita) > maximo && resto.length > 1) {
        let n = resto.length - 1;
        while (n > 1 && anchoTexto(resto.slice(0, n), tam, negrita) > maximo) n -= 1;
        salida.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      linea = resto;
    }
    salida.push(linea);
  }
  return salida;
}

// ---- Documento

interface Pagina { ops: string[] }
const num = (n: number) => (Math.round(n * 100) / 100).toString();
const rgb = (c: Color) => c.map((x) => num(Math.max(0, Math.min(1, x)))).join(' ');

export interface OpcionesTexto { tam?: number; negrita?: boolean; color?: Color; sangria?: number; interlinea?: number; despues?: number }
export interface ColumnaTabla { titulo: string; ancho: number }

export class DocumentoPdf {
  private paginas: Pagina[] = [{ ops: [] }];
  private y = A4.alto - MARGEN;
  readonly anchoUtil = A4.ancho - 2 * MARGEN;

  constructor(private readonly opciones: { titulo: string; pie: string; fecha?: Date }) {}

  private get pagina(): Pagina { return this.paginas[this.paginas.length - 1]!; }
  numeroDePaginas() { return this.paginas.length; }
  private nuevaPagina() { this.paginas.push({ ops: [] }); this.y = A4.alto - MARGEN; }
  /** Si lo que sigue no cabe, empieza otra pagina. */
  private asegurar(alto: number) { if (this.y - alto < MARGEN + 12) this.nuevaPagina(); }
  salto() { this.nuevaPagina(); }
  espacio(n: number) { this.y -= n; }

  private texto(s: string, x: number, y: number, tam: number, negrita: boolean, color: Color) {
    this.pagina.ops.push(`BT /${negrita ? 'F2' : 'F1'} ${num(tam)} Tf ${rgb(color)} rg 1 0 0 1 ${num(x)} ${num(y)} Tm (${escapar(comoCadena(s))}) Tj ET`);
  }
  private rect(x: number, y: number, w: number, h: number, color: Color) { this.pagina.ops.push(`${rgb(color)} rg ${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`); }
  private linea(x1: number, y1: number, x2: number, y2: number, color: Color, grosor = 0.6) { this.pagina.ops.push(`${rgb(color)} RG ${num(grosor)} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`); }

  /** Banda de titulo de la primera pagina. */
  banda(titulo: string, subtitulo: string) {
    const alto = 78;
    this.rect(0, A4.alto - alto, A4.ancho, alto, VERDE);
    this.texto(titulo, MARGEN, A4.alto - 36, 20, true, [1, 1, 1]);
    this.texto(subtitulo, MARGEN, A4.alto - 58, 10, false, [0.88, 0.94, 0.9]);
    this.y = A4.alto - alto - 26;
  }

  titulo(s: string) {
    this.asegurar(34);
    this.y -= 6;
    this.texto(s, MARGEN, this.y - 12, 13, true, VERDE);
    this.linea(MARGEN, this.y - 18, MARGEN + this.anchoUtil, this.y - 18, [0.72, 0.8, 0.74], 0.8);
    this.y -= 28;
  }

  parrafo(s: string, o: OpcionesTexto = {}) {
    const tam = o.tam ?? 10;
    const paso = tam * (o.interlinea ?? 1.38);
    const sangria = o.sangria ?? 0;
    const lineas = partirLineas(s, this.anchoUtil - sangria, tam, o.negrita ?? false);
    for (const l of lineas) {
      this.asegurar(paso);
      this.y -= paso;
      this.texto(l, MARGEN + sangria, this.y + tam * 0.28, tam, o.negrita ?? false, o.color ?? TINTA);
    }
    this.y -= o.despues ?? 4;
  }

  lista(items: readonly string[], o: OpcionesTexto = {}) {
    const tam = o.tam ?? 10;
    const paso = tam * 1.38;
    for (const it of items) {
      const lineas = partirLineas(it, this.anchoUtil - 14, tam);
      lineas.forEach((l, k) => {
        this.asegurar(paso);
        this.y -= paso;
        if (k === 0) this.texto('•', MARGEN + 2, this.y + tam * 0.28, tam, true, VERDE);
        this.texto(l, MARGEN + 14, this.y + tam * 0.28, tam, false, o.color ?? TINTA);
      });
      this.y -= 2;
    }
    this.y -= 2;
  }

  /** Tabla con encabezado que se repite en cada pagina. Cada celda hace salto de linea; la fila no se parte entre paginas. */
  tabla(columnas: readonly ColumnaTabla[], filas: readonly (readonly string[])[], o: { tam?: number } = {}) {
    const tam = o.tam ?? 9;
    const paso = tam * 1.32;
    const pad = 4;
    const total = columnas.reduce((s, c) => s + c.ancho, 0);
    const escala = this.anchoUtil / total;
    const anchos = columnas.map((c) => c.ancho * escala);
    const encabezado = () => {
      this.asegurar(paso + 2 * pad + 8);
      this.rect(MARGEN, this.y - paso - 2 * pad + 2, this.anchoUtil, paso + 2 * pad, GRIS_CLARO);
      let x = MARGEN;
      columnas.forEach((c, k) => { this.texto(c.titulo, x + pad, this.y - paso + 1, tam, true, VERDE); x += anchos[k]!; });
      this.y -= paso + 2 * pad;
    };
    encabezado();
    for (const fila of filas) {
      const celdas = fila.map((t, k) => partirLineas(t, anchos[k]! - 2 * pad, tam));
      const alto = Math.max(...celdas.map((l) => l.length)) * paso + 2 * pad;
      if (this.y - alto < MARGEN + 12) { this.nuevaPagina(); encabezado(); }
      let x = MARGEN;
      celdas.forEach((lineas, k) => { lineas.forEach((l, i) => this.texto(l, x + pad, this.y - pad - paso * (i + 1) + paso * 0.28 + 1, tam, false, TINTA)); x += anchos[k]!; });
      this.y -= alto;
      this.linea(MARGEN, this.y, MARGEN + this.anchoUtil, this.y, [0.84, 0.88, 0.85]);
    }
    this.y -= 8;
  }

  /** Barras horizontales: una por dato, todas a la misma escala (`maximo`). `valor` null = sin dato (no se dibuja barra). */
  barras(datos: readonly { etiqueta: string; valor: number | null; texto: string; color?: Color }[], maximo: number) {
    const etiquetaAncho = 92;
    const barraAncho = this.anchoUtil - etiquetaAncho - 86;
    const alto = 13;
    for (const d of datos) {
      this.asegurar(alto + 6);
      this.y -= alto + 4;
      this.texto(d.etiqueta, MARGEN, this.y + 3, 9, false, TINTA);
      this.rect(MARGEN + etiquetaAncho, this.y, barraAncho, alto - 2, GRIS_CLARO);
      if (d.valor != null && maximo > 0) this.rect(MARGEN + etiquetaAncho, this.y, Math.max(2, Math.min(1, d.valor / maximo) * barraAncho), alto - 2, d.color ?? VERDE);
      this.texto(d.texto, MARGEN + etiquetaAncho + barraAncho + 8, this.y + 3, 9, true, TINTA);
    }
    this.y -= 6;
  }

  /** Arma los bytes del archivo (con el pie y el numero de pagina en cada pagina). */
  generar(): Uint8Array {
    const total = this.paginas.length;
    const fecha = this.opciones.fecha ?? new Date();
    const conPie = this.paginas.map((p, i) => {
      const ops = [...p.ops];
      ops.push(`${rgb([0.7, 0.75, 0.71])} RG 0.5 w ${MARGEN} ${PIE_Y + 12} m ${num(A4.ancho - MARGEN)} ${PIE_Y + 12} l S`);
      ops.push(`BT /F1 7.5 Tf ${rgb(GRIS)} rg 1 0 0 1 ${MARGEN} ${PIE_Y} Tm (${escapar(comoCadena(this.opciones.pie))}) Tj ET`);
      const pagina = `Página ${i + 1} de ${total}`;
      ops.push(`BT /F1 7.5 Tf ${rgb(GRIS)} rg 1 0 0 1 ${num(A4.ancho - MARGEN - anchoTexto(pagina, 7.5))} ${PIE_Y} Tm (${escapar(comoCadena(pagina))}) Tj ET`);
      return ops.join('\n');
    });

    const trozos: Uint8Array[] = [];
    const offsets: number[] = [];
    let pos = 0;
    const escribir = (s: string) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff; trozos.push(b); pos += b.length; };
    const objeto = (n: number, cuerpo: string) => { offsets[n] = pos; escribir(`${n} 0 obj\n${cuerpo}\nendobj\n`); };

    escribir('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    const hijos = conPie.map((_, i) => `${6 + 2 * i} 0 R`).join(' ');
    objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objeto(2, `<< /Type /Pages /Kids [${hijos}] /Count ${total} >>`);
    objeto(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objeto(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const dos = (n: number) => String(n).padStart(2, '0');
    const sello = `D:${fecha.getUTCFullYear()}${dos(fecha.getUTCMonth() + 1)}${dos(fecha.getUTCDate())}${dos(fecha.getUTCHours())}${dos(fecha.getUTCMinutes())}${dos(fecha.getUTCSeconds())}Z`;
    objeto(5, `<< /Title (${escapar(comoCadena(this.opciones.titulo))}) /Creator (AgroHive) /Producer (AgroHive) /CreationDate (${sello}) >>`);
    conPie.forEach((contenido, i) => {
      const nPagina = 6 + 2 * i;
      objeto(nPagina, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(A4.ancho)} ${num(A4.alto)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${nPagina + 1} 0 R >>`);
      objeto(nPagina + 1, `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`);
    });
    const nObjetos = 6 + 2 * total;
    const inicioXref = pos;
    escribir(`xref\n0 ${nObjetos}\n0000000000 65535 f \n`);
    for (let n = 1; n < nObjetos; n++) escribir(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
    escribir(`trailer\n<< /Size ${nObjetos} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`);

    const salida = new Uint8Array(pos);
    let o = 0;
    for (const t of trozos) { salida.set(t, o); o += t.length; }
    return salida;
  }
}
