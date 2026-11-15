// Texto de Esquilote con iconos: {brocha} se dibuja con el mismo icono de la barra de herramientas. Puro.
// Un nombre que no existe se deja como texto (sin llaves perdidas ni iconos inventados).

export const NOMBRES_ICONO = ['brocha', 'goma', 'mover', 'insecticida', 'bicho', 'escudo', 'deshacer', 'rehacer', 'cubeta', 'calendario'] as const;
export type NombreIcono = (typeof NOMBRES_ICONO)[number];
export type ParteTexto = { tipo: 'texto'; valor: string } | { tipo: 'icono'; nombre: NombreIcono };

const esIcono = (x: string): x is NombreIcono => (NOMBRES_ICONO as readonly string[]).includes(x);

export function partes(texto: string): ParteTexto[] {
  const salida: ParteTexto[] = [];
  let resto = texto;
  for (;;) {
    const m = /\{([a-z]+)\}/.exec(resto);
    if (!m) break;
    const nombre = m[1]!;
    if (m.index > 0) salida.push({ tipo: 'texto', valor: resto.slice(0, m.index) });
    if (esIcono(nombre)) salida.push({ tipo: 'icono', nombre });
    else salida.push({ tipo: 'texto', valor: m[0] });
    resto = resto.slice(m.index + m[0].length);
  }
  if (resto) salida.push({ tipo: 'texto', valor: resto });
  // Une los trozos de texto contiguos (un token desconocido queda pegado a su vecino).
  return salida.reduce<ParteTexto[]>((acc, p) => {
    const ultimo = acc.at(-1);
    if (p.tipo === 'texto' && ultimo?.tipo === 'texto') ultimo.valor += p.valor;
    else acc.push(p.tipo === 'texto' ? { ...p } : p);
    return acc;
  }, []);
}

/** Caracteres que se "escriben": cada icono cuenta como uno. */
export const largo = (ps: readonly ParteTexto[]): number => ps.reduce((n, p) => n + (p.tipo === 'icono' ? 1 : p.valor.length), 0);

/** Las primeras `n` posiciones; un icono aparece entero o no aparece. */
export function recortar(ps: readonly ParteTexto[], n: number): ParteTexto[] {
  const salida: ParteTexto[] = [];
  let falta = Math.max(0, n);
  for (const p of ps) {
    if (falta <= 0) break;
    if (p.tipo === 'icono') { salida.push(p); falta -= 1; continue; }
    salida.push({ tipo: 'texto', valor: p.valor.slice(0, falta) });
    falta -= p.valor.length;
  }
  return salida;
}

/** Texto plano (sin iconos), para leerlo en voz alta y para las pruebas. */
export const textoPlano = (texto: string): string => partes(texto).map((p) => (p.tipo === 'texto' ? p.valor : '')).join('').replace(/\s{2,}/g, ' ').replace(/\s+([.,;:)])/g, '$1').trim();
