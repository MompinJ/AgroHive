// A4.1 (parte del motor): series del balance de agua para el dashboard (contrato serie-balance, propuesto). Un documento
// por rotacion y escenario, bajo demanda: columnas diarias alineadas por ciclo y sumas por mes. La interfaz solo
// grafica; nada se recalcula fuera del motor. Fechas del plan (como resultado-celda); fechaClima y mesClima dicen el dia
// y el mes del anio real del escenario.
import { sinNumeros } from './estados';
import { sumarDias } from './fechas';
import { fao56 } from './fuentes';
import type { ResultadoMotor } from './motor';
import { VERSION_CONTRATO, type Escenario, type SerieBalance } from './tipos';

const UNIDADES: SerieBalance['unidades'] = {
  lluviaMm: 'mm/dia',
  et0Mm: 'mm/dia',
  etcMm: 'mm/dia',
  etcAjMm: 'mm/dia',
  drMm: 'mm',
  rawMm: 'mm',
  humedad: 'fraccion de TAW (0 a 1)',
  percolacionMm: 'mm/dia',
  deficitMm: 'mm/dia',
};
const FUENTE_BALANCE = fao56('Capitulo 8: balance de agua de la zona de raices (ec. 80 a 88)', 'https://www.fao.org/4/x0490e/x0490e0e.htm');
const r2 = (x: number) => Math.round(x * 100) / 100;
const r3 = (x: number) => Math.round(x * 1000) / 1000;
const vacias = (): SerieBalance['ciclos'][number]['dias'] => ({
  lluviaMm: [],
  et0Mm: [],
  etcMm: [],
  etcAjMm: [],
  drMm: [],
  rawMm: [],
  humedad: [],
  percolacionMm: [],
  deficitMm: [],
});

/** Serie del balance de una rotacion en un escenario; null si el escenario no tiene anio real (sin clima). */
export function serieBalance(res: ResultadoMotor, escenario: Escenario): SerieBalance | null {
  const sim = res.simulaciones[escenario];
  if (sim.anioReal === null) return null;
  // Celdas por (ciclo, cultivo): con porCelda un ciclo puede tener varias series.
  const celdas = new Map<string, { ciclo: number; cultivo: string; siembra: string; celdas: string[] }>();
  for (const [celda, ciclos] of res.ciclosPorCelda) {
    for (const c of ciclos) {
      const k = `${c.ciclo}|${c.cultivo}`;
      const prev = celdas.get(k) ?? { ciclo: c.ciclo, cultivo: c.cultivo, siembra: c.siembra, celdas: [] };
      prev.celdas.push(celda);
      celdas.set(k, prev);
    }
  }
  const ciclos: SerieBalance['ciclos'] = [...celdas.entries()]
    .sort(([, a], [, b]) => a.ciclo - b.ciclo || (a.cultivo < b.cultivo ? -1 : 1))
    .map(([k, c]) => {
      const sc = sim.ciclos.get(k);
      const b = sc?.balance;
      if (!sc || !b || !sc.siembraClima) {
        const estado = sim.estado === 'ERROR_DATOS' ? ('ERROR_DATOS' as const) : ('NO_EVALUABLE' as const);
        return {
          ciclo: c.ciclo,
          cultivo: c.cultivo,
          celdas: c.celdas,
          estado,
          motivo: sc?.motivo ?? sim.motivo ?? 'Ciclo sin simular.',
          desde: c.siembra,
          fechaClima: null,
          tawMm: null,
          dias: vacias(),
          mensual: [],
        };
      }
      const dias = vacias();
      b.dias.forEach((d, i) => {
        dias.lluviaMm.push(r2(sc.lluviaMm[i] ?? 0));
        dias.et0Mm.push(r2(sc.et0Mm[i] ?? 0));
        dias.etcMm.push(r2(d.etcMm));
        dias.etcAjMm.push(r2(d.etcAjMm));
        dias.drMm.push(r2(d.drMm));
        dias.rawMm.push(r2(d.rawMm));
        dias.humedad.push(r3(d.humedad));
        dias.percolacionMm.push(r2(d.percolacionMm));
        dias.deficitMm.push(r2(d.deficitMm));
      });
      // Sumas por mes del plan (el mes del clima va al lado).
      const meses = new Map<string, { mesClima: string; n: number; ll: number; et0: number; etc: number; aj: number; dp: number; def: number; hum: number }>();
      b.dias.forEach((d, i) => {
        const mes = sumarDias(c.siembra, i).slice(0, 7);
        const m = meses.get(mes) ?? { mesClima: sumarDias(sc.siembraClima as string, i).slice(0, 7), n: 0, ll: 0, et0: 0, etc: 0, aj: 0, dp: 0, def: 0, hum: 0 };
        m.n++;
        m.ll += sc.lluviaMm[i] ?? 0;
        m.et0 += sc.et0Mm[i] ?? 0;
        m.etc += d.etcMm;
        m.aj += d.etcAjMm;
        m.dp += d.percolacionMm;
        m.def += d.deficitMm;
        m.hum += d.humedad;
        meses.set(mes, m);
      });
      const ciclo: SerieBalance['ciclos'][number] = {
        ciclo: c.ciclo,
        cultivo: c.cultivo,
        celdas: c.celdas,
        estado: sc.estado,
        desde: c.siembra,
        fechaClima: sc.siembraClima,
        tawMm: r2(b.tawMm),
        dias,
        mensual: [...meses.entries()].map(([mes, m]) => ({
          mes,
          mesClima: m.mesClima,
          dias: m.n,
          lluviaMm: r2(m.ll),
          et0Mm: r2(m.et0),
          etcMm: r2(m.etc),
          etcAjMm: r2(m.aj),
          percolacionMm: r2(m.dp),
          deficitMm: r2(m.def),
          humedadMedia: r3(m.hum / m.n),
        })),
      };
      if (sc.estado !== 'EVALUABLE') ciclo.motivo = sc.motivo ?? (sim.clima?.respaldo ? 'Clima de respaldo (no es NASA POWER).' : `Clima del escenario en ${sc.estado}.`);
      return ciclo;
    });
  const doc: SerieBalance = {
    meta: res.esEjemplo
      ? { versionContrato: VERSION_CONTRATO, esEjemplo: true, aviso: 'Calculado con entradas de ejemplo o sinteticas: no son datos reales.' }
      : { versionContrato: VERSION_CONTRATO, esEjemplo: false },
    rotacionId: res.plan.rotacionId,
    escenario,
    anioReal: sim.anioReal,
    estado: sim.estado,
    unidades: UNIDADES,
    fuentes: sim.clima ? [sim.clima.fuente, FUENTE_BALANCE] : [FUENTE_BALANCE],
    ciclos,
    advertencias: [
      {
        codigo: 'FECHAS_DEL_PLAN',
        mensaje: `Las fechas son las del plan; el clima de cada ciclo es el de su temporada en el anio agricola ${sim.anioReal} (fechaClima y mesClima).`,
        severidad: 'info',
      },
    ],
  };
  if (sinNumeros(sim.estado) || sim.estado !== 'EVALUABLE') doc.motivo = sim.motivo ?? (sim.clima?.respaldo ? 'Clima de respaldo (no es NASA POWER).' : `Escenario en ${sim.estado}.`);
  return doc;
}
