// Panel del historial de hechos: boton con el numero de hechos y un panel con la lista, del mas reciente al mas viejo.
import { useId, useState, type ReactNode } from 'react';
import { IconoBicho, IconoBrocha, IconoCalendario, IconoEscudo, IconoInsecticida } from './iconos';
import { masRecientesPrimero, NOMBRE_TIPO_HECHO, textoHecho, type Hecho, type TipoHecho } from './historial';
import { fechaLarga } from './eventos';
import { useIdioma } from '../i18n/Idioma';

const ICONOS: Record<TipoHecho, () => ReactNode> = { siembra: IconoBrocha, insecticida: IconoInsecticida, cosecha: IconoCalendario, plaga: IconoBicho, problema: IconoEscudo, muerte: IconoBicho };
const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

export function PanelHistorial({ hechos, onBorrar, abiertoInicial = false }: { hechos: readonly Hecho[]; onBorrar: () => void; abiertoInicial?: boolean }) {
  const { t } = useIdioma();
  const id = useId();
  const [abierto, setAbierto] = useState(abiertoInicial);
  const lista = masRecientesPrimero(hechos);
  return <>
    <button type="button" className="boton-historial" aria-expanded={abierto} aria-controls={`${id}-panel`} onClick={() => setAbierto((a) => !a)} title={t('historial.titulo')}>
      <IconoCalendario />
      <span className="boton-historial-texto">{t('historial.boton')}</span>
      {hechos.length > 0 && <span className="boton-historial-cuenta" aria-label={`${hechos.length} hechos`}>{hechos.length}</span>}
    </button>
    {abierto && <aside id={`${id}-panel`} className="historial" aria-label={t('historial.titulo')}>
      <header className="historial-cabeza">
        <h2>{t('historial.titulo')}</h2>
        <button type="button" className="historial-cerrar" onClick={() => setAbierto(false)} aria-label={t('historial.cerrar')}>×</button>
      </header>
      {lista.length === 0 ? <p className="historial-vacio">{t('historial.vacio')}</p> : <ol className="historial-lista">
        {lista.map((h) => {
          const Icono = ICONOS[h.tipo];
          return <li key={h.id} className={`hecho hecho-${h.tipo}`}>
            <span className="hecho-icono" aria-hidden="true"><Icono /></span>
            <div className="hecho-cuerpo">
              <p className="hecho-titulo"><span className="hecho-tipo">{NOMBRE_TIPO_HECHO[h.tipo]}</span> {textoHecho(h)}</p>
              {h.detalle && <p className="hecho-detalle">{h.detalle}</p>}
              <p className="hecho-cuando">{h.fechaSim ? t('historial.enSimulacion', { fecha: fechaLarga(h.fechaSim) }) : ''}{hora(h.cuando)}</p>
            </div>
          </li>;
        })}
      </ol>}
      {lista.length > 0 && <footer className="historial-pie"><button type="button" className="lab-boton lab-boton-suave" onClick={onBorrar}>{t('historial.borrar')}</button></footer>}
    </aside>}
  </>;
}
