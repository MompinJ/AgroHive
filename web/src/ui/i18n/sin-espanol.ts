// Detector de texto en espanol que quedo sin traducir, para las pruebas de B7 (pantallas en ingles).
// Mira el texto visible y los atributos que se leen (aria-label, title, alt, placeholder, data-tip) de un HTML renderizado.
// Los nombres propios de lugares y fuentes y los estados del contrato (NO_EVALUABLE, EXPLORATORIO) no cuentan.
const PALABRAS = /\b(el|la|los|las|del|de|que|para|con|por|una|uno|sin|año|años|días|lluvia|cultivo|cultivos|siembra|suelo|agua|parcela|ejemplo|ejemplos|terreno|clima|mapa|celda|celdas|vértice|vértices|tamaño|elige|dibuja|usar|cargando|consultando|aviso|riesgo|fecha|seco|lluvioso|escenario|escenarios|comparación|método|fuentes)\b|[áéíóúñ¿¡]/i;
const PERMITIDOS = [
  /Bajío|Guanajuato|Jaral del Progreso|Cerro Culiacán|Belmonte de Campos|Castilla y León|Tierra de Campos|Uasin Gishu|Sorriso|Mato Grosso|Ludhiana|Punjab|Story County|Iowa|Rift Valley|Esquilote/g,
  /NO_EVALUABLE|EXPLORATORIO|ERROR_DATOS|RESPALDO_HISTORICO|SUPUESTO/g,
  /México|Español/g,
];

export function textosDe(html: string): string[] {
  const atributos = [...html.matchAll(/\b(?:aria-label|title|alt|placeholder|data-tip)="([^"]*)"/g)].map((m) => m[1] as string);
  const visibles = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, '\n')
    .split('\n');
  return [...visibles, ...atributos].map((x) => x.replace(/&[a-z#0-9]+;/gi, ' ').trim()).filter(Boolean);
}

/** Textos que parecen espanol (despues de quitar nombres propios y estados). */
export function enEspanol(html: string): string[] {
  return textosDe(html).filter((x) => PALABRAS.test(PERMITIDOS.reduce((t, r) => t.replace(r, ''), x)));
}
