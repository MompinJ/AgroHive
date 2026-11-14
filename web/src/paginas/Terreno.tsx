import { ActionLink, Card, FieldIllustration, PageHeading } from '../ui/components';
import { demo } from '../ui/demo';

export function Terreno({ polygonMode, onSelectDemo }: { polygonMode: boolean; onSelectDemo: () => void }) {
  return <>
    <PageHeading step="02" title="Empieza por un terreno.">Explora el caso de ejemplo mientras preparamos la conexión con mapas y datos reales.</PageHeading>
    <div className="terrain-layout">
      <Card title={demo.location} eyebrow="Parcela de demostración" className="demo-card">
        <FieldIllustration compact />
        <div className="demo-description"><span className="small-tag">SUPUESTO</span><p><strong>{demo.areaHa} hectáreas ficticias</strong> para explorar la interfaz. No corresponden a un levantamiento real del terreno.</p></div>
        <p>El clima, la elevación y las propiedades del suelo están pendientes de integrar. No se descargarán datos al continuar.</p>
        <a className="button" href="#/laboratorio" onClick={onSelectDemo}>Abrir laboratorio demo <span aria-hidden="true">↗</span></a>
      </Card>
      <Card title="Tu propio terreno" eyebrow="Polígono personalizado" className={polygonMode ? 'polygon-card highlighted' : 'polygon-card'}>
        <div className="polygon-placeholder" aria-hidden="true"><span /></div>
        <span className="small-tag">Integración pendiente · A2.10</span>
        <p>El mapa y la herramienta para dibujar el contorno se incorporarán en otra actividad. En esta versión todavía no puedes guardar ni evaluar un polígono.</p>
        {polygonMode && <p className="inline-note">Elegiste dibujar un terreno. Por ahora puedes recorrer el laboratorio con la parcela de ejemplo.</p>}
        <ActionLink href="#/terreno?modo=poligono" secondary>Ver entrada de polígono</ActionLink>
      </Card>
    </div>
  </>;
}
