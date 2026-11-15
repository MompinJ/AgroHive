import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, DataState } from './components';
import type { EstadoSerieBalance } from './useSerieBalance';
import { nombreCultivo, nombreEscenario } from './lab/piezas';
import { useIdioma } from './i18n/Idioma';
import { tt } from './i18n/actual';

const formato = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
export default function DashboardBalance({ serie, nombre }: { serie: EstadoSerieBalance; nombre?: string }) {
  const datos = serie.datos;
  const { t } = useIdioma();
  if (!datos) return <Card title={t('dash.titulo')}><DataState state={serie.error ? 'error' : 'loading'}>{serie.error || t('dash.consultando')}</DataState>{serie.error && <button className="ui-action" onClick={serie.reintentar}>{t('dash.reintentar')}</button>}</Card>;
  return <section className="ui-flow" aria-labelledby="dashboard-titulo">
    <h2 id="dashboard-titulo">{t('dash.encabezado', { nombre: nombre ?? tt('plan.rotacion', { n: datos.rotacionId.replace(/^R/, '') }), escenario: nombreEscenario[datos.escenario] ?? datos.escenario })}{datos.anioReal ? ` (${datos.anioReal})` : ''}</h2>
    <p>{datos.estado}{datos.motivo ? ` · ${datos.motivo}` : ''}{t('dash.fechas')}</p>
    {datos.meta.esEjemplo && <p className="ui-warning">{datos.meta.aviso}</p>}
    {datos.ciclos.map((c, indice) => <Card key={`${c.ciclo}:${indice}`} title={t('dash.ciclo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })} eyebrow={c.estado}>
      <p>{c.motivo}</p><p className="quiet-note">{t('dash.celdas', { n: c.celdas.length, taw: c.tawMm === null ? 'NO_EVALUABLE' : `${formato.format(c.tawMm)} mm` })}</p>
      {!c.mensual.length ? <DataState state="missing">{c.motivo ?? t('dash.sinSerie')}</DataState> : <>
        <h3>{t('dash.lluviaDemanda')}</h3>
        <div className="balance-chart" role="img" aria-label={t('dash.lluviaDemandaAria', { n: c.ciclo })}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={c.mensual} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" /><XAxis dataKey="mes" tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><YAxis width={44} tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-control-border)', color: 'var(--color-text)' }} /><Legend />
              <Line type="linear" dataKey="lluviaMm" name={t('dash.lluvia')} stroke="var(--color-text)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="etcMm" name={t('dash.demanda')} stroke="var(--color-text-body)" strokeWidth={2} strokeDasharray="8 4" dot={false} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="etcAjMm" name={t('dash.ajustado')} stroke="var(--color-text-muted)" strokeWidth={2} strokeDasharray="2 4" dot={false} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <h3>{t('dash.deficitPerc')}</h3>
        <div className="balance-chart" role="img" aria-label={t('dash.deficitPercAria', { n: c.ciclo })}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={c.mensual} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" /><XAxis dataKey="mes" tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><YAxis width={44} tick={{ fill: 'var(--color-text-body)', fontSize: 12 }} /><Tooltip contentStyle={{ background: 'var(--color-surface)', color: 'var(--color-text)' }} /><Legend />
              <Line type="linear" dataKey="deficitMm" name={t('dash.deficit')} stroke="var(--color-text)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
              <Line type="linear" dataKey="percolacionMm" name={t('dash.percolacion')} stroke="var(--color-text-body)" strokeWidth={2} strokeDasharray="8 4" dot={false} isAnimationActive={false} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="quiet-note">{t('dash.nota')}</p>
        <div className="ui-table-wrap" role="region" aria-label={t('dash.tablaAria', { n: c.ciclo })} tabIndex={0}><table><caption>{t('dash.caption')}</caption><thead><tr><th>{t('dash.mesPlan')}</th><th>{t('dash.mesClima')}</th><th>{t('dash.colLluvia')}</th><th>{t('dash.colEtc')}</th><th>{t('dash.colAj')}</th><th>{t('dash.colDef')}</th><th>{t('dash.colPerc')}</th><th>{t('dash.colHum')}</th></tr></thead><tbody>{c.mensual.map((m) => <tr key={m.mes}><th scope="row">{m.mes}</th><td>{m.mesClima}</td><td>{formato.format(m.lluviaMm)}</td><td>{formato.format(m.etcMm)}</td><td>{formato.format(m.etcAjMm)}</td><td>{formato.format(m.deficitMm)}</td><td>{formato.format(m.percolacionMm)}</td><td>{formato.format(m.humedadMedia)}</td></tr>)}</tbody></table></div>
      </>}
    </Card>)}
    {datos.advertencias?.map((a, i) => <p className="ui-warning" key={i}>{a.mensaje}</p>)}
  </section>;
}
