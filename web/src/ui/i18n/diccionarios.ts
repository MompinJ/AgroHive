export type Idioma = 'es' | 'en';
import { terrenoEn, terrenoEs } from './textos/terreno';
import { tutorialEn, tutorialEs } from './textos/tutorial';
import { laboratorioEn, laboratorioEs } from './textos/laboratorio';
import { escenaEn, escenaEs } from './textos/escena';
import { comparacionEn, comparacionEs } from './textos/comparacion';
import { metodoEn, metodoEs } from './textos/metodo';

const es = {
  'idioma.etiqueta': 'Idioma',
  'nav.inicio': 'Inicio',
  'nav.terreno': 'Terreno',
  'nav.cultivos': 'Cultivos',
  'nav.escenarios': 'Escenarios',
  'nav.comparacion': 'Comparación',
  'nav.metodo': 'Método y fuentes',
  'nav.saltar': 'Saltar al contenido',
  'pasos.titulo': 'Pasos',
  'pasos.descripcion': 'Paso {actual} de {total}: {nombre}',
  'pasos.completado': ', completado',
  'pasos.bloqueado': ', bloqueado hasta completar el anterior',
  'pasos.bloqueadoCorto': 'Bloqueado',
  'pasos.terreno': 'Elige tu parcela',
  'pasos.cultivos': 'Pinta tus siembras',
  'pasos.escenarios': 'Años seco a lluvioso',
  'pasos.comparacion': 'La más robusta',
  'escenario.seco': 'Año seco',
  'escenario.habitual': 'Año normal',
  'escenario.lluvioso': 'Año lluvioso',
  'estado.EVALUABLE': 'Evaluable',
  'estado.NO_EVALUABLE': 'No evaluable',
  'estado.EXPLORATORIO': 'Solo para explorar',
  'estado.ERROR_DATOS': 'Error de datos',
  'estado.RESPALDO_HISTORICO': 'Respaldo histórico',
  'etiqueta.SUPUESTO': 'Supuesto',
  'inicio.etiqueta': 'Agricultura · Clima · Decisiones',
  'inicio.tituloPrimero': 'Cada ciclo abre',
  'inicio.tituloSegundo': 'otra posibilidad.',
  'inicio.pregunta': '¿Y si cambias lo que siembras?',
  'inicio.descripcion': 'Explora rotaciones de cultivos con la historia climática de NASA y compara cómo responden en distintos escenarios.',
  'inicio.dibujar': 'Dibujar un terreno',
  'inicio.aviso': 'Prototipo de demostración · Los datos ilustrativos no son predicciones agrícolas.',
  ...terrenoEs,
  ...tutorialEs,
  ...laboratorioEs,
  ...escenaEs,
  ...comparacionEs,
  ...metodoEs,
} as const;

export type ClaveTexto = keyof typeof es;

const en: Record<ClaveTexto, string> = {
  'idioma.etiqueta': 'Language',
  'nav.inicio': 'Home',
  'nav.terreno': 'Land',
  'nav.cultivos': 'Crops',
  'nav.escenarios': 'Scenarios',
  'nav.comparacion': 'Comparison',
  'nav.metodo': 'Methods and sources',
  'nav.saltar': 'Skip to content',
  'pasos.titulo': 'Steps',
  'pasos.descripcion': 'Step {actual} of {total}: {nombre}',
  'pasos.completado': ', completed',
  'pasos.bloqueado': ', locked until the previous step is complete',
  'pasos.bloqueadoCorto': 'Locked',
  'pasos.terreno': 'Choose your plot',
  'pasos.cultivos': 'Paint your crops',
  'pasos.escenarios': 'Dry to wet years',
  'pasos.comparacion': 'The most robust',
  'escenario.seco': 'Dry year',
  'escenario.habitual': 'Normal year',
  'escenario.lluvioso': 'Wet year',
  'estado.EVALUABLE': 'Evaluable',
  'estado.NO_EVALUABLE': 'Not evaluable',
  'estado.EXPLORATORIO': 'For exploration only',
  'estado.ERROR_DATOS': 'Data error',
  'estado.RESPALDO_HISTORICO': 'Historical fallback',
  'etiqueta.SUPUESTO': 'Assumed',
  'inicio.etiqueta': 'Agriculture · Climate · Decisions',
  'inicio.tituloPrimero': 'Every cycle opens',
  'inicio.tituloSegundo': 'new possibilities.',
  'inicio.pregunta': 'What if you changed what you plant?',
  'inicio.descripcion': 'Explore crop rotations with NASA climate history and compare how they respond to different scenarios.',
  'inicio.dibujar': 'Draw a plot',
  'inicio.aviso': 'Demonstration prototype · Illustrative data are not agricultural predictions.',
  ...terrenoEn,
  ...tutorialEn,
  ...laboratorioEn,
  ...escenaEn,
  ...comparacionEn,
  ...metodoEn,
};

export const diccionarios: Record<Idioma, Record<ClaveTexto, string>> = { es, en };

export function traducir(idioma: Idioma, clave: ClaveTexto, valores: Readonly<Record<string, string | number>> = {}): string {
  return diccionarios[idioma][clave].replace(/\{(\w+)\}/g, (original: string, nombre: string) =>
    valores[nombre] === undefined ? original : String(valores[nombre]));
}
