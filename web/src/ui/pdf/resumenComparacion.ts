// Resumen descargable de la comparacion (PDF). Puro: recibe lo que el motor ya calculo (ranking, agua que falto por anio, debilidades y
// fortalezas que redacta el motor), el historial de hechos y los datos de la parcela, y arma el documento. No recalcula ni inventa nada:
// un dato que falta se escribe "sin dato".

import { describirCelda } from '../../geo/escala-celda';
import { fechaLarga } from '../lab/eventos';
import { NOMBRE_TIPO_HECHO, textoHecho, type Hecho } from '../lab/historial';
import { DocumentoPdf, GRIS, VERDE, type Color } from './pdf';

export interface CicloResumen { ciclo: number; cultivo: string; siembra: string; cosecha: string | null; dias: number | null; plagas: string[] }
export interface AnioResumen { nombre: string; anioReal: number | null; mm: number | null }
export interface RotacionResumen {
  id: string; nombre: string; posicion: number | null; estado: string;
  ciclos: CicloResumen[]; anios: AnioResumen[]; peor: string | null; debilidades: string[]; fortalezas: string[];
}
export interface DatosResumen {
  fecha: Date;
  parcela: { nombre: string; areaHa: number | null; celdas: number; tamanoCeldaM: number; esDemo: boolean };
  /** Como se ordena la comparacion (texto del motor). */
  ponderacion: string;
  rotaciones: readonly RotacionResumen[];
  /** Rotacion que el usuario eligio, si eligio. */
  elegida: string | null;
  limites: readonly string[];
  hechos: readonly Hecho[];
}

export const MAX_HECHOS_EN_PDF = 60;
export const AVISO_PIE = 'AgroHive explora escenarios con datos históricos; no predice cosechas ni ingresos ni reemplaza a un agrónomo.';

const mm = (n: number | null | undefined) => (n == null ? 'sin dato' : `${Math.round(n).toLocaleString('es-MX')} mm`);
const fechaDe = (d: Date) => fechaLarga(d.toISOString().slice(0, 10));
const COLOR_ANIO: Record<string, Color> = { 'Año seco': [0.82, 0.45, 0.2], 'Año normal': [0.25, 0.55, 0.35], 'Año lluvioso': [0.2, 0.42, 0.65] };

export const FUENTES_PDF: readonly string[] = [
  'Clima histórico: NASA POWER (diario, comunidad AG). Es regional: el mismo para toda la parcela.',
  'Cultivos: Kc y etapas de FAO-56; rangos de temperatura y lluvia de FAO EcoCrop.',
  'Suelo: estimaciones de ISRIC SoilGrids y OpenLandMap; relieve: AWS Terrain Tiles (Terrarium).',
  'Plagas: registros de presencia de GBIF; cultivos hospederos de EPPO. Es presencia en la región, no un pronóstico de daño.',
];

/** Arma el PDF y devuelve sus bytes. */
export function construirResumenPdf(d: DatosResumen): Uint8Array {
  const doc = new DocumentoPdf({ titulo: 'AgroHive - Resumen de la comparación', pie: AVISO_PIE, fecha: d.fecha });
  doc.banda('AgroHive · Resumen de la comparación', `Generado el ${fechaDe(d.fecha)} · ${d.parcela.nombre}`);

  doc.titulo('Tu parcela');
  const celda = describirCelda(d.parcela.tamanoCeldaM);
  doc.parrafo(`${d.parcela.nombre}: ${d.parcela.areaHa != null ? `${d.parcela.areaHa.toLocaleString('es-MX', { maximumFractionDigits: 2 })} hectáreas, ` : ''}${d.parcela.celdas} ${d.parcela.celdas === 1 ? 'celda' : 'celdas'}${celda ? ` (${celda.texto})` : ''}.`);
  if (d.parcela.esDemo) doc.parrafo('Es la parcela de demostración: sus 2 hectáreas son ficticias y no corresponden a un levantamiento real del terreno.', { color: GRIS });

  doc.titulo('Cómo se compara');
  doc.parrafo('La mejor rotación no es la que más rinde en un buen año, sino la que menos sufre en uno malo. Se prueban tres años reales del pasado en la zona: uno seco, uno normal y uno lluvioso.');
  doc.parrafo(d.ponderacion, { color: GRIS });

  doc.titulo('Ranking de rotaciones');
  if (d.rotaciones.length === 0) doc.parrafo('Todavía no hay rotaciones comparadas.');
  else {
    doc.tabla(
      [{ titulo: 'Lugar', ancho: 1 }, { titulo: 'Rotación', ancho: 3 }, { titulo: 'Cultivos por ciclo', ancho: 4 }, { titulo: 'Año seco', ancho: 2 }, { titulo: 'Año normal', ancho: 2 }, { titulo: 'Año lluvioso', ancho: 2 }],
      d.rotaciones.map((r) => [
        r.posicion != null ? String(r.posicion) : '—',
        `${r.nombre}${r.id === d.elegida ? ' (tu plan)' : ''}`,
        r.ciclos.map((c) => c.cultivo).join(' → ') || 'sin ciclos',
        ...(['Año seco', 'Año normal', 'Año lluvioso'] as const).map((n) => { const a = r.anios.find((x) => x.nombre === n); return a ? `${mm(a.mm)}${a.anioReal ? ` (${a.anioReal})` : ''}` : 'sin dato'; }),
      ]),
    );
    const maximo = Math.max(1, ...d.rotaciones.flatMap((r) => r.anios.map((a) => a.mm ?? 0)));
    doc.parrafo('Agua que le faltó al cultivo, por rotación y año (menos es mejor):', { negrita: true, despues: 2 });
    doc.barras(d.rotaciones.flatMap((r) => r.anios.map((a) => ({ etiqueta: `${r.nombre.length > 14 ? `${r.nombre.slice(0, 13)}…` : r.nombre} · ${a.nombre.replace('Año ', '')}`, valor: a.mm, texto: mm(a.mm), color: COLOR_ANIO[a.nombre] ?? VERDE }))), maximo);
  }

  for (const r of d.rotaciones) {
    doc.titulo(`${r.posicion != null ? `Lugar ${r.posicion} · ` : ''}${r.nombre}${r.posicion === 1 ? ' (la más robusta)' : ''}${r.id === d.elegida ? ' · tu plan' : ''}`);
    if (r.estado !== 'EVALUABLE') doc.parrafo(`Estado: ${r.estado === 'EXPLORATORIO' ? 'solo para explorar' : r.estado === 'NO_EVALUABLE' ? 'sin evaluar' : r.estado}.`, { color: GRIS });
    doc.tabla(
      [{ titulo: 'Ciclo', ancho: 1 }, { titulo: 'Cultivo', ancho: 2 }, { titulo: 'Siembra', ancho: 3 }, { titulo: 'Cosecha aproximada', ancho: 4 }, { titulo: 'Plagas pendientes', ancho: 5 }],
      r.ciclos.map((c) => [String(c.ciclo), c.cultivo, fechaLarga(c.siembra), c.cosecha ? `${fechaLarga(c.cosecha)}${c.dias ? ` (${c.dias} días)` : ''}` : 'sin dato', c.plagas.length ? c.plagas.join('; ') : 'Sin plagas pendientes']),
    );
    if (r.peor) doc.parrafo(`Su peor año: ${r.peor.toLowerCase()}.`, { negrita: true });
    if (r.debilidades.length) { doc.parrafo('Debilidades', { negrita: true, color: [0.65, 0.28, 0.1], despues: 1 }); doc.lista(r.debilidades.slice(0, 4)); }
    if (r.fortalezas.length) { doc.parrafo('Fortalezas', { negrita: true, color: VERDE, despues: 1 }); doc.lista(r.fortalezas.slice(0, 3)); }
  }

  doc.titulo('Historial de hechos');
  if (d.hechos.length === 0) doc.parrafo('No se registraron hechos en esta sesión.', { color: GRIS });
  else {
    const recientes = d.hechos.slice(-MAX_HECHOS_EN_PDF);
    if (recientes.length < d.hechos.length) doc.parrafo(`Se muestran los últimos ${recientes.length} de ${d.hechos.length} hechos.`, { color: GRIS });
    doc.lista(recientes.map((h) => `${NOMBRE_TIPO_HECHO[h.tipo]}: ${textoHecho(h)}${h.fechaSim ? ` (en la simulación: ${fechaLarga(h.fechaSim)})` : ''}`));
  }

  if (d.limites.length) { doc.titulo('Lo que este cálculo no ve'); doc.lista(d.limites); }

  doc.titulo('Fuentes y límites');
  doc.lista(FUENTES_PDF);
  doc.parrafo('AgroHive no predice cosechas ni ingresos. Las fechas de cosecha son aproximadas (siembra más la duración del ciclo del catálogo). La decisión final es tuya; valídala con un agrónomo.', { color: GRIS });
  return doc.generar();
}

/** Nombre del archivo: agrohive-resumen-AAAA-MM-DD.pdf */
export const nombreArchivoPdf = (fecha: Date) => `agrohive-resumen-${fecha.toISOString().slice(0, 10)}.pdf`;
