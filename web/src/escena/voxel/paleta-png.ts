// Decodifica la paleta PNG incrustada en un .bbmodel (16x16, un color por pixel,
// doc 07 y modelos/paleta.md). Sin canvas: funciona igual en el navegador, en el
// Worker y en las pruebas (Node), con DecompressionStream para el zlib del PNG.
// Soporta lo que generan voxelkit.py y Blockbench: 8 bits, RGB o RGBA, sin entrelazado.

export interface ColorPaleta {
  /** '#rrggbb' */
  hex: string;
  /** 0 a 1 */
  alfa: number;
}

const FIRMA_PNG = [137, 80, 78, 71, 13, 10, 26, 10];

function base64ABytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function inflarZlib(datos: Uint8Array): Promise<Uint8Array> {
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Devuelve los colores en orden de pixel: indice = y * ancho + x. */
export async function decodificarPaletaPng(dataUrl: string): Promise<ColorPaleta[]> {
  const coma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:image/png;base64,') || coma < 0) throw new Error('La paleta no es un PNG en data URL.');
  const bytes = base64ABytes(dataUrl.slice(coma + 1));
  if (!FIRMA_PNG.every((b, i) => bytes[i] === b)) throw new Error('Firma PNG invalida.');

  const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let ancho = 0;
  let alto = 0;
  let canales = 0;
  const idat: Uint8Array[] = [];
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const largo = vista.getUint32(pos);
    const tipo = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
    const datos = bytes.subarray(pos + 8, pos + 8 + largo);
    if (tipo === 'IHDR') {
      ancho = vista.getUint32(pos + 8);
      alto = vista.getUint32(pos + 12);
      const profundidad = datos[8];
      const tipoColor = datos[9];
      const entrelazado = datos[12];
      if (profundidad !== 8 || entrelazado !== 0 || (tipoColor !== 2 && tipoColor !== 6)) {
        throw new Error(`PNG no soportado (profundidad ${profundidad}, tipo ${tipoColor}, entrelazado ${entrelazado}).`);
      }
      canales = tipoColor === 6 ? 4 : 3;
    } else if (tipo === 'IDAT') {
      idat.push(datos);
    } else if (tipo === 'IEND') {
      break;
    }
    pos += 12 + largo;
  }
  if (!ancho || !alto || idat.length === 0) throw new Error('PNG sin IHDR o IDAT.');

  const comprimido = new Uint8Array(idat.reduce((s, d) => s + d.length, 0));
  let o = 0;
  for (const d of idat) {
    comprimido.set(d, o);
    o += d.length;
  }
  const crudo = await inflarZlib(comprimido);

  const fila = ancho * canales;
  if (crudo.length < alto * (fila + 1)) throw new Error('PNG truncado.');
  const pix = new Uint8Array(alto * fila);
  for (let y = 0; y < alto; y++) {
    const filtro = crudo[y * (fila + 1)];
    const ini = y * (fila + 1) + 1;
    for (let x = 0; x < fila; x++) {
      const v = crudo[ini + x] ?? 0;
      const a = x >= canales ? (pix[y * fila + x - canales] ?? 0) : 0;
      const b = y > 0 ? (pix[(y - 1) * fila + x] ?? 0) : 0;
      const c = x >= canales && y > 0 ? (pix[(y - 1) * fila + x - canales] ?? 0) : 0;
      let r: number;
      switch (filtro) {
        case 0: r = v; break;
        case 1: r = v + a; break;
        case 2: r = v + b; break;
        case 3: r = v + ((a + b) >> 1); break;
        case 4: r = v + paeth(a, b, c); break;
        default: throw new Error(`Filtro PNG desconocido: ${filtro}.`);
      }
      pix[y * fila + x] = r & 0xff;
    }
  }

  const colores: ColorPaleta[] = [];
  for (let k = 0; k < ancho * alto; k++) {
    const p = k * canales;
    const hex = '#' + [pix[p], pix[p + 1], pix[p + 2]].map((n) => (n ?? 0).toString(16).padStart(2, '0')).join('');
    colores.push({ hex, alfa: canales === 4 ? (pix[p + 3] ?? 255) / 255 : 1 });
  }
  return colores;
}
