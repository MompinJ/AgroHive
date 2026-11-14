import { demoSequence } from './demo';

// Estado de interacción local; R1 parte del plan de ejemplo de A1.1.
export const crops = ['Maíz', 'Frijol', 'Calabaza', 'NO_EVALUABLE'] as const;
export type Crop = typeof crops[number];
export type Cycle = 1 | 2 | 3;
export const cycles: readonly Cycle[] = [1, 2, 3];
export const scenarios = ['Seco', 'Habitual', 'Lluvioso'] as const;
export type Scenario = typeof scenarios[number];
export const rotationIds = ['R0', 'R1', 'R2'] as const;
export type RotationId = typeof rotationIds[number];
export type CropSequence = [Crop, Crop, Crop];
export type RotationChoices = Record<RotationId, CropSequence>;

export const initialRotations: RotationChoices = {
  R0: ['Maíz', 'Maíz', 'Maíz'],
  R1: demoSequence,
  R2: ['Frijol', 'Calabaza', 'Maíz'],
};

export function ScenarioSelector({ value, onChange }: { value: Scenario; onChange: (scenario: Scenario) => void }) {
  return <fieldset className="choice-group"><legend>Escenario histórico</legend>
    <div className="segmented">{scenarios.map((scenario) => <label key={scenario}>
      <input type="radio" name="escenario" value={scenario} checked={value === scenario} onChange={() => onChange(scenario)} />
      <span>{scenario}</span>
    </label>)}</div>
  </fieldset>;
}

export function CycleSelector({ value, onChange }: { value: Cycle; onChange: (cycle: Cycle) => void }) {
  return <fieldset className="choice-group"><legend>Ciclo visible</legend>
    <div className="segmented">{cycles.map((cycle) => <label key={cycle}>
      <input type="radio" name="ciclo" value={cycle} checked={value === cycle} onChange={() => onChange(cycle)} />
      <span>Ciclo {cycle}</span>
    </label>)}</div>
  </fieldset>;
}
