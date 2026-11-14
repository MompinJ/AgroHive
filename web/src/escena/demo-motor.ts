// Entradas de la vista previa con el motor real (web/src/motor/) y el paquete de
// demo sin internet (datos/demo/respuestas/, A2.4). Solo arma entradas: el
// calculo lo hace el motor y la escena solo lo representa.
// - Parcela: la de contratos/ejemplos (poligono ficticio de 2 ha, por eso sigue
//   marcada como ejemplo) con la elevacion y pendiente reales de terreno.json.
// - Suelo: el del mapa (suelo.json, TAW por Saxton y Rawls 2006, A2.16) o el
//   selector manual de respaldo "franco", declarado SUPUESTO (doc 04, igual que
//   la evidencia de C2 en web/src/motor/pruebas/c2.test.ts).
// - Plan de prueba sin calendario local: R1 milpa (maiz PV, frijol OI, maiz PV) o
//   R2 (calabaza PV, frijol OI, maiz PV). Sin calendario, el motor no marca la
//   calabaza como no registrada en Isla: es solo para ver los tres modelos.

import parcelaEjemplo from '../../../contratos/ejemplos/parcela.ejemplo.json';
import catalogo from '../../../datos/catalogos/cultivos.json';
import tabla from '../../../datos/catalogos/suelos.json';
import sueloDemo from '../../../datos/demo/respuestas/suelo.json';
import terrenoDemo from '../../../datos/demo/respuestas/terreno.json';
import type {
  Advertencia,
  CatalogoCultivos,
  Fuente,
  Parcela,
  PlanSiembra,
  Suelo,
  TablaSuelos,
} from '../../../contratos/tipos/contratos';
import type { EntradasMotor } from '../motor/motor';

export type ModoSuelo = 'mapa' | 'manual_franco';

interface TerrenoRespuesta {
  terreno: { estado: Parcela['terreno']['estado']; fuente: Fuente };
  celdas: { id: string; elevacionM: number | null; pendientePct: number | null }[];
  advertencias?: Advertencia[];
}

/** Parcela de ejemplo con el terreno real del paquete de demo (POST /api/elevacion). */
export function parcelaConTerrenoDemo(): Parcela {
  const parcela = structuredClone(parcelaEjemplo) as unknown as Parcela;
  const terreno = terrenoDemo as unknown as TerrenoRespuesta;
  for (const c of parcela.celdas) {
    const t = terreno.celdas.find((x) => x.id === c.id);
    // Celda que el terreno no trae: hueco, no se conserva la elevacion ficticia del ejemplo.
    c.elevacionM = t ? t.elevacionM : null;
    c.pendientePct = t ? t.pendientePct : null;
  }
  parcela.terreno = terreno.terreno;
  parcela.meta = {
    ...parcela.meta,
    esEjemplo: true,
    aviso:
      'Parcela ficticia de 2 ha (poligono de ejemplo, coordenadas ilustrativas en Isla, Veracruz) con elevacion real de Terrarium y plan de prueba. No es una parcela medida.',
  };
  parcela.advertencias = terreno.advertencias ?? [];
  return parcela;
}

export const SUELO_MANUAL_FRANCO: Suelo = {
  meta: { versionContrato: '0.6.0', esEjemplo: false },
  id: 'manual-franco',
  etiqueta: 'SUPUESTO',
  origen: 'selector_manual',
  aviso: 'Tipo de suelo elegido en el selector manual (franco); no es una medicion de la parcela.',
  textura: { estado: 'EVALUABLE', etiqueta: 'SUPUESTO', clase: null, grupo: 'franco' },
  ph: { estado: 'NO_EVALUABLE', motivo: 'Selector manual: sin pH.' },
};

export type RotacionPrueba = 'R1' | 'R2';

/** R1: milpa (maiz, frijol, maiz). R2: calabaza, frijol, maiz, para ver los tres cultivos. */
export const ROTACIONES_PRUEBA: Record<RotacionPrueba, [string, string, 'PV' | 'OI'][]> = {
  R1: [
    ['maiz', '2016-06-15', 'PV'],
    ['frijol', '2016-11-01', 'OI'],
    ['maiz', '2017-06-15', 'PV'],
  ],
  R2: [
    ['calabaza', '2016-06-15', 'PV'],
    ['frijol', '2016-11-01', 'OI'],
    ['maiz', '2017-06-15', 'PV'],
  ],
};

export function planPrueba(parcelaId: string, rotacion: RotacionPrueba = 'R1'): PlanSiembra {
  const ciclos = ROTACIONES_PRUEBA[rotacion];
  return {
    meta: { versionContrato: '0.6.0', esEjemplo: true, aviso: 'Plan de prueba de la vista previa de la escena; no es una recomendacion.' },
    rotacionId: rotacion,
    parcelaId,
    calendarioLocal: { sinCalendarioLocal: true, motivo: 'Calendario de Isla pendiente (A0.6).' },
    asignacionClima: 'temporada_tipica',
    ciclos: ciclos.map(([cultivo, siembra, temporada], i) => ({
      ciclo: i + 1,
      cultivo,
      siembra,
      temporada,
      porQue: 'Fecha de prueba de la vista previa.',
    })) as PlanSiembra['ciclos'],
    porCelda: null,
  };
}

/** Entradas del motor sin los escenarios (los da `escenarios(serie)` del cliente del motor). */
export function entradasDemo(modo: ModoSuelo, rotacion: RotacionPrueba = 'R1'): Omit<EntradasMotor, 'escenarios'> {
  const parcela = parcelaConTerrenoDemo();
  return {
    plan: planPrueba(parcela.id, rotacion),
    parcela,
    suelo: modo === 'mapa' ? (sueloDemo as unknown as Suelo) : SUELO_MANUAL_FRANCO,
    tablaSuelos: tabla as unknown as TablaSuelos,
    catalogo: catalogo as unknown as CatalogoCultivos,
  };
}

/** Fechas del plan para recorrer la rotacion (cada 15 dias, del 1 de junio de 2016 al 31 de diciembre de 2017, mas los dias de siembra). */
export function fechasPlan(): string[] {
  const fechas: string[] = [];
  const inicio = Date.UTC(2016, 5, 1);
  const fin = Date.UTC(2017, 11, 31);
  for (let t = inicio; t <= fin; t += 15 * 86400000) fechas.push(new Date(t).toISOString().slice(0, 10));
  // Tambien los dias de siembra de las rotaciones de prueba (etapa siembra visible).
  for (const ciclos of Object.values(ROTACIONES_PRUEBA)) for (const [, siembra] of ciclos) fechas.push(siembra);
  return [...new Set(fechas)].sort();
}

/**
 * PRUEBA DE CARGA, no son datos: la parcela de ejemplo partida en el tope de
 * 1600 celdas (40 x 40) con un relieve sintetico suave, solo para medir el
 * rendimiento de la escena y del motor (A5.4). Va marcada como ejemplo y con
 * el terreno EXPLORATORIO; nunca se usa en la demo.
 */
export function parcelaCargaSintetica(lado = 40): Parcela {
  const base = parcelaConTerrenoDemo();
  const ladoM = Math.sqrt((base.areaHa * 10000) / (lado * lado));
  const [lon0, lat0] = base.centroide;
  const celdas = [] as unknown as Parcela['celdas'];
  for (let i = 0; i < lado; i++) {
    for (let j = 0; j < lado; j++) {
      celdas.push({
        id: `c-${i}-${j}`,
        i,
        j,
        centro: [lon0 + (j - lado / 2) * 0.00003, lat0 - (i - lado / 2) * 0.00003],
        fraccionDentro: 1,
        elevacionM: Math.round((62 + Math.sin(i / 6) + Math.cos(j / 7)) * 10) / 10,
        pendientePct: null,
      });
    }
  }
  return {
    ...base,
    id: 'parcela-prueba-carga',
    nombre: 'Prueba de carga (sintetica)',
    tamanoCeldaM: Math.round(ladoM * 100) / 100,
    celdas,
    terreno: {
      estado: 'EXPLORATORIO',
      fuente: { nombre: 'SINTETICO - prueba de carga, no es terreno real', nota: 'Relieve generado para medir rendimiento.' },
    },
    meta: {
      ...base.meta,
      esEjemplo: true,
      aviso: `PRUEBA DE CARGA, NO SON DATOS: ${lado * lado} celdas con relieve sintetico para medir rendimiento. No es una parcela ni un terreno real.`,
    },
    advertencias: [],
  };
}

export function entradasCarga(modo: ModoSuelo): Omit<EntradasMotor, 'escenarios'> {
  const parcela = parcelaCargaSintetica();
  return { ...entradasDemo(modo), parcela, plan: planPrueba(parcela.id) };
}

/**
 * Vista previa con la cuadricula de balam (web/src/ui/cuadricula.ts, A2.9): un
 * poligono en L de 4.8 ha (518 celdas) junto a la parcela demo, con la elevacion que
 * responda POST /api/elevacion (en desarrollo, la API local con el paquete de
 * demo: VITE_API_URL). Si la API falla, las celdas quedan sin elevacion (huecos).
 */
export async function parcelaCuadriculaBalam(): Promise<{ parcela: Parcela; nota: string }> {
  const { generarCuadricula } = await import('../ui/cuadricula');
  const { obtenerTerreno } = await import('../api/cliente');
  // El mismo poligono de las revisiones de punta a punta: 4.8 ha y 518 celdas de 10 m.
  const { parcela } = generarCuadricula([[-95.526, 18.028], [-95.5236, 18.028], [-95.5236, 18.0302], [-95.5248, 18.0302], [-95.5248, 18.0292], [-95.526, 18.0292]]);
  const r = await obtenerTerreno({ tamanoCeldaM: parcela.tamanoCeldaM, celdas: parcela.celdas.map(({ id, i, j, centro }) => ({ id, i, j, centro })) });
  if (!r.ok) return { parcela, nota: `Sin elevacion: ${r.error.motivo}` };
  const alturas = new Map(r.datos.celdas.map((c) => [c.id, c]));
  return {
    nota: `Cuadricula de balam: ${parcela.celdas.length} celdas de ${parcela.tamanoCeldaM.toFixed(1)} m; elevacion de ${r.datos.terreno.fuente.nombre}.`,
    parcela: {
      ...parcela,
      id: 'parcela-cuadricula-balam',
      terreno: { estado: r.datos.terreno.estado, fuente: { nombre: r.datos.terreno.fuente.nombre } },
      celdas: parcela.celdas.map((c) => ({ ...c, elevacionM: alturas.get(c.id)?.elevacionM ?? null, pendientePct: alturas.get(c.id)?.pendientePct ?? null })) as Parcela['celdas'],
      advertencias: (r.datos.advertencias ?? []) as Advertencia[],
    },
  };
}
