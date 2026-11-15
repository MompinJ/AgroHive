// Paso 3: como responde la parcela en anios reales seco, habitual y lluvioso. Las metricas y
// el anio real salen del resultado del motor; la fecha solo consulta celdas ya calculadas.
import type { Escenario } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import type { EstadoSerieBalance } from '../useSerieBalance';
import type { RangoTiempo } from '../tiempo';
import { ControlTiempo } from '../ControlTiempo';
import { Aviso, Cargando, EncabezadoPanel, FuenteVisible, IconoCultivo, nombreCultivo, nombreEscenario, numero, porcentaje } from './piezas';
import type { PasoLab } from './Laboratorio';

const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];
export const nombresPilares: Record<string, string> = { deficitHidrico: 'Déficit hídrico', excesoHidrico: 'Exceso de agua', compatibilidadCiclo: 'Compatibilidad de fechas', proteccionSuelo: 'Protección del suelo', riesgoCalor: 'Riesgo por calor', aporteIndirecto: 'Aporte indirecto' };

export function PanelEscenarios({ estado, onAvanzar, fecha, rango, serie, celdasListas, errorCeldas, onFecha, claveTiempo }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void;
  fecha: string; rango: RangoTiempo | null; serie: EstadoSerieBalance; celdasListas: boolean; errorCeldas: string;
  onFecha: (f: string) => void; claveTiempo: string;
}) {
  const { rotacion, setRotacion, ciclo, setCiclo, escenario, setEscenario } = estado.seleccion;
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const resultado = estado.calculo?.ranking.rotaciones.find((r) => r.rotacionId === plan?.rotacionId);
  const metricas = resultado?.porEscenario[escenario];
  const encabezado = <EncabezadoPanel indice={2} titulo="¿Cómo responde tu campo?">Cada escenario es un año real de la historia de NASA POWER. No es un pronóstico.</EncabezadoPanel>;

  if (!plan || !visible) return <aside className="panel panel-izq" aria-label="Escenarios">{encabezado}<Cargando>Preparando…</Cargando></aside>;

  return <>
    <aside className="panel panel-izq" aria-label="Escenarios">
      {encabezado}

      <div className="panel-bloque">
        <p className="panel-etiqueta" id="esc-etiqueta">Escenario histórico</p>
        <div className="lab-escenarios" role="radiogroup" aria-labelledby="esc-etiqueta">
          {escenarios.map((e) => <button type="button" role="radio" key={e} aria-checked={e === escenario} className={`lab-escenario lab-escenario-${e}`} onClick={() => setEscenario(e)}>
            <strong>{nombreEscenario[e]}</strong>
            <small>{resultado?.porEscenario[e].anioReal ?? '—'}</small>
          </button>)}
        </div>
      </div>

      <div className="panel-bloque lab-fila">
        <div className="lab-segmentado lab-segmentado-chico" role="radiogroup" aria-label="Rotación">
          {estado.planes.map((p) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} onClick={() => { setRotacion(p.rotacionId); setCiclo(1); }}>{p.rotacionId}</button>)}
        </div>
        <div className="lab-segmentado lab-segmentado-chico" role="radiogroup" aria-label="Ciclo visible">
          {plan.ciclos.map((c) => <button type="button" role="radio" key={c.ciclo} aria-checked={c.ciclo === visible.ciclo} onClick={() => setCiclo(c.ciclo)} title={nombreCultivo(c.cultivo)}>
            <IconoCultivo cultivo={c.cultivo} tamano={18} />{c.ciclo}
          </button>)}
        </div>
      </div>

      <div className="panel-bloque">
        <p className="lab-resumen" role="status">{plan.rotacionId} · ciclo {visible.ciclo}: <strong>{nombreCultivo(visible.cultivo)}</strong> · año real {metricas?.anioReal ?? 'NO_EVALUABLE'}{metricas ? ` · ${metricas.estado}` : ''}</p>
        {!estado.calculo ? <Cargando>El motor está calculando…</Cargando> : <dl className="lab-metricas">
          <div><dt>Déficit acumulado</dt><dd>{numero(metricas?.pilares.deficitHidrico.deficitTotalMm, ' mm')}</dd></div>
          <div><dt>Demanda no cubierta</dt><dd>{porcentaje(metricas?.pilares.deficitHidrico.proporcionDemandaNoCubierta)}</dd></div>
          <div><dt>Exceso acumulado</dt><dd>{numero(metricas?.pilares.excesoHidrico?.excesoTotalMm, ' mm')}</dd></div>
        </dl>}
      </div>

      {metricas && <details className="panel-bloque lab-pilares">
        <summary><span className="panel-etiqueta">Pilares de la prueba de estrés</span></summary>
        <ul>{Object.entries(metricas.pilares).map(([id, p]) => <li key={id}><span className={`lab-estado lab-estado-${p.estado === 'EVALUABLE' ? 'ok' : 'no'}`}>{p.estado}</span><span><strong>{nombresPilares[id] ?? id}</strong>{p.motivo ? <small>{p.motivo}</small> : null}</span></li>)}</ul>
      </details>}

      {resultado?.cultivosNoRecomendados?.map((c) => <Aviso tipo="aviso" key={c.cultivo}><strong>{nombreCultivo(c.cultivo)}: no recomendado aquí.</strong> {c.motivo} <FuenteVisible fuente={c.fuente} /></Aviso>)}
      {estado.error && <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso>}

      <footer className="panel-pie">
        <a className="lab-boton lab-boton-suave" href="#/laboratorio"><span aria-hidden="true">←</span> Cultivos</a>
        <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('comparacion')}>Comparar rotaciones <span aria-hidden="true">→</span></button>
      </footer>
    </aside>

    <section className="lab-dock" aria-label="Recorrido en el tiempo">
      <ControlTiempo key={claveTiempo} fecha={fecha} rango={rango} listo={!!estado.calculo && celdasListas} fallo={!!errorCeldas} onFecha={onFecha} />
      {serie.error && <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: serie.reintentar }}>{serie.error} Puedes elegir fechas manualmente.</Aviso>}
    </section>
  </>;
}
