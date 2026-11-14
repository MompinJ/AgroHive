import { ActionLink, Card, DataState, PageHeading } from '../ui/components';
import { rotationIds, scenarios } from '../ui/selections';
import type { Cycle, RotationChoices, RotationId, Scenario } from '../ui/selections';

export function Comparacion({ rotations, rotation, cycle, scenario }: { rotations: RotationChoices; rotation: RotationId; cycle: Cycle; scenario: Scenario }) {
  return <>
    <PageHeading step="04" title="Compara antes de decidir.">Las alternativas se muestran en orden de identificador. Todavía no hay resultados ni clasificación por robustez.</PageHeading>
    <div className="comparison-toolbar"><p>Tu selección: <strong>{rotation} · Ciclo {cycle} · {scenario}</strong></p><ActionLink href="#/laboratorio" secondary>Volver al laboratorio</ActionLink></div>
    <div className="comparison-grid">{rotationIds.map((id) => <Card key={id} title={`Rotación ${id}`} eyebrow={rotation === id ? 'Selección actual' : 'Alternativa de ejemplo'} className={rotation === id ? 'highlighted' : ''}>
      <ol className="rotation-sequence">{rotations[id].map((crop, index) => <li key={index}><span>Ciclo {index + 1}</span><strong>{crop}</strong></li>)}</ol>
      <dl className="scenario-results">{scenarios.map((item) => <div key={item}><dt>{item}</dt><dd>NO_EVALUABLE</dd></div>)}</dl>
      <p className="quiet-note">Peor caso: NO_EVALUABLE</p>
    </Card>)}</div>
    <div className="evidence-grid">
      <Card title="¿Qué falta para evaluar?" eyebrow="Evidencia y evaluabilidad">
        <DataState state="missing">Se utilizan ejemplos de contratos, pero aún faltan las series climáticas reales y los resultados del motor.</DataState>
        <p>Una alternativa será evaluable cuando el motor entregue los indicadores y su evidencia. Este prototipo no presenta resultados evaluables de ejemplo.</p>
      </Card>
      <Card title="Ninguna recomendación todavía" eyebrow="Riesgos y límites">
        <p>Las secuencias solo sirven para probar la interfaz. Sin parámetros de cultivo, suelo e historia climática no se puede determinar cuál es más robusta.</p>
        <p>La comparación futura deberá mostrar fuentes, huecos de información y riesgos, además del resultado de cada escenario.</p>
      </Card>
    </div>
  </>;
}
