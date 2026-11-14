// A2.6: balance de agua de la zona de raices por bloque (modelo de cubeta, doc 05, paso 4). FAO-56, capitulo 8.
// Por dia i, con agotamiento Dr (mm por debajo de capacidad de campo):
//   ETc = Kc x ET0                                   (ec. 58)
//   p   = p(Tabla 22) + 0.04 (5 - ETc), 0.1 <= p <= 0.8 (Tabla 22, nota sobre p)
//   TAW = tawMmPorM x Zr ; RAW = p x TAW            (ec. 82 y 83)
//   Ks  = 1 si Dr(i-1) <= RAW; si no (TAW - Dr) / ((1 - p) TAW)   (ec. 84)
//   ETc ajustada = Ks x ETc                          (ec. 80)
//   DP  = max(0, P - ETc aj. - Dr(i-1))              (ec. 88, percolacion: el exceso)
//   Dr  = Dr(i-1) - P + ETc aj. + DP                 (ec. 85, sin riego, escurrimiento ni ascenso capilar)
// La parte de la demanda no cubierta, ETc - ETc ajustada, es el deficit del dia.
// Escurrimiento RO = 0: no hay coeficiente con fuente para la pendiente de la celda (se declara; ver A3.7).
import { etapaFao, kcDia } from './cultivo';
import type { ParametrosCultivo } from './cultivo';
import type { EstadoPlanta } from './tipos';
import type { EtapaFao } from './tipos';

/** Diferencia con el punto de marchitez (TAW) por debajo de la cual el dia se muestra como marchita: la mitad de la precision mostrada (0.1 mm). */
export const TOLERANCIA_MARCHITEZ_MM = 0.05;

export interface DiaBalance {
  etcMm: number;
  etcAjMm: number;
  deficitMm: number;
  percolacionMm: number;
  drMm: number;
  rawMm: number;
  ks: number;
  /** Agua en la cubeta como fraccion de TAW (0 a 1). */
  humedad: number;
  etapa: EtapaFao;
  estadoPlanta: EstadoPlanta;
}

export interface BalanceCiclo {
  tawMm: number;
  dias: DiaBalance[];
  etcTotalMm: number;
  /** Lluvia de los dias del ciclo (mm): la base de la fraccion percolada del pilar de exceso. */
  lluviaTotalMm: number;
  deficitTotalMm: number;
  excesoTotalMm: number;
  diasDeficit: number;
  /** Dias con exceso (percolacion mayor que cero). */
  diasExceso: number;
  /** null si el cultivo no tiene etapas sensibles con fuente. */
  diasDeficitEtapasSensibles: number | null;
}

export interface EntradaBalance {
  cultivo: ParametrosCultivo;
  tawMmPorM: number;
  /** Lluvia y ET0 desde el dia de siembra, ya sin huecos (el motor no rellena faltantes). */
  lluviaMm: readonly number[];
  et0Mm: readonly number[];
  /** Agotamiento inicial Dr,i en mm. 0 = capacidad de campo (supuesto de FAO-56 cap. 8 tras lluvia intensa). */
  drInicialMm: number;
}

export function estadoPlantaDe(drMm: number, rawMm: number, tawMm: number): EstadoPlanta {
  if (drMm >= tawMm - TOLERANCIA_MARCHITEZ_MM) return 'marchita';
  if (drMm > rawMm) return 'estresada';
  return 'normal';
}

export function balanceCiclo(e: EntradaBalance): BalanceCiclo {
  const c = e.cultivo;
  const taw = e.tawMmPorM * c.zrM;
  const n = c.totalDias;
  if (e.lluviaMm.length < n || e.et0Mm.length < n) throw new Error('balanceCiclo: faltan dias de clima');
  let dr = Math.min(Math.max(0, e.drInicialMm), taw);
  const dias: DiaBalance[] = [];
  let etcTotal = 0;
  let lluviaTotal = 0;
  let deficitTotal = 0;
  let exceso = 0;
  let diasDeficit = 0;
  let diasExceso = 0;
  let diasSens = 0;
  for (let i = 1; i <= n; i++) {
    const lluvia = e.lluviaMm[i - 1] as number;
    const etc = kcDia(c, i) * (e.et0Mm[i - 1] as number);
    const p = Math.min(0.8, Math.max(0.1, c.p + 0.04 * (5 - etc)));
    const raw = p * taw;
    const ks = dr <= raw ? 1 : Math.max(0, (taw - dr) / ((1 - p) * taw));
    const etcAj = ks * etc;
    const dp = Math.max(0, lluvia - etcAj - dr);
    dr = Math.min(taw, Math.max(0, dr - lluvia + etcAj + dp));
    const deficit = etc - etcAj;
    const etapa = etapaFao(c, i);
    etcTotal += etc;
    lluviaTotal += lluvia;
    deficitTotal += deficit;
    exceso += dp;
    if (dp > 0) diasExceso++;
    if (deficit > 0) {
      diasDeficit++;
      if (c.etapasSensibles?.includes(etapa)) diasSens++;
    }
    dias.push({
      etcMm: etc,
      etcAjMm: etcAj,
      deficitMm: deficit,
      percolacionMm: dp,
      drMm: dr,
      rawMm: raw,
      ks,
      humedad: taw > 0 ? 1 - dr / taw : 0,
      etapa,
      estadoPlanta: estadoPlantaDe(dr, raw, taw),
    });
  }
  return {
    tawMm: taw,
    dias,
    etcTotalMm: etcTotal,
    lluviaTotalMm: lluviaTotal,
    deficitTotalMm: deficitTotal,
    excesoTotalMm: exceso,
    diasDeficit,
    diasExceso,
    diasDeficitEtapasSensibles: c.etapasSensibles ? diasSens : null,
  };
}
