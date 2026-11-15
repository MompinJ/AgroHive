import background from '../ui/assets/inicio-campo.png';
import '../ui/inicio.css';

export function Inicio() {
  return <section className="landing-hero" aria-labelledby="inicio-titulo">
    <img className="landing-background" src={background} alt="" width="1662" height="946" fetchPriority="high" />
    <div className="landing-content">
      <p className="landing-tag">Agricultura · Clima · Decisiones</p>
      <h1 id="inicio-titulo" tabIndex={-1}>Cada ciclo abre<br />otra posibilidad.</h1>
      <p className="landing-question">¿Y si cambias lo que siembras?</p>
      <p className="landing-description">Explora rotaciones de cultivos con la historia climática de NASA<br className="landing-desktop-break" /> y compara cómo responden en distintos escenarios.</p>
      <div className="landing-actions">
        <a className="landing-button" href="#/terreno?modo=poligono">Dibujar un terreno</a>
      </div>
      <p className="landing-disclaimer">Prototipo de demostración · Los datos ilustrativos no son predicciones agrícolas.</p>
    </div>
  </section>;
}
