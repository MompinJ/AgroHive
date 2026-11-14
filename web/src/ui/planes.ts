import type { CalendarioLocal, Ciclo, Fuente, Parcela, PlanSiembra } from '../../../contratos/tipos/contratos';
import calendarioJson from '../../../datos/catalogos/calendario-isla.json';
import version from '../../../contratos/package.json';
import { dentroDeVentana } from '../motor/pilares';

export const calendarioIsla = calendarioJson as CalendarioLocal;
export const nombresCultivos: Record<string, string> = { maiz: 'Maíz', frijol: 'Frijol', calabaza: 'Calabaza', chile: 'Chile' };
export function referenciaSiembra(cultivo: string, temporada: Ciclo['temporada'], calendario: CalendarioLocal | null) {
  return calendario?.entradas.find((e) => e.cultivo === cultivo && e.temporada === temporada && e.regimen === 'temporal');
}
export function explicarFecha(c: Pick<Ciclo, 'cultivo' | 'temporada'>, calendario: CalendarioLocal | null): { texto: string; fuente?: Fuente } {
  const e = referenciaSiembra(c.cultivo, c.temporada, calendario);
  if (!e || e.ventana.estado !== 'EVALUABLE') return { texto: 'Sin calendario local con ventana evaluable para este cultivo y temporada.' };
  const v = e.ventana;
  return { texto: `Referencia para ${calendario!.ubicacion.municipio}, ${c.temporada}: ${v.desdeDia ?? 1}/${v.desdeMes} a ${v.hastaDia ?? 'fin'}/${v.hastaMes}. Requiere validación local.`, fuente: v.fuente };
}
export function armarPlan(id: string, parcela: Parcela, ciclos: Ciclo[], calendario: CalendarioLocal | null): PlanSiembra {
  return {
    meta: { versionContrato: version.version, esEjemplo: false }, rotacionId: id, parcelaId: parcela.id,
    asignacionClima: 'temporada_tipica', porCelda: null,
    calendarioLocal: calendario ? { calendarioId: calendario.id } : { sinCalendarioLocal: true, motivo: 'No hay calendario verificado para el municipio de esta parcela.' },
    ciclos: ciclos.map((c) => {
      const ventana = referenciaSiembra(c.cultivo, c.temporada, calendario)?.ventana;
      return { ...c, porQue: `Fecha elegida en el selector. ${explicarFecha(c, calendario).texto}`, dentroDeVentana: ventana?.estado === 'EVALUABLE' ? dentroDeVentana(c.siembra, ventana) : null };
    }) as PlanSiembra['ciclos'],
  };
}
export function planesIniciales(parcela: Parcela, calendario: CalendarioLocal | null): PlanSiembra[] {
  const definiciones: Record<string, [string, string, Ciclo['temporada']][]> = {
    R1: [['maiz', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI'], ['maiz', '2027-06-15', 'PV']],
    R2: [['maiz', '2026-06-15', 'PV'], ['maiz', '2027-06-15', 'PV']],
    R3: [['frijol', '2026-06-15', 'PV'], ['frijol', '2026-11-01', 'OI']],
    R4: [['maiz', '2026-06-01', 'PV'], ['frijol', '2026-10-10', 'OI'], ['maiz', '2027-06-01', 'PV']],
  };
  return Object.entries(definiciones).map(([id, lista]) => armarPlan(id, parcela, lista.map(([cultivo, siembra, temporada], i) => ({ ciclo: i + 1, cultivo, siembra, temporada, porQue: 'Plan de demostración editable, no recomendación.' })), calendario));
}
