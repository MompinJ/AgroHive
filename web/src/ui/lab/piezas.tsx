// Piezas pequenas de los paneles flotantes del laboratorio.
import type { ReactNode } from 'react';
import type { PlanSiembra } from '../../../../contratos/tipos/contratos';
import { colorCultivo, nombresCultivos } from '../planes';
import { iconoDeCultivo } from '../iconosCultivo2D';
import { pasos } from '../navigation';

export const numero = (n: number | null | undefined, unidad = '') => n == null ? 'NO_EVALUABLE' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })}${unidad}`;
export const porcentaje = (n: number | null | undefined) => n == null ? 'NO_EVALUABLE' : new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 }).format(n);
const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** 2026-06-15 -> 15 jun 2026 (sin pasar por Date para no mover el dia por zona horaria). */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return `${Number(d)} ${meses[Number(m) - 1] ?? m} ${a}`;
}
export const nombreCultivo = (id: string) => nombresCultivos[id] ?? id;
/** "Recorri el ciclo 2 al 3 feb 2027 para que no se encimen." o vacio si nada se movio. */
export function textoMovidos(movidos: readonly { ciclo: number; despues: string }[]): string {
  if (!movidos.length) return '';
  const lista = movidos.map((m) => `el ciclo ${m.ciclo} al ${fechaCorta(m.despues)}`);
  return `Recorrí ${lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0]} para que los ciclos no se encimen.`;
}
export const nombreTemporada = (t: string) => (t === 'PV' ? 'Primavera–verano' : 'Otoño–invierno');
/** 1 jun – 15 jul (ventana del calendario, sin anio). */
export function rangoVentana(v: { desdeMes: number; desdeDia?: number; hastaMes: number; hastaDia?: number }): string {
  return `${v.desdeDia ?? 1} ${meses[v.desdeMes - 1]} – ${v.hastaDia ?? 'fin de'} ${meses[v.hastaMes - 1]}`;
}
export const nombreEscenario: Record<string, string> = { seco: 'Año seco', habitual: 'Año normal', lluvioso: 'Año lluvioso' };

export function IconoCultivo({ cultivo, tamano = 28 }: { cultivo: string; tamano?: number }) {
  const url = iconoDeCultivo(cultivo);
  return <span className="lab-icono" style={{ width: tamano, height: tamano, background: url ? undefined : colorCultivo(cultivo) }} aria-hidden="true">
    {url && <img src={url} alt="" width={tamano} height={tamano} />}
  </span>;
}

/** Secuencia de cultivos de un plan, en chips pequenos. */
export function Secuencia({ plan }: { plan: PlanSiembra }) {
  return <ol className="lab-secuencia" aria-label="Cultivos por ciclo">
    {plan.ciclos.map((c) => <li key={c.ciclo}><span className="lab-punto" style={{ background: colorCultivo(c.cultivo) }} aria-hidden="true" />{nombreCultivo(c.cultivo)}</li>)}
  </ol>;
}

export function EncabezadoPanel({ indice, titulo, children }: { indice: number; titulo: string; children?: ReactNode }) {
  return <header className="panel-cabeza">
    <p className="panel-paso">Paso {indice + 1} de {pasos.length}</p>
    <h1 tabIndex={-1}>{titulo}</h1>
    {children && <p className="panel-intro">{children}</p>}
  </header>;
}

export function Aviso({ tipo = 'info', children, className = '', onCerrar, accion }: { tipo?: 'info' | 'aviso' | 'error'; children: ReactNode; className?: string; onCerrar?: () => void; accion?: { texto: string; onClick: () => void } }) {
  return <div className={`lab-aviso lab-aviso-${tipo} ${className}`} role={tipo === 'error' ? 'alert' : 'status'}>
    <span className="lab-aviso-marca" aria-hidden="true">{tipo === 'error' ? '!' : 'i'}</span>
    <div className="lab-aviso-texto">{children}</div>
    {accion && <button type="button" className="lab-boton lab-boton-suave" onClick={accion.onClick}>{accion.texto}</button>}
    {onCerrar && <button type="button" className="lab-aviso-cerrar" onClick={onCerrar} aria-label="Cerrar aviso">×</button>}
  </div>;
}

export function Cargando({ children }: { children: ReactNode }) {
  return <p className="lab-cargando" role="status"><span className="lab-giro" aria-hidden="true" />{children}</p>;
}
