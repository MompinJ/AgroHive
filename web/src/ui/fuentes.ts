import type { Fuente } from '../../../contratos/tipos/contratos';

/** Conserva las citas recibidas; no completa datos ausentes ni consulta fuentes nuevas. */
export function fuentesDe(documento: unknown): Fuente[] {
  const fuentes = new Map<string, Fuente>();
  function agregar(valor: unknown) {
    if (!valor || typeof valor !== 'object' || !('nombre' in valor) || typeof valor.nombre !== 'string') return;
    const fuente = valor as Fuente;
    fuentes.set(JSON.stringify([fuente.nombre, fuente.url, fuente.cita, fuente.periodo, fuente.coordenada, fuente.nota]), fuente);
  }
  function recorrer(valor: unknown) {
    if (Array.isArray(valor)) { valor.forEach(recorrer); return; }
    if (!valor || typeof valor !== 'object') return;
    for (const [clave, dato] of Object.entries(valor)) {
      if (clave === 'fuente') agregar(dato);
      if (clave === 'fuentes' && Array.isArray(dato)) dato.forEach(agregar);
      recorrer(dato);
    }
  }
  recorrer(documento);
  return [...fuentes.values()];
}
