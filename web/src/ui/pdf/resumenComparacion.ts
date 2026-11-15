// Resumen descargable de la comparacion (PDF). Puro: recibe lo que el motor ya calculo (ranking, agua que falto por anio, debilidades y
// fortalezas que redacta el motor), el historial de hechos y los datos de la parcela, y arma el documento. No recalcula ni inventa nada:
// un dato que falta se escribe "sin dato".

import { describirCelda } from '../../geo/escala-celda';
import { fechaLarga } from '../lab/eventos';
import { NOMBRE_TIPO_HECHO, textoHecho, type Hecho } from '../lab/historial';
import { DocumentoPdf, GRIS, VERDE, type Color } from './pdf';
import { idiomaActual, tt } from '../i18n/actual';
import { textoCelda } from '../i18n/textos/terreno';

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
/** Aviso del pie (en espanol; construirResumenPdf usa el del idioma activo). */
export const AVISO_PIE = 'AgroHive explora escenarios con datos históricos; no predice cosechas ni ingresos ni reemplaza a un agrónomo.';

const mm = (n: number | null | undefined) => (n == null ? tt('pdf.sinDato') : `${Math.round(n).toLocaleString('es-MX')} mm`);
const fechaDe = (d: Date) => fechaLarga(d.toISOString().slice(0, 10));
/** Color de cada anio en las barras, por su nombre visible (el del idioma activo). */
const colorAnio = (nombre: string): Color | undefined =>
  nombre === tt('escenario.seco') ? [0.82, 0.45, 0.2] : nombre === tt('escenario.habitual') ? [0.25, 0.55, 0.35] : nombre === tt('escenario.lluvioso') ? [0.2, 0.42, 0.65] : undefined;
const ANIOS = () => [tt('escenario.seco'), tt('escenario.habitual'), tt('escenario.lluvioso')] as const;
/** "Año seco" -> "seco"; "Dry year" -> "Dry". */
const anioCorto = (nombre: string) => (idiomaActual() === 'en' ? nombre.replace(/ year$/, '') : nombre.replace('Año ', ''));

/** Fuentes del pie del PDF (en espanol; construirResumenPdf usa las del idioma activo, fuentesPdf()). */
export const FUENTES_PDF: readonly string[] = [
  'Clima histórico: NASA POWER (diario, comunidad AG). Es regional: el mismo para toda la parcela.',
  'Cultivos: Kc y etapas de FAO-56; rangos de temperatura y lluvia de FAO EcoCrop.',
  'Suelo: estimaciones de ISRIC SoilGrids y OpenLandMap; relieve: AWS Terrain Tiles (Terrarium).',
  'Plagas: registros de presencia de GBIF; cultivos hospederos de EPPO. Es presencia en la región, no un pronóstico de daño.',
];
const fuentesPdf = () => [tt('pdf.fuente1'), tt('pdf.fuente2'), tt('pdf.fuente3'), tt('pdf.fuente4')];

/** Arma el PDF y devuelve sus bytes. */
export function construirResumenPdf(d: DatosResumen): Uint8Array {
  const doc = new DocumentoPdf({ titulo: tt('pdf.tituloDoc'), pie: tt('pdf.aviso'), fecha: d.fecha });
  doc.banda(tt('pdf.banda'), tt('pdf.generado', { fecha: fechaDe(d.fecha), parcela: d.parcela.nombre }));

  doc.titulo(tt('pdf.tuParcela'));
  const celda = describirCelda(d.parcela.tamanoCeldaM);
  doc.parrafo(`${d.parcela.nombre}: ${d.parcela.areaHa != null ? tt('pdf.hectareas', { n: d.parcela.areaHa.toLocaleString('es-MX', { maximumFractionDigits: 2 }) }) : ''}${d.parcela.celdas} ${d.parcela.celdas === 1 ? tt('pdf.celda') : tt('pdf.celdas')}${celda ? ` (${textoCelda(celda)})` : ''}.`);
  if (d.parcela.esDemo) doc.parrafo(tt('pdf.demo'), { color: GRIS });

  doc.titulo(tt('pdf.comoSeCompara'));
  doc.parrafo(tt('pdf.comoTexto'));
  doc.parrafo(d.ponderacion, { color: GRIS });

  doc.titulo(tt('pdf.ranking'));
  if (d.rotaciones.length === 0) doc.parrafo(tt('pdf.sinRotaciones'));
  else {
    doc.tabla(
      [{ titulo: tt('pdf.lugar'), ancho: 1 }, { titulo: tt('pdf.rotacion'), ancho: 3 }, { titulo: tt('pdf.cultivosCiclo'), ancho: 4 }, ...ANIOS().map((titulo) => ({ titulo, ancho: 2 }))],
      d.rotaciones.map((r) => [
        r.posicion != null ? String(r.posicion) : '—',
        `${r.nombre}${r.id === d.elegida ? tt('pdf.tuPlan') : ''}`,
        r.ciclos.map((c) => c.cultivo).join(' → ') || tt('pdf.sinCiclos'),
        ...ANIOS().map((n) => { const a = r.anios.find((x) => x.nombre === n); return a ? `${mm(a.mm)}${a.anioReal ? ` (${a.anioReal})` : ''}` : tt('pdf.sinDato'); }),
      ]),
    );
    const maximo = Math.max(1, ...d.rotaciones.flatMap((r) => r.anios.map((a) => a.mm ?? 0)));
    doc.parrafo(tt('pdf.aguaBarras'), { negrita: true, despues: 2 });
    doc.barras(d.rotaciones.flatMap((r) => r.anios.map((a) => ({ etiqueta: `${r.nombre.length > 14 ? `${r.nombre.slice(0, 13)}…` : r.nombre} · ${anioCorto(a.nombre)}`, valor: a.mm, texto: mm(a.mm), color: colorAnio(a.nombre) ?? VERDE }))), maximo);
  }

  for (const r of d.rotaciones) {
    doc.titulo(`${r.posicion != null ? tt('pdf.lugarN', { n: r.posicion }) : ''}${r.nombre}${r.posicion === 1 ? tt('pdf.masRobusta') : ''}${r.id === d.elegida ? tt('pdf.tuPlanPunto') : ''}`);
    if (r.estado !== 'EVALUABLE') doc.parrafo(tt('pdf.estado', { estado: r.estado === 'EXPLORATORIO' ? tt('pdf.explorar') : r.estado === 'NO_EVALUABLE' ? tt('pdf.sinEvaluar') : r.estado }), { color: GRIS });
    doc.tabla(
      [{ titulo: tt('pdf.ciclo'), ancho: 1 }, { titulo: tt('pdf.cultivo'), ancho: 2 }, { titulo: tt('pdf.siembra'), ancho: 3 }, { titulo: tt('pdf.cosecha'), ancho: 4 }, { titulo: tt('pdf.plagas'), ancho: 5 }],
      r.ciclos.map((c) => [String(c.ciclo), c.cultivo, fechaLarga(c.siembra), c.cosecha ? `${fechaLarga(c.cosecha)}${c.dias ? tt('pdf.dias', { n: c.dias }) : ''}` : tt('pdf.sinDato'), c.plagas.length ? c.plagas.join('; ') : tt('pdf.sinPlagas')]),
    );
    if (r.peor) doc.parrafo(tt('pdf.peor', { anio: r.peor.toLowerCase() }), { negrita: true });
    if (r.debilidades.length) { doc.parrafo(tt('pdf.debilidades'), { negrita: true, color: [0.65, 0.28, 0.1], despues: 1 }); doc.lista(r.debilidades.slice(0, 4)); }
    if (r.fortalezas.length) { doc.parrafo(tt('pdf.fortalezas'), { negrita: true, color: VERDE, despues: 1 }); doc.lista(r.fortalezas.slice(0, 3)); }
  }

  doc.titulo(tt('pdf.historial'));
  if (d.hechos.length === 0) doc.parrafo(tt('pdf.sinHechos'), { color: GRIS });
  else {
    const recientes = d.hechos.slice(-MAX_HECHOS_EN_PDF);
    if (recientes.length < d.hechos.length) doc.parrafo(tt('pdf.ultimos', { n: recientes.length, total: d.hechos.length }), { color: GRIS });
    doc.lista(recientes.map((h) => `${NOMBRE_TIPO_HECHO[h.tipo]}: ${textoHecho(h)}${h.fechaSim ? tt('pdf.enSimulacion', { fecha: fechaLarga(h.fechaSim) }) : ''}`));
  }

  if (d.limites.length) { doc.titulo(tt('pdf.noVe')); doc.lista(d.limites); }

  doc.titulo(tt('pdf.fuentesLimites'));
  doc.lista(fuentesPdf());
  doc.parrafo(tt('pdf.final'), { color: GRIS });
  return doc.generar();
}

/** Nombre del archivo: agrohive-resumen-AAAA-MM-DD.pdf */
export const nombreArchivoPdf = (fecha: Date) => `agrohive-resumen-${fecha.toISOString().slice(0, 10)}.pdf`;
