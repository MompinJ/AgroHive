import { ActionLink, Card, DataState, PageHeading } from '../ui/components';
import { agruparFuentes } from '../ui/fuentes';
import { condicionesFuentes } from '../ui/licencias';
import type { LaboratorioEstado } from '../ui/useLaboratorio';
import { useIdioma } from '../ui/i18n/Idioma';

export function MetodoFuentes({ estado }: { estado: LaboratorioEstado }) {
  const datos = estado.datos;
  const { t } = useIdioma();
  const bloques = datos ? [
    { nombre: t('met.clima'), documento: datos.serie, estado: datos.serie.estado },
    { nombre: t('met.relieve'), documento: datos.parcela, estado: datos.parcela.terreno.estado },
    { nombre: t('met.suelo'), documento: datos.suelo, estado: datos.suelo?.etiqueta ?? 'NO_EVALUABLE' },
    { nombre: t('met.cultivos'), documento: [datos.catalogo, datos.tabla], estado: t('met.cultivosEstado') },
    { nombre: t('met.calendario'), documento: datos.calendario, estado: datos.calendario ? t('met.calRef') : t('met.sinCal') },
    { nombre: t('met.proxima'), documento: datos.capa, estado: datos.capa?.estado ?? 'NO_EVALUABLE' },
  ] : [];
  const grupos = agruparFuentes(bloques.map((b) => b.documento));
  return <div className="ui-flow">
    <PageHeading step="05" title={t('met.titulo')}>{t('met.intro')}</PageHeading>
    <ActionLink href="#/laboratorio" secondary>{t('met.volver')}</ActionLink>
    <Card title={t('met.como')}>
      <ol className="ui-copy"><li>{t('met.paso1')}</li><li>{t('met.paso2')}</li><li>{t('met.paso3')}</li><li>{t('met.paso4')}</li></ol>
      <p>{t('met.worker')}</p>
      <p>{t('met.region')}</p>
    </Card>
    <Card title={t('met.presente')}>
      <ul className="ui-copy"><li>{t('met.lim1')}</li><li>{t('met.lim2')}</li><li>{t('met.lim3')}</li><li>{t('met.lim4')}</li><li>{t('met.lim5')}</li></ul>
      <p className="ui-warning">{t('met.decision')}</p>
    </Card>
    {!datos && <><DataState state={estado.error ? 'error' : 'loading'}>{estado.error || t('met.preparando')}</DataState>{estado.error && <button className="ui-action" onClick={estado.reintentar}>{t('met.reintentar')}</button>}</>}
    {datos && <Card title={t('met.datosSesion')}>
      <p>{t('met.parcela', { nombre: datos.parcela.nombre ?? datos.parcela.id, centroide: datos.parcela.centroide.join(', ') })}</p>
      <p>{datos.parcela.meta.aviso}</p>{datos.avisos.map((aviso, i) => <p className="ui-warning" key={i}>{aviso}</p>)}
      {datos.serie.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
      {datos.suelo?.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
      {datos.parcela.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
    </Card>}
    <Card title={t('met.licencias')}><p>{t('met.licenciasIntro')}</p><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">{t('met.ccby')}</a></p><ul className="source-list">{condicionesFuentes.map((c) => <li key={c.id}><h3>{c.nombre}</h3><p>{c.texto}</p><a href={c.url} target="_blank" rel="noreferrer">{t('met.consultar', { nombre: c.nombre })}</a></li>)}</ul></Card>
    {grupos.map((g) => <Card title={g.nombre} key={g.id}>
      <p className="quiet-note">{condicionesFuentes.find((c) => c.id === g.id)?.texto ?? t('met.sinLicencia')}</p>
      <details><summary>{t('met.verRefs', { n: g.referencias.length })}</summary><ul className="source-list">{g.referencias.map((f, i) => <li key={i}>
        <p>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.nombre}</a> : f.nombre}</p>
        {f.cita && <p>{f.cita}</p>}{f.periodo && <p>{t('met.periodo', { desde: f.periodo.desde, hasta: f.periodo.hasta })}</p>}{f.coordenada && <p>{t('met.coordenada', { c: f.coordenada.join(', ') })}</p>}
        {f.resolucion && <p>{t('met.resolucion', { r: f.resolucion })}</p>}{f.unidades && <p>{t('met.unidades', { u: f.unidades })}</p>}{f.consultado && <p>{t('met.consulta', { f: f.consultado })}</p>}{f.nota && <p>{f.nota}</p>}
      </li>)}</ul></details>
    </Card>)}
  </div>;
}
