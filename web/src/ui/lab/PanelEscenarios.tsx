// Paso 3: como responde la parcela en anios reales seco, habitual y lluvioso. Las metricas y
// el anio real salen del resultado del motor; la fecha solo consulta celdas ya calculadas.
import type { Escenario } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import type { EstadoSerieBalance } from '../useSerieBalance';
import type { RangoTiempo } from '../tiempo';
import { ControlTiempo } from '../ControlTiempo';
import { PanelIzq } from './PanelIzq';
import { MarcaProblema } from '../../escena/MarcaProblema';
import type { ProblemaCultivo } from '../../escena/problemas';
import { Aviso, Cargando, EncabezadoPanel, IconoCultivo, nombreCultivo, nombreEscenario, numero, porcentaje } from './piezas';
import { nombreRotacion } from '../planes';
import type { PasoLab } from './Laboratorio';
import { useIdioma } from '../i18n/Idioma';
import { tt } from '../i18n/actual';

const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];
/** Nombre visible de cada pilar en el idioma activo (se lee como antes: nombresPilares[p]). */
export const nombresPilares: Record<string, string> = {
  get deficitHidrico() { return tt('pilar.deficitHidrico'); }, get excesoHidrico() { return tt('pilar.excesoHidrico'); },
  get compatibilidadCiclo() { return tt('pilar.compatibilidadCiclo'); }, get proteccionSuelo() { return tt('pilar.proteccionSuelo'); },
  get riesgoCalor() { return tt('pilar.riesgoCalor'); }, get aporteIndirecto() { return tt('pilar.aporteIndirecto'); },
};

export function PanelEscenarios({ estado, onAvanzar, fecha, rango, serie, celdasListas, errorCeldas, onFecha, claveTiempo, retener = false, problemas = [] }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void;
  fecha: string; rango: RangoTiempo | null; serie: EstadoSerieBalance; celdasListas: boolean; errorCeldas: string;
  onFecha: (f: string) => void; claveTiempo: string; retener?: boolean;
  /** Cultivos con problemas en la fecha mostrada: una entrada por grupo de celdas de la misma planta. */
  problemas?: readonly ProblemaCultivo[];
}) {
  const { rotacion, setRotacion, ciclo, setCiclo, escenario, setEscenario } = estado.seleccion;
  const { t } = useIdioma();
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const resultado = estado.calculo?.ranking.rotaciones.find((r) => r.rotacionId === plan?.rotacionId);
  const metricas = resultado?.porEscenario[escenario];
  const encabezado = <EncabezadoPanel indice={2} titulo={t('esc.titulo')}>{t('esc.intro')}</EncabezadoPanel>;

  if (!plan || !visible) return <PanelIzq etiqueta={t('esc.etiqueta')}>{encabezado}<Cargando>{t('esc.preparando')}</Cargando></PanelIzq>;
  const pilar = metricas?.pilares;

  return <>
    <PanelIzq etiqueta={t('esc.etiqueta')}>
      {encabezado}

      <div className="lab-escenarios" role="radiogroup" aria-label={t('esc.anio')}>
        {escenarios.map((e) => <button type="button" role="radio" key={e} aria-checked={e === escenario} className={`lab-escenario lab-escenario-${e}`} onClick={() => setEscenario(e)}>
          <strong>{nombreEscenario[e]}</strong>
          <small>{resultado?.porEscenario[e].anioReal ?? '—'}</small>
        </button>)}
      </div>

      <div className="panel-bloque lab-fila">
        <div className="lab-rotaciones lab-rotaciones-chicas" role="radiogroup" aria-label={t('esc.rotacion')}>
          {estado.planes.map((p, i) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} className="lab-tip" data-tip={nombreRotacion(p.rotacionId, estado.planes)} aria-label={nombreRotacion(p.rotacionId, estado.planes)} onClick={() => { setRotacion(p.rotacionId); setCiclo(1); }}>{i + 1}</button>)}
        </div>
        <div className="lab-iconos" role="radiogroup" aria-label={t('esc.cicloQueVes')}>
          {plan.ciclos.map((c) => <button type="button" role="radio" key={c.ciclo} aria-checked={c.ciclo === visible.ciclo} className="lab-tip" data-tip={t('esc.cicloCultivo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })} aria-label={t('esc.cicloCultivo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })} onClick={() => setCiclo(c.ciclo)}>
            <IconoCultivo cultivo={c.cultivo} tamano={22} />
            {c.ciclo === visible.ciclo && problemas.filter((p) => p.cultivo === c.cultivo).map((p) => <MarcaProblema key={p.cultivo} problema={p} nombre={nombreCultivo(c.cultivo)} />)}
          </button>)}
        </div>
      </div>

      <div className="panel-bloque">
        <p className="lab-resumen" role="status"><strong>{nombreCultivo(visible.cultivo)}</strong>{problemas.filter((p) => p.cultivo === visible.cultivo).map((p) => <MarcaProblema key={p.cultivo} problema={p} nombre={nombreCultivo(p.cultivo)} />)}{t('esc.resumen', { n: visible.ciclo, escenario: nombreEscenario[escenario]!.toLowerCase() })}{metricas?.anioReal ? ` (${metricas.anioReal})` : ''}</p>
        {problemas.some((p) => p.cultivo !== visible.cultivo) && <p className="lab-otros-problemas">{t('esc.tambien')}{problemas.filter((p) => p.cultivo !== visible.cultivo).map((p) => <span key={p.cultivo}>{nombreCultivo(p.cultivo)}<MarcaProblema problema={p} nombre={nombreCultivo(p.cultivo)} /></span>)}</p>}
        {!estado.calculo ? <Cargando>{t('esc.calculando')}</Cargando> : <dl className="lab-metricas">
          <div className="lab-tip" data-tip={t('esc.faltoTip')}><dt>{t('esc.falto')}</dt><dd>{numero(pilar?.deficitHidrico.deficitTotalMm, ' mm')}</dd></div>
          <div className="lab-tip" data-tip={t('esc.sedTip')}><dt>{t('esc.sed')}</dt><dd>{porcentaje(pilar?.deficitHidrico.proporcionDemandaNoCubierta)}</dd></div>
          <div className="lab-tip" data-tip={t('esc.demasTip')}><dt>{t('esc.demas')}</dt><dd>{numero(pilar?.excesoHidrico?.excesoTotalMm, ' mm')}</dd></div>
        </dl>}
      </div>

      {resultado?.cultivosNoRecomendados?.map((c) => <Aviso tipo="aviso" key={c.cultivo}><strong>{nombreCultivo(c.cultivo)}</strong>{t('esc.casiNo')}</Aviso>)}
      {estado.error && <Aviso tipo="error" accion={{ texto: t('esc.reintentar'), onClick: estado.reintentar }}>{estado.error}</Aviso>}

      <footer className="panel-pie">
        <a className="lab-boton lab-boton-suave" href="#/laboratorio"><span aria-hidden="true">←</span>{t('esc.cultivos')}</a>
        <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('comparacion')}>{t('esc.comparar')}<span aria-hidden="true">→</span></button>
      </footer>
    </PanelIzq>

    <section className="lab-dock" aria-label={t('esc.recorrido')}>
      <ControlTiempo key={claveTiempo} fecha={fecha} rango={rango} listo={!!estado.calculo && celdasListas} fallo={!!errorCeldas} retener={retener} onFecha={onFecha} />
      {serie.error && <Aviso tipo="error" accion={{ texto: t('esc.reintentar'), onClick: serie.reintentar }}>{t('esc.errorRecorrido')}</Aviso>}
    </section>
  </>;
}
