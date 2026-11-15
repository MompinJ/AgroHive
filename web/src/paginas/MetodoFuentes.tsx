import { ActionLink, Card, DataState, PageHeading } from '../ui/components';
import { agruparFuentes } from '../ui/fuentes';
import { condicionesFuentes } from '../ui/licencias';
import type { LaboratorioEstado } from '../ui/useLaboratorio';

export function MetodoFuentes({ estado }: { estado: LaboratorioEstado }) {
  const datos = estado.datos;
  const bloques = datos ? [
    { nombre: 'Clima histórico', documento: datos.serie, estado: datos.serie.estado },
    { nombre: 'Relieve', documento: datos.parcela, estado: datos.parcela.terreno.estado },
    { nombre: 'Suelo', documento: datos.suelo, estado: datos.suelo?.etiqueta ?? 'NO_EVALUABLE' },
    { nombre: 'Cultivos y tabla de suelos', documento: [datos.catalogo, datos.tabla], estado: 'Parámetros con fuentes; revisar cada valor' },
    { nombre: 'Calendario local', documento: datos.calendario, estado: datos.calendario ? 'Referencia local' : 'Sin calendario local' },
    { nombre: 'Próxima temporada', documento: datos.capa, estado: datos.capa?.estado ?? 'NO_EVALUABLE' },
  ] : [];
  const grupos = agruparFuentes(bloques.map((b) => b.documento));
  return <div className="ui-flow">
    <PageHeading step="05" title="Método, fuentes y límites">Revisa de dónde salen los datos de esta sesión y qué puede evaluarse antes de tomar una decisión.</PageHeading>
    <ActionLink href="#/laboratorio" secondary>Volver al laboratorio</ActionLink>
    <Card title="Cómo funciona la comparación">
      <ol className="ui-copy"><li>Eliges una parcela, cultivos y fechas de siembra.</li><li>El motor selecciona años históricos secos, normales y lluviosos; conserva el año real de cada escenario.</li><li>Calcula demanda de agua y balance hídrico con los parámetros disponibles. Si falta un dato esencial, explica el motivo y devuelve NO_EVALUABLE.</li><li>Compara la robustez usando los pilares que tienen datos en todas las alternativas. Los pesos, exclusiones y supuestos se muestran junto al resultado.</li></ol>
      <p>Los cálculos ocurren en un Worker del navegador. La escena representa sus resultados: no decide etapas ni estrés por su cuenta.</p>
      <p>El clima representa una región; no es una medición independiente de cada bloque. El suelo de mapas globales es una estimación. La pendiente y el relieve no convierten la simulación en un levantamiento de campo.</p>
    </Card>
    <Card title="Lo que debes tener presente">
      <ul className="ui-copy"><li>AgroHive no predice cosechas, ingresos ni una temporada exacta.</li><li>La banda de próxima temporada es exploratoria. No sumes sus extremos mensuales.</li><li>Sin intensidad de lluvia subdiaria y factores con fuente no se estima erosión; los días de suelo desnudo son un indicador distinto.</li><li>Un calendario regional es una referencia; no sustituye la validación de fechas con un especialista local.</li><li>Las parcelas de ejemplo son contornos ficticios sobre tierra de cultivo real, con datos de la API grabados (sirven sin red). Las parcelas dibujadas conservan las limitaciones y huecos de las fuentes consultadas.</li></ul>
      <p className="ui-warning">La decisión final corresponde al agricultor. Valida las alternativas con un profesional de agronomía.</p>
    </Card>
    {!datos && <><DataState state={estado.error ? 'error' : 'loading'}>{estado.error || 'Preparando las fuentes de la sesión.'}</DataState>{estado.error && <button className="ui-action" onClick={estado.reintentar}>Reintentar carga de fuentes</button>}</>}
    {datos && <Card title="Datos y advertencias de esta sesión">
      <p>Parcela: {datos.parcela.nombre ?? datos.parcela.id}. Centroide: {datos.parcela.centroide.join(', ')}.</p>
      <p>{datos.parcela.meta.aviso}</p>{datos.avisos.map((aviso, i) => <p className="ui-warning" key={i}>{aviso}</p>)}
      {datos.serie.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
      {datos.suelo?.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
      {datos.parcela.advertencias?.map((a, i) => <p key={i}>{a.mensaje}</p>)}
    </Card>}
    <Card title="Licencias, términos y atribución"><p>Resumen de las fuentes del proyecto. La revisión humana de licencias sigue pendiente; los puntos sin confirmar no se convierten en permisos.</p><p><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">Texto de CC BY 4.0</a></p><ul className="source-list">{condicionesFuentes.map((c) => <li key={c.id}><h3>{c.nombre}</h3><p>{c.texto}</p><a href={c.url} target="_blank" rel="noreferrer">Consultar condiciones de {c.nombre}</a></li>)}</ul></Card>
    {grupos.map((g) => <Card title={g.nombre} key={g.id}>
      <p className="quiet-note">{condicionesFuentes.find((c) => c.id === g.id)?.texto ?? 'Licencia específica no verificada para esta referencia. Se conserva la cita original; no se deducen permisos de reutilización.'}</p>
      <details><summary>Ver {g.referencias.length} referencias y metadatos de esta fuente</summary><ul className="source-list">{g.referencias.map((f, i) => <li key={i}>
        <p>{f.url ? <a href={f.url} target="_blank" rel="noreferrer">{f.nombre}</a> : f.nombre}</p>
        {f.cita && <p>{f.cita}</p>}{f.periodo && <p>Período: {f.periodo.desde} a {f.periodo.hasta}.</p>}{f.coordenada && <p>Coordenada de la fuente: {f.coordenada.join(', ')}.</p>}
        {f.resolucion && <p>Resolución: {f.resolucion}.</p>}{f.unidades && <p>Unidades: {f.unidades}.</p>}{f.consultado && <p>Consulta: {f.consultado}.</p>}{f.nota && <p>{f.nota}</p>}
      </li>)}</ul></details>
    </Card>)}
  </div>;
}
