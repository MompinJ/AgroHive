// B7, pantalla Terreno: lista de ejemplos, dibujo de la parcela, mapa y tamano de celda.
// Los paises, el clima de Koppen y los mensajes de la cuadricula vienen de datos o de web/src/geo/ en espanol: aqui se
// les da su etiqueta visible en ingles (por id, por clase de Koppen o por el mensaje exacto), sin cambiar el dato.
import { idiomaActual, tt } from '../actual';
export const terrenoEs = {
  'terreno.tituloA': 'Empieza por',
  'terreno.tituloB': 'un terreno.',
  'terreno.intro': 'Abre una parcela de ejemplo en otro lugar del mundo o dibuja el contorno de la tuya.',
  'terreno.verEjemplos': 'Ver ejemplos',
  'terreno.dibujarMia': 'Dibujar mi parcela',
  'terreno.ejemplosEtiqueta': 'Parcelas de ejemplo',
  'terreno.ejemplosTitulo': 'Seis lugares del mundo',
  'terreno.clima': 'clima {descripcion}',
  'terreno.avisoEjemplos': 'Parcelas de ejemplo, no son levantamientos: poligonos ficticios sobre tierra de cultivo real, con datos reales de la API grabados en la fecha indicada. Los cultivos sugeridos son ejemplos de la region, no una recomendacion.',
  'terreno.poligonoEtiqueta': 'Polígono personalizado',
  'terreno.poligonoTitulo': 'Tu propio terreno',
  'terreno.poligonoEstado': 'Contorno y cuadrícula',
  'terreno.poligonoTexto': 'Dibuja los límites, revisa la cuadrícula y consulta la elevación. El relieve faltante se muestra como no evaluable.',
  'pais.México': 'México',
  'pais.Brasil': 'Brasil',
  'pais.Kenia': 'Kenia',
  'pais.India': 'India',
  'pais.España': 'España',
  'pais.Estados Unidos': 'Estados Unidos',
  'dibujo.titulo': 'Dibuja tu parcela',
  'dibujo.intro': 'Marca las esquinas en el mapa. Arrastra un vértice para moverlo o el punto de en medio de un lado para agregar uno.',
  'dibujo.cargandoMapa': 'Cargando mapa…',
  'dibujo.herramientas': 'Herramientas de dibujo',
  'dibujo.deshacer': 'Deshacer',
  'dibujo.borrarTodo': 'Borrar todo',
  'dibujo.porCoordenadas': 'Agregar por coordenadas',
  'dibujo.centrar': 'Centrar en el contorno',
  'dibujo.acercar': 'Acercar',
  'dibujo.alejar': 'Alejar',
  'dibujo.como': 'Cómo dibujar',
  'dibujo.formCoordenadas': 'Agregar vértice por coordenadas',
  'dibujo.longitud': 'Longitud',
  'dibujo.latitud': 'Latitud',
  'dibujo.agregar': 'Agregar',
  'dibujo.errorCoordenadas': 'Longitud entre −180 y 180; latitud entre −85 y 85.',
  'dibujo.limite': 'El límite es de {limite} vértices.',
  'dibujo.ayudaClicB': 'Clic',
  'dibujo.ayudaClic': ' en el mapa: agrega un vértice.',
  'dibujo.ayudaArrastraB': 'Arrastra',
  'dibujo.ayudaArrastra': ' un vértice: lo mueve.',
  'dibujo.ayudaMedioB': 'Arrastra',
  'dibujo.ayudaMedio': ' el punto medio de un lado: agrega uno ahí.',
  'dibujo.ayudaBorrarB': 'Doble clic',
  'dibujo.ayudaBorrar': ' o clic derecho en un vértice: lo borra (con teclado, Suprimir).',
  'dibujo.primerVertice': 'Haz clic en el mapa para marcar el primer vértice',
  'dibujo.vertice': 'vértice',
  'dibujo.vertices': 'vértices',
  'dibujo.areaCeldas': ' · {area} ha · {celdas} celdas',
  'dibujo.faltan': ' · faltan {n}',
  'dibujo.tamano': 'Tamaño de celda: {tamano}',
  'dibujo.automatico': 'automático',
  'dibujo.errorElevacion': 'No se pudo consultar la elevación.',
  'dibujo.sinElevacion': 'Continuar sin elevación',
  'dibujo.consultando': 'Consultando elevación…',
  'dibujo.reintentar': 'Reintentar',
  'dibujo.usar': 'Usar esta parcela',
  'dibujo.elevacionEjemplo': 'La elevación recibida es de ejemplo, no corresponde a mediciones reales.',
  'dibujo.errorCuadricula': 'No se pudo generar la cuadrícula.',
  'celda.texto': '1 celda = {lado} × {lado} (≈ {superficie})',
  'celda.etiqueta': 'Tamaño de celda',
  'celda.automatico': 'Automático',
  'celda.leyenda': ' en el mapa trazado. Las celdas del borde pueden quedar cortadas por el contorno.',
  'celda.nota': 'Celdas más chicas siguen mejor el contorno, pero son más. El tope es de {tope} celdas.',
  'celda.subido': ' Pediste {pedido} m: se usan {lado} m para no pasar del tope.',
  'celda.ajustado': 'Pediste celdas de {pedido} m; se usan de {lado} m para no pasar de {tope} celdas.',
  'mapa.satelite': 'Satélite',
  'mapa.calles': 'Mapa',
  'mapa.vista': 'Vista del mapa',
  'mapa.vertice': 'Vértice {n}',
  'mapa.verticeTitulo': 'Vértice {n}: arrastra para mover; doble clic o clic derecho para borrar',
  'mapa.medioTitulo': 'Arrastra para agregar un vértice en este lado',
  'mapa.lienzo': 'Mapa para dibujar el contorno de la parcela. Clic agrega un vértice.',
  'mapa.errorTeselas': 'No cargó parte del mapa. Prueba la otra vista.',
} as const;

export const terrenoEn: Record<keyof typeof terrenoEs, string> = {
  'terreno.tituloA': 'Start with',
  'terreno.tituloB': 'a plot of land.',
  'terreno.intro': 'Open a sample plot somewhere else in the world or draw the outline of your own.',
  'terreno.verEjemplos': 'See examples',
  'terreno.dibujarMia': 'Draw my plot',
  'terreno.ejemplosEtiqueta': 'Sample plots',
  'terreno.ejemplosTitulo': 'Six places around the world',
  'terreno.clima': '{descripcion} climate',
  'terreno.avisoEjemplos': 'Sample plots, not field surveys: made-up outlines on real cropland, with real API data recorded on the date shown. The suggested crops are examples from the region, not a recommendation.',
  'terreno.poligonoEtiqueta': 'Custom outline',
  'terreno.poligonoTitulo': 'Your own plot',
  'terreno.poligonoEstado': 'Outline and grid',
  'terreno.poligonoTexto': 'Draw the boundaries, check the grid and look up the elevation. Missing terrain data is shown as not evaluable.',
  'pais.México': 'Mexico',
  'pais.Brasil': 'Brazil',
  'pais.Kenia': 'Kenya',
  'pais.India': 'India',
  'pais.España': 'Spain',
  'pais.Estados Unidos': 'United States',
  'dibujo.titulo': 'Draw your plot',
  'dibujo.intro': 'Mark the corners on the map. Drag a vertex to move it, or the midpoint of a side to add one.',
  'dibujo.cargandoMapa': 'Loading map…',
  'dibujo.herramientas': 'Drawing tools',
  'dibujo.deshacer': 'Undo',
  'dibujo.borrarTodo': 'Clear all',
  'dibujo.porCoordenadas': 'Add by coordinates',
  'dibujo.centrar': 'Center on the outline',
  'dibujo.acercar': 'Zoom in',
  'dibujo.alejar': 'Zoom out',
  'dibujo.como': 'How to draw',
  'dibujo.formCoordenadas': 'Add a vertex by coordinates',
  'dibujo.longitud': 'Longitude',
  'dibujo.latitud': 'Latitude',
  'dibujo.agregar': 'Add',
  'dibujo.errorCoordenadas': 'Longitude between −180 and 180; latitude between −85 and 85.',
  'dibujo.limite': 'The limit is {limite} vertices.',
  'dibujo.ayudaClicB': 'Click',
  'dibujo.ayudaClic': ' on the map: adds a vertex.',
  'dibujo.ayudaArrastraB': 'Drag',
  'dibujo.ayudaArrastra': ' a vertex: moves it.',
  'dibujo.ayudaMedioB': 'Drag',
  'dibujo.ayudaMedio': ' the midpoint of a side: adds one there.',
  'dibujo.ayudaBorrarB': 'Double-click',
  'dibujo.ayudaBorrar': ' or right-click a vertex: deletes it (with the keyboard, Delete).',
  'dibujo.primerVertice': 'Click on the map to place the first vertex',
  'dibujo.vertice': 'vertex',
  'dibujo.vertices': 'vertices',
  'dibujo.areaCeldas': ' · {area} ha · {celdas} cells',
  'dibujo.faltan': ' · {n} more needed',
  'dibujo.tamano': 'Cell size: {tamano}',
  'dibujo.automatico': 'automatic',
  'dibujo.errorElevacion': 'Could not look up the elevation.',
  'dibujo.sinElevacion': 'Continue without elevation',
  'dibujo.consultando': 'Looking up elevation…',
  'dibujo.reintentar': 'Try again',
  'dibujo.usar': 'Use this plot',
  'dibujo.elevacionEjemplo': 'The elevation received is sample data, not real measurements.',
  'dibujo.errorCuadricula': 'Could not build the grid.',
  'celda.texto': '1 cell = {lado} × {lado} (≈ {superficie})',
  'celda.etiqueta': 'Cell size',
  'celda.automatico': 'Automatic',
  'celda.leyenda': ' on the drawn map. Cells on the edge may be cut by the outline.',
  'celda.nota': 'Smaller cells follow the outline better, but there are more of them. The limit is {tope} cells.',
  'celda.subido': ' You asked for {pedido} m: {lado} m is used to stay under the limit.',
  'celda.ajustado': 'You asked for {pedido} m cells; {lado} m cells are used to stay under {tope} cells.',
  'mapa.satelite': 'Satellite',
  'mapa.calles': 'Map',
  'mapa.vista': 'Map view',
  'mapa.vertice': 'Vertex {n}',
  'mapa.verticeTitulo': 'Vertex {n}: drag to move; double-click or right-click to delete',
  'mapa.medioTitulo': 'Drag to add a vertex on this side',
  'mapa.lienzo': 'Map for drawing the plot outline. Click adds a vertex.',
  'mapa.errorTeselas': 'Part of the map did not load. Try the other view.',
};

/** Mensajes que lanza web/src/geo/cuadricula.ts (en espanol), con su version en ingles. */
export const ERRORES_CUADRICULA_EN: Readonly<Record<string, string>> = {
  'Usa entre 3 y 200 vértices.': 'Use between 3 and 200 vertices.',
  'Coordenadas inválidas. Usa longitud entre −180 y 180 y latitud entre −85 y 85.': 'Invalid coordinates. Use longitude between −180 and 180 and latitude between −85 and 85.',
  'Hay vértices repetidos.': 'There are repeated vertices.',
  'El contorno se cruza o no forma un polígono válido.': 'The outline crosses itself or is not a valid polygon.',
  'El contorno debe cubrir al menos un metro cuadrado.': 'The outline must cover at least one square meter.',
  'No se admiten parcelas que crucen el antimeridiano.': 'Plots that cross the antimeridian are not supported.',
  'La parcela supera el límite local de 100 km. Dibuja un contorno menor.': 'The plot exceeds the 100 km local limit. Draw a smaller outline.',
  'No se pudieron generar celdas para este contorno.': 'No cells could be built for this outline.',
};

/** Clima de Koppen-Geiger en ingles, con los nombres de la Tabla 1 de Peel et al. (2007), como describirKoppen de geo/koppen.ts. */
export function koppenEn(clase: string): string {
  const g = clase[0] as 'A' | 'B' | 'C' | 'D' | 'E';
  const primera = { A: 'tropical', B: 'arid', C: 'temperate', D: 'cold', E: 'polar' }[g] ?? clase;
  const completa: Record<string, string> = { Af: 'rainforest', Am: 'monsoon', Aw: 'savannah', ET: 'tundra', EF: 'frost' };
  if (completa[clase]) return `${primera}, ${completa[clase]}`;
  if (g === 'B') return `${primera}, ${clase[1] === 'W' ? 'desert' : 'steppe'}, ${clase[2] === 'h' ? 'hot' : 'cold'}`;
  const s = clase[1], t = clase[2] ?? '';
  const fin = t === 'd' ? 'very cold winter' : `${{ a: 'hot', b: 'warm', c: 'cold' }[t] ?? t} summer`;
  const estacion = s === 's' ? 'dry summer' : s === 'w' ? 'dry winter' : 'no dry season';
  return `${primera}, ${estacion}, ${fin}`;
}

/** "1 celda = 20.0 m × 20.0 m (≈ 400 m²)" de describirCelda (geo/escala-celda.ts), en el idioma activo. */
export function textoCelda(d: { lado: string; superficie: string }): string {
  return tt('celda.texto', { lado: d.lado, superficie: d.superficie });
}

/** Mensaje de la cuadricula (error de geo/cuadricula.ts o su advertencia) en el idioma activo. */
export function mensajeCuadricula(mensaje: string, codigo?: string, valores?: { pedido?: number | string; lado?: string; tope?: number }): string {
  if (idiomaActual() !== 'en') return mensaje;
  if (codigo === 'TAMANO_CELDA_AJUSTADO' && valores) return tt('celda.ajustado', { pedido: valores.pedido ?? '', lado: valores.lado ?? '', tope: valores.tope ?? '' });
  const tope = /^La cuadrícula pasa de (\d+) celdas/.exec(mensaje);
  if (tope) return `The grid has more than ${tope[1]} cells; choose a larger cell size.`;
  return ERRORES_CUADRICULA_EN[mensaje] ?? mensaje;
}
