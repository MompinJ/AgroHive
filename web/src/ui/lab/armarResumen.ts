// Arma los datos del resumen en PDF a partir de lo que la pantalla de Comparacion ya tiene: no calcula nada del motor.
import type { CatalogoCultivos, Escenario, Parcela, PlanSiembra, ResultadoRotacion } from '../../../../contratos/tipos/contratos';
import { diasCultivo } from '../planes';
import { nombreCultivo, nombreEscenario } from './piezas';
import type { Hecho } from './historial';
import type { DatosResumen, RotacionResumen } from '../pdf/resumenComparacion';

const ESCENARIOS: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const sumarDias = (f: string, d: number) => new Date(Date.parse(`${f}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);
const bloques = (n: number) => `${n} ${n === 1 ? 'bloque' : 'bloques'}`;

export interface EntradaResumen {
  /** Rotaciones en el orden del ranking del motor. */
  ordenadas: readonly ResultadoRotacion[];
  planes: readonly PlanSiembra[];
  catalogo: CatalogoCultivos;
  nombreRotacion: (id: string) => string;
  plagasDe: (rotacionId: string) => readonly { ciclo: number; plaga: string; cultivo: string; bloques: number }[];
  parcela: Pick<Parcela, 'nombre' | 'areaHa' | 'celdas' | 'tamanoCeldaM'>;
  esDemo: boolean;
  ponderacion: string;
  limites: readonly string[];
  hechos: readonly Hecho[];
  elegida: string | null;
  fecha: Date;
}

export function armarDatosResumen(e: EntradaResumen): DatosResumen {
  const rotaciones: RotacionResumen[] = e.ordenadas.map((r) => {
    const plan = e.planes.find((p) => p.rotacionId === r.rotacionId);
    const plagas = e.plagasDe(r.rotacionId);
    const peor = r.peorCaso?.escenario;
    return {
      id: r.rotacionId,
      nombre: e.nombreRotacion(r.rotacionId),
      posicion: r.ranking?.posicion ?? null,
      estado: r.estado,
      ciclos: (plan?.ciclos ?? []).map((c) => {
        const dias = diasCultivo(c.cultivo, e.catalogo);
        return {
          ciclo: c.ciclo, cultivo: nombreCultivo(c.cultivo), siembra: c.siembra, dias,
          cosecha: dias ? sumarDias(c.siembra, dias) : null,
          plagas: plagas.filter((p) => p.ciclo === c.ciclo).map((p) => `${p.plaga}: ${bloques(p.bloques)} de ${p.cultivo.toLowerCase()} sin insecticida`),
        };
      }),
      anios: ESCENARIOS.map((s) => ({ nombre: nombreEscenario[s]!, anioReal: r.porEscenario[s].anioReal ?? null, mm: r.porEscenario[s].pilares.deficitHidrico.deficitTotalMm ?? null })),
      peor: peor ? nombreEscenario[peor]! : null,
      debilidades: [...r.explicacion?.riesgos ?? []],
      fortalezas: [...r.explicacion?.beneficios ?? []],
    };
  });
  return {
    fecha: e.fecha,
    parcela: { nombre: e.parcela.nombre ?? 'Tu parcela', areaHa: e.parcela.areaHa ?? null, celdas: e.parcela.celdas.length, tamanoCeldaM: e.parcela.tamanoCeldaM, esDemo: e.esDemo },
    ponderacion: e.ponderacion, rotaciones, elegida: e.elegida, limites: e.limites, hechos: e.hechos,
  };
}
