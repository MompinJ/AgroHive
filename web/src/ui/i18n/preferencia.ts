import type { Idioma } from './diccionarios';

const CLAVE_IDIOMA = 'agrohive-idioma';

export function esIdioma(valor: unknown): valor is Idioma {
  return valor === 'es' || valor === 'en';
}

export function leerIdioma(almacen?: Pick<Storage, 'getItem'>, idiomaNavegador?: string): Idioma {
  try {
    const guardado = (almacen ?? window.localStorage).getItem(CLAVE_IDIOMA);
    if (esIdioma(guardado)) return guardado;
  } catch { /* El modo privado o el render sin navegador no impiden usar la interfaz. */ }
  const preferido = idiomaNavegador ?? (typeof navigator !== 'undefined' ? navigator.language : 'es');
  return /^en(?:-|$)/i.test(preferido) ? 'en' : 'es';
}

export function guardarIdioma(idioma: Idioma, almacen?: Pick<Storage, 'setItem'>): void {
  try { (almacen ?? window.localStorage).setItem(CLAVE_IDIOMA, idioma); }
  catch { /* La preferencia sigue vigente en memoria si no puede persistirse. */ }
}
