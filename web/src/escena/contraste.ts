// Contraste de color segun WCAG 2.2 (luminancia relativa y razon de contraste).
// Se usa para elegir la "tinta" (negro o blanco) de patrones, iconos y textos
// sobre cada color de estado, y para que las pruebas verifiquen los minimos:
// 3:1 para elementos graficos (WCAG 1.4.11) y 4.5:1 para texto (WCAG 1.4.3).

export const CONTRASTE_MIN_GRAFICO = 3;
export const CONTRASTE_MIN_TEXTO = 4.5;

export const NEGRO = '#000000';
export const BLANCO = '#ffffff';

export function hexARgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Color invalido: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexARgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function razonContraste(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Negro o blanco, el que mas contraste tenga sobre `fondo`. */
export function tintaSobre(fondo: string): typeof NEGRO | typeof BLANCO {
  return razonContraste(fondo, NEGRO) >= razonContraste(fondo, BLANCO) ? NEGRO : BLANCO;
}
