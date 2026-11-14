// Fuente de los .bbmodel de Mafer (modelos/cultivos/ y modelos/suelos/). Vite los empaqueta como
// texto y se cargan bajo demanda: solo se baja el modelo que la escena usa.
// Para sumar un cultivo basta con dejar su <cultivo>_<etapa>.bbmodel en modelos/cultivos/.

import { leerBbmodel, type ModeloVoxel } from './bbmodel';

// Plantas (modelos/cultivos/) y losas de suelo (modelos/suelos/, A2.12); los nombres no se repiten.
const archivos = import.meta.glob(['../../../../modelos/cultivos/*.bbmodel', '../../../../modelos/suelos/*.bbmodel'], {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

function claveDeRuta(ruta: string): string {
  const nombre = ruta.slice(ruta.lastIndexOf('/') + 1);
  return nombre.replace(/\.bbmodel$/, '');
}

const porClave = new Map(Object.entries(archivos).map(([ruta, cargar]) => [claveDeRuta(ruta), cargar]));

/** Claves disponibles, por ejemplo "maiz_madurez". */
export const MODELOS_DISPONIBLES: ReadonlySet<string> = new Set(porClave.keys());

const cache = new Map<string, Promise<ModeloVoxel>>();

export function cargarModelo(clave: string): Promise<ModeloVoxel> {
  const cargar = porClave.get(clave);
  if (!cargar) return Promise.reject(new Error(`No hay ${clave}.bbmodel en modelos/.`));
  let p = cache.get(clave);
  if (!p) {
    p = cargar().then((texto) => leerBbmodel(JSON.parse(texto), `${clave}.bbmodel`));
    cache.set(clave, p);
  }
  return p;
}
