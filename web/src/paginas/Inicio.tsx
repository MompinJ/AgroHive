import { ActionLink, FieldIllustration } from '../ui/components';

export function Inicio() {
  return <div className="home-layout">
    <section className="home-copy">
      <p className="eyebrow">Agricultura · Clima · Decisiones</p>
      <h1 tabIndex={-1}>Cada ciclo abre<br />otra posibilidad.</h1>
      <p className="home-lead">¿Y si cambias lo que siembras?</p>
      <p className="home-description">AgroHive te ayudará a explorar rotaciones de cultivos frente a la historia climática de NASA y a comparar cómo responden a distintos escenarios.</p>
      <div className="actions"><ActionLink href="#/terreno">Explorar parcela demo</ActionLink><ActionLink href="#/terreno?modo=poligono" secondary>Dibujar un terreno</ActionLink></div>
      <p className="quiet-note">Prototipo de interfaz. Aún no hay simulaciones ni datos climáticos conectados.</p>
      <div className="home-principle"><span aria-hidden="true">01 — 03</span><p>Elige un terreno. Explora una rotación.<br />Compara con evidencia.</p></div>
    </section>
    <aside className="home-visual" aria-label="Presentación del prototipo">
      <div className="visual-heading"><span className="eyebrow">Una mirada al campo</span><span className="small-tag">Diseño conceptual</span></div>
      <FieldIllustration />
      <div className="visual-bottom"><strong>Maíz / Frijol / Calabaza</strong><span>Opciones de interfaz</span></div>
      <p className="visual-note">Ilustración decorativa. No es un mapa ni representa datos de una parcela.</p>
    </aside>
    <div className="home-limits"><span className="small-tag">Decidir con contexto</span><p>La historia climática permite explorar alternativas; no predice cosechas ni ingresos. La decisión final es del agricultor.</p></div>
  </div>;
}
