// Piezas pequenas de los paneles flotantes del laboratorio.
import type { ReactNode } from 'react';
import type { PlanSiembra } from '../../../../contratos/tipos/contratos';
import { colorCultivo, nombresCultivos } from '../planes';
import { iconoDeCultivo } from '../iconosCultivo2D';
import { pasos } from '../navigation';
import { tt } from '../i18n/actual';
import type { ClaveTexto } from '../i18n/diccionarios';
import { idiomaActual } from '../i18n/actual';
import { NOMBRES_CULTIVO_EN } from '../i18n/cultivos-en';

export const numero = (n: number | null | undefined, unidad = '') => n == null ? 'NO_EVALUABLE' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 1 })}${unidad}`;
export const porcentaje = (n: number | null | undefined) => n == null ? 'NO_EVALUABLE' : new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 }).format(n);
const mes = (m: number) => tt(`mes.${m}` as ClaveTexto);
/** 2026-06-15 -> 15 jun 2026 (sin pasar por Date para no mover el dia por zona horaria). */
export function fechaCorta(fecha: string): string {
  const [a, m, d] = fecha.split('-');
  return tt('fecha.corta', { dia: Number(d), mes: Number(m) >= 1 && Number(m) <= 12 ? mes(Number(m)) : (m ?? ''), anio: a ?? '' });
}
/** Nombre visible del cultivo en el idioma activo (en ingles, nombreComunEn del catalogo; si falta, el de espanol). */
export const nombreCultivo = (id: string) => (idiomaActual() === 'en' ? NOMBRES_CULTIVO_EN[id] : undefined) ?? nombresCultivos[id] ?? id;
/** "Recorri el ciclo 2 al 3 feb 2027 para que no se encimen." o vacio si nada se movio. */
export function textoMovidos(movidos: readonly { ciclo: number; despues: string }[]): string {
  if (!movidos.length) return '';
  const lista = movidos.map((m) => tt('movidos.ciclo', { ciclo: m.ciclo, fecha: fechaCorta(m.despues) }));
  return tt('movidos.texto', { lista: lista.length > 1 ? `${lista.slice(0, -1).join(', ')}${tt('movidos.y')}${lista.at(-1)}` : (lista[0] ?? '') });
}
export const nombreTemporada = (t: string) => (t === 'PV' ? tt('temporada.PV') : tt('temporada.OI'));
/** 1 jun – 15 jul (ventana del calendario, sin anio). */
export function rangoVentana(v: { desdeMes: number; desdeDia?: number; hastaMes: number; hastaDia?: number }): string {
  const mismoMes = v.desdeMes === v.hastaMes;
  // GGCMI da un solo dia tipico de siembra; MIRCA, solo el mes.
  if (mismoMes && v.desdeDia != null && v.desdeDia === v.hastaDia) return tt('ventana.cerca', { dia: v.desdeDia, mes: mes(v.desdeMes) });
  if (mismoMes && v.desdeDia == null && v.hastaDia == null) return tt('ventana.en', { mes: mes(v.desdeMes) });
  return v.hastaDia == null
    ? tt('ventana.rangoFin', { desdeDia: v.desdeDia ?? 1, desdeMes: mes(v.desdeMes), hastaMes: mes(v.hastaMes) })
    : tt('ventana.rango', { desdeDia: v.desdeDia ?? 1, desdeMes: mes(v.desdeMes), hastaDia: v.hastaDia, hastaMes: mes(v.hastaMes) });
}
/** Nombre visible del escenario en el idioma activo (se lee como antes: nombreEscenario[e]). */
export const nombreEscenario: Record<string, string> = {
  get seco() { return tt('escenario.seco'); },
  get habitual() { return tt('escenario.habitual'); },
  get lluvioso() { return tt('escenario.lluvioso'); },
};

export function IconoCultivo({ cultivo, tamano = 28 }: { cultivo: string; tamano?: number }) {
  const url = iconoDeCultivo(cultivo);
  return <span className="lab-icono" style={{ width: tamano, height: tamano, background: url ? undefined : colorCultivo(cultivo) }} aria-hidden="true">
    {url && <img src={url} alt="" width={tamano} height={tamano} />}
  </span>;
}

/** Secuencia de cultivos de un plan, en chips pequenos. */
export function Secuencia({ plan }: { plan: PlanSiembra }) {
  return <ol className="lab-secuencia" aria-label={tt('piezas.secuencia')}>
    {plan.ciclos.map((c) => <li key={c.ciclo}><span className="lab-punto" style={{ background: colorCultivo(c.cultivo) }} aria-hidden="true" />{nombreCultivo(c.cultivo)}</li>)}
  </ol>;
}

export function EncabezadoPanel({ indice, titulo, children }: { indice: number; titulo: string; children?: ReactNode }) {
  return <header className="panel-cabeza">
    <p className="panel-paso">{tt('piezas.paso', { n: indice + 1, total: pasos.length })}</p>
    <h1 tabIndex={-1}>{titulo}</h1>
    {children && <p className="panel-intro">{children}</p>}
  </header>;
}

export function Aviso({ tipo = 'info', children, className = '', onCerrar, accion }: { tipo?: 'info' | 'aviso' | 'error'; children: ReactNode; className?: string; onCerrar?: () => void; accion?: { texto: string; onClick: () => void } }) {
  return <div className={`lab-aviso lab-aviso-${tipo} ${className}`} role={tipo === 'error' ? 'alert' : 'status'}>
    <span className="lab-aviso-marca" aria-hidden="true">{tipo === 'error' ? '!' : 'i'}</span>
    <div className="lab-aviso-texto">{children}</div>
    {accion && <button type="button" className="lab-boton lab-boton-suave" onClick={accion.onClick}>{accion.texto}</button>}
    {onCerrar && <button type="button" className="lab-aviso-cerrar" onClick={onCerrar} aria-label={tt('piezas.cerrarAviso')}>×</button>}
  </div>;
}

export function Cargando({ children }: { children: ReactNode }) {
  return <p className="lab-cargando" role="status"><span className="lab-giro" aria-hidden="true" />{children}</p>;
}
