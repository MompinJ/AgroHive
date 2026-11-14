import { useEffect, useId, useState } from 'react';
import { desplazarMes, fechaEnIndice, indiceDeFecha, type RangoTiempo } from './tiempo';
import './tiempo.css';

export function ControlTiempo({ fecha, rango, listo, fallo = false, onFecha }: {
  fecha: string; rango: RangoTiempo | null; listo: boolean; fallo?: boolean; onFecha: (fecha: string) => void;
}) {
  const id = useId();
  const [reproduciendo, setReproduciendo] = useState(false);
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
  useEffect(() => {
    if (reducido || !visible || !dentro || alFinal || fallo) setReproduciendo(false);
  }, [reducido, visible, dentro, alFinal, fallo]);
  useEffect(() => {
    if (!reproduciendo || reducido || !visible || !listo || !rango || !dentro || alFinal || fallo) return;
    // Un paso pendiente como máximo; no avanza hasta que se pinte su resultado.
    const reloj = setTimeout(() => onFecha(desplazarMes(fecha, 1, rango)), 1100);
    return () => clearTimeout(reloj);
  }, [reproduciendo, reducido, visible, listo, rango, dentro, alFinal, fallo, fecha, onFecha]);
  function elegir(nueva: string) { setReproduciendo(false); onFecha(nueva); }
  return <div className="time-control">
    <label htmlFor={`${id}-fecha`}>Fecha que muestra la parcela</label>
    <input id={`${id}-fecha`} type="date" value={fecha} onChange={(e) => { if (e.target.value) elegir(e.target.value); }} />
    {rango ? <>
      <label htmlFor={`${id}-rango`}>Recorre las fechas del ciclo</label>
      <input id={`${id}-rango`} type="range" min={0} max={rango.pasos} step={1}
        value={Math.max(0, Math.min(rango.pasos, indiceDeFecha(rango.desde, fecha)))}
        aria-valuetext={dentro ? fecha : `Fuera del recorrido: ${fecha}`} aria-describedby={`${id}-ayuda`}
        onChange={(e) => elegir(fechaEnIndice(rango.desde, Number(e.target.value)))} />
      <div className="time-limits numeric"><span>{rango.desde}</span><span>{rango.hasta}</span></div>
      <div className="ui-actions">
        <button type="button" className="ui-action" disabled={!dentro || fecha <= rango.desde} onClick={() => elegir(desplazarMes(fecha, -1, rango))}>Mes anterior</button>
        <button type="button" className="ui-action" disabled={!dentro || alFinal} onClick={() => elegir(desplazarMes(fecha, 1, rango))}>Mes siguiente</button>
        <button type="button" className="ui-action" disabled={reducido || !dentro || rango.pasos === 0 || fallo} aria-pressed={reproduciendo} onClick={() => {
          if (reproduciendo) setReproduciendo(false);
          else { if (alFinal) onFecha(rango.desde); setReproduciendo(true); }
        }}>{reproduciendo ? 'Pausar recorrido' : alFinal ? 'Repetir recorrido' : 'Reproducir meses'}</button>
      </div>
      <p id={`${id}-ayuda`} className="quiet-note">Arrastra para elegir un día o usa las flechas del teclado. Los botones y la reproducción avanzan por meses dentro de la serie del motor. {!dentro && 'La fecha elegida está fuera del recorrido; usa el deslizador para volver.'}</p>
      {reducido && <p className="quiet-note">Movimiento reducido activo: la reproducción está deshabilitada. Puedes cambiar de fecha manualmente.</p>}
    </> : <p className="quiet-note">Sin días del motor disponibles para recorrer este ciclo. Puedes consultar una fecha manualmente; no se inventa su duración.</p>}
    <p className="quiet-note" role="status">{reproduciendo ? listo ? 'Reproduciendo por meses.' : 'Reproducción en espera del resultado.' : 'Recorrido en pausa.'}</p>
  </div>;
}
