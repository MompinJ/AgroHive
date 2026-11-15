// Parcelas de ejemplo mundiales (decision de Mompin, 15/11): reemplazan a la demo de Isla. Son el punto de entrada para
// quien no quiere dibujar su parcela y, a la vez, el respaldo sin red: todo viene grabado de la API real en
// datos/demo/ejemplos/<id>/ (herramientas/ejemplos/grabar.py), validado contra contratos/.
//
// Fuera de la interfaz: listarEjemplos() da el indice y cargarEjemplo(id) devuelve lo mismo que hoy arma la rama esDemo
// de ui/useLaboratorio.ts (parcela, serie, suelo, capa, catalogo, tabla, calendario, avisos y avisosDatos), mas la
// evidencia grabada (NDVI, SMAP, plagas, CDL y SSURGO) y el clima de Koppen-Geiger para el bioma de la escena.
// No calcula indicadores: solo carga. Un dato que no se pudo grabar llega null con su motivo en `faltan` y en avisos;
// nunca se rellena.
import type {
  CalendarioLocal, CatalogoCultivos, Cdl, Ndvi, Parcela, Plagas, ProximaTemporadaAproximada, SerieClima, Smap, Ssurgo, Suelo, TablaSuelos,
} from '../../../contratos/tipos/contratos';
import indiceJson from '../../../datos/demo/ejemplos/indice.json';
import { avisosDe, type AvisoDatos } from '../api/datosParcela';
import type { Bioma } from '../escena/render/entorno';
import { climaDeSerie, type ClimaKoppen } from '../geo/koppen';

/** Estado de cada dato al grabar (manifiesto.json de cada ejemplo). */
export type EstadoDato = 'EVALUABLE' | 'EXPLORATORIO' | 'RESPALDO_HISTORICO' | 'NO_EVALUABLE';

/** Una fila de datos/demo/ejemplos/indice.json. */
export interface ResumenEjemplo {
  id: string;
  nombre: string;
  pais: string;
  paisIso: string;
  continente: string;
  ubicacion: NonNullable<Parcela['ubicacion']>;
  centroide: [number, number];
  areaHa: number;
  celdas: number;
  /** Ids del catalogo de 40: ejemplos de la region, no una recomendacion ni una estadistica. */
  cultivosSugeridos: string[];
  porQue: string;
  /** Koppen-Geiger calculado al grabar con geo/koppen.ts (cargarEjemplo lo recalcula de la serie). */
  clima: { clase: string; descripcion: string; bioma: Bioma } | null;
  /** Momento de la grabacion (ISO 8601). */
  grabado: string;
  versionContrato: string;
  datos: Record<string, EstadoDato>;
}

interface Indice { aviso: string; regenerar: string; ejemplos: ResumenEjemplo[] }
interface Manifiesto { grabado: string; datos: Record<string, { estado: EstadoDato; motivo?: string; archivo?: string }> }

const indice = indiceJson as unknown as Indice;
/** Aviso general de los ejemplos (va en pantalla junto a la lista). */
export const AVISO_EJEMPLOS = indice.aviso;

// Cada archivo es un trozo aparte: solo se baja el del ejemplo elegido.
const respuestas = import.meta.glob<unknown>('../../../datos/demo/ejemplos/*/respuestas/*.json', { import: 'default' });
const parcelas = import.meta.glob<unknown>('../../../datos/demo/ejemplos/*/parcela.json', { import: 'default' });
const manifiestos = import.meta.glob<Manifiesto>('../../../datos/demo/ejemplos/*/manifiesto.json', { import: 'default', eager: true });
const base = (id: string) => `../../../datos/demo/ejemplos/${id}`;

/** Los ejemplos grabados, en el orden del indice. */
export function listarEjemplos(): ResumenEjemplo[] {
  return indice.ejemplos.map((e) => ({ ...e }));
}

export function existeEjemplo(id: string): boolean {
  return indice.ejemplos.some((e) => e.id === id);
}

/** Lo que devuelve cargarEjemplo: la forma de DatosLaboratorio (rama esDemo) mas la evidencia y el clima del lugar. */
export interface DatosEjemplo {
  esDemo: true;
  ejemplo: ResumenEjemplo;
  parcela: Parcela;
  serie: SerieClima;
  suelo: Suelo | null;
  catalogo: CatalogoCultivos;
  tabla: TablaSuelos;
  calendario: CalendarioLocal | null;
  capa: ProximaTemporadaAproximada | null;
  avisos: string[];
  avisosDatos: AvisoDatos[];
  /** Evidencia grabada (no entra al motor ni al ranking). SMAP es la foto de los 10 dias anteriores a la grabacion. */
  evidencia: { ndvi: Ndvi | null; smap: Smap | null; plagas: Plagas | null; cdl: Cdl | null; ssurgo: Ssurgo | null };
  /** Koppen-Geiger de la serie (Peel et al. 2007) y el bioma decorativo de la escena. */
  clima: ClimaKoppen;
  bioma: Bioma | null;
  /** Datos que no se pudieron grabar, con su motivo (tambien van en avisos). */
  faltan: { dato: string; motivo: string }[];
}

const NOMBRE_DATO: Record<string, string> = {
  clima: 'Clima', suelo: 'Suelo', terreno: 'Elevación', 'proxima-temporada': 'Próxima temporada', calendario: 'Calendario de siembra',
  plagas: 'Plagas', ndvi: 'NDVI', smap: 'SMAP', cdl: 'CDL', ssurgo: 'SSURGO', worldcover: 'WorldCover',
};

export async function cargarEjemplo(id: string): Promise<DatosEjemplo> {
  const ejemplo = indice.ejemplos.find((e) => e.id === id);
  if (!ejemplo) throw new Error(`No hay un ejemplo con id "${id}". Ejemplos: ${indice.ejemplos.map((e) => e.id).join(', ')}.`);
  const manifiesto = manifiestos[`${base(id)}/manifiesto.json`];
  if (!manifiesto) throw new Error(`El ejemplo "${id}" no tiene manifiesto.json: vuelve a grabarlo (herramientas/ejemplos/grabar.py).`);
  const leer = async <T>(nombre: string): Promise<T | null> => {
    const cargar = respuestas[`${base(id)}/respuestas/${nombre}.json`];
    return cargar ? ((await cargar()) as T) : null;
  };
  const cargarParcela = parcelas[`${base(id)}/parcela.json`];
  if (!cargarParcela) throw new Error(`El ejemplo "${id}" no tiene parcela.json.`);
  const [parcela, serie, suelo, capa, calendario, ndvi, smap, plagas, cdl, ssurgo, cat, tab] = await Promise.all([
    cargarParcela() as Promise<Parcela>,
    leer<SerieClima>('serie-clima'), leer<Suelo>('suelo'), leer<ProximaTemporadaAproximada>('proxima-temporada'),
    leer<CalendarioLocal>('calendario'), leer<Ndvi>('ndvi'), leer<Smap>('smap'), leer<Plagas>('plagas'), leer<Cdl>('cdl'), leer<Ssurgo>('ssurgo'),
    import('../../../datos/catalogos/cultivos.json'), import('../../../datos/catalogos/suelos.json'),
  ]);
  if (!serie) throw new Error(`El ejemplo "${id}" no trae serie de clima: sin clima no hay motor.`);
  const catalogo = cat.default as CatalogoCultivos;
  const faltan = Object.entries(manifiesto.datos)
    .filter(([, d]) => d.estado === 'NO_EVALUABLE' && d.motivo)
    .map(([dato, d]) => ({ dato, motivo: d.motivo! }));
  const sinDato = (dato: string) => ({ ok: false as const, error: { estado: 'ERROR_DATOS' as const, motivo: faltan.find((f) => f.dato === dato)?.motivo ?? 'No se grabó.' } });
  const clima = climaDeSerie(serie);
  const fecha = manifiesto.grabado.slice(0, 10);
  const avisos = [
    `Parcela de ejemplo en ${ejemplo.nombre} (${ejemplo.pais}): polígono ficticio sobre tierra de cultivo real, no es un levantamiento. Clima, suelo y terreno son datos reales de la API grabados el ${fecha}.`,
    ...faltan.filter((f) => f.dato !== 'cdl' && f.dato !== 'ssurgo').map((f) => `${NOMBRE_DATO[f.dato] ?? f.dato}: ${f.motivo}`),
    ...(calendario ? [] : ['Sin calendario local verificado para esta parcela.']),
  ];
  return {
    esDemo: true, ejemplo: { ...ejemplo }, parcela: structuredClone(parcela), serie, suelo, catalogo, tabla: tab.default as TablaSuelos,
    calendario, capa, avisos,
    avisosDatos: avisosDe({
      clima: { ok: true, datos: serie }, suelo: suelo ? { ok: true, datos: suelo } : sinDato('suelo'), cultivos: { ok: true, datos: catalogo },
      proximaTemporada: capa ? { ok: true, datos: capa } : sinDato('proxima-temporada'), calendario: calendario ? { ok: true, datos: calendario } : sinDato('calendario'),
    }),
    evidencia: { ndvi, smap, plagas, cdl, ssurgo }, clima, bioma: clima.bioma, faltan,
  };
}
