// Ficha de un bloque (A3.8, con balam): lo que se muestra al tocar, hacer clic, pasar
// el cursor o elegir una celda con el teclado. Pura: solo repite lo que entregan la
// parcela y el motor, con sus unidades. Un valor que falta dice NO_EVALUABLE y por que;
// nunca se muestra como cero.

import { ESTILOS_ESTADO } from './estilos-estado';
import type { BloqueEscena } from './modelo';

export interface FilaFicha {
  etiqueta: string;
  valor: string;
  /** true si el valor es NO_EVALUABLE (para marcarlo distinto, no con color solo). */
  faltante?: boolean;
  nota?: string;
}

export interface Ficha {
  titulo: string;
  /** Resumen corto para el globo al pasar el cursor. */
  resumen: string;
  filas: FilaFicha[];
}

const NOMBRES_CULTIVO: Record<string, string> = {
  maiz: 'Maíz',
  frijol: 'Frijol',
  calabaza: 'Calabaza',
  chile: 'Chile',
  sorgo: 'Sorgo',
  sandia: 'Sandía',
  camote: 'Camote',
  cacahuate: 'Cacahuate',
};
const NOMBRES_ETAPA: Record<string, string> = {
  suelo_desnudo: 'Suelo desnudo',
  siembra: 'Siembra',
  brote: 'Brote',
  crecimiento: 'Crecimiento',
  madurez: 'Madurez',
};

export const nombreCultivo = (id: string) => NOMBRES_CULTIVO[id] ?? id;

const numero = (n: number, decimales: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

export function fichaBloque(b: BloqueEscena): Ficha {
  const r = b.registro;
  const estilo = ESTILOS_ESTADO[b.estadoVisual];
  // Por que falta un indicador: el motivo del registro, o que no hay registro.
  // El motivo del registro solo explica los huecos cuando todo el registro esta sin numeros.
  const sinNumeros = r && (r.estado === 'NO_EVALUABLE' || r.estado === 'ERROR_DATOS');
  const porQue = !r
    ? 'el motor no entregó resultado para esta celda'
    : sinNumeros
      ? (r.motivo ?? `registro ${r.estado}`)
      : 'el motor no lo calculó para esta fecha';
  const falta = (nota = porQue) => ({ valor: 'NO_EVALUABLE', faltante: true, nota });
  const fila = (etiqueta: string, v: number | null | undefined, formato: (n: number) => string, nota?: string): FilaFicha =>
    v === null || v === undefined || !Number.isFinite(v)
      ? { etiqueta, ...falta() }
      : { etiqueta, valor: formato(v), ...(nota ? { nota } : {}) };

  const cultivo = b.cultivo ? nombreCultivo(b.cultivo) : null;
  const filas: FilaFicha[] = [];

  filas.push({
    etiqueta: 'Estado',
    valor: estilo.etiqueta + (r && r.estado !== 'EVALUABLE' ? ` (${r.estado})` : ''),
    ...(b.motivo ? { nota: b.motivo } : {}),
  });
  filas.push({ etiqueta: 'Cultivo', valor: cultivo ?? 'Sin cultivo' });
  filas.push(
    b.etapa
      ? { etiqueta: 'Etapa', valor: NOMBRES_ETAPA[b.etapa] ?? b.etapa }
      : r
        ? { etiqueta: 'Etapa', ...falta('sin parámetros del cultivo para saber su etapa') }
        : { etiqueta: 'Etapa', ...falta() },
  );
  if (b.noRecomendadoEnLugar) {
    filas.push({
      etiqueta: 'En este lugar',
      valor: 'Cultivo no recomendado',
      ...(r?.fuenteMotivo ? { nota: `Fuente: ${r.fuenteMotivo.nombre}` } : {}),
    });
  }
  filas.push(fila('Humedad del suelo', r?.humedad, (h) => `${numero(h * 100, 0)} % del agua disponible`, 'Fracción del agua disponible para la planta (TAW).'));
  filas.push(fila('Déficit acumulado', r?.deficitMm, (x) => `${numero(x, 1)} mm`, 'Demanda del cultivo no cubierta en el ciclo hasta esta fecha.'));
  filas.push(fila('Exceso acumulado', r?.excesoMm, (x) => `${numero(x, 1)} mm`, 'Agua que escurre o drena en el ciclo hasta esta fecha.'));
  if (r && r.etcMm !== undefined) filas.push(fila('Demanda del día (ETc)', r.etcMm, (x) => `${numero(x, 1)} mm`));
  if (r && r.estresCalor !== undefined) {
    filas.push(
      r.estresCalor === null
        ? { etiqueta: 'Calor sobre el umbral', ...falta('el umbral de calor del cultivo no tiene fuente') }
        : { etiqueta: 'Calor sobre el umbral', valor: r.estresCalor ? 'Sí' : 'No' },
    );
  }
  filas.push(
    r && r.riesgoErosion === null && !sinNumeros
      ? { etiqueta: 'Riesgo de erosión', ...falta('el pilar de erosión no se calcula todavía') }
      : fila('Riesgo de erosión', r?.riesgoErosion, (x) => `${numero(x, 2)} (índice relativo de 0 a 1)`),
  );
  filas.push(
    b.pendientePct === null
      ? { etiqueta: 'Pendiente', ...falta('no se pudo calcular con la elevación disponible') }
      : { etiqueta: 'Pendiente', valor: `${numero(b.pendientePct, 1)} %` },
  );
  filas.push(
    b.relieve.tipo === 'medido'
      ? { etiqueta: 'Elevación', valor: `${numero(b.relieve.elevacionM, 1)} m` }
      : { etiqueta: 'Elevación', ...falta(b.relieve.motivo) },
  );
  if (b.fraccionDentro !== null && b.fraccionDentro < 1) {
    filas.push({ etiqueta: 'Dentro de la parcela', valor: `${numero(b.fraccionDentro * 100, 0)} % de la celda` });
  }
  if (r) filas.push({ etiqueta: 'Fecha', valor: r.fecha });

  return {
    titulo: `Celda ${b.celdaId}`,
    resumen: `${cultivo ?? 'Sin cultivo'} · ${estilo.etiqueta}${b.noRecomendadoEnLugar ? ' · no recomendado aquí' : ''}`,
    filas,
  };
}

/**
 * Bloque vecino en pantalla (flechas en la lista de celdas): dx +1 = este, dz -1 = norte,
 * como en la escena. Si no hay vecino en esa direccion, devuelve el mismo bloque.
 */
export function vecino(bloques: readonly BloqueEscena[], actual: BloqueEscena, dx: number, dz: number): BloqueEscena {
  const objetivo = bloques.find((b) => Math.abs(b.x - (actual.x + dx)) < 1e-6 && Math.abs(b.z - (actual.z + dz)) < 1e-6);
  return objetivo ?? actual;
}

/** Bloque mas cercano al centro de la parcela (primera seleccion con el teclado). */
export function bloqueCentral(bloques: readonly BloqueEscena[]): BloqueEscena | null {
  let mejor: BloqueEscena | null = null;
  for (const b of bloques) if (!mejor || b.x * b.x + b.z * b.z < mejor.x * mejor.x + mejor.z * mejor.z) mejor = b;
  return mejor;
}
