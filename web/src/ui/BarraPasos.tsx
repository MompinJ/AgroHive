// Barra superior fija con el stepper: los pasos se siguen en orden. Un paso solo se abre
// cuando el anterior se completo; los ya hechos se pueden revisar.
import { Brand } from './components';
import { indicePaso, pasos } from './navigation';
import './barra.css';
import { useIdioma } from './i18n/Idioma';
import { SelectorIdioma } from './i18n/SelectorIdioma';

const textosPasos = [
  ['nav.terreno', 'pasos.terreno'], ['nav.cultivos', 'pasos.cultivos'],
  ['nav.escenarios', 'pasos.escenarios'], ['nav.comparacion', 'pasos.comparacion'],
] as const;

export function BarraPasos({ path, progreso, sobreEscena = false }: { path: string; progreso: number; sobreEscena?: boolean }) {
  const actual = indicePaso(path);
  const { t } = useIdioma();
  return <header className={`barra${sobreEscena ? ' barra-sobre-escena' : ''}`}>
    <div className="barra-interior">
      <Brand />
      <nav className="stepper" aria-label={t('pasos.titulo')}>
        <ol>
          {pasos.map((p, i) => {
            const [nombre, ayuda] = textosPasos[i]!;
            const etiqueta = t(nombre);
            const estado = i === actual ? 'actual' : i < progreso ? 'hecho' : i <= progreso ? 'abierto' : 'bloqueado';
            const contenido = <>
              <span className="stepper-num" aria-hidden="true">{estado === 'hecho' ? <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : i + 1}</span>
              <span className="stepper-texto"><span className="stepper-nombre">{etiqueta}</span><span className="stepper-ayuda">{estado === 'bloqueado' ? t('pasos.bloqueadoCorto') : t(ayuda)}</span></span>
            </>;
            const descripcion = t('pasos.descripcion', { actual: i + 1, total: pasos.length, nombre: etiqueta }) + (estado === 'hecho' ? t('pasos.completado') : estado === 'bloqueado' ? t('pasos.bloqueado') : '');
            return <li key={p.path} className={`stepper-paso stepper-${estado}`}>
              {estado === 'bloqueado'
                ? <span className="stepper-enlace" aria-disabled="true" aria-label={descripcion}>{contenido}</span>
                : <a className="stepper-enlace" href={`#${p.path}`} aria-current={estado === 'actual' ? 'step' : undefined} aria-label={descripcion}>{contenido}</a>}
            </li>;
          })}
        </ol>
      </nav>
      <div className="barra-acciones">
        <a className="barra-fuentes" href="#/metodo" aria-current={path === '/metodo' ? 'page' : undefined}>{t('nav.metodo')}</a>
        <SelectorIdioma />
      </div>
    </div>
  </header>;
}
