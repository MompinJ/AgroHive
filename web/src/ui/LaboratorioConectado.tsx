import { lazy, Suspense, useEffect, useState } from 'react';
import type { Ciclo, Escenario, Fuente, ResultadoCeldas } from '../../../contratos/tipos/contratos';
import { ActionLink, Card, DataState, PageHeading } from './components';
import { armarPlan, explicarFecha, nombresCultivos, referenciaSiembra } from './planes';
import { conLimite, type LaboratorioEstado } from './useLaboratorio';
import './laboratorio.css';
import { TarjetasRotacion } from './TarjetasRotacion';

const Escena = lazy(() => import('../escena/EscenaParcela').then((m) => ({ default: m.EscenaParcela })));
const DashboardBalance = lazy(() => import('./DashboardBalance'));
const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const pilares: Record<string, string> = { deficitHidrico: 'Déficit hídrico', excesoHidrico: 'Exceso de agua', compatibilidadCiclo: 'Compatibilidad de fechas', proteccionSuelo: 'Protección del suelo', riesgoCalor: 'Riesgo por calor', aporteIndirecto: 'Aporte indirecto' };
export function FuenteVisible({ fuente }: { fuente: Fuente }) {
  return <span className="quiet-note">Fuente: {fuente.url ? <a href={fuente.url} target="_blank" rel="noreferrer">{fuente.nombre}</a> : fuente.nombre}{fuente.cita ? ` · ${fuente.cita}` : ''}</span>;
}
const numero = (n: number | null | undefined, unidad = '') => n == null ? 'NO_EVALUABLE' : `${n.toLocaleString('es-MX', { maximumFractionDigits: 2 })}${unidad}`;
const porcentaje = (n: number | null | undefined) => n == null ? 'NO_EVALUABLE' : new Intl.NumberFormat('es-MX', { style: 'percent', maximumFractionDigits: 1 }).format(n);

export function LaboratorioConectado({ estado, comparacion = false }: { estado: LaboratorioEstado; comparacion?: boolean }) {
  const { rotacion, setRotacion, ciclo, setCiclo, escenario, setEscenario, fechaElegida, setFecha, mostrarBanda, setMostrarBanda } = estado.seleccion;
  const [celdas, setCeldas] = useState<{ clave: string; valor: ResultadoCeldas } | null>(null);
  const [errorCeldas, setErrorCeldas] = useState('');
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const claveFecha = `${plan?.rotacionId}:${visible?.ciclo}:${visible?.siembra}`;
  const fecha = fechaElegida?.clave === claveFecha ? fechaElegida.fecha : visible?.siembra ?? '';
  const claveCeldas = `${estado.calculo?.clave}:${plan?.rotacionId}:${escenario}:${fecha}`;
  useEffect(() => {
    if (!estado.calculo || !plan || !fecha || comparacion) return;
    let activo = true;
    setErrorCeldas('');
    void conLimite(estado.calculo.cliente.celdas(plan.rotacionId, escenario, fecha)).then((valor) => {
      if (activo) setCeldas({ clave: claveCeldas, valor });
    }).catch((e: unknown) => { if (activo) setErrorCeldas(e instanceof Error ? e.message : 'No se pudieron consultar las celdas.'); });
    return () => { activo = false; };
  }, [estado.calculo, plan, escenario, fecha, claveCeldas, comparacion]);
  if (!estado.datos || !plan) return <><PageHeading step="03" title="Prepara tu comparación">Cargamos los datos para tu parcela.</PageHeading><DataState state={estado.error ? 'error' : 'loading'}>{estado.error || 'Preparando clima, suelo y cultivos.'}</DataState>{estado.error && <button className="ui-action" onClick={estado.reintentar}>Reintentar carga</button>}</>;
  const datos = estado.datos;
  const ranking = estado.calculo?.ranking;
  const resultado = ranking?.rotaciones.find((r) => r.rotacionId === plan.rotacionId);
  const metricas = resultado?.porEscenario[escenario];
  function editar(index: number, cambio: Partial<Ciclo>) {
    if (!plan) return;
    estado.actualizar(armarPlan(plan.rotacionId, datos.parcela, plan.ciclos.map((c, i) => i === index ? { ...c, ...cambio } : c), datos.calendario));
  }
  return <div className="ui-flow">
    <PageHeading step={comparacion ? '04' : '03'} title={comparacion ? 'Compara las rotaciones' : '¿Y si siembras algo distinto?'}>Usa historia climática real para explorar alternativas. La fecha del plan se traslada a la temporada de cada año histórico; no predice la cosecha.</PageHeading>
    <details className="ui-warning"><summary>Parcela, fuentes y advertencias</summary><p>{datos.parcela.meta.aviso}</p>{datos.avisos.map((m) => <p key={m}>{m}</p>)}<p>Clima: {datos.serie.estado} · {datos.serie.fuente.nombre}</p><FuenteVisible fuente={datos.serie.fuente} /><p>{datos.suelo?.aviso ?? 'Sin suelo evaluable.'}</p>{datos.serie.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}{datos.parcela.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}</details>
    {!comparacion && <div className="lab-grid lab-connected">
      <Card title="Configura la rotación" eyebrow="01 / Elige">
        <label className="field-label" htmlFor="rotacion-real">Rotación</label><select id="rotacion-real" value={plan.rotacionId} onChange={(e) => { setRotacion(e.target.value); setCiclo(1); }}>{estado.planes.map((p) => <option key={p.rotacionId}>{p.rotacionId}</option>)}</select>
        {plan.ciclos.map((c, i) => {
          const referencia = explicarFecha(c, datos.calendario);
          const local = referenciaSiembra(c.cultivo, c.temporada, datos.calendario);
          return <fieldset className="plan-cycle" key={c.ciclo}><legend>Ciclo {c.ciclo}</legend>
            <label htmlFor={`cultivo-${c.ciclo}`}>Cultivo</label><select id={`cultivo-${c.ciclo}`} value={c.cultivo} onChange={(e) => editar(i, { cultivo: e.target.value })}>{datos.catalogo.cultivos.map((cultivo) => <option value={cultivo.id} key={cultivo.id}>{nombresCultivos[cultivo.id] ?? cultivo.nombreComun}</option>)}</select>
            <label htmlFor={`temporada-${c.ciclo}`}>Temporada</label><select id={`temporada-${c.ciclo}`} value={c.temporada} onChange={(e) => editar(i, { temporada: e.target.value as Ciclo['temporada'] })}><option value="PV">Primavera–verano</option><option value="OI">Otoño–invierno</option></select>
            <label htmlFor={`siembra-${c.ciclo}`}>Fecha de siembra</label><input id={`siembra-${c.ciclo}`} type="date" required value={c.siembra} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) editar(i, { siembra: e.target.value }); }} />
            <p className="quiet-note">{c.porQue}</p>{referencia.fuente && <FuenteVisible fuente={referencia.fuente} />}
            {c.dentroDeVentana != null && <p className="quiet-note">{c.dentroDeVentana ? 'Dentro de la ventana de referencia.' : 'Fuera de la ventana de referencia. Puedes conservar tu fecha y revisar el resultado.'}</p>}
            {local?.ventana.estado === 'EVALUABLE' && <button className="ui-action" onClick={() => {
              const v = local.ventana;
              if (v.estado === 'EVALUABLE') editar(i, { siembra: `${c.siembra.slice(0, 4)}-${String(v.desdeMes).padStart(2, '0')}-${String(v.desdeDia ?? 1).padStart(2, '0')}` });
            }}>Usar inicio de ventana</button>}
            {local?.presencia.estado === 'no_registrado' && <div className="ui-warning"><strong>No recomendado aquí</strong><p>La fuente no registra este cultivo en el lugar durante el período consultado.</p><FuenteVisible fuente={local.presencia.fuente} /></div>}
          </fieldset>;
        })}
      </Card>
      <Card title={datos.parcela.nombre ?? 'Parcela seleccionada'} eyebrow="02 / Explora">
        <p className="quiet-note numeric">{numero(datos.parcela.areaHa, ' ha')} · {datos.parcela.celdas.length} celdas · relieve {datos.parcela.terreno.estado}</p>
        <div className="ui-actions">{plan.ciclos.map((c) => <button className="ui-action" key={c.ciclo} aria-pressed={visible?.ciclo === c.ciclo} onClick={() => setCiclo(c.ciclo)}>Ciclo {c.ciclo}</button>)}</div>
        <p role="status">{plan.rotacionId} · Ciclo {visible?.ciclo} · {nombresCultivos[visible?.cultivo ?? ''] ?? visible?.cultivo} · {escenario} {metricas?.anioReal ?? 'sin año evaluable'}</p>
        <label htmlFor="fecha-observacion">Fecha que muestra la escena</label><input id="fecha-observacion" type="date" value={fecha} onChange={(e) => { if (e.target.value) setFecha({ clave: claveFecha, fecha: e.target.value }); }} />
        {errorCeldas && <DataState state="error">{errorCeldas} Cambia la fecha o reintenta el cálculo.</DataState>}
        <Suspense fallback={<DataState state="loading">Cargando escena 3D.</DataState>}><Escena parcela={datos.parcela} suelo={datos.suelo} resultado={estado.calculo && celdas?.clave === claveCeldas ? celdas.valor : null} fecha={fecha} /></Suspense>
      </Card>
      <Card title="Lee el escenario" eyebrow="03 / Observa">
        <fieldset className="choice-group"><legend>Escenario histórico</legend><div className="ui-actions">{escenarios.map((e) => <label key={e}><input type="radio" name="escenario-real" value={e} checked={e === escenario} onChange={() => setEscenario(e)} /> {e}</label>)}</div></fieldset>
        <p className="numeric">Año real: {metricas?.anioReal ?? 'NO_EVALUABLE'} · {metricas?.estado ?? 'Calculando'}</p>
        <dl className="metrics-list"><div><dt>Déficit acumulado</dt><dd>{numero(metricas?.pilares.deficitHidrico.deficitTotalMm, ' mm')}</dd></div><div><dt>Demanda no cubierta</dt><dd>{porcentaje(metricas?.pilares.deficitHidrico.proporcionDemandaNoCubierta)}</dd></div><div><dt>Exceso acumulado</dt><dd>{numero(metricas?.pilares.excesoHidrico?.excesoTotalMm, ' mm')}</dd></div></dl>
        {metricas && Object.entries(metricas.pilares).map(([id, p]) => <p className="quiet-note" key={id}>{pilares[id] ?? id}: {p.estado}{p.motivo ? ` · ${p.motivo}` : ''}</p>)}
        {resultado?.cultivosNoRecomendados?.map((c) => <div className="ui-warning" key={c.cultivo}><strong>{nombresCultivos[c.cultivo] ?? c.cultivo}: no recomendado aquí</strong><p>{c.motivo}</p><FuenteVisible fuente={c.fuente} /></div>)}
        <ActionLink href="#/comparacion">Comparar rotaciones</ActionLink>
      </Card>
    </div>}
    {estado.error && <><DataState state="error">{estado.error}</DataState><button className="ui-action" onClick={estado.reintentar}>Reintentar cálculo</button></>}
    {!estado.calculo && !estado.error && <DataState state="loading">Calculando planes en el motor. Los resultados anteriores están invalidados.</DataState>}
    {ranking && <Card title="Comparación por robustez" eyebrow="Resultados del motor">
      <p>{ranking.mensaje ?? `${ranking.criterio?.startsWith('B') ? 'Criterio B: menor arrepentimiento máximo entre escenarios' : ranking.criterio ? 'Criterio A: menor déficit en el peor escenario' : 'Sin ranking evaluable'}. Los pesos se declaran ${ranking.ponderacion?.etiqueta ?? 'sin ponderación'}.`}</p>
      <p className="quiet-note">{ranking.ponderacion?.nota}</p>
      <div className="ui-table-wrap" role="region" aria-label="Resultados de las rotaciones" tabIndex={0}><table><caption>Peor caso por rotación; sin posición cuando no es evaluable</caption><thead><tr><th>Rotación</th><th>Estado</th><th>Posición</th><th>Peor escenario</th></tr></thead><tbody>{ranking.rotaciones.map((r) => <tr key={r.rotacionId}><th scope="row">{r.rotacionId}</th><td>{r.estado}</td><td>{r.ranking?.posicion ?? 'Sin ranking'}</td><td>{r.peorCaso?.escenario ?? 'NO_EVALUABLE'}</td></tr>)}</tbody></table></div>
      <p>Un pilar entra solo si todas las rotaciones comparadas tienen datos para evaluarlo.</p>
      <ul>{Object.entries(ranking.ponderacion?.pesos ?? {}).map(([id, peso]) => <li key={id}>{pilares[id] ?? id}: incluido, peso {numero(peso)}.</li>)}{ranking.ponderacion?.pilaresExcluidos.map((id) => {
        const motivos = [...new Set(ranking.rotaciones.flatMap((r) => escenarios.map((e) => r.porEscenario[e].pilares[id]?.motivo).filter((m): m is string => !!m)))];
        return <li key={id}>{pilares[id] ?? id}: excluido. {motivos.join(' ') || ranking.ponderacion?.nota}</li>;
      })}</ul>
      {ranking.noOrdenadas.map((r) => <p key={r.rotacionId}>{r.rotacionId}: {r.motivo}</p>)}
      <details><summary>Fuentes y advertencias del cálculo</summary>{ranking.advertencias.map((a, i) => <p key={i}>{a.mensaje}</p>)}{resultado?.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}</details>
      {comparacion && <ActionLink href="#/laboratorio" secondary>Volver al laboratorio</ActionLink>}
    </Card>}
    <button className="ui-action" aria-expanded={mostrarDashboard} onClick={() => setMostrarDashboard((v) => !v)}>{mostrarDashboard ? 'Ocultar gráficas de agua' : 'Mostrar gráficas de agua'}</button>
    {mostrarDashboard && estado.calculo && <Suspense fallback={<DataState state="loading">Cargando dashboard.</DataState>}><DashboardBalance cliente={estado.calculo.cliente} revision={estado.calculo.clave} rotacion={plan.rotacionId} escenario={escenario} /></Suspense>}
    {ranking && <TarjetasRotacion rotaciones={ranking.rotaciones} />}
    <Card title="Próxima temporada aproximada" eyebrow="Exploratorio">
      <label><input type="checkbox" checked={mostrarBanda} onChange={(e) => setMostrarBanda(e.target.checked)} /> Mostrar banda de incertidumbre</label>
      <p>No es una predicción de cosecha ni de una temporada exacta.</p>
      {mostrarBanda && <>{estado.calculo ? <>
        <p>{estado.calculo.proxima.aviso} · {estado.calculo.proxima.estado}</p><p>{estado.calculo.proxima.motivo}</p>
        <div className="ui-table-wrap" role="region" aria-label="Bandas mensuales aproximadas" tabIndex={0}><table><caption>Rango mensual; los extremos no se suman entre meses</caption><thead><tr><th>Mes</th><th>Lluvia (mm)</th><th>Temperatura (°C)</th></tr></thead><tbody>{estado.calculo.proxima.meses.map((m) => <tr key={m.mes}><th scope="row">{m.mes}</th><td>{numero(m.lluviaMm.inferior)} – {numero(m.lluviaMm.superior)}</td><td>{numero(m.tMediaC.inferior)} – {numero(m.tMediaC.superior)}</td></tr>)}</tbody></table></div>
        {resultado?.proximaTemporada && <><p>{resultado.proximaTemporada.aviso}</p><p>{resultado.proximaTemporada.estado} · {resultado.proximaTemporada.motivo}</p><p>{resultado.proximaTemporada.criterioAnalogos}</p><p>Años análogos: {resultado.proximaTemporada.aniosAnalogos.map((a) => a.anioReal).join(', ') || 'Sin años evaluables'}</p><p>Demanda no cubierta entre análogos: {numero(resultado.proximaTemporada.rango.proporcionDemandaNoCubierta.inferior)} – {numero(resultado.proximaTemporada.rango.proporcionDemandaNoCubierta.superior)}</p>{resultado.proximaTemporada.ciclosFuera?.map((c) => <p key={c.ciclo}>Ciclo {c.ciclo}: {c.motivo}</p>)}</>}
        {estado.calculo.proxima.advertencias.map((a, i) => <p key={i}>{a.mensaje}</p>)}{estado.calculo.proxima.fuentes.map((f, i) => <p key={i}><FuenteVisible fuente={f} /></p>)}
      </> : <DataState state={estado.error ? 'error' : 'loading'}>{estado.error || 'Esperando la banda validada por el motor.'}</DataState>}</>}
    </Card>
  </div>;
}
