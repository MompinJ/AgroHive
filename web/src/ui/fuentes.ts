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

export interface GrupoFuente { id: string; nombre: string; referencias: Fuente[] }
function publicacion(f: Fuente): [string, string] {
  const texto = `${f.nombre} ${f.url ?? ''} ${f.cita ?? ''}`.toLowerCase();
  if (/saxton|rawls/.test(texto)) return ['saxton', 'Saxton y Rawls (2006)'];
  if (/ecocrop|recocrop/.test(texto)) return ['ecocrop', 'FAO EcoCrop'];
  if (/fao.?56|x0490|allen.*pereira/.test(texto)) return ['fao56', 'FAO 56'];
  if (/power.larc|nasa power/.test(texto)) return ['power', 'NASA POWER'];
  if (/open-meteo|openmeteo/.test(texto)) return ['openmeteo', 'Open-Meteo'];
  if (/soilgrids|isric.*wcs/.test(texto)) return ['soilgrids', 'ISRIC SoilGrids'];
  if (/openlandmap|soil-db|soildb/.test(texto)) return ['openlandmap', 'OpenLandMap'];
  if (/terrarium|terrain tiles|mapzen|tilezen/.test(texto)) return ['terreno', 'Terrain Tiles (Terrarium)'];
  return [f.url?.split('#')[0] ?? f.nombre, f.nombre];
}
export function agruparFuentes(documento: unknown): GrupoFuente[] {
  const grupos = new Map<string, GrupoFuente>();
  for (const fuente of fuentesDe(documento)) {
    const [id, nombre] = publicacion(fuente);
    const grupo = grupos.get(id) ?? { id, nombre, referencias: [] };
    grupo.referencias.push(fuente);
    grupos.set(id, grupo);
  }
  return [...grupos.values()];
}
