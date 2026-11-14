import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Escenario, SerieBalance } from '../../../contratos/tipos/contratos';
import type { ClienteMotor } from '../motor/cliente';
import { Card, DataState } from './components';
import { conLimite } from './useLaboratorio';
import { nombresCultivos } from './planes';

const formato = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
export default function DashboardBalance({ cliente, revision, rotacion, escenario }: { cliente: ClienteMotor; revision: string; rotacion: string; escenario: Escenario }) {
  const [serie, setSerie] = useState<{ clave: string; datos: SerieBalance } | null>(null);
  const [error, setError] = useState<{ clave: string; motivo: string } | null>(null);
  const [intento, setIntento] = useState(0);
  const clave = `${revision}:${rotacion}:${escenario}:${intento}`;
  useEffect(() => {
    let activo = true;
    void conLimite(cliente.serieBalance(rotacion, escenario)).then((datos) => { if (activo) setSerie({ clave, datos }); }).catch((e: unknown) => { if (activo) setError({ clave, motivo: e instanceof Error ? e.message : 'No se pudo leer la serie.' }); });
    return () => { activo = false; };
  }, [cliente, clave, rotacion, escenario]);
  const datos = serie?.clave === clave ? serie.datos : null;
  if (!datos) return <Card title="Dashboard de agua"><DataState state={error?.clave === clave ? 'error' : 'loading'}>{error?.clave === clave ? error.motivo : 'Consultando las series del motor.'}</DataState>{error?.clave === clave && <button className="ui-action" onClick={() => setIntento((n) => n + 1)}>Reintentar series</button>}</Card>;
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
    <details><summary>Fuentes de las series del balance</summary><ul>{datos.fuentes.map((f, i) => <li key={i}>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.nombre}</a> : f.nombre}{f.cita ? ` · ${f.cita}` : ''}</li>)}</ul></details>
  </section>;
}
