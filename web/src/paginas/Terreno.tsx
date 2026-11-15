import { useEffect, useRef } from 'react';
import { listarEjemplos } from '../demo/ejemplos';
import { fotoPorEjemplo } from '../ui/fotosEjemplos';
import { nombreCultivo as nombreDelCultivo } from '../ui/lab/piezas';
import type { Parcela } from '../../../contratos/tipos/contratos';
import { DibujarParcela } from '../ui/DibujarParcela';
import hero from '../ui/assets/terreno-hero-v1.png';
import '../ui/terreno.css';
import { useIdioma } from '../ui/i18n/Idioma';
import { koppenEn } from '../ui/i18n/textos/terreno';
import type { ClaveTexto } from '../ui/i18n/diccionarios';

const ejemplos = listarEjemplos();
const nombreCultivo = (id: string) => nombreDelCultivo(id).toLowerCase();
const PAISES = { 'pais.México': 1, 'pais.Brasil': 1, 'pais.Kenia': 1, 'pais.India': 1, 'pais.España': 1, 'pais.Estados Unidos': 1 };

/** Baja a una seccion y le da el foco (sin animar si se pide menos movimiento). */
function bajarA(seccion: HTMLElement | null) {
  if (!seccion) return;
  const reducir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  seccion.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  seccion.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

/** Baja al editor del contorno y le da el foco (sin animar si se pide menos movimiento). */
function irAlEditor(editor: HTMLElement | null) {
  if (!editor) return;
  const reducir = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  editor.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  editor.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export function Terreno({ polygonMode, onElegirEjemplo, ejemplo, parcela, onGuardar }: { polygonMode: boolean; onElegirEjemplo: (id: string) => void; ejemplo: string | null; parcela: Parcela | null; onGuardar: (p: Parcela) => void }) {
  const { idioma, t } = useIdioma();
  const pais = (p: string) => (`pais.${p}` in PAISES ? t(`pais.${p}` as ClaveTexto) : p);
  const clima = (c: { clase: string; descripcion: string }) => t('terreno.clima', { descripcion: idioma === 'en' ? koppenEn(c.clase) : c.descripcion });
  const editor = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLElement>(null);
  // Al entrar en modo poligono, despues de que App sube la pagina y enfoca el h1 al cambiar de ruta.
  useEffect(() => {
    if (!polygonMode) return;
    const t = setTimeout(() => irAlEditor(editor.current), 60);
    return () => clearTimeout(t);
  }, [polygonMode]);
  return <div className="terrain-page">
    <section className="terrain-hero" aria-labelledby="terreno-titulo">
      <div className="terrain-copy">
        <h1 id="terreno-titulo" tabIndex={-1}>{t('terreno.tituloA')}<br />{t('terreno.tituloB')}</h1>
        <p className="terrain-intro">{t('terreno.intro')}</p>
        <div className="terrain-actions">
          <button type="button" className="terrain-button" onClick={() => bajarA(lista.current)}>{t('terreno.verEjemplos')}</button>
          <a className="terrain-button terrain-button-secondary" href="#/terreno?modo=poligono" aria-current={polygonMode ? 'location' : undefined} onClick={() => { if (polygonMode) irAlEditor(editor.current); }}>{t('terreno.dibujarMia')}</a>
        </div>
      </div>
      <div className="terrain-art" aria-hidden="true">
        <img src={hero} alt="" width="1774" height="887" fetchPriority="high" />
      </div>
    </section>
    <div className="terrain-options">
      <section ref={lista} className="terrain-option terrain-option-demo terrain-ejemplos" aria-labelledby="demo-titulo">
        <div className="terrain-option-copy">
          <p className="terrain-eyebrow">{t('terreno.ejemplosEtiqueta')}</p>
          <h2 id="demo-titulo" tabIndex={-1}>{t('terreno.ejemplosTitulo')}</h2>
          <ul className="terrain-ejemplos-lista">
            {ejemplos.map((e) => <li key={e.id}>
              <a className="terrain-ejemplo" href="#/laboratorio" aria-current={ejemplo === e.id ? 'true' : undefined} onClick={() => onElegirEjemplo(e.id)}>
                <span className="terrain-ejemplo-texto">
                <strong>{e.nombre}</strong>
                <span className="terrain-ejemplo-lugar">{pais(e.pais)}{e.clima ? ` · ${clima(e.clima)}` : ''}</span>
                <span className="terrain-ejemplo-cultivos">{e.cultivosSugeridos.map(nombreCultivo).join(', ')}</span>
                </span>
                {fotoPorEjemplo[e.id] && <span className="terrain-ejemplo-imagen"><img src={fotoPorEjemplo[e.id]!.src} alt={fotoPorEjemplo[e.id]!.alt} width="500" height="375" loading="lazy" decoding="async" /></span>}
              </a>
            </li>)}
          </ul>
        </div>
      </section>
    </div>
    <div ref={editor} className="terrain-editor">{polygonMode && <DibujarParcela onGuardar={onGuardar} guardada={parcela} />}</div>
  </div>;
}
