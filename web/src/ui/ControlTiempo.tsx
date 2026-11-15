import { useEffect, useId, useState } from 'react';
import { desplazarSemana, fechaDeSemana, semanaDeFecha, totalSemanas, type RangoTiempo } from './tiempo';
import './tiempo.css';
import { useIdioma } from './i18n/Idioma';

/** Pausa entre semanas al reproducir (ms). */
export const MS_POR_SEMANA = 1000;

export function ControlTiempo({ fecha, rango, listo, fallo = false, retener = false, onFecha }: {
  fecha: string; rango: RangoTiempo | null; listo: boolean; fallo?: boolean;
  /** true mientras hay un aviso o una animacion en pantalla (y unos segundos despues): la reproduccion espera antes de avanzar. */
  retener?: boolean; onFecha: (fecha: string) => void;
}) {
  const id = useId();
  const [reproduciendo, setReproduciendo] = useState(false);
  // Mientras se arrastra solo cambia la fecha que se lee; el modelo cambia al soltar.
  const [arrastre, setArrastre] = useState<number | null>(null);
  const [reducido, setReducido] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  useEffect(() => {
    const consulta = matchMedia('(prefers-reduced-motion: reduce)');
    const movimiento = () => setReducido(consulta.matches);
    const visibilidad = () => setVisible(!document.hidden);
    consulta.addEventListener('change', movimiento);
    document.addEventListener('visibilitychange', visibilidad);
    return () => { consulta.removeEventListener('change', movimiento); document.removeEventListener('visibilitychange', visibilidad); };
  }, []);
  const dentro = !!rango && fecha >= rango.desde && fecha <= rango.hasta;
  const alFinal = !!rango && fecha >= rango.hasta;
  const { t } = useIdioma();
  useEffect(() => {
    if (reducido || !visible || !dentro || alFinal || fallo) setReproduciendo(false);
  }, [reducido, visible, dentro, alFinal, fallo]);
  useEffect(() => {
    if (!reproduciendo || reducido || !visible || !listo || !rango || !dentro || alFinal || fallo || retener) return;
    // Un paso pendiente como máximo; no avanza hasta que se pinte su resultado ni mientras haya un aviso o una animación.
    const reloj = setTimeout(() => onFecha(desplazarSemana(fecha, 1, rango)), MS_POR_SEMANA);
    return () => clearTimeout(reloj);
  }, [reproduciendo, reducido, visible, listo, rango, dentro, alFinal, fallo, retener, fecha, onFecha]);
  function elegir(nueva: string) { setReproduciendo(false); onFecha(nueva); }
  function soltar() {
    if (arrastre == null || !rango) return;
    const nueva = fechaDeSemana(rango, arrastre);
    setArrastre(null);
    if (nueva !== fecha) elegir(nueva);
  }
  const semanas = rango ? totalSemanas(rango) : 0;
  const semanaActual = rango ? (arrastre ?? semanaDeFecha(rango, fecha)) : 0;
  const fechaVista = arrastre != null && rango ? fechaDeSemana(rango, arrastre) : fecha;
  return <div className="time-control">
    <label htmlFor={`${id}-fecha`}>{t('tiempo.fecha')}</label>
    <input id={`${id}-fecha`} type="date" value={fecha} onChange={(e) => { if (e.target.value) elegir(e.target.value); }} />
    {rango ? <>
      <label htmlFor={`${id}-rango`}>{t('tiempo.recorre')}</label>
      <input id={`${id}-rango`} type="range" min={0} max={semanas} step={1}
        value={Math.max(0, Math.min(semanas, semanaActual))}
        aria-valuetext={dentro || arrastre != null ? t('tiempo.semana', { n: semanaActual + 1, total: semanas + 1, fecha: fechaVista }) : t('tiempo.fuera', { fecha })} aria-describedby={`${id}-ayuda`}
        onChange={(e) => { setReproduciendo(false); setArrastre(Number(e.target.value)); }}
        onPointerUp={soltar} onKeyUp={soltar} onBlur={soltar} onTouchEnd={soltar} />
      <div className="time-limits numeric"><span>{rango.desde}</span><output className="time-actual" aria-hidden="true">{t('tiempo.semanaCorta', { n: semanaActual + 1, total: semanas + 1, fecha: fechaVista })}</output><span>{rango.hasta}</span></div>
      <div className="ui-actions">
        <button type="button" className="ui-action time-icono" disabled={!dentro || fecha <= rango.desde} onClick={() => elegir(desplazarSemana(fecha, -1, rango))} aria-label={t('tiempo.anterior')} title={t('tiempo.anterior')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" className="ui-action time-icono time-reproducir" disabled={reducido || !dentro || rango.pasos === 0 || fallo} aria-pressed={reproduciendo} onClick={() => {
          if (reproduciendo) setReproduciendo(false);
          else { if (alFinal) onFecha(rango.desde); setReproduciendo(true); }
        }} aria-label={reproduciendo ? t('tiempo.pausarRecorrido') : alFinal ? t('tiempo.repetirRecorrido') : t('tiempo.reproducirSemanas')} title={reproduciendo ? t('tiempo.pausar') : alFinal ? t('tiempo.repetir') : t('tiempo.reproducir')}>
          {reproduciendo
            ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            : <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" /></svg>}
        </button>
        <button type="button" className="ui-action time-icono" disabled={!dentro || alFinal} onClick={() => elegir(desplazarSemana(fecha, 1, rango))} aria-label={t('tiempo.siguiente')} title={t('tiempo.siguiente')}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
      <p id={`${id}-ayuda`} className="quiet-note">{t('tiempo.ayuda')}{!dentro && t('tiempo.fueraAyuda')}</p>
      {reducido && <p className="quiet-note">{t('tiempo.reducido')}</p>}
    </> : <p className="quiet-note">{t('tiempo.sinDias')}</p>}
    <p className="quiet-note" role="status">{reproduciendo ? retener ? t('tiempo.espera') : listo ? t('tiempo.reproduciendo') : t('tiempo.esperaResultado') : t('tiempo.pausa')}</p>
  </div>;
}
