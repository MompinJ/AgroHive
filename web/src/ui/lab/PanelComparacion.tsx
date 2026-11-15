// Paso 4: ranking por robustez del motor, explicacion de cada rotacion, graficas de agua y
// banda exploratoria de la proxima temporada. Nada se recalcula aqui.
import { lazy, Suspense, useState } from 'react';
import type { Escenario } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import type { EstadoSerieBalance } from '../useSerieBalance';
import { ordenarRotaciones } from '../ordenRotaciones';
import { TarjetasRotacion } from '../TarjetasRotacion';
import { Aviso, Cargando, EncabezadoPanel, FuenteVisible, Secuencia, nombreEscenario, numero } from './piezas';
import { nombresPilares } from './PanelEscenarios';
import type { PasoLab } from './Laboratorio';

const DashboardBalance = lazy(() => import('../DashboardBalance'));
const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];
type Pestana = 'explicacion' | 'agua' | 'proxima';

export function PanelComparacion({ estado, serie, setGraficas }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void; serie: EstadoSerieBalance; setGraficas: (v: boolean) => void;
}) {
  const [pestana, setPestana] = useState<Pestana>('explicacion');
  const { rotacion, setRotacion, setMostrarBanda } = estado.seleccion;
  const ranking = estado.calculo?.ranking;
  const ordenadas = ordenarRotaciones(ranking?.rotaciones ?? []);
  const resultado = ranking?.rotaciones.find((r) => r.rotacionId === rotacion);
  const elegir = (p: Pestana) => { setPestana(p); setGraficas(p === 'agua'); setMostrarBanda(p === 'proxima'); };
  const criterio = ranking ? ranking.mensaje ?? `${ranking.criterio?.startsWith('B') ? 'Menor arrepentimiento máximo entre escenarios' : ranking.criterio ? 'Menor déficit en el peor escenario' : 'Sin ranking evaluable'}.` : '';

  return <section className="panel panel-ancho" aria-label="Comparación">
    <EncabezadoPanel indice={3} titulo="Compara las rotaciones">Ordenadas por robustez: la que mejor aguanta su peor año, no la que más rinde en un año ideal.</EncabezadoPanel>

    {!ranking ? (estado.error ? <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso> : <Cargando>El motor está ordenando las rotaciones…</Cargando>) : <>
      <p className="panel-ayuda">{criterio} {ranking.ponderacion ? `Pesos ${ranking.ponderacion.etiqueta}.` : ''}</p>
      <ol className="lab-ranking">
        {ordenadas.map((r) => {
          const plan = estado.planes.find((p) => p.rotacionId === r.rotacionId);
          const primera = r.ranking?.posicion === 1;
          return <li key={r.rotacionId} className={`${primera ? 'lab-ranking-primera' : ''}${r.rotacionId === rotacion ? ' lab-ranking-actual' : ''}`}>
            <button type="button" aria-pressed={r.rotacionId === rotacion} onClick={() => setRotacion(r.rotacionId)}>
              <span className="lab-ranking-pos" aria-label={r.ranking?.posicion ? `Posición ${r.ranking.posicion}` : 'Sin posición'}>{r.ranking?.posicion ?? '—'}</span>
              <span className="lab-ranking-cuerpo">
                <span className="lab-ranking-titulo"><strong>{r.rotacionId}</strong>{primera && <span className="lab-insignia">Más robusta</span>}<span className="lab-ranking-estado">{r.estado}</span></span>
                {plan && <Secuencia plan={plan} />}
                <span className="lab-ranking-escenarios">
                  {escenarios.map((e) => <span key={e} className={r.peorCaso?.escenario === e ? 'lab-peor' : ''}>{nombreEscenario[e]} {r.porEscenario[e].anioReal ?? '—'}: {numero(r.porEscenario[e].pilares.deficitHidrico.deficitTotalMm, ' mm')}{r.peorCaso?.escenario === e ? ' · peor caso' : ''}</span>)}
                </span>
              </span>
            </button>
          </li>;
        })}
      </ol>
      {ranking.noOrdenadas.map((r) => <p className="panel-ayuda" key={r.rotacionId}>{r.rotacionId}: {r.motivo}</p>)}

      <details className="panel-bloque">
        <summary><span className="panel-etiqueta">Cómo se ordenó</span></summary>
        <p className="panel-ayuda">{ranking.ponderacion?.nota}</p>
        <p className="panel-ayuda">Un pilar entra solo si todas las rotaciones comparadas tienen datos para evaluarlo.</p>
        <ul className="lab-lista">{Object.entries(ranking.ponderacion?.pesos ?? {}).map(([id, peso]) => <li key={id}>{nombresPilares[id] ?? id}: incluido, peso {numero(peso)}.</li>)}{ranking.ponderacion?.pilaresExcluidos.map((id) => {
          const motivos = [...new Set(ranking.rotaciones.flatMap((r) => escenarios.map((e) => r.porEscenario[e].pilares[id]?.motivo).filter((m): m is string => !!m)))];
          return <li key={id}>{nombresPilares[id] ?? id}: excluido. {motivos.join(' ') || ranking.ponderacion?.nota}</li>;
        })}</ul>
        {ranking.advertencias.map((a, i) => <p className="panel-ayuda" key={i}>{a.mensaje}</p>)}
        {resultado?.advertencias?.map((a, i) => <p className="panel-ayuda" key={`r${i}`}>{a.mensaje}</p>)}
      </details>

      <div className="lab-pestanas" role="tablist" aria-label="Detalle">
        {([['explicacion', 'Qué explica cada una'], ['agua', 'Gráficas de agua'], ['proxima', 'Próxima temporada']] as const).map(([id, texto]) => <button type="button" role="tab" key={id} id={`tab-${id}`} aria-selected={pestana === id} aria-controls={`panel-${id}`} onClick={() => elegir(id)}>{texto}</button>)}
      </div>
      <div className="lab-pestana" role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === 'explicacion' && <TarjetasRotacion rotaciones={ordenadas} />}
        {pestana === 'agua' && <Suspense fallback={<Cargando>Cargando gráficas…</Cargando>}><DashboardBalance serie={serie} /></Suspense>}
        {pestana === 'proxima' && <div className="ui-flow">
          <Aviso tipo="aviso">Exploratorio: no es una predicción de cosecha ni de una temporada exacta.</Aviso>
          <p>{estado.calculo!.proxima.aviso} · {estado.calculo!.proxima.estado}</p><p className="panel-ayuda">{estado.calculo!.proxima.motivo}</p>
          <div className="ui-table-wrap" role="region" aria-label="Bandas mensuales aproximadas" tabIndex={0}><table><caption>Rango mensual; los extremos no se suman entre meses</caption><thead><tr><th>Mes</th><th>Lluvia (mm)</th><th>Temperatura (°C)</th></tr></thead><tbody>{estado.calculo!.proxima.meses.map((m) => <tr key={m.mes}><th scope="row">{m.mes}</th><td>{numero(m.lluviaMm.inferior)} – {numero(m.lluviaMm.superior)}</td><td>{numero(m.tMediaC.inferior)} – {numero(m.tMediaC.superior)}</td></tr>)}</tbody></table></div>
          {resultado?.proximaTemporada && <>
            <p>{resultado.proximaTemporada.aviso}</p><p className="panel-ayuda">{resultado.proximaTemporada.estado} · {resultado.proximaTemporada.motivo}</p>
            <p className="panel-ayuda">{resultado.proximaTemporada.criterioAnalogos}</p>
            <p>Años análogos: {resultado.proximaTemporada.aniosAnalogos.map((a) => a.anioReal).join(', ') || 'Sin años evaluables'}</p>
            <p>Demanda no cubierta entre análogos: {numero(resultado.proximaTemporada.rango.proporcionDemandaNoCubierta.inferior)} – {numero(resultado.proximaTemporada.rango.proporcionDemandaNoCubierta.superior)}</p>
            {resultado.proximaTemporada.ciclosFuera?.map((c) => <p className="panel-ayuda" key={c.ciclo}>Ciclo {c.ciclo}: {c.motivo}</p>)}
          </>}
          {estado.calculo!.proxima.advertencias.map((a, i) => <p className="panel-ayuda" key={i}>{a.mensaje}</p>)}
          {estado.calculo!.proxima.fuentes.map((f, i) => <p key={i}><FuenteVisible fuente={f} /></p>)}
        </div>}
      </div>
    </>}

    <footer className="panel-pie">
      <a className="lab-boton lab-boton-suave" href="#/escenarios"><span aria-hidden="true">←</span> Escenarios</a>
      <a className="lab-boton lab-boton-suave" href="#/metodo">Método y fuentes</a>
    </footer>
    <p className="panel-legal">La decisión final es del agricultor. AgroHive no predice cosechas ni reemplaza a un agrónomo.</p>
  </section>;
}
