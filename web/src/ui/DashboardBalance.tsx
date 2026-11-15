import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, DataState } from './components';
import type { EstadoSerieBalance } from './useSerieBalance';
import { nombresCultivos } from './planes';

const formato = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
export default function DashboardBalance({ serie }: { serie: EstadoSerieBalance }) {
  const datos = serie.datos;
  if (!datos) return <Card title="Dashboard de agua"><DataState state={serie.error ? 'error' : 'loading'}>{serie.error || 'Consultando las series del motor.'}</DataState>{serie.error && <button className="ui-action" onClick={serie.reintentar}>Reintentar series</button>}</Card>;
  return <section className="ui-flow" aria-labelledby="dashboard-titulo">
    <h2 id="dashboard-titulo">Dashboard de agua · {datos.rotacionId} · {datos.escenario} {datos.anioReal}</h2>
    <p>{datos.estado}{datos.motivo ? ` · ${datos.motivo}` : ''}. Las fechas de las gráficas son las del plan; la tabla identifica el mes climático real.</p>
    {datos.meta.esEjemplo && <p className="ui-warning">{datos.meta.aviso}</p>}
    {datos.ciclos.map((c, indice) => <Card key={`${c.ciclo}:${indice}`} title={`Ciclo ${c.ciclo} · ${nombresCultivos[c.cultivo] ?? c.cultivo}`} eyebrow={c.estado}>
      <p>{c.motivo}</p><p className="quiet-note">{c.celdas.length} celdas con esta serie · capacidad de agua del suelo: {c.tawMm === null ? 'NO_EVALUABLE' : `${formato.format(c.tawMm)} mm`}.</p>
      {!c.mensual.length ? <DataState state="missing">{c.motivo ?? 'El motor no entregó una serie evaluable para este ciclo.'}</DataState> : <>
        <h3>Lluvia y demanda mensual (mm)</h3>
        <div className="balance-chart" role="img" aria-label={`Lluvia y demanda mensual del ciclo ${c.ciclo}. Valores completos en la tabla siguiente.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={c.mensual} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" /><XAxis dataKey="mes" tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><YAxis width={44} tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-control-border)', color: 'var(--color-text)' }} /><Legend />
              <Line type="linear" dataKey="lluviaMm" name="Lluvia" stroke="var(--color-text)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="etcMm" name="Demanda (ETc)" stroke="var(--color-text-body)" strokeWidth={2} strokeDasharray="8 4" dot={false} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="etcAjMm" name="Consumo ajustado" stroke="var(--color-text-muted)" strokeWidth={2} strokeDasharray="2 4" dot={false} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h3>Déficit y agua percolada por mes (mm)</h3>
        <div className="balance-chart" role="img" aria-label={`Déficit y percolación del ciclo ${c.ciclo}. Valores completos en la tabla siguiente.`}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={c.mensual} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" /><XAxis dataKey="mes" tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><YAxis width={44} tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-text)' }} /><Legend />
              <Line type="linear" dataKey="deficitMm" name="Déficit" stroke="var(--color-text)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="percolacionMm" name="Percolación" stroke="var(--color-text-body)" strokeWidth={2} strokeDasharray="8 4" dot={false} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="quiet-note">La percolación es agua que supera la capacidad de la cubeta del modelo; no es una medición de encharcamiento. Los trazos y la tabla distinguen series sin depender del color.</p>
        <div className="ui-table-wrap" role="region" aria-label={`Tabla mensual del ciclo ${c.ciclo}`} tabIndex={0}><table><caption>Datos mensuales recibidos del motor · desplaza la tabla para ver todas las columnas</caption><thead><tr><th>Mes del plan</th><th>Mes climático</th><th>Lluvia (mm)</th><th>Demanda ETc (mm)</th><th>Consumo ajustado (mm)</th><th>Déficit (mm)</th><th>Percolación (mm)</th><th>Humedad media (fracción TAW)</th></tr></thead><tbody>{c.mensual.map((m) => <tr key={m.mes}><th scope="row">{m.mes}</th><td>{m.mesClima}</td><td>{formato.format(m.lluviaMm)}</td><td>{formato.format(m.etcMm)}</td><td>{formato.format(m.etcAjMm)}</td><td>{formato.format(m.deficitMm)}</td><td>{formato.format(m.percolacionMm)}</td><td>{formato.format(m.humedadMedia)}</td></tr>)}</tbody></table></div>
      </>}
    </Card>)}
    {datos.advertencias?.map((a, i) => <p className="ui-warning" key={i}>{a.mensaje}</p>)}
  </section>;
}
