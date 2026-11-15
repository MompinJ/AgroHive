// Idioma de los textos que arma el motor (tarjetas de rotacion y motivos del ranking que se ven en pantalla).
// [DECIDIDO] 15/11: la app tiene espanol e ingles. El motor no conoce la interfaz: recibe el idioma como dato.
// Mismo conjunto que `Idioma` de web/src/ui/i18n (balam, B7), sin importarlo, para que el motor no dependa de la UI.
export type IdiomaMotor = 'es' | 'en';

/** Sin idioma, el motor habla espanol: asi nada de lo que ya existe cambia. */
export const IDIOMA_MOTOR_POR_DEFECTO: IdiomaMotor = 'es';

export function esIdiomaMotor(valor: unknown): valor is IdiomaMotor {
  return valor === 'es' || valor === 'en';
}

/** Idioma valido o el de por defecto (un valor raro desde el Worker no rompe el calculo). */
export function idiomaMotor(valor: unknown): IdiomaMotor {
  return esIdiomaMotor(valor) ? valor : IDIOMA_MOTOR_POR_DEFECTO;
}
