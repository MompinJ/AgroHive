// Paso 3: como responde la parcela en anios reales seco, habitual y lluvioso. Las metricas y
// el anio real salen del resultado del motor; la fecha solo consulta celdas ya calculadas.
import type { Escenario } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import type { EstadoSerieBalance } from '../useSerieBalance';
import type { RangoTiempo } from '../tiempo';
import { ControlTiempo } from '../ControlTiempo';
import { Aviso, Cargando, EncabezadoPanel, IconoCultivo, nombreCultivo, nombreEscenario, numero, porcentaje } from './piezas';
import { nombreRotacion } from '../planes';
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
  const encabezado = <EncabezadoPanel indice={2} titulo="¿Cómo le iría a tu plan?">Lo probamos con tres años reales del pasado en tu zona: uno seco, uno normal y uno lluvioso.</EncabezadoPanel>;

  if (!plan || !visible) return <aside className="panel panel-izq" aria-label="Escenarios">{encabezado}<Cargando>Preparando…</Cargando></aside>;
  const pilar = metricas?.pilares;

  return <>
    <aside className="panel panel-izq" aria-label="Escenarios">
      {encabezado}

      <div className="lab-escenarios" role="radiogroup" aria-label="Año de prueba">
        {escenarios.map((e) => <button type="button" role="radio" key={e} aria-checked={e === escenario} className={`lab-escenario lab-escenario-${e}`} onClick={() => setEscenario(e)}>
          <strong>{nombreEscenario[e]}</strong>
          <small>{resultado?.porEscenario[e].anioReal ?? '—'}</small>
        </button>)}
      </div>

      <div className="panel-bloque lab-fila">
        <div className="lab-rotaciones lab-rotaciones-chicas" role="radiogroup" aria-label="Rotación">
          {estado.planes.map((p, i) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} className="lab-tip" data-tip={nombreRotacion(p.rotacionId, estado.planes)} aria-label={nombreRotacion(p.rotacionId, estado.planes)} onClick={() => { setRotacion(p.rotacionId); setCiclo(1); }}>{i + 1}</button>)}
        </div>
        <div className="lab-iconos" role="radiogroup" aria-label="Ciclo que ves">
          {plan.ciclos.map((c) => <button type="button" role="radio" key={c.ciclo} aria-checked={c.ciclo === visible.ciclo} className="lab-tip" data-tip={`Ciclo ${c.ciclo}: ${nombreCultivo(c.cultivo)}`} aria-label={`Ciclo ${c.ciclo}: ${nombreCultivo(c.cultivo)}`} onClick={() => setCiclo(c.ciclo)}>
            <IconoCultivo cultivo={c.cultivo} tamano={22} />
          </button>)}
        </div>
      </div>

      <div className="panel-bloque">
        <p className="lab-resumen" role="status"><strong>{nombreCultivo(visible.cultivo)}</strong>, ciclo {visible.ciclo}, en el {nombreEscenario[escenario]!.toLowerCase()}{metricas?.anioReal ? ` (${metricas.anioReal})` : ''}</p>
        {!estado.calculo ? <Cargando>Calculando…</Cargando> : <dl className="lab-metricas">
          <div className="lab-tip" data-tip="Agua que el cultivo necesitó y no tuvo en todo el plan"><dt>Agua que faltó</dt><dd>{numero(pilar?.deficitHidrico.deficitTotalMm, ' mm')}</dd></div>
          <div className="lab-tip" data-tip="Parte de lo que el cultivo pidió de agua que no recibió"><dt>Sed del cultivo</dt><dd>{porcentaje(pilar?.deficitHidrico.proporcionDemandaNoCubierta)}</dd></div>
          <div className="lab-tip" data-tip="Agua de lluvia que sobró y escurrió o se fue al subsuelo"><dt>Agua de más</dt><dd>{numero(pilar?.excesoHidrico?.excesoTotalMm, ' mm')}</dd></div>
        </dl>}
      </div>

      {resultado?.cultivosNoRecomendados?.map((c) => <Aviso tipo="aviso" key={c.cultivo}><strong>{nombreCultivo(c.cultivo)}</strong> casi no se siembra en esta zona.</Aviso>)}
      {estado.error && <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso>}

      <footer className="panel-pie">
        <a className="lab-boton lab-boton-suave" href="#/laboratorio"><span aria-hidden="true">←</span> Cultivos</a>
        <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('comparacion')}>Comparar <span aria-hidden="true">→</span></button>
      </footer>
    </aside>

    <section className="lab-dock" aria-label="Recorrido en el tiempo">
      <ControlTiempo key={claveTiempo} fecha={fecha} rango={rango} listo={!!estado.calculo && celdasListas} fallo={!!errorCeldas} onFecha={onFecha} />
      {serie.error && <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: serie.reintentar }}>No se pudo cargar el recorrido en el tiempo.</Aviso>}
    </section>
  </>;
}
