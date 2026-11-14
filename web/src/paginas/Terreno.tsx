import { demo } from '../ui/demo';
import type { Parcela } from '../../../contratos/tipos/contratos';
import { DibujarParcela } from '../ui/DibujarParcela';
import hero from '../ui/assets/terreno-hero-v1.png';
import field from '../ui/assets/terreno-demo-v1.png';
import polygon from '../ui/assets/terreno-poligono-v1.png';
import '../ui/terreno.css';

export function Terreno({ polygonMode, onSelectDemo, parcela, onGuardar }: { polygonMode: boolean; onSelectDemo: () => void; parcela: Parcela | null; onGuardar: (p: Parcela) => void }) {
  return <div className="terrain-page">
    <section className="terrain-hero" aria-labelledby="terreno-titulo">
      <div className="terrain-copy">
        <h1 id="terreno-titulo" tabIndex={-1}>Empieza por<br />un terreno.</h1>
        <p className="terrain-intro">Explora el caso de ejemplo o dibuja el contorno de tu parcela para consultar su relieve.</p>
        <div className="terrain-actions">
          <a className="terrain-button" href="#/laboratorio" onClick={onSelectDemo}>Abrir laboratorio demo</a>
          <a className="terrain-button terrain-button-secondary" href="#/terreno?modo=poligono" aria-current={polygonMode ? 'location' : undefined}>Dibujar mi parcela</a>
        </div>
      </div>
      <div className="terrain-art" aria-hidden="true">
        <img src={hero} alt="" width="1774" height="887" fetchPriority="high" />
      </div>
    </section>
    <div className="terrain-options">
      <section className="terrain-option terrain-option-demo" aria-labelledby="demo-titulo">
        <img className="terrain-option-image" src={field} alt="" width="1254" height="1254" />
        <div className="terrain-option-copy">
          <p className="terrain-eyebrow">Parcela de demostración</p>
          <div className="terrain-option-heading"><h2 id="demo-titulo">{demo.location}</h2><span className="terrain-status">SUPUESTO</span></div>
          <p>{demo.areaHa} hectáreas ficticias para explorar la interfaz. No corresponden a un levantamiento real del terreno.</p>
          <div className="terrain-data-note">
            <svg width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 23h15a5.5 5.5 0 0 0 1-10.9A8 8 0 0 0 9.4 9 7 7 0 0 0 9 23Z" strokeLinejoin="round" /></svg>
            <p>El laboratorio ya integra clima histórico, elevación y estimaciones del suelo. La demo usa un contorno ficticio; cada fuente conserva sus advertencias.</p>
          </div>
        </div>
      </section>
      <section className={`terrain-option terrain-option-custom${polygonMode ? ' terrain-option-selected' : ''}`} aria-labelledby="poligono-titulo">
        <img className="terrain-option-image" src={polygon} alt="" width="1254" height="1254" />
        <div className="terrain-option-copy">
          <p className="terrain-eyebrow">Polígono personalizado</p>
          <h2 id="poligono-titulo">Tu propio terreno</h2>
          <span className="terrain-status">Contorno y cuadrícula</span>
          <p>Dibuja los límites, revisa la cuadrícula y consulta la elevación. El relieve faltante se muestra como no evaluable.</p>
        </div>
      </section>
    </div>
    {polygonMode && <DibujarParcela onGuardar={onGuardar} guardada={parcela} />}
  </div>;
}
