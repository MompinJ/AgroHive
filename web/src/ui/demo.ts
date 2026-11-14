import parcela from '../../../contratos/ejemplos/parcela.ejemplo.json';
import plan from '../../../contratos/ejemplos/plan-siembra.ejemplo.json';
import type { Ciclo, Meta, Parcela } from '../../../contratos/tipos/contratos';
import type { Crop, CropSequence } from './selections';

// Solo se leen metadatos, ubicación y selecciones. No se importan las
// mediciones ficticias ni el ranking del ejemplo de resultado-rotacion.
const meta: Meta = parcela.meta;
const location: Parcela['ubicacion'] = parcela.ubicacion;
const exampleCycles: Ciclo[] = plan.ciclos;
const cropLabels: Record<string, Crop> = { maiz: 'Maíz', frijol: 'Frijol', calabaza: 'Calabaza' };

function cropForCycle(cycle: number): Crop {
  const entry = exampleCycles.find((item) => item.ciclo === cycle);
  const label = entry ? cropLabels[entry.cultivo] : undefined;
  return label ?? 'NO_EVALUABLE';
}

export const demoSequence: CropSequence = [cropForCycle(1), cropForCycle(2), cropForCycle(3)];
export const demo = {
  location: `${location.municipio}, ${location.estado}`,
  areaHa: parcela.areaHa,
  notice: meta.aviso,
  contractVersion: meta.versionContrato,
};
