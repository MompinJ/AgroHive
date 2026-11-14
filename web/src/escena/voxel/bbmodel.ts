// Lector puro de .bbmodel (Blockbench) para A3.2. Sin three: devuelve cubos con
// la referencia de color de cada cara a la paleta compartida (doc 07).
// Convenciones (doc 07, herramientas/voxelkit.py): model_format "free",
// format_version "5.0", box_uv false; 16 unidades = 1 celda; origen en el centro
// de la base, y = 0 es la superficie, +Y arriba, +Z frente; rotacion Euler ZYX
// en grados alrededor de `origin`. Cada cara apunta a un pixel de la textura
// 16x16 incrustada: el indice del pixel es el indice de color de la paleta.

export type NombreCara = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
export const CARAS: readonly NombreCara[] = ['north', 'south', 'east', 'west', 'up', 'down'];

export type Vec3 = [number, number, number];

export interface CuboVoxel {
  nombre: string;
  desde: Vec3;
  hasta: Vec3;
  origen: Vec3;
  /** Grados, se aplican en orden Euler ZYX (matriz Rz * Ry * Rx). */
  rotacion: Vec3;
  /** Indice de paleta por cara; null si la cara no tiene textura (no se dibuja). */
  caras: Record<NombreCara, number | null>;
}

export interface TexturaPaleta {
  ancho: number;
  alto: number;
  /** Data URL PNG de la textura incrustada (paleta). */
  fuente: string;
}

export interface ModeloVoxel {
  nombre: string;
  cubos: CuboVoxel[];
  textura: TexturaPaleta;
}

export class ErrorBbmodel extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorBbmodel';
  }
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function vec3(v: unknown, campo: string, cubo: string): Vec3 {
  if (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))) {
    return [v[0], v[1], v[2]] as Vec3;
  }
  throw new ErrorBbmodel(`Cubo "${cubo}": "${campo}" debe ser [x, y, z] numerico.`);
}

/**
 * Lee el JSON de un .bbmodel. Lanza ErrorBbmodel si no sigue las convenciones
 * de doc 07 (mejor fallar visible que dibujar un modelo equivocado).
 */
export function leerBbmodel(json: unknown, nombreArchivo = 'modelo'): ModeloVoxel {
  if (!esObjeto(json)) throw new ErrorBbmodel(`${nombreArchivo}: no es un objeto JSON.`);
  const meta = json['meta'];
  if (!esObjeto(meta)) throw new ErrorBbmodel(`${nombreArchivo}: falta "meta".`);
  if (meta['model_format'] !== 'free') {
    throw new ErrorBbmodel(`${nombreArchivo}: model_format "${String(meta['model_format'])}", se espera "free" (doc 07).`);
  }
  if (meta['box_uv'] === true) throw new ErrorBbmodel(`${nombreArchivo}: box_uv debe ser false (doc 07).`);
  if (typeof meta['format_version'] !== 'string' || !meta['format_version'].startsWith('5.')) {
    throw new ErrorBbmodel(`${nombreArchivo}: format_version "${String(meta['format_version'])}", se espera 5.x (doc 07).`);
  }

  const texturas = json['textures'];
  if (!Array.isArray(texturas) || texturas.length !== 1 || !esObjeto(texturas[0])) {
    throw new ErrorBbmodel(`${nombreArchivo}: se espera exactamente una textura (la paleta compartida).`);
  }
  const tex = texturas[0];
  const fuente = tex['source'];
  if (typeof fuente !== 'string' || !fuente.startsWith('data:image/png;base64,')) {
    throw new ErrorBbmodel(`${nombreArchivo}: la paleta debe ir incrustada como PNG (data URL).`);
  }
  const ancho = Number(tex['width']);
  const alto = Number(tex['height']);
  const uvAncho = Number(tex['uv_width'] ?? ancho);
  const uvAlto = Number(tex['uv_height'] ?? alto);
  if (![ancho, alto, uvAncho, uvAlto].every((n) => Number.isInteger(n) && n > 0)) {
    throw new ErrorBbmodel(`${nombreArchivo}: medidas de textura invalidas.`);
  }

  const elementos = json['elements'];
  if (!Array.isArray(elementos)) throw new ErrorBbmodel(`${nombreArchivo}: falta "elements".`);

  const cubos: CuboVoxel[] = [];
  elementos.forEach((el, k) => {
    if (!esObjeto(el)) throw new ErrorBbmodel(`${nombreArchivo}: elemento ${k} invalido.`);
    if (el['type'] !== undefined && el['type'] !== 'cube') return; // mallas u otros tipos: no se usan
    if (el['export'] === false || el['visibility'] === false) return;
    const nombre = typeof el['name'] === 'string' ? el['name'] : `cubo_${k}`;
    const desde = vec3(el['from'], 'from', nombre);
    const hasta = vec3(el['to'], 'to', nombre);
    const origen = el['origin'] === undefined ? ([0, 0, 0] as Vec3) : vec3(el['origin'], 'origin', nombre);
    const rotacion = el['rotation'] === undefined ? ([0, 0, 0] as Vec3) : vec3(el['rotation'], 'rotation', nombre);
    const caras = el['faces'];
    if (!esObjeto(caras)) throw new ErrorBbmodel(`Cubo "${nombre}": falta "faces".`);
    const indices = {} as Record<NombreCara, number | null>;
    for (const cara of CARAS) {
      const c = caras[cara];
      if (!esObjeto(c) || c['texture'] === null || c['texture'] === undefined || c['texture'] === false) {
        indices[cara] = null;
        continue;
      }
      const uv = c['uv'];
      if (!Array.isArray(uv) || uv.length !== 4 || !uv.every((n) => typeof n === 'number' && Number.isFinite(n))) {
        throw new ErrorBbmodel(`Cubo "${nombre}", cara ${cara}: uv invalido.`);
      }
      const [u0, v0, u1, v1] = uv as [number, number, number, number];
      // Pixel de la paleta: esquina minima del uv, convertida de unidades uv a pixeles.
      const px = Math.floor((Math.min(u0, u1) * ancho) / uvAncho);
      const py = Math.floor((Math.min(v0, v1) * alto) / uvAlto);
      if (px < 0 || py < 0 || px >= ancho || py >= alto) {
        throw new ErrorBbmodel(`Cubo "${nombre}", cara ${cara}: uv fuera de la paleta.`);
      }
      indices[cara] = py * ancho + px;
    }
    cubos.push({ nombre, desde, hasta, origen, rotacion, caras: indices });
  });

  const nombre = typeof json['name'] === 'string' ? json['name'] : nombreArchivo;
  return { nombre, cubos, textura: { ancho, alto, fuente } };
}
