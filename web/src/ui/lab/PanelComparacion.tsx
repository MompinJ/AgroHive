// Paso 4: comparacion directa. Una tarjeta por rotacion, en el orden del ranking del motor:
// su lugar, sus cultivos, cuanta agua le falto en cada anio y, primero, sus debilidades (los
// riesgos que redacta el motor). Nada se recalcula aqui.
import { lazy, Suspense, useState } from 'react';
import type { Escenario } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import type { EstadoSerieBalance } from '../useSerieBalance';
import { ordenarRotaciones } from '../ordenRotaciones';
import { nombreRotacion } from '../planes';
import { Aviso, Cargando, EncabezadoPanel, IconoCultivo, nombreCultivo, nombreEscenario, numero } from './piezas';
import { IconoInfo } from './iconos';
import { nombresPilares } from './PanelEscenarios';
import type { PasoLab } from './Laboratorio';
import { PlanElegido } from './PlanElegido';
import { armarDatosResumen } from './armarResumen';
import { construirResumenPdf, nombreArchivoPdf } from '../pdf/resumenComparacion';
import { descargarArchivo } from '../pdf/descargar';
import { tocar } from '../sonido';
import type { Hecho } from './historial';
import { useIdioma } from '../i18n/Idioma';
import type { ClaveTexto } from '../i18n/diccionarios';

const DashboardBalance = lazy(() => import('../DashboardBalance'));
const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];

export function PanelComparacion({ estado, onAvanzar, serie, setGraficas, plagasDe, hechos = [] }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void; serie: EstadoSerieBalance; setGraficas: (v: boolean) => void;
  /** Por rotacion: plagas registradas en la zona que atacan sus cultivos y bloques sin insecticida. */
  plagasDe: (rotacionId: string) => readonly { ciclo: number; plaga: string; cultivo: string; bloques: number }[];
  /** Historial de hechos, que va en el resumen en PDF. */
  hechos?: readonly Hecho[];
}) {
  const { rotacion, setRotacion, setCiclo, setEscenario, setMostrarBanda } = estado.seleccion;
  const { idioma, t } = useIdioma();
  const rotacionEnFrase = (id: string) => (idioma === 'en' ? nombreRotacion(id, estado.planes) : nombreRotacion(id, estado.planes).toLowerCase());
  const [elegido, setElegido] = useState<string | null>(null);
  const [descarga, setDescarga] = useState<'ok' | 'error' | null>(null);
  const planElegido = elegido ? estado.planes.find((p) => p.rotacionId === elegido) : undefined;
  const ranking = estado.calculo?.ranking;
  const ordenadas = ordenarRotaciones(ranking?.rotaciones ?? []);
  const resultado = ranking?.rotaciones.find((r) => r.rotacionId === rotacion);
  const maximo = Math.max(1, ...ordenadas.flatMap((r) => escenarios.map((e) => r.porEscenario[e].pilares.deficitHidrico.deficitTotalMm ?? 0)));
  const limites = [...new Set(ordenadas.flatMap((r) => r.explicacion?.huecos ?? []))];
  const comoSeOrdena = ranking?.ponderacion
    ? t('cmp.ordenPonderado', { pilares: Object.keys(ranking.ponderacion.pesos).map((p) => (nombresPilares[p] ?? p).toLowerCase()).join(', ') })
    : t('cmp.orden');

  // Resumen descargable en PDF: lo que la pantalla ya muestra (ranking, anios, debilidades, plagas) mas el historial de hechos.
  const descargarResumen = (elegida: string | null) => {
    if (!ranking || !estado.datos) return;
    try {
      const fecha = new Date();
      const bytes = construirResumenPdf(armarDatosResumen({
        ordenadas, planes: estado.planes, catalogo: estado.datos.catalogo, nombreRotacion: (id) => nombreRotacion(id, estado.planes), plagasDe,
        parcela: estado.datos.parcela, esDemo: estado.datos.esDemo, ponderacion: comoSeOrdena, limites, hechos, elegida, fecha,
      }));
      const ok = descargarArchivo(bytes, nombreArchivoPdf(fecha));
      setDescarga(ok ? 'ok' : 'error');
      if (ok) tocar('exito');
    } catch { setDescarga('error'); }
  };

  const ir = (id: string, destino: PasoLab, escenario?: Escenario) => {
    setRotacion(id); setCiclo(1);
    if (escenario) setEscenario(escenario);
    onAvanzar(destino);
  };

  return <section className="panel panel-ancho" aria-label={t('cmp.etiqueta')}>
    <EncabezadoPanel indice={3} titulo={t('cmp.titulo')} />
    <div className="lab-etiqueta-fila">
      <p className="panel-intro">{t('cmp.intro')}</p>
      <span className="lab-tip lab-info" tabIndex={0} data-tip={comoSeOrdena} aria-label={comoSeOrdena}><IconoInfo /></span>
    </div>

    {!ranking ? (estado.error ? <Aviso tipo="error" accion={{ texto: t('cmp.reintentar'), onClick: estado.reintentar }}>{estado.error}</Aviso> : <Cargando>{t('cmp.comparando')}</Cargando>) : <>
      <ol className="cmp-tarjetas">
        {ordenadas.map((r) => {
          const plan = estado.planes.find((p) => p.rotacionId === r.rotacionId);
          const pos = r.ranking?.posicion ?? null;
          const plagas = plagasDe(r.rotacionId).map((p) => t('cmp.plaga', { plaga: p.plaga.toLowerCase(), cultivo: p.cultivo.toLowerCase(), ciclo: p.ciclo, n: p.bloques, bloques: p.bloques === 1 ? t('cultivos.bloque') : t('cultivos.bloques') }));
          const debilidades = [...plagas.slice(0, 1), ...(r.explicacion?.riesgos ?? [])];
          const fortalezas = r.explicacion?.beneficios ?? [];
          const peor = r.peorCaso?.escenario;
          return <li key={r.rotacionId} className={`cmp-tarjeta${pos === 1 ? ' cmp-primera' : ''}${r.rotacionId === rotacion ? ' cmp-actual' : ''}`}>
            <header className="cmp-cabeza">
              <span className="cmp-pos" aria-label={pos ? t('cmp.lugar', { n: pos }) : t('cmp.sinLugar')}>{pos ?? '—'}</span>
              <h2>{nombreRotacion(r.rotacionId, estado.planes)}</h2>
              {pos === 1 && <span className="lab-insignia">{t('cmp.masRobusta')}</span>}
              {r.estado !== 'EVALUABLE' && <span className="cmp-estado lab-tip" data-tip={r.explicacion?.porQue ?? r.estado}>{r.estado === 'EXPLORATORIO' ? t('cmp.explorar') : r.estado === 'RESPALDO_HISTORICO' ? t('cmp.respaldo') : t('cmp.sinEvaluar')}</span>}
            </header>

            {plan && <ol className="cmp-cultivos" aria-label={t('cmp.cultivosCiclo')}>
              {plan.ciclos.map((c) => <li key={c.ciclo} className="lab-tip" data-tip={t('cmp.ciclo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })}><IconoCultivo cultivo={c.cultivo} tamano={24} /><span className="sr-only">{t('cmp.ciclo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })}</span></li>)}
            </ol>}

            <div className="cmp-barras" role="img" aria-label={t('cmp.aguaFalto', { lista: escenarios.map((e) => `${nombreEscenario[e]} ${numero(r.porEscenario[e].pilares.deficitHidrico.deficitTotalMm, ' mm')}`).join(', ') })}>
              {escenarios.map((e) => {
                const mm = r.porEscenario[e].pilares.deficitHidrico.deficitTotalMm;
                return <div key={e} className={`cmp-barra cmp-barra-${e}${peor === e ? ' cmp-peor' : ''}`}>
                  <span className="cmp-valor">{mm == null ? '—' : `${Math.round(mm)} mm`}</span>
                  <span className="cmp-columna"><span style={{ height: `${mm == null ? 0 : Math.max(4, (mm / maximo) * 100)}%` }} /></span>
                  <span className="cmp-anio">{t(`cmp.corto.${e}` as ClaveTexto)}</span>
                </div>;
              })}
              <p className="cmp-leyenda">{t('cmp.leyenda')}</p>
            </div>
            {peor && <p className="cmp-peor-anio">{t('cmp.peorAnio')}<strong>{nombreEscenario[peor]!.toLowerCase()} ({r.porEscenario[peor].anioReal ?? '—'})</strong></p>}

            <div className="cmp-lista cmp-debil">
              <h3>{t('cmp.debilidades')}</h3>
              {debilidades.length ? <ul>{debilidades.slice(0, 2).map((t, i) => <li key={i}>{t}</li>)}</ul> : <p>{t('cmp.ninguna')}</p>}
            </div>
            {fortalezas.length > 0 && <div className="cmp-lista cmp-fuerte">
              <h3>{t('cmp.fortalezas')}</h3>
              <ul>{fortalezas.slice(0, 1).map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>}

            <footer className="cmp-acciones">
              <button type="button" className="lab-boton lab-boton-primario" onClick={() => { setRotacion(r.rotacionId); setElegido(r.rotacionId); }}>{t('cmp.elegir')}</button>
              <button type="button" className="lab-boton lab-boton-suave" onClick={() => ir(r.rotacionId, 'escenarios', peor)}>{t('cmp.verPeor')}</button>
              <button type="button" className="lab-boton lab-boton-suave" onClick={() => ir(r.rotacionId, 'cultivos')}>{t('cmp.mejorar')}</button>
            </footer>
          </li>;
        })}
      </ol>
      {ranking.noOrdenadas.map((r) => <p className="panel-ayuda" key={r.rotacionId}>{nombreRotacion(r.rotacionId, estado.planes)}: {r.motivo}</p>)}

      <details className="panel-bloque" onToggle={(e) => setGraficas((e.target as HTMLDetailsElement).open)}>
        <summary><span className="panel-etiqueta">{t('cmp.aguaMes', { rotacion: rotacionEnFrase(rotacion) })}</span></summary>
        <Suspense fallback={<Cargando>{t('cmp.cargandoGraficas')}</Cargando>}><DashboardBalance serie={serie} nombre={nombreRotacion(rotacion, estado.planes)} /></Suspense>
      </details>

      <details className="panel-bloque" onToggle={(e) => setMostrarBanda((e.target as HTMLDetailsElement).open)}>
        <summary><span className="panel-etiqueta">{t('cmp.proxima')}</span></summary>
        <p className="panel-ayuda">{estado.datos?.capa?.metodo === 'anomalia_estacional' ? t('cmp.proximaAnomalia') : t('cmp.proximaRango')}</p>
        <div className="ui-table-wrap" role="region" aria-label={t('cmp.rangoMensual')} tabIndex={0}><table><thead><tr><th>{t('cmp.mes')}</th><th>{t('cmp.lluvia')}</th><th>{t('cmp.temperatura')}</th></tr></thead><tbody>{estado.calculo!.proxima.meses.map((m) => <tr key={m.mes}><th scope="row">{m.mes}</th><td>{numero(m.lluviaMm.inferior)} – {numero(m.lluviaMm.superior)}</td><td>{numero(m.tMediaC.inferior)} – {numero(m.tMediaC.superior)}</td></tr>)}</tbody></table></div>
        {resultado?.proximaTemporada && resultado.proximaTemporada.aniosAnalogos.length > 0 && <p className="panel-ayuda">{t('cmp.parecidos', { lista: resultado.proximaTemporada.aniosAnalogos.map((a) => a.anioReal).join(', ') })}</p>}
      </details>

      {limites.length > 0 && <details className="panel-bloque">
        <summary><span className="panel-etiqueta">{t('cmp.noVe')}</span></summary>
        <ul className="lab-lista">{limites.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </details>}
    </>}

    <footer className="panel-pie">
      <a className="lab-boton lab-boton-suave" href="#/escenarios"><span aria-hidden="true">←</span>{t('cmp.escenarios')}</a>
      <button type="button" className="lab-boton lab-boton-primario" disabled={!ranking || !estado.datos} onClick={() => descargarResumen(elegido)}>{t('cmp.descargar')}</button>
    </footer>
    <p className="panel-ayuda" role="status">{descarga === 'ok' ? t('cmp.descargado') : descarga === 'error' ? t('cmp.errorPdf') : ''}</p>
    <p className="panel-legal">{t('cmp.legal')}</p>
    {elegido && planElegido && estado.datos && <PlanElegido nombre={nombreRotacion(elegido, estado.planes)} plan={planElegido} resultado={ranking?.rotaciones.find((x) => x.rotacionId === elegido)}
      catalogo={estado.datos.catalogo} plagas={plagasDe(elegido)} onDescargar={() => descargarResumen(elegido)} onCerrar={() => setElegido(null)} />}
  </section>;
}
