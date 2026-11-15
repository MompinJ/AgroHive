// Leyenda de escala: cuanto equivale una celda en el terreno real. Pura; solo formatea el lado de la
// celda (parcela.tamanoCeldaM), no calcula nada agronomico. Las celdas del borde pueden estar cortadas
// por el contorno (fraccionDentro < 1), asi que la leyenda habla de la celda completa.

export interface DescripcionCelda {
  /** Lado, por ejemplo "70.7 m". */
  lado: string;
  /** Superficie de la celda completa, por ejemplo "0.50 ha" o "400 m²". */
  superficie: string;
  /** Frase lista para mostrar. */
  texto: string;
}

const numero = (n: number, decimales: number) => n.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export function describirCelda(ladoM: number): DescripcionCelda | null {
  if (!Number.isFinite(ladoM) || ladoM <= 0) return null;
  const lado = `${numero(ladoM, ladoM >= 100 ? 0 : 1)} m`;
  const m2 = ladoM * ladoM;
  const superficie = m2 >= 2500 ? `${numero(m2 / 10000, 2)} ha` : `${numero(Math.round(m2), 0)} m²`;
  return { lado, superficie, texto: `1 celda = ${lado} × ${lado} (≈ ${superficie})` };
}

/** Cuantas celdas completas caben en una hectarea, para que el numero tenga referencia. */
export function celdasPorHectarea(ladoM: number): number | null {
  return Number.isFinite(ladoM) && ladoM > 0 ? 10000 / (ladoM * ladoM) : null;
}
