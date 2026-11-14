// Protocolo de mensajes del Web Worker del motor. La logica vive aqui (pura y probada); worker.ts solo la conecta.
// Cambiar el plan de una rotacion reemplaza su resultado guardado: lo anterior queda invalidado hasta recalcular.
import { seleccionarEscenarios, type SeleccionEscenarios } from './escenarios';
import { resultadoCeldas, simularRotacion, type EntradasMotor, type ResultadoMotor } from './motor';
import type { Escenario, ResultadoCeldas, ResultadoRotacion, SerieClima } from './tipos';

export type Peticion =
  | { id: number; tipo: 'escenarios'; serie: SerieClima }
  | { id: number; tipo: 'simular'; entradas: EntradasMotor }
  | { id: number; tipo: 'celdas'; rotacionId: string; escenario: Escenario; fecha: string }
  | { id: number; tipo: 'olvidar'; rotacionId?: string };

export interface Resultados {
  escenarios: SeleccionEscenarios;
  simular: ResultadoRotacion;
  celdas: ResultadoCeldas;
  olvidar: null;
}

export type Respuesta = { id: number; ok: true; resultado: Resultados[keyof Resultados] } | { id: number; ok: false; error: string };

export class EstadoMotor {
  private readonly rotaciones = new Map<string, ResultadoMotor>();

  atender(p: Peticion): Respuesta {
    try {
      switch (p.tipo) {
        case 'escenarios':
          return { id: p.id, ok: true, resultado: seleccionarEscenarios(p.serie) };
        case 'simular': {
          const r = simularRotacion(p.entradas);
          this.rotaciones.set(p.entradas.plan.rotacionId, r);
          return { id: p.id, ok: true, resultado: r.rotacion };
        }
        case 'celdas': {
          const r = this.rotaciones.get(p.rotacionId);
          if (!r) return { id: p.id, ok: false, error: `La rotacion ${p.rotacionId} no esta calculada (o se invalido): pedir 'simular' primero.` };
          const c = resultadoCeldas(r, p.escenario, p.fecha);
          if (!c) return { id: p.id, ok: false, error: `El escenario ${p.escenario} no tiene anio real: no hay resultado por celda.` };
          return { id: p.id, ok: true, resultado: c };
        }
        case 'olvidar':
          if (p.rotacionId) this.rotaciones.delete(p.rotacionId);
          else this.rotaciones.clear();
          return { id: p.id, ok: true, resultado: null };
      }
    } catch (e) {
      return { id: p.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
