import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { traducir } from './diccionarios';
import type { ClaveTexto, Idioma } from './diccionarios';
import { esIdioma, guardarIdioma, leerIdioma } from './preferencia';
import { fijarIdiomaActual } from './actual';

type Traducir = (clave: ClaveTexto, valores?: Readonly<Record<string, string | number>>) => string;
interface EstadoIdioma { idioma: Idioma; cambiarIdioma: (idioma: Idioma) => void; t: Traducir }
const ContextoIdioma = createContext<EstadoIdioma | null>(null);

export function ProveedorIdioma({ children, idiomaInicial }: { children: ReactNode; idiomaInicial?: Idioma }) {
  const [idioma, setIdioma] = useState<Idioma>(() => idiomaInicial ?? leerIdioma());
  fijarIdiomaActual(idioma); // antes de los hijos: el codigo que no es React lee este idioma durante el render
  const cambiarIdioma = useCallback((siguiente: Idioma) => {
    if (!esIdioma(siguiente)) return;
    guardarIdioma(siguiente);
    setIdioma(siguiente);
  }, []);
  useEffect(() => { document.documentElement.lang = idioma; }, [idioma]);
  const valor = useMemo<EstadoIdioma>(() => ({ idioma, cambiarIdioma, t: (clave, valores) => traducir(idioma, clave, valores) }), [idioma, cambiarIdioma]);
  return <ContextoIdioma.Provider value={valor}>{children}</ContextoIdioma.Provider>;
}

/** Sin ProveedorIdioma (pruebas o vistas previas que montan un componente suelto), espanol: el componente se ve como antes de B7. */
const SIN_PROVEEDOR: EstadoIdioma = { idioma: 'es', cambiarIdioma: () => {}, t: (clave, valores) => traducir('es', clave, valores) };

export function useIdioma(): EstadoIdioma {
  return useContext(ContextoIdioma) ?? SIN_PROVEEDOR;
}
