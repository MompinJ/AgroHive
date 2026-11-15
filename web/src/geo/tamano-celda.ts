// Tamano de celda que elige el usuario (control de escala, [DECIDIDO] Mompin 14/11 noche).
// Puro. "Automatico" conserva la regla de siempre (lado >= 10 m y como mucho 40 x 40 en la
// caja envolvente); un tamano pedido se respeta mientras la cuadricula no pase del tope de
// 200 celdas (decision del equipo 15/11: la escena se traba con muchas; el contrato parcela
// admite hasta 1600, doc 08). Si lo rebasa, el lado se sube lo justo y se avisa. El modo
// automatico tambien respeta el tope: sube el lado sin avisar, porque no hubo un tamano pedido.

/** Tope de celdas que genera la interfaz (decision del equipo, 15/11). */
export const TOPE_CELDAS = 200;
/** Maximo del contrato parcela (maxItems; doc 08): lo que la escena acepta dibujar si viene de otra fuente. */
export const TOPE_CELDAS_CONTRATO = 1600;
/** Lado minimo de la regla automatica, en m (unos 9 m por pixel del DEM de Terrarium z14). */
export const LADO_MINIMO_AUTO_M = 10;
/** Tamanos que ofrece el selector, en m `[DECIDIDO]` (Mompin). */
export const TAMANOS_CELDA_M = [10, 20, 30, 50, 100] as const;

/** 'auto' o un lado en metros. */
export type PedidoTamano = 'auto' | number;

export interface EscalaCelda {
  pedido: PedidoTamano;
  /** Lado que se usa, en m. */
  ladoM: number;
  /** true si el lado pedido se subio para no pasar del tope. */
  subido: boolean;
}

/** Regla automatica de siempre (web/src/ui/cuadricula.ts antes de este cambio). */
export function ladoAutomatico(anchoM: number, altoM: number): number {
  return Math.max(LADO_MINIMO_AUTO_M, anchoM / 40, altoM / 40);
}

/** Filas y columnas de la caja envolvente para un lado. En automatico, como mucho 40. */
export function dimensiones(anchoM: number, altoM: number, ladoM: number, automatico: boolean) {
  const n = (m: number) => Math.max(1, Math.ceil(m / ladoM));
  return automatico
    ? { filas: Math.min(40, n(altoM)), columnas: Math.min(40, n(anchoM)) }
    : { filas: n(altoM), columnas: n(anchoM) };
}

/**
 * Lado final para el pedido. `contar(lado)` devuelve cuantas celdas tocan el contorno con
 * ese lado. El area del contorno da una cota: con menos de area / tope m2 por celda, el
 * tope se rebasa seguro, asi que se empieza desde ahi y no se recorre una cuadricula enorme.
 * El lado se redondea hacia arriba a 0.1 m.
 */
export function elegirLado(
  pedido: PedidoTamano,
  anchoM: number,
  altoM: number,
  areaM2: number,
  contar: (ladoM: number) => number,
  tope = TOPE_CELDAS,
): EscalaCelda {
  const auto = ladoAutomatico(anchoM, altoM);
  if (pedido !== 'auto' && !(Number.isFinite(pedido) && pedido > 0)) throw new RangeError('El tamano de celda debe ser un numero de metros mayor que cero.');
  const redondear = (l: number) => Math.ceil(l * 10 - 1e-9) / 10;
  const base = pedido === 'auto' ? auto : pedido;
  let lado = Math.max(base, redondear(Math.sqrt(areaM2 / tope)));
  for (let intento = 0; intento < 40; intento++) {
    const n = contar(lado);
    if (n <= tope) return { pedido, ladoM: lado, subido: pedido === 'auto' ? false : lado > pedido };
    lado = redondear(Math.max(lado * Math.sqrt(n / tope) * 1.002, lado + 0.1));
  }
  // No deberia pasar: el lado crece hasta caber en el tope.
  return { pedido, ladoM: Math.max(auto, base), subido: pedido !== 'auto' && Math.max(auto, base) > pedido };
}
