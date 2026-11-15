import type { BloqueEscena } from '../escena/modelo';

// Fuente única: sprites de Mafer. Se emiten como archivos para compartir la
// descarga entre celdas, en vez de repetir un SVG inline hasta 1600 veces.
const archivos = import.meta.glob<string>('../../../modelos/iconos2d/*.svg', {
  eager: true, query: '?url&no-inline', import: 'default',
});
const porClave = new Map(Object.entries(archivos).map(([ruta, url]) => [ruta.slice(ruta.lastIndexOf('/') + 1, -4), url]));

export function iconoCultivo2D(b: Pick<BloqueEscena, 'cultivo' | 'etapa' | 'estadoVisual'>): { clave: string; url: string } | null {
  if (!b.cultivo || !b.etapa || ['suelo_desnudo', 'sin_resultado', 'NO_EVALUABLE', 'ERROR_DATOS'].includes(b.estadoVisual) || b.etapa === 'suelo_desnudo') return null;
  const clave = `${b.cultivo}_${b.estadoVisual === 'podrida' ? 'podrida' : b.etapa}`;
  const url = porClave.get(clave);
  return url ? { clave, url } : null;
}

/** Dibujo de un cultivo en madurez para la paleta de la brocha; null si no hay sprite. */
export function iconoDeCultivo(cultivo: string): string | null {
  return porClave.get(`${cultivo}_madurez`) ?? null;
}
