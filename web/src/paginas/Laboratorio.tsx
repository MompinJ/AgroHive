import { ActionLink, Card, DataState, FieldIllustration, PageHeading } from '../ui/components';
import { crops, cycles, CycleSelector, rotationIds, ScenarioSelector } from '../ui/selections';
import type { Crop, CropSequence, Cycle, RotationId, Scenario } from '../ui/selections';

interface LaboratoryProps {
  rotation: RotationId;
  sequence: CropSequence;
  cycle: Cycle;
  scenario: Scenario;
  onRotation: (value: RotationId) => void;
  onCycle: (value: Cycle) => void;
  onScenario: (value: Scenario) => void;
  onCrop: (cycle: Cycle, crop: Crop) => void;
}

export function Laboratorio(props: LaboratoryProps) {
  const { rotation, sequence, cycle, scenario } = props;
  return <>
    <PageHeading step="03" title="¿Y si siembras algo distinto?">Prueba los controles. Las selecciones son ejemplos de interfaz y aún no generan una evaluación científica.</PageHeading>
    <div className="lab-grid">
      <Card title="Tu rotación" eyebrow="01 / Configura" className="selector-panel">
        <label className="field-label" htmlFor="rotation">Rotación de ejemplo</label>
        <select id="rotation" value={rotation} onChange={(event) => {
          const next = rotationIds.find((id) => id === event.target.value);
          if (next) props.onRotation(next);
        }}>{rotationIds.map((id) => <option key={id} value={id}>{id} · Ejemplo de interfaz</option>)}</select>
        <div className="crop-selectors">{cycles.map((item) => <div className="crop-field" key={item}>
          <label htmlFor={`crop-${item}`}><span className="cycle-number" aria-hidden="true">0{item}</span>Ciclo {item}</label>
          <select id={`crop-${item}`} value={sequence[item - 1]} onChange={(event) => {
            const next = crops.find((crop) => crop === event.target.value);
            if (next) props.onCrop(item, next);
          }}>{crops.map((crop) => <option key={crop} value={crop}>{crop}</option>)}</select>
        </div>)}</div>
        <p className="quiet-note">Sin fechas de siembra ni parámetros agronómicos. No son recomendaciones de rotación.</p>
      </Card>
      <Card title="Parcela demo · Isla" eyebrow="02 / Explora" className="terrain-panel">
        <div className="terrain-toolbar"><span className="small-tag">2 ha ficticias · SUPUESTO</span><span className="view-pending">2D / 3D pendientes</span></div>
        <div className="terrain-preview"><FieldIllustration compact /><div className="preview-label"><strong>Espacio reservado para el terreno</strong><span>Ilustración decorativa, sin cuadrícula ni relieve real</span></div></div>
        <div className="selection-readout" role="status"><span>{rotation} / Ciclo {cycle}</span><strong>{sequence[cycle - 1]}</strong><span>Escenario {scenario.toLowerCase()}</span></div>
        <CycleSelector value={cycle} onChange={props.onCycle} />
      </Card>
      <Card title="Lectura del escenario" eyebrow="03 / Observa" className="metrics-panel">
        <ScenarioSelector value={scenario} onChange={props.onScenario} />
        <p className="quiet-note">Año histórico: NO_EVALUABLE. Serie climática pendiente.</p>
        <DataState state="missing">Faltan los datos y el motor. Cambiar cultivos o escenarios solo actualiza la interfaz.</DataState>
        <dl className="metrics-list">{['Déficit hídrico', 'Balance de agua', 'Compatibilidad de ciclo'].map((label) => <div key={label}><dt>{label}</dt><dd>NO_EVALUABLE</dd></div>)}</dl>
        <ActionLink href="#/comparacion">Ver comparación</ActionLink>
      </Card>
    </div>
  </>;
}
