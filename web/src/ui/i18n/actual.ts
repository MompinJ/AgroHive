// Idioma activo para el codigo que no es un componente de React (consejos de la mascota, eventos, ficha de la escena,
// nombres de cultivo). ProveedorIdioma lo fija en cada render, antes que sus hijos, asi que lo que se arma durante el
// render ya sale en el idioma elegido. Un useMemo que arme textos debe llevar `idioma` en sus dependencias.
import { traducir, type ClaveTexto, type Idioma } from './diccionarios';

let actual: Idioma = 'es';

export function fijarIdiomaActual(idioma: Idioma): void {
  actual = idioma;
}

export function idiomaActual(): Idioma {
  return actual;
}

/** t() fuera de React: traduce con el idioma activo. */
export function tt(clave: ClaveTexto, valores?: Readonly<Record<string, string | number>>): string {
  return traducir(actual, clave, valores);
}
