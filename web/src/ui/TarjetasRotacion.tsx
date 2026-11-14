import type { ResultadoRotacion } from '../../../contratos/tipos/contratos';
import { Card, DataState } from './components';

export function TarjetasRotacion({ rotaciones }: { rotaciones: ResultadoRotacion[] }) {
  return <section className="ui-flow" aria-labelledby="tarjetas-titulo">
    <h2 id="tarjetas-titulo">Qué explica cada rotación</h2>
    <div className="rotation-cards">{rotaciones.map((r) => {
      const e = r.explicacion;
      return <Card key={r.rotacionId} title={`Rotación ${r.rotacionId}`} eyebrow={r.estado}>
        {!e ? <DataState state="missing">El motor no entregó una explicación para esta rotación.</DataState> : <>
          <p>{e.porQue}</p>
          <h3>Huecos de información</h3>
          {e.huecos.length ? <ul className="ui-warning">{e.huecos.map((h, i) => <li key={i}>{h}</li>)}</ul> : <p>El motor no reporta huecos adicionales.</p>}
          <h3>Beneficios que muestran los datos</h3>
          {e.beneficios.length ? <ul>{e.beneficios.map((b, i) => <li key={i}>{b}</li>)}</ul> : <p>No hay beneficios evaluables reportados.</p>}
          <h3>Riesgos y límites</h3>
          {e.riesgos.length ? <ul>{e.riesgos.map((b, i) => <li key={i}>{b}</li>)}</ul> : <p>El motor no reporta riesgos adicionales; esto no demuestra ausencia de riesgo.</p>}
          <h3>Evidencia y fuentes</h3>
          <ul>{e.evidencia.map((ev, i) => <li key={i}><p>{ev.texto}</p><p className="quiet-note">{ev.fuente.url ? <a href={ev.fuente.url} target="_blank" rel="noreferrer">{ev.fuente.nombre}</a> : ev.fuente.nombre}{ev.fuente.cita ? ` · ${ev.fuente.cita}` : ''}</p></li>)}</ul>
          <p className="ui-warning">{e.avisoExperto}</p>
        </>}
      </Card>;
    })}</div>
  </section>;
}
