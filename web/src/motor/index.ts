// Punto de entrada del motor (A2.5 a A2.7, A4.2 y la parte del motor de A2.13). La interfaz usa crearClienteMotor (Web Worker); las pruebas y
// herramientas pueden llamar las funciones puras directamente.
export { crearClienteMotor, type ClienteMotor } from './cliente';
export { seleccionarEscenarios, lluviaPorAnioAgricola, percentilTipo7, PERCENTIL_OBJETIVO, type SeleccionEscenarios, type LluviaAnioAgricola } from './escenarios';
export { simularRotacion, resultadoCeldas, siembraEnEscenario, type EntradasMotor, type ResultadoMotor } from './motor';
export { rankear, SIN_OPCION_ROBUSTA, type OpcionesRanking, type ResultadoRanking, type FilaRanking } from './ranking';
export { vistaProximaTemporada, mesEnEscenario, type VistaProximaTemporada, type MesProximaTemporada } from './proxima';
export { proximaTemporadaRotacion, simularRotacionCompleta, candidatosAnalogos, AVISO_ANALOGOS } from './analogos';
export { tarjetaRotacion, conTarjetas, AVISO_EXPERTO, type ContextoTarjetas } from './tarjetas';
export { serieBalance } from './series';
export { VERSION_CONTRATO, ESCENARIOS, type SerieBalance } from './tipos';
