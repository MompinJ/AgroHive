import background from '../ui/assets/inicio-campo.png';
import '../ui/inicio.css';
import { useIdioma } from '../ui/i18n/Idioma';
import { SelectorIdioma } from '../ui/i18n/SelectorIdioma';

export function Inicio() {
  const { t } = useIdioma();
  return <section className="landing-hero" aria-labelledby="inicio-titulo">
    <div className="landing-idioma"><SelectorIdioma /></div>
    <img className="landing-background" src={background} alt="" width="1662" height="946" fetchPriority="high" />
    <div className="landing-content">
      <p className="landing-tag">{t('inicio.etiqueta')}</p>
      <h1 id="inicio-titulo" tabIndex={-1}>{t('inicio.tituloPrimero')}<br />{t('inicio.tituloSegundo')}</h1>
      <p className="landing-question">{t('inicio.pregunta')}</p>
      <p className="landing-description">{t('inicio.descripcion')}</p>
      <div className="landing-actions">
        <a className="landing-button" href="#/terreno?modo=poligono">{t('inicio.dibujar')}</a>
      </div>
      <p className="landing-disclaimer">{t('inicio.aviso')}</p>
    </div>
  </section>;
}
