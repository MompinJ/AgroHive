// Entradas de la vista previa con el motor real (web/src/motor/) y el paquete de
// demo sin internet (datos/demo/respuestas/, A2.4). Solo arma entradas: el
// calculo lo hace el motor y la escena solo lo representa.
// - Parcela: la de contratos/ejemplos (poligono ficticio de 2 ha, por eso sigue
//   marcada como ejemplo) con la elevacion y pendiente reales de terreno.json.
// - Suelo: el del mapa (suelo.json, su TAW hoy es NO_EVALUABLE hasta A2.16) o el
//   selector manual de respaldo "franco", declarado SUPUESTO (doc 04, igual que
//   la evidencia de C2 en web/src/motor/pruebas/c2.test.ts).
// - Plan: R1 milpa de prueba (maiz PV, frijol OI, maiz PV), sin calendario local.

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

export function planPrueba(parcelaId: string): PlanSiembra {
  const ciclos: [string, string, 'PV' | 'OI'][] = [
    ['maiz', '2016-06-15', 'PV'],
    ['frijol', '2016-11-01', 'OI'],
    ['maiz', '2017-06-15', 'PV'],
  ];
  return {
    meta: { versionContrato: '0.6.0', esEjemplo: true, aviso: 'Plan de prueba de la vista previa de la escena; no es una recomendacion.' },
    rotacionId: 'R1',
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
export function entradasDemo(modo: ModoSuelo): Omit<EntradasMotor, 'escenarios'> {
  const parcela = parcelaConTerrenoDemo();
  return {
    plan: planPrueba(parcela.id),
    parcela,
    suelo: modo === 'mapa' ? (sueloDemo as unknown as Suelo) : SUELO_MANUAL_FRANCO,
    tablaSuelos: tabla as unknown as TablaSuelos,
    catalogo: catalogo as unknown as CatalogoCultivos,
  };
}

/** Fechas del plan para recorrer la rotacion (cada 15 dias, del 1 de junio de 2016 al 31 de diciembre de 2017). */
export function fechasPlan(): string[] {
  const fechas: string[] = [];
  const inicio = Date.UTC(2016, 5, 1);
  const fin = Date.UTC(2017, 11, 31);
  for (let t = inicio; t <= fin; t += 15 * 86400000) fechas.push(new Date(t).toISOString().slice(0, 10));
  return fechas;
}
