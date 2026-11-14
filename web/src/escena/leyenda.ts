// Leyenda de la escena (base de A3.3): siempre visible, con texto y no solo
// color. Pura: devuelve las entradas y la componente que la pinte (escena o
// modo 2D) solo las muestra. Cuenta celdas por estado tal como las entrego el
// motor; no calcula indicadores.

import { ESTILO_SIN_ELEVACION, ESTILOS_ESTADO, ORDEN_ESTADOS, type EstiloEstado } from './estilos-estado';
import type { EscenaModelo, EstadoVisual } from './modelo';

export interface EntradaLeyenda extends EstiloEstado {
  clave: EstadoVisual | 'sin_elevacion';
  celdas: number;
  /** Frase completa para lectores de pantalla y para quien no distingue colores. */
  textoAccesible: string;
}

const celdasTexto = (n: number) => `${n} ${n === 1 ? 'celda' : 'celdas'}`;

/**
 * Entradas en orden fijo. Por defecto solo los estados presentes; con
 * `todas: true` se listan todos (util para una leyenda fija en pantalla).
 * Si hay celdas sin elevacion, se agrega su entrada al final.
 */
export function entradasLeyenda(modelo: EscenaModelo, opciones: { todas?: boolean } = {}): EntradaLeyenda[] {
  const conteo = new Map<EstadoVisual, number>();
  for (const b of modelo.bloques) conteo.set(b.estadoVisual, (conteo.get(b.estadoVisual) ?? 0) + 1);
  const entradas: EntradaLeyenda[] = ORDEN_ESTADOS.filter((e) => opciones.todas || conteo.has(e)).map((clave) => {
    const estilo = ESTILOS_ESTADO[clave];
    const celdas = conteo.get(clave) ?? 0;
    return {
      ...estilo,
      clave,
      celdas,
      textoAccesible: `${estilo.etiqueta}: ${estilo.descripcionPatron}. ${estilo.descripcion} ${celdasTexto(celdas)}.`,
    };
  });
  const sinElevacion = modelo.bloques.filter((b) => b.relieve.tipo === 'sin_elevacion').length;
  if (sinElevacion > 0 || opciones.todas) {
    entradas.push({
      ...ESTILO_SIN_ELEVACION,
      clave: 'sin_elevacion',
      celdas: sinElevacion,
      textoAccesible: `${ESTILO_SIN_ELEVACION.etiqueta}: ${ESTILO_SIN_ELEVACION.descripcionPatron}. ${ESTILO_SIN_ELEVACION.descripcion} ${celdasTexto(sinElevacion)}.`,
    });
  }
  return entradas;
}

/**
 * Descripcion textual de un bloque para tooltip o lector de pantalla (base de
 * A3.8). Solo repite lo que entrega el motor; lo nulo se dice NO_EVALUABLE.
 */
export function describirBloque(b: EscenaModelo['bloques'][number]): string {
  const estilo = ESTILOS_ESTADO[b.estadoVisual];
  const partes = [`Celda ${b.celdaId}`, `estado ${estilo.etiqueta}`];
  partes.push(b.cultivo ? `cultivo ${b.cultivo}` : 'sin cultivo');
  if (b.etapa) partes.push(`etapa ${b.etapa.replace('_', ' ')}`);
  partes.push(b.relieve.tipo === 'medido' ? `elevacion ${b.relieve.elevacionM} m` : 'elevacion NO_EVALUABLE');
  partes.push(b.pendientePct === null ? 'pendiente NO_EVALUABLE' : `pendiente ${b.pendientePct} %`);
  if (b.noRecomendadoEnLugar) partes.push('cultivo no recomendado en el lugar');
  if (b.motivo) partes.push(b.motivo.replace(/\.+$/, ''));
  return partes.join(', ') + '.';
}
