// Protocolo de mensajes del Web Worker del motor. La logica vive aqui (pura y probada); worker.ts solo la conecta.
// Cambiar el plan de una rotacion reemplaza su resultado guardado: lo anterior queda invalidado hasta recalcular.
import { seleccionarEscenarios, type SeleccionEscenarios } from './escenarios';
import { simularRotacionCompleta } from './analogos';
import { resultadoCeldas, type EntradasMotor, type ResultadoMotor } from './motor';
import { vistaProximaTemporada, type VistaProximaTemporada } from './proxima';
import { rankear, type OpcionesRanking, type ResultadoRanking } from './ranking';
import { serieBalance } from './series';
import { conTarjetas } from './tarjetas';
import type { ProximaTemporadaAproximada } from '../../../contratos/tipos/contratos';
import type { Escenario, ResultadoCeldas, ResultadoRotacion, SerieBalance, SerieClima } from './tipos';

export type Peticion =
  | { id: number; tipo: 'escenarios'; serie: SerieClima }
  | { id: number; tipo: 'simular'; entradas: EntradasMotor }
  | { id: number; tipo: 'celdas'; rotacionId: string; escenario: Escenario; fecha: string }
  /** A4.2: ordena las rotaciones ya simuladas (todas, o las de rotacionIds). Se vuelve a pedir tras cada 'simular'. */
  | { id: number; tipo: 'rankear'; rotacionIds?: string[]; opciones?: OpcionesRanking }
  /** A2.13: banda de proxima temporada (GET /api/proxima-temporada) junto a los escenarios de A2.5. */
  | { id: number; tipo: 'proxima'; proxima: ProximaTemporadaAproximada | null; escenarios: SeleccionEscenarios['escenarios'] }
  /** A4.1: series del balance de agua de una rotacion en un escenario (bajo demanda, para el dashboard). */
  | { id: number; tipo: 'serieBalance'; rotacionId: string; escenario: Escenario }
  | { id: number; tipo: 'olvidar'; rotacionId?: string };

export interface Resultados {
  escenarios: SeleccionEscenarios;
  simular: ResultadoRotacion;
  celdas: ResultadoCeldas;
  rankear: ResultadoRanking;
  proxima: VistaProximaTemporada;
  serieBalance: SerieBalance;
  olvidar: null;
}

export type Respuesta = { id: number; ok: true; resultado: Resultados[keyof Resultados] } | { id: number; ok: false; error: string };

export class EstadoMotor {
  private readonly rotaciones = new Map<string, ResultadoMotor>();
  private readonly entradas = new Map<string, EntradasMotor>();

  atender(p: Peticion): Respuesta {
    try {
      switch (p.tipo) {
        case 'escenarios':
          return { id: p.id, ok: true, resultado: seleccionarEscenarios(p.serie) };
        case 'simular': {
          // Primero se invalida lo anterior: si el nuevo plan falla, no debe quedar el resultado viejo para 'celdas' ni 'rankear'.
          this.rotaciones.delete(p.entradas.plan.rotacionId);
          this.entradas.delete(p.entradas.plan.rotacionId);
          const r = simularRotacionCompleta(p.entradas);
          this.rotaciones.set(p.entradas.plan.rotacionId, r);
          this.entradas.set(p.entradas.plan.rotacionId, p.entradas);
          return { id: p.id, ok: true, resultado: r.rotacion };
        }
        case 'celdas': {
          const r = this.rotaciones.get(p.rotacionId);
          if (!r) return { id: p.id, ok: false, error: `La rotacion ${p.rotacionId} no esta calculada (o se invalido): pedir 'simular' primero.` };
          const c = resultadoCeldas(r, p.escenario, p.fecha);
          if (!c) return { id: p.id, ok: false, error: `El escenario ${p.escenario} no tiene anio real: no hay resultado por celda.` };
          return { id: p.id, ok: true, resultado: c };
        }
        case 'rankear': {
          const ids = p.rotacionIds ?? [...this.rotaciones.keys()].sort();
          if (ids.length === 0) return { id: p.id, ok: true, resultado: rankear([], p.opciones ?? {}) }; // sin rotaciones no hay tarjetas que armar
          const faltan = ids.filter((i) => !this.rotaciones.has(i));
          if (faltan.length > 0) return { id: p.id, ok: false, error: `Rotaciones sin calcular: ${faltan.join(', ')}.` };
          const entrada = ids.map((i) => {
            const r = this.rotaciones.get(i) as ResultadoMotor;
            return { rotacion: r.rotacion, numeroSiembras: r.plan.ciclos.length };
          });
          const ranking = rankear(entrada, p.opciones ?? {});
          // A4.3: cada rotacion sale con su tarjeta en `explicacion` (plantilla, sin LLM).
          const e0 = this.entradas.get(ids[0] as string) as EntradasMotor;
          const motores = Object.fromEntries(ids.map((i) => [i, this.rotaciones.get(i) as ResultadoMotor]));
          const rotaciones = conTarjetas({ ranking, motores, catalogo: e0.catalogo, calendario: e0.calendario ?? null, suelo: e0.suelo });
          return { id: p.id, ok: true, resultado: { ...ranking, rotaciones } };
        }
        case 'serieBalance': {
          const r = this.rotaciones.get(p.rotacionId);
          if (!r) return { id: p.id, ok: false, error: `La rotacion ${p.rotacionId} no esta calculada (o se invalido): pedir 'simular' primero.` };
          const sb = serieBalance(r, p.escenario);
          if (!sb) return { id: p.id, ok: false, error: `El escenario ${p.escenario} no tiene anio real: no hay series.` };
          return { id: p.id, ok: true, resultado: sb };
        }
        case 'proxima':
          return { id: p.id, ok: true, resultado: vistaProximaTemporada(p.proxima, p.escenarios) };
        case 'olvidar':
          if (p.rotacionId) {
            this.rotaciones.delete(p.rotacionId);
            this.entradas.delete(p.rotacionId);
          } else {
            this.rotaciones.clear();
            this.entradas.clear();
          }
          return { id: p.id, ok: true, resultado: null };
        default: {
          // H-M5: un tipo desconocido responde un error con su id; antes devolvia undefined y el cliente fallaba al leerlo.
          const x = p as { id: number; tipo?: unknown };
          return { id: x.id, ok: false, error: `Peticion desconocida: ${String(x.tipo)}.` };
        }
      }
    } catch (e) {
      return { id: p.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
