/* Generado por contratos/generar-tipos.mjs desde los JSON Schema de contratos/.
   No editar a mano: cambiar el schema y correr `npm run tipos`. */

/**
 * Identificador del cultivo en el catalogo (minusculas, sin acentos), por ejemplo 'maiz'. Coincide con el prefijo de los modelos .bbmodel (doc 07).
 */
export type IdCultivo = string;
/**
 * Ciclo agricola: PV (primavera-verano) u OI (otono-invierno), como los publica SIAP.
 */
export type Temporada = "PV" | "OI";
/**
 * Estados de respuesta de doc 04. EVALUABLE: parametros y fechas justificados. NO_EVALUABLE: falta un parametro, calendario o entrada esencial (nunca se sustituye por cero). EXPLORATORIO: ilustracion limitada y etiquetada, no es recomendacion. ERROR_DATOS: fallo de la API sin respaldo. RESPALDO_HISTORICO: se uso respaldo (Open-Meteo o cache); siempre visible.
 */
export type EstadoEvaluacion = "EVALUABLE" | "NO_EVALUABLE" | "EXPLORATORIO" | "ERROR_DATOS" | "RESPALDO_HISTORICO";
/**
 * Coordenada [longitud, latitud] en grados WGS84 (orden GeoJSON).
 *
 * @minItems 2
 * @maxItems 2
 */
export type LonLat = [number, number];
export type Fecha = string;
/**
 * Escenario climatico historico (doc 04): anio real cercano a p10 (seco), p50 (habitual) o p90 (lluvioso).
 */
export type Escenario = "seco" | "habitual" | "lluvioso";
/**
 * Parametro numerico con fuente obligatoria, o NO_EVALUABLE con motivo. Nunca un numero sin fuente.
 */
export type ValorCitado = ValorEvaluable | ValorNoEvaluable;
/**
 * De donde sale un valor. FUENTE: tomado de una fuente citada (API o tabla publicada). SUPUESTO: estimado por un modelo global o elegido por defecto, no medido en la parcela. USUARIO: lo capturo el usuario.
 */
export type EtiquetaProcedencia = "FUENTE" | "SUPUESTO" | "USUARIO";
/**
 * Identificador de celda 'c-<i>-<j>'.
 */
export type IdCelda = string;
/**
 * Identificador de rotacion, por ejemplo R0, R1, R2.
 */
export type IdRotacion = string;
/**
 * Etapa cualitativa para el render (doc 07). suelo_desnudo: entre ciclos o tras la cosecha. No es altura ni biomasa real.
 */
export type EtapaVisual = "suelo_desnudo" | "siembra" | "brote" | "crecimiento" | "madurez";
/**
 * Estado visual cualitativo derivado del motor (doc 05, paso 5).
 */
export type EstadoPlanta = "normal" | "estresada" | "marchita" | "podrida";
/**
 * Paso 7.1: true si alguna siembra cae fuera de ventana viable en todos los escenarios. null si no se pudo evaluar.
 */
export type FiltroClima = boolean | null;
/**
 * B (principal): puntaje por escenario combinando pilares, robustez = peor puntaje, minimax de arrepentimiento, desempate por promedio. A (respaldo): menor exposicion hidrica en el peor caso, sin puntaje compuesto.
 */
export type CriterioRanking = "B_minimax_arrepentimiento" | "A_exposicion_hidrica_peor_caso";
/**
 * Clase textural USDA (12 clases).
 */
export type ClaseTextura =
  | "arena"
  | "arena_franca"
  | "franco_arenoso"
  | "franco"
  | "franco_limoso"
  | "limo"
  | "franco_arcillo_arenoso"
  | "franco_arcilloso"
  | "franco_arcillo_limoso"
  | "arcillo_arenoso"
  | "arcillo_limoso"
  | "arcilla";
/**
 * Grupo simplificado del selector manual del MVP (doc 04).
 */
export type GrupoSuelo = "arenoso" | "franco" | "arcilloso";
/**
 * Porcentajes de arena, limo y arcilla del mapa global. null si no se tienen.
 */
export type FraccionesTextura = {
  arena: number;
  limo: number;
  arcilla: number;
} | null;
/**
 * Agua total disponible por metro de suelo. Si es EVALUABLE, la unidad es mm/m.
 */
export type TawPorMetro = ValorCitado & {};

export interface ContratosAgroHive {
  "calendario-local"?: CalendarioLocal;
  "clima-escenario"?: ClimaEscenario;
  cultivo?: CatalogoCultivos;
  parcela?: Parcela;
  "plan-siembra"?: PlanSiembra;
  "proxima-temporada"?: ProximaTemporadaAproximada;
  "resultado-celda"?: ResultadoCeldas;
  "resultado-rotacion"?: ResultadoRotacion;
  "serie-clima"?: SerieClima;
  suelo?: Suelo;
  "tabla-suelos"?: TablaSuelos;
}
/**
 * Calendario agricola de un lugar (A0.6, V-20; decidido el 14/11): por cultivo y temporada (PV, OI), la ventana de siembra con su fuente (SIAP, INIFAP) y si el cultivo se registra en el lugar. Depende del lugar, no del cultivo: por eso no esta en el catalogo. Sin dato, NO_EVALUABLE con motivo.
 */
export interface CalendarioLocal {
  meta: Meta;
  id: string;
  ubicacion: UbicacionCalendario;
  /**
   * @minItems 1
   */
  entradas: [EntradaCalendario, ...EntradaCalendario[]];
  advertencias?: Advertencia[];
}
/**
 * Cabecera de todo documento de contrato. Si esEjemplo es true, aviso es obligatorio y los valores no son datos reales.
 */
export interface Meta {
  /**
   * Version semantica del contrato con la que se genero el documento.
   */
  versionContrato: string;
  /**
   * true si el documento es ilustrativo (contratos/ejemplos/). Un ejemplo nunca se presenta como dato real.
   */
  esEjemplo: boolean;
  /**
   * Texto visible que explica que el documento es de ejemplo o sus limitaciones.
   */
  aviso?: string;
  /**
   * Momento en que se genero el documento (ISO 8601).
   */
  generado?: string;
}
export interface UbicacionCalendario {
  pais: string;
  /**
   * Clave INEGI de la entidad (2 digitos).
   */
  claveEstadoInegi: string;
  estado: string;
  /**
   * Clave INEGI del municipio dentro de la entidad (3 digitos).
   */
  claveMunicipioInegi: string;
  municipio: string;
  /**
   * Distrito de Desarrollo Rural (SIAP), si aplica.
   */
  ddr?: string;
  region?: string;
}
export interface EntradaCalendario {
  cultivo: IdCultivo;
  temporada: Temporada;
  regimen: "temporal" | "riego";
  estado: EstadoEvaluacion;
  motivo?: string;
  ventana: VentanaSiembraCitada | ValorNoEvaluable;
  presencia: PresenciaLocal;
}
export interface VentanaSiembraCitada {
  estado: "EVALUABLE";
  desdeMes: number;
  hastaMes: number;
  desdeDia?: number;
  hastaDia?: number;
  fuente: Fuente;
}
/**
 * Trazabilidad de un valor (doc 04, principio 5): fuente, coordenada, periodo, unidades y fecha de consulta.
 */
export interface Fuente {
  /**
   * Nombre de la fuente, por ejemplo 'NASA POWER (diario, comunidad AG)' o 'FAO-56 Tabla 12'.
   */
  nombre: string;
  url?: string;
  /**
   * Referencia bibliografica, tabla o pagina.
   */
  cita?: string;
  coordenada?: LonLat;
  periodo?: Periodo;
  unidades?: string;
  consultado?: Fecha;
  /**
   * Resolucion espacial o temporal del dato (por ejemplo '0.5 x 0.625 grados' o '250 m').
   */
  resolucion?: string;
  nota?: string;
}
export interface Periodo {
  desde: Fecha;
  hasta: Fecha;
}
export interface ValorNoEvaluable {
  estado: "NO_EVALUABLE";
  /**
   * Por que falta el valor (parametro sin fuente, dato no disponible, etc.).
   */
  motivo: string;
}
/**
 * Si la fuente registra el cultivo en el lugar (por ejemplo, superficie sembrada en SIAP en un periodo). no_registrado permite mostrar el cultivo sin recomendarlo.
 */
export interface PresenciaLocal {
  estado: "registrado" | "no_registrado" | "sin_dato";
  periodo?: Periodo;
  fuente: Fuente;
  nota?: string;
}
export interface Advertencia {
  /**
   * Identificador estable en MAYUSCULAS, por ejemplo SUELO_SUPUESTO o RESOLUCION_GRUESA.
   */
  codigo: string;
  mensaje: string;
  severidad: "info" | "aviso" | "critico";
}
/**
 * Serie climatica diaria de un escenario historico (seco, habitual, lluvioso). Es un anio real del historico, no una prediccion. La misma serie aplica a todas las celdas de la parcela.
 */
export interface ClimaEscenario {
  meta: Meta;
  escenario: Escenario;
  /**
   * Anio real del historico que representa el escenario. Siempre visible en la interfaz.
   */
  anioReal: number;
  /**
   * EVALUABLE con la fuente principal; RESPALDO_HISTORICO si se uso Open-Meteo o cache; EXPLORATORIO si la serie es ilustrativa o esta ajustada ('que pasa si': lluvia x factor); ERROR_DATOS si no hay serie.
   */
  estado: "EVALUABLE" | "RESPALDO_HISTORICO" | "EXPLORATORIO" | "ERROR_DATOS" | "NO_EVALUABLE";
  /**
   * true si los datos no vienen de la fuente principal (NASA POWER).
   */
  respaldo: boolean;
  coordenada: LonLat;
  fuente: Fuente;
  seleccion: SeleccionEscenario;
  diario: DiaClima[];
  humedadSuelo?: MetadatoHumedadSuelo;
  advertencias?: Advertencia[];
}
/**
 * Como se eligio el anio del escenario, para que sea reproducible (doc 04).
 */
export interface SeleccionEscenario {
  ventana: Periodo;
  /**
   * Percentil de lluvia anual buscado (10, 50 o 90 por defecto).
   */
  percentilObjetivo: number;
  /**
   * Lluvia del anio calendario del anio elegido (suma de diarios), solo como referencia. La cantidad con la que se elige el escenario va en lluviaTemporadasMm.
   */
  lluviaAnualMm: number | null;
  lluviaTemporadasMm?: LluviaTemporadas;
  /**
   * Descripcion breve del criterio, por ejemplo 'anio mas cercano al p10 de lluvia anual'.
   */
  criterio: string;
}
/**
 * Lluvia del anio agricola elegido por temporada (mm): ventanas de siembra PV y OI segun SIAP, y su suma (la cantidad sobre la que se calcula el percentil, doc 05 paso 1). null en un campo si falta algun dia. Opcional (agregado en 0.6.0).
 */
export interface LluviaTemporadas {
  /**
   * Lluvia de la ventana PV (mm).
   */
  pv: number | null;
  /**
   * Lluvia de la ventana OI (mm).
   */
  oi: number | null;
  /**
   * pv + oi (mm).
   */
  total: number | null;
  fuente: Fuente;
}
/**
 * Un dia de la serie. Los valores faltantes van en null (se muestran, no se rellenan).
 */
export interface DiaClima {
  fecha: Fecha;
  /**
   * Lluvia del dia en mm (POWER PRECTOTCORR).
   */
  lluviaMm: number | null;
  tMaxC: number | null;
  tMinC: number | null;
  tMediaC?: number | null;
  /**
   * Radiacion solar de onda corta en MJ/m2/dia (POWER ALLSKY_SFC_SW_DWN; la conversion de unidades la hace el backend, ver [VERIFICAR] en 04).
   */
  radiacionMjM2Dia?: number | null;
  humedadRelativaPct?: number | null;
  vientoMS?: number | null;
  /**
   * ET0 del dia si la fuente la entrega (Open-Meteo); si no, la calcula el motor.
   */
  et0Mm?: number | null;
  /**
   * Humedad de la zona de raices de NASA POWER (GWETROOT, MERRA-2): fraccion de SATURACION de 0 a 1, en los primeros ~100 cm, regional (0.5 x 0.625 grados). No es fraccion de TAW: para usarla en la cubeta se convierte con thetaSat, thetaFC y thetaWP del suelo (ver metadatos en humedadSuelo). null si falta.
   */
  humedadRaizFraccionSat?: number | null;
}
/**
 * De donde sale humedadRaizFraccionSat y para que se usa (V-06, decidido el 14/11).
 */
export interface MetadatoHumedadSuelo {
  variable: "GWETROOT";
  definicion: string;
  profundidadCm?: number | null;
  fuente: Fuente;
  /**
   * @minItems 1
   */
  uso: ["condicion_inicial" | "comparacion", ...("condicion_inicial" | "comparacion")[]];
}
/**
 * Catalogo propio de cultivos (decision 14/11, doc 13; actividad A1.5), sembrado desde FAO EcoCrop (rangos de temperatura, lluvia y ciclo) y FAO-56 (Kc y duracion de etapas). Cada parametro lleva su fuente o es NO_EVALUABLE; un cultivo con parametros esenciales faltantes es NO_EVALUABLE para el motor. Solo lleva lo que no depende del lugar: las ventanas de siembra viven en calendario-local.
 */
export interface CatalogoCultivos {
  meta: Meta;
  versionCatalogo: string;
  /**
   * @minItems 1
   */
  cultivos: [Cultivo, ...Cultivo[]];
}
export interface Cultivo {
  id: IdCultivo;
  nombreComun: string;
  nombreCientifico: string;
  estado: EstadoEvaluacion;
  /**
   * Para el indicador de aporte indirecto al suelo (doc 05). null si no se ha clasificado.
   */
  esLeguminosa?: boolean | null;
  cicloDias: ValorCitado;
  duracionEtapasDias: DuracionEtapas;
  kc: CoeficientesKc;
  profundidadRaizM?: ValorCitado;
  fraccionAgotamientoP?: ValorCitado;
  /**
   * Etapas FAO-56 donde el deficit pesa mas en el pilar hidrico.
   */
  etapasSensibles?: ("inicial" | "desarrollo" | "media" | "final")[];
  umbrales: UmbralesCultivo;
  modelo3d?: Modelo3D;
  notas?: string;
}
export interface ValorEvaluable {
  estado: "EVALUABLE";
  valor: number;
  unidad: string;
  fuente: Fuente;
  etiqueta?: EtiquetaProcedencia;
}
/**
 * Duracion de las cuatro etapas FAO-56 (inicial, desarrollo, media, final), en dias.
 */
export interface DuracionEtapas {
  inicial: ValorCitado;
  desarrollo: ValorCitado;
  media: ValorCitado;
  final: ValorCitado;
}
/**
 * Coeficientes de cultivo FAO-56: Kc inicial, medio y final. En la etapa de desarrollo el motor interpola.
 */
export interface CoeficientesKc {
  inicial: ValorCitado;
  media: ValorCitado;
  final: ValorCitado;
}
/**
 * Rangos de EcoCrop y umbral de estres por calor. La lluvia viene en dos escalas distintas: del ciclo (siembra a cosecha) y anual (como la publica EcoCrop); no se convierten entre si.
 */
export interface UmbralesCultivo {
  tMinAbsC: ValorCitado;
  tMaxAbsC: ValorCitado;
  tOptMinC: ValorCitado;
  tOptMaxC: ValorCitado;
  lluviaCicloMinMm: ValorCitado;
  lluviaCicloMaxMm: ValorCitado;
  lluviaAnualMinMm: ValorCitado;
  lluviaAnualMaxMm: ValorCitado;
  tEstresCalorC: ValorCitado;
}
/**
 * Prefijo de los archivos .bbmodel (doc 07: <cultivo>_<etapa>.bbmodel).
 */
export interface Modelo3D {
  prefijo: string;
}
/**
 * Parcela del usuario (demo fija o poligono libre) y su cuadricula de celdas con relieve. El clima es el mismo para toda la parcela (doc 04, resolucion); las celdas difieren por cultivo, suelo y relieve.
 */
export interface Parcela {
  meta: Meta;
  id: string;
  nombre?: string;
  /**
   * demo: parcela precargada. poligono_usuario: dibujada por el usuario en el mapa.
   */
  origen: "demo" | "poligono_usuario";
  ubicacion?: Ubicacion;
  /**
   * Anillo exterior [lon, lat] en WGS84, cerrado (el primer punto se repite al final, como en GeoJSON). Que este cerrado lo comprueba el generador de cuadricula, no el schema.
   *
   * @minItems 4
   */
  poligono: [LonLat, LonLat, LonLat, LonLat, ...LonLat[]];
  /**
   * true si el poligono no corresponde a la ubicacion real de una parcela (demo).
   */
  coordenadasIlustrativas?: boolean;
  areaHa: number;
  centroide: LonLat;
  /**
   * Lado de la celda cuadrada en metros locales (adaptativo para respetar el tope de celdas).
   */
  tamanoCeldaM: number;
  /**
   * Id del documento de suelo (contrato suelo) que aplica a la parcela.
   */
  sueloId: string;
  terreno: Terreno;
  /**
   * Cuadricula de la parcela. Tope propuesto de 1600 celdas (doc 08).
   *
   * @minItems 1
   * @maxItems 1600
   */
  celdas: [Celda, ...Celda[]];
  advertencias?: Advertencia[];
}
/**
 * Referencia administrativa, solo informativa.
 */
export interface Ubicacion {
  municipio?: string;
  estado?: string;
  pais?: string;
}
/**
 * Procedencia de la elevacion y la pendiente de las celdas.
 */
export interface Terreno {
  estado: EstadoEvaluacion;
  fuente: Fuente;
}
export interface Celda {
  id: IdCelda;
  /**
   * Fila.
   */
  i: number;
  /**
   * Columna.
   */
  j: number;
  centro: LonLat;
  /**
   * Fraccion del area de la celda dentro del poligono (0 a 1). Las celdas de borde pueden ser parciales.
   */
  fraccionDentro?: number;
  /**
   * Elevacion en metros. null si no se obtuvo (se muestra el hueco, no se rellena).
   */
  elevacionM: number | null;
  /**
   * Pendiente en porcentaje. null si no se pudo calcular.
   */
  pendientePct: number | null;
}
/**
 * Rotacion que arma el selector 'what if': que cultivo va en cada ciclo y, opcionalmente, en cada celda. Que los ciclos sean cronologicos y no se traslapen lo valida el motor (doc 04), no el schema.
 */
export interface PlanSiembra {
  meta: Meta;
  rotacionId: IdRotacion;
  nombre?: string;
  parcelaId: string;
  /**
   * Calendario local usado para sugerir las fechas, o constancia de que no hay.
   */
  calendarioLocal: ConCalendarioLocal | SinCalendarioLocal;
  /**
   * Como se asigna clima a cada ciclo (doc 05, paso 2). Decidido el 14/11 (A2.8): temporada_tipica, cada ciclo en su temporada tipica (PV u OI) dentro del anio del escenario.
   */
  asignacionClima: "temporada_tipica";
  /**
   * @minItems 1
   */
  ciclos: [Ciclo, ...Ciclo[]];
  /**
   * Solo si se pinta por bloques ([EN EVENTO]); null si toda la parcela sigue los ciclos generales. Clave: id de celda; valor: cultivos que reemplazan a los generales en esa celda.
   */
  porCelda: {
    /**
     * @minItems 1
     */
    [k: string]: [CicloCelda, ...CicloCelda[]];
  } | null;
}
export interface ConCalendarioLocal {
  calendarioId: string;
}
export interface SinCalendarioLocal {
  sinCalendarioLocal: true;
  motivo: string;
}
export interface Ciclo {
  ciclo: number;
  cultivo: IdCultivo;
  siembra: Fecha;
  temporada: Temporada;
  /**
   * Explicacion visible en la interfaz de por que se sugiere o se eligio esa fecha y de donde sale (calendario local y su fuente, o eleccion libre del usuario).
   */
  porQue: string;
  /**
   * true si la fecha cae en la ventana del calendario local; null si no hay calendario o ventana.
   */
  dentroDeVentana?: boolean | null;
}
export interface CicloCelda {
  ciclo: number;
  cultivo: IdCultivo;
}
/**
 * Capa opcional 'proxima temporada (aproximada)' (decision 14/11, doc 13; A2.13). Anomalia del pronostico estacional (ECMWF via Open-Meteo) aplicada a la climatologia historica, o respaldo estadistico propio (percentiles y tendencia). Se entrega SOLO como banda de incertidumbre por mes: no hay campo de cifra unica a proposito. Es complementaria al clima del escenario y no bloquea el MVP.
 */
export interface ProximaTemporadaAproximada {
  meta: Meta;
  /**
   * Siempre false: no predice una temporada exacta, muestra un rango plausible.
   */
  esPrediccion: false;
  /**
   * EXPLORATORIO por naturaleza; ERROR_DATOS o NO_EVALUABLE si no se pudo construir.
   */
  estado: "EXPLORATORIO" | "ERROR_DATOS" | "NO_EVALUABLE";
  /**
   * Texto visible obligatorio, por ejemplo 'Rango aproximado, no es una prediccion'.
   */
  aviso: string;
  /**
   * anomalia_estacional (metodo aprobado de A2.13): para cada mes se toma la distribucion historica de ese mes (20 anios de POWER) y se desplaza por la anomalia de SEAS5; la banda son los percentiles de esa distribucion desplazada. Sin tendencia, declarada en una advertencia. respaldo_estadistico: los mismos percentiles sin desplazar.
   */
  metodo: "anomalia_estacional" | "respaldo_estadistico";
  coordenada: LonLat;
  emitido: Fecha;
  /**
   * Horizonte fijo de 6 meses (V-21, decidido el 14/11: se habla en semestres), aunque el servicio estacional llegue a 7.
   */
  horizonteMeses: 6;
  climatologia?: Periodo;
  banda: DefinicionBanda;
  /**
   * @minItems 1
   */
  fuentes: [Fuente, ...Fuente[]];
  /**
   * @maxItems 6
   */
  meses:
    | []
    | [MesAproximado]
    | [MesAproximado, MesAproximado]
    | [MesAproximado, MesAproximado, MesAproximado]
    | [MesAproximado, MesAproximado, MesAproximado, MesAproximado]
    | [MesAproximado, MesAproximado, MesAproximado, MesAproximado, MesAproximado]
    | [MesAproximado, MesAproximado, MesAproximado, MesAproximado, MesAproximado, MesAproximado];
  advertencias?: Advertencia[];
}
/**
 * Que percentiles delimitan la banda (por defecto 10 y 90).
 */
export interface DefinicionBanda {
  percentilInferior: number;
  percentilSuperior: number;
}
export interface MesAproximado {
  /**
   * Mes en formato AAAA-MM.
   */
  mes: string;
  lluviaMm: RangoIncertidumbre;
  tMediaC: RangoIncertidumbre;
  /**
   * Mediana historica de lluvia del mes, solo como referencia de comparacion.
   */
  climatologiaLluviaMm?: number | null;
  /**
   * Mediana historica de temperatura media del mes, solo como referencia.
   */
  climatologiaTMediaC?: number | null;
}
/**
 * Banda [inferior, superior]. null en ambos extremos si no se pudo estimar.
 */
export interface RangoIncertidumbre {
  inferior: number | null;
  superior: number | null;
}
/**
 * Salida del motor por celda y fecha para una rotacion y un escenario. Es lo unico que leen la escena 3D, el modo 2D y los tooltips: el render no decide etapa ni estres. Nomenclatura: 'estado' es siempre el estado de evaluacion de doc 04; el estado visual de la planta es 'estadoPlanta'.
 */
export interface ResultadoCeldas {
  meta: Meta;
  rotacionId: IdRotacion;
  escenario: Escenario;
  anioReal: number;
  parcelaId: string;
  estado: EstadoEvaluacion;
  registros: RegistroCelda[];
  advertencias?: Advertencia[];
}
export interface RegistroCelda {
  celdaId: IdCelda;
  fecha: Fecha;
  estado: EstadoEvaluacion;
  /**
   * Obligatorio si el estado no es EVALUABLE: por que no se calculo o que limita el resultado.
   */
  motivo?: string;
  /**
   * Ciclo del plan en curso; null si la celda esta entre ciclos.
   */
  ciclo: number | null;
  /**
   * Cultivo en la celda; null si esta en suelo desnudo.
   */
  cultivo: IdCultivo | null;
  /**
   * Etapa visual; null si no hay parametros del cultivo para saberla (entonces el registro no es EVALUABLE y explica el motivo).
   */
  etapa: EtapaVisual | null;
  /**
   * Avance dentro de la etapa visual (0 a 1), para interpolar escala en el render.
   */
  avanceEtapa: number | null;
  estadoPlanta: EstadoPlanta | null;
  /**
   * Agua en la cubeta como fraccion de TAW (0 a 1).
   */
  humedad: number | null;
  /**
   * Deficit acumulado en el ciclo hasta la fecha (mm): ETc no cubierta.
   */
  deficitMm: number | null;
  /**
   * Exceso acumulado en el ciclo hasta la fecha (mm): escurrimiento o drenaje.
   */
  excesoMm: number | null;
  /**
   * Demanda del cultivo del dia, ETc = Kc x ET0 (mm).
   */
  etcMm?: number | null;
  /**
   * true si ese dia supero el umbral de calor del cultivo; null si no se evalua.
   */
  estresCalor?: boolean | null;
  /**
   * Indice relativo de erosion (0 a 1), inspirado en USLE/RUSLE; no son toneladas. null si el pilar no se calcula.
   */
  riesgoErosion: number | null;
  /**
   * true si el cultivo se muestra pero no se recomienda en el lugar; el registro explica el motivo y cita la fuente en fuenteMotivo.
   */
  noRecomendadoEnLugar?: boolean;
  fuenteMotivo?: Fuente;
}
/**
 * Metricas de una rotacion en los tres escenarios, peor caso, ranking y explicacion (doc 05, pasos 6 a 8). Criterio principal B (decidido el 14/11): puntaje compuesto por escenario, robustez = peor puntaje, minimax de arrepentimiento y desempate por promedio. El criterio A (solo pilar hidrico) se conserva como respaldo si los pilares 2 y 3 (A3.7) no llegan. Los null son huecos que el motor llena con valores calculados, nunca con numeros inventados.
 */
export interface ResultadoRotacion {
  meta: Meta;
  rotacionId: IdRotacion;
  estado: EstadoEvaluacion;
  filtroClima?: FiltroClima;
  /**
   * Cultivos de la rotacion que se muestran pero no se recomiendan en el lugar. Si hay alguno, la rotacion no puede ser EVALUABLE (queda EXPLORATORIO: se ilustra, no se recomienda).
   */
  cultivosNoRecomendados?: CultivoNoRecomendado[];
  porEscenario: MetricasPorEscenario;
  /**
   * Escenario en el que la rotacion sale peor segun el criterio de ranking; null si no es evaluable.
   */
  peorCaso: PeorCaso | null;
  /**
   * Criterio B: arrepentimiento maximo entre escenarios (mejor puntaje del escenario entre las rotaciones comparadas menos el puntaje de esta). null con el criterio A de respaldo o si no es evaluable.
   */
  arrepentimiento: number | null;
  /**
   * Criterio B: pesos con que se combinan los pilares en el puntaje. null con el criterio A o si no es evaluable. Sin pesos con fuente o justificados, se usan pesos iguales declarados como SUPUESTO; nunca pesos inventados presentados como dato.
   */
  ponderacion: Ponderacion | null;
  /**
   * Posicion en el ranking de robustez; null si la rotacion no es evaluable o no se ha ordenado.
   */
  ranking: Ranking | null;
  proximaTemporada?: ProximaTemporadaRotacion;
  advertencias: Advertencia[];
  explicacion: Explicacion;
}
/**
 * Cultivo que se muestra en la rotacion pero no se recomienda en ese lugar (por ejemplo, la fuente no lo registra en el municipio).
 */
export interface CultivoNoRecomendado {
  cultivo: IdCultivo;
  /**
   * @minItems 1
   */
  ciclos: [number, ...number[]];
  motivo: string;
  fuente: Fuente;
  calendarioId?: string;
}
export interface MetricasPorEscenario {
  seco: MetricasEscenario;
  habitual: MetricasEscenario;
  lluvioso: MetricasEscenario;
}
export interface MetricasEscenario {
  /**
   * Anio real del escenario, siempre visible.
   */
  anioReal: number | null;
  estado: EstadoEvaluacion;
  pilares: Pilares;
  /**
   * Criterio B: puntaje compuesto del escenario, de 0 a 1 (mayor es mejor). La normalizacion de cada pilar se documenta en A4.2. null con el criterio A o si el escenario no es evaluable.
   */
  puntaje: number | null;
}
export interface Pilares {
  deficitHidrico: PilarDeficitHidrico;
  compatibilidadCiclo?: PilarCompatibilidadCiclo;
  proteccionSuelo?: PilarProteccionSuelo;
  riesgoCalor?: PilarRiesgoCalor;
  aporteIndirecto?: PilarAporteIndirecto;
  excesoHidrico?: PilarExcesoHidrico;
}
/**
 * Pilar 1 (nucleo).
 */
export interface PilarDeficitHidrico {
  estado: EstadoEvaluacion;
  motivo?: string;
  proporcionDemandaNoCubierta: number | null;
  diasDeficit: number | null;
  diasDeficitEtapasSensibles: number | null;
  deficitTotalMm?: number | null;
  excesoTotalMm?: number | null;
}
/**
 * Pilar 2: siembras en meses viables segun clima y calendario.
 */
export interface PilarCompatibilidadCiclo {
  estado: EstadoEvaluacion;
  motivo?: string;
  siembrasFueraDeVentana: number | null;
}
/**
 * Pilar 3: indice relativo de erosion y periodos de suelo desnudo; no son toneladas.
 */
export interface PilarProteccionSuelo {
  estado: EstadoEvaluacion;
  motivo?: string;
  indiceErosionRelativo: number | null;
  diasSueloDesnudo: number | null;
}
export interface PilarRiesgoCalor {
  estado: EstadoEvaluacion;
  motivo?: string;
  diasEstresCalor: number | null;
}
/**
 * Reglas simples (leguminosa, cobertura, diversidad); no afirma nitrogeno medido.
 */
export interface PilarAporteIndirecto {
  estado: EstadoEvaluacion;
  motivo?: string;
  incluyeLeguminosa: boolean | null;
  especiesDistintas: number | null;
}
/**
 * Pilar de exceso de agua (decidido por Mompin el 14/11): percolacion por debajo de la raiz, FAO-56 ec. 88 (DP = (P - RO) + I - ETc - Dr,i-1 >= 0, cap. 8, 'Soil water balance'). fraccionLluviaPercolada = percolacion / lluvia de los dias de ciclo. Normalizacion del ranking: 1 - fraccionLluviaPercolada, declarada SUPUESTO (sin umbral publicado de encharcamiento por cultivo). Opcional (agregado en 0.7.0).
 */
export interface PilarExcesoHidrico {
  estado: EstadoEvaluacion;
  motivo?: string;
  /**
   * Percolacion profunda acumulada en los dias de ciclo (mm).
   */
  excesoTotalMm: number | null;
  /**
   * Dias de ciclo con percolacion profunda mayor que cero.
   */
  diasExceso: number | null;
  /**
   * Percolacion / lluvia de los dias de ciclo (0 a 1).
   */
  fraccionLluviaPercolada: number | null;
}
export interface PeorCaso {
  escenario: Escenario;
  criterio: CriterioRanking;
  /**
   * Nombre de la metrica que define el peor caso, por ejemplo 'deficitHidrico.proporcionDemandaNoCubierta' o 'puntaje'.
   */
  metrica: string;
  valor: number;
}
export interface Ponderacion {
  pesos: PesosPilares;
  etiqueta: EtiquetaProcedencia;
  fuente?: Fuente;
  pilaresExcluidos: (
    "deficitHidrico" | "compatibilidadCiclo" | "proteccionSuelo" | "riesgoCalor" | "aporteIndirecto" | "excesoHidrico"
  )[];
  nota: string;
}
/**
 * Peso de cada pilar que entra al puntaje (suman 1). Un pilar NO_EVALUABLE no lleva peso y va en pilaresExcluidos.
 */
export interface PesosPilares {
  deficitHidrico?: number;
  compatibilidadCiclo?: number;
  proteccionSuelo?: number;
  riesgoCalor?: number;
  aporteIndirecto?: number;
  excesoHidrico?: number;
}
export interface Ranking {
  posicion: number;
  /**
   * Total de rotaciones evaluables comparadas.
   */
  de: number;
  criterio: CriterioRanking;
  desempate?: string;
}
/**
 * Como le iria a la rotacion en la proxima temporada, evaluada con anios historicos reales analogos al pronostico estacional. Solo rangos entre analogos, nunca una cifra: no es una prediccion.
 */
export interface ProximaTemporadaRotacion {
  estado: "EXPLORATORIO" | "NO_EVALUABLE" | "ERROR_DATOS";
  motivo?: string;
  esPrediccion: false;
  aviso: string;
  emitido: Fecha;
  horizonte: HorizonteMeses;
  /**
   * Como se eligieron los anios analogos.
   */
  criterioAnalogos: string;
  ciclosEvaluados: number[];
  /**
   * Ciclos del plan que caen fuera del horizonte, con motivo.
   */
  ciclosFuera?: CicloFuera[];
  aniosAnalogos: AnioAnalogo[];
  rango: RangoProximaTemporada;
  /**
   * @minItems 1
   */
  fuentes: [Fuente, ...Fuente[]];
}
export interface HorizonteMeses {
  desde: string;
  hasta: string;
}
export interface CicloFuera {
  ciclo: number;
  motivo: string;
}
export interface AnioAnalogo {
  anioReal: number;
  mesesDentro: number;
  deMeses: number;
  estado: EstadoEvaluacion;
  motivo?: string;
  deficitHidrico: PilarDeficitHidrico;
  excesoHidrico: PilarExcesoHidrico;
}
/**
 * Rango entre los anios analogos (inferior, superior) de cada metrica.
 */
export interface RangoProximaTemporada {
  proporcionDemandaNoCubierta: RangoIncertidumbre;
  fraccionLluviaPercolada: RangoIncertidumbre;
  excesoTotalMm: RangoIncertidumbre;
}
/**
 * Tarjeta de la rotacion (doc 05, paso 8). Si la redacta un LLM, solo usa numeros ya calculados; siempre hay plantilla de respaldo.
 */
export interface Explicacion {
  porQue: string;
  evidencia: Evidencia[];
  beneficios: string[];
  huecos: string[];
  riesgos: string[];
  /**
   * Aviso de validar con un experto local.
   */
  avisoExperto: string;
  redactadaPor: "plantilla" | "llm";
}
/**
 * Dato concreto que respalda la explicacion (anio real, lluvia, mes, deficit).
 */
export interface Evidencia {
  texto: string;
  valor?: number | null;
  unidad?: string;
  fuente: Fuente;
}
/**
 * Respuesta de GET /api/clima: serie diaria de un periodo, sin elegir escenario (modelo SerieClima de api/app/modelos.py). El motor (A2.5) corta de aqui los anios de cada escenario y arma clima-escenario. Usa el mismo dia que clima-escenario.
 */
export interface SerieClima {
  meta: Meta;
  estado: EstadoEvaluacion;
  /**
   * true si los datos no vienen de NASA POWER.
   */
  respaldo: boolean;
  coordenada: LonLat;
  periodo?: Periodo;
  fuente: Fuente;
  diario: DiaClima[];
  humedadSuelo?: MetadatoHumedadSuelo;
  advertencias?: Advertencia[];
}
/**
 * Suelo de la parcela (decisiones del 14/11, doc 13): textura y pH estimados por zona con mapas globales o elegidos en el selector manual de respaldo. Se consultan AMBOS servicios (ISRIC SoilGrids por WCS y OpenLandMap) para compararlos: cada uno va en 'estimaciones' y 'estimacionUsada' dice cual alimenta textura, pH y agua. El TAW sale de la tabla FAO-56 (A1.6) o de la pedotransferencia de Saxton y Rawls (2006). Siempre etiqueta SUPUESTO: no se mide en la parcela.
 */
export interface Suelo {
  meta: Meta;
  id: string;
  /**
   * Todo el documento es una estimacion, no una medicion.
   */
  etiqueta: "SUPUESTO";
  /**
   * mapa_global: estimado por script desde ISRIC u OpenLandMap y servido desde cache. selector_manual: el usuario eligio el tipo de suelo.
   */
  origen: "mapa_global" | "selector_manual";
  /**
   * Texto visible para el usuario, por ejemplo 'pH y textura estimados por un modelo global; no son una medicion de su parcela'.
   */
  aviso: string;
  coordenada?: LonLat;
  profundidad?: ProfundidadCm;
  textura: Textura;
  /**
   * pH estimado o NO_EVALUABLE si el servicio no respondio y no hay respaldo.
   */
  ph: PhEstimado | ValorNoEvaluable;
  /**
   * Estimaciones por servicio, para comparar ISRIC y OpenLandMap. Opcional; si existe, estimacionUsada es obligatoria.
   *
   * @minItems 1
   */
  estimaciones?: [EstimacionSuelo, ...EstimacionSuelo[]];
  /**
   * id de la estimacion que alimenta textura, pH y agua; null si se uso el selector manual.
   */
  estimacionUsada?: string | null;
  agua?: AguaSuelo;
  advertencias?: Advertencia[];
}
/**
 * Intervalo de profundidad de la estimacion en cm (por ejemplo 0 a 30).
 */
export interface ProfundidadCm {
  desdeCm: number;
  hastaCm: number;
}
export interface Textura {
  estado: EstadoEvaluacion;
  etiqueta: "SUPUESTO";
  /**
   * Clase USDA si viene del mapa global; null si solo se conoce el grupo del selector.
   */
  clase?: ClaseTextura | null;
  grupo: GrupoSuelo;
  fraccionesPct?: FraccionesTextura;
  fuente?: Fuente;
}
export interface PhEstimado {
  estado: "EVALUABLE" | "EXPLORATORIO" | "RESPALDO_HISTORICO";
  etiqueta: "SUPUESTO";
  /**
   * pH en agua estimado por el modelo global.
   */
  valor: number;
  fuente: Fuente;
}
/**
 * Lo que devolvio un servicio de suelo para la coordenada.
 */
export interface EstimacionSuelo {
  id: string;
  servicio: "isric_soilgrids_wcs" | "openlandmap";
  estado: EstadoEvaluacion;
  fuente: Fuente;
  profundidad?: ProfundidadCm;
  textura: TexturaEstimada;
  /**
   * pH en agua; null si el servicio no lo dio.
   */
  ph: number | null;
  /**
   * Carbono organico del suelo (g/kg); null si no se dio.
   */
  carbonoOrganicoGKg?: number | null;
  motivo?: string;
}
export interface TexturaEstimada {
  clase: ClaseTextura | null;
  fraccionesPct: FraccionesTextura;
}
/**
 * Agua disponible del suelo y como se obtuvo. Si el TAW es EVALUABLE, metodoTaw es obligatorio.
 */
export interface AguaSuelo {
  tawMmPorM: ValorCitado;
  metodoTaw?: MetodoTaw;
  retencion?: RetencionAgua;
}
export interface MetodoTaw {
  /**
   * tabla_fao56: TAW por clase textural de contratos/tabla-suelos (FAO-56 Tabla 19). pedotransferencia_saxton_rawls_2006: calculado desde arena, arcilla y materia organica (aplica a cualquier textura, incluidas las que no estan en la tabla).
   */
  metodo: "tabla_fao56" | "pedotransferencia_saxton_rawls_2006";
  fuente: Fuente;
  etiqueta?: "SUPUESTO";
  entradas?: EntradasPedotransferencia;
}
/**
 * Entradas de Saxton y Rawls (2006) y de que estimacion salen.
 */
export interface EntradasPedotransferencia {
  estimacionId: string;
  arenaPct: ValorCitado;
  arcillaPct: ValorCitado;
  materiaOrganicaPct: ValorCitado;
}
/**
 * Contenidos de agua (m3/m3) a saturacion, capacidad de campo y punto de marchitez. Hacen falta, por ejemplo, para pasar la humedad de POWER (fraccion de saturacion) a fraccion de TAW.
 */
export interface RetencionAgua {
  thetaSatM3M3: ValorCitado;
  thetaFcM3M3: ValorCitado;
  thetaWpM3M3: ValorCitado;
}
/**
 * Tabla de suelos por clase textural (A1.6): rangos de humedad y agua disponible por metro (TAW) de FAO-56 Tabla 19, con fuente por valor. La consume el motor para pasar de la textura del suelo (contrato suelo) a la capacidad de la cubeta. Basada en la propuesta de Mafer (datos/catalogos/suelos.schema.json). Son valores tipicos por textura, no medidos: aplicados a una parcela siguen siendo SUPUESTO.
 */
export interface TablaSuelos {
  meta: Meta;
  versionCatalogo: string;
  /**
   * Como se obtiene tawMmPorM a partir de los rangos, por ejemplo 'punto medio de (thetaFC - thetaWP) x 1000, FAO-56 ecuacion 82'.
   */
  metodoTaw?: string;
  representanteGrupo: RepresentanteGrupo;
  notaRepresentanteGrupo?: string;
  /**
   * Una entrada por clase USDA. Que no se repitan clases lo comprueba el motor o el generador del catalogo.
   *
   * @minItems 1
   */
  texturas: [TexturaTabla, ...TexturaTabla[]];
}
/**
 * Clase USDA que usa cada grupo del selector manual cuando no hay mapa global. Es una eleccion del equipo, no de FAO.
 */
export interface RepresentanteGrupo {
  arenoso: ClaseTextura;
  franco: ClaseTextura;
  arcilloso: ClaseTextura;
}
export interface TexturaTabla {
  clase: ClaseTextura;
  grupo: GrupoSuelo;
  /**
   * EVALUABLE si la clase tiene TAW con fuente; NO_EVALUABLE si la tabla no la cubre.
   */
  estado: "EVALUABLE" | "NO_EVALUABLE";
  /**
   * Nombre de la fila en FAO-56 Tabla 19 (por ejemplo 'Loam'); null si no hay fila para esa clase.
   */
  filaFao: string | null;
  rangos: RangosHumedadSuelo | ValorNoEvaluable;
  tawMmPorM: TawPorMetro;
}
/**
 * Fila de FAO-56 Tabla 19: humedad a capacidad de campo y punto de marchitez (m3/m3), agua disponible (m3/m3), REW y TEW (mm).
 */
export interface RangosHumedadSuelo {
  estado: "EVALUABLE";
  fuente: Fuente;
  thetaFcM3M3: RangoTabla;
  thetaWpM3M3: RangoTabla;
  aguaDisponibleM3M3: RangoTabla;
  rewMm: RangoTabla;
  tewMm: RangoTabla;
}
/**
 * Rango [min, max] publicado en la tabla. Que min <= max lo comprueba el generador.
 */
export interface RangoTabla {
  min: number;
  max: number;
}
