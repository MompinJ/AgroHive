// Comprobacion de tipos: si el OpenAPI cambia de forma incompatible, esto deja de compilar.
import type { components, paths } from "./api";

export type SerieClima = components["schemas"]["SerieClima"];
export type TerrenoRespuesta = components["schemas"]["TerrenoRespuesta"];
export type ClimaQuery = paths["/api/clima"]["get"]["parameters"]["query"];

export function diasConLluviaFaltante(serie: SerieClima): number {
  return serie.diario.filter((d) => d.lluviaMm === null).length;
}
