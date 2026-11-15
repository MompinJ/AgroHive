// Paso 2: que se siembra en cada ciclo. Solo se elige el cultivo y se pinta; la temporada y
// la fecha salen del calendario local (SIAP/INIFAP o GGCMI via API) y se pueden ajustar.
import { useMemo, useState } from 'react';
import type { LaboratorioEstado } from '../useLaboratorio';
import { agregarCiclo, aplicarAcomodando, cambiarSiembra, conteoPintado, diasCultivo, inicioDeVentana, nombreRotacion, nuevaRotacion, quitarCiclo, referenciaSiembra } from '../planes';
import { climatologia, conveniencia } from './conveniencia';
import type { PlagaZona, riesgosDelPlan } from './plagas';
import { PanelIzq } from './PanelIzq';
import { cultivosParaPintar } from './cultivosListos';
import { MODELOS_DISPONIBLES } from '../../escena/voxel/fuente-modelos';
import { Aviso, Cargando, EncabezadoPanel, IconoCultivo, fechaCorta, nombreCultivo, rangoVentana, textoMovidos } from './piezas';
import { IconoBasura, IconoBicho, IconoCalendario, IconoEscudo, IconoInfo, IconoInsecticida, IconoMas, IconoQuitar } from './iconos';
import type { Herramienta } from './BarraHerramientas';
import type { PasoLab } from './Laboratorio';
import { AvisosDatos } from '../../escena/AvisosDatos';
import { useIdioma } from '../i18n/Idioma';
import { nombrePlaga } from '../i18n/textos/laboratorio';
import type { ClaveTexto } from '../i18n/diccionarios';

export type { Herramienta } from './BarraHerramientas';
const diccionarioPaises = { 'pais.México': 1, 'pais.Brasil': 1, 'pais.Kenia': 1, 'pais.India': 1, 'pais.España': 1, 'pais.Estados Unidos': 1 };

export function PanelCultivos({ estado, onAvanzar, herramienta, setHerramienta, cultivoActivo, setCultivoPincel, calculando, riesgos, hayPlagas, onProteger, presentes }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void;
  herramienta: Herramienta; setHerramienta: (h: Herramienta) => void;
  cultivoActivo: string | null; setCultivoPincel: (c: string | null) => void;
  calculando: boolean;
  riesgos: ReturnType<typeof riesgosDelPlan>; hayPlagas: boolean; onProteger: (() => void) | null; presentes: readonly PlagaZona[];
}) {
  const { rotacion, setRotacion, ciclo, setCiclo } = estado.seleccion;
  const { idioma, t } = useIdioma();
  const [errorFecha, setErrorFecha] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [nota, setNota] = useState('');
  const [verTodos, setVerTodos] = useState(false);
  const datos = estado.datos;
  const clima = useMemo(() => climatologia(datos?.serie), [datos?.serie]);
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const encabezado = <EncabezadoPanel indice={1} titulo={t('cultivos.titulo')}>{t('cultivos.intro')}</EncabezadoPanel>;

  if (!datos || !plan || !visible) {
    return <PanelIzq etiqueta={t('cultivos.etiqueta')}>
      {encabezado}
      {estado.error ? <Aviso tipo="error" accion={{ texto: t('cultivos.reintentar'), onClick: estado.reintentar }}>{estado.error}</Aviso> : <Cargando>{t('cultivos.preparando')}</Cargando>}
    </PanelIzq>;
  }

  const indice = plan.ciclos.indexOf(visible);
  const siguiente = plan.ciclos[indice + 1];
  const pintado = conteoPintado(plan, visible.ciclo);
  const local = referenciaSiembra(visible.cultivo, visible.temporada, datos.calendario);
  const ventana = local?.ventana.estado === 'EVALUABLE' ? local.ventana : null;
  const inicioVentana = ventana ? inicioDeVentana(ventana, Number(visible.siembra.slice(0, 4))) : null;
  const disponibles = siguiente ? Math.round((Date.parse(siguiente.siembra) - Date.parse(visible.siembra)) / 86400000) : null;

  // Paleta ordenada de mas a menos conveniente para la tierra y la fecha del ciclo (conveniencia.ts).
  // Se ven los 8 primeros; "Ver mas" despliega el resto en el mismo orden. La busqueda filtra.
  const normal = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Solo se ofrecen cultivos con informacion suficiente (parametros del motor y todos sus modelos): un cultivo incompleto no sale.
  const listos = cultivosParaPintar(datos.catalogo, MODELOS_DISPONIBLES).listos;
  const evaluados = listos.map((c, orden) => ({ c, orden, v: conveniencia(c, {
    clima, siembra: visible.siembra, temporada: visible.temporada, dias: diasCultivo(c.id, datos.catalogo), disponibles, calendario: datos.calendario, plagas: presentes,
  }) })).sort((x, y) => y.v.puntos - x.v.puntos || x.orden - y.orden);
  const q = normal(busqueda.trim());
  const filtrados = q ? evaluados.filter(({ c }) => normal(nombreCultivo(c.id)).includes(q) || normal(c.nombreComun).includes(q) || normal(c.nombreCientifico ?? '').includes(q)) : evaluados;
  const visibles = q || verTodos ? filtrados : filtrados.slice(0, 8);

  function aplicar(nuevo: typeof plan) {
    const r = aplicarAcomodando(nuevo!, datos!.parcela, datos!.calendario, datos!.catalogo);
    if ('error' in r) { setErrorFecha(r.error); setNota(''); return false; }
    setErrorFecha('');
    setNota(textoMovidos(r.movidos));
    estado.actualizar(r.plan);
    return true;
  }

  return <PanelIzq etiqueta={t('cultivos.etiqueta')}>
    {encabezado}

    <div className="panel-bloque">
      <div className="lab-etiqueta-fila">
        <p className="panel-etiqueta" id="rot-etiqueta">{t('cultivos.rotacion')}</p>
        <span className="lab-tip lab-info" tabIndex={0} data-tip={t('cultivos.rotacionTip')} aria-label={t('cultivos.rotacionEtiqueta')}><IconoInfo /></span>
      </div>
      <div className="lab-rotaciones" role="radiogroup" aria-labelledby="rot-etiqueta">
        {estado.planes.map((p, i) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} aria-label={nombreRotacion(p.rotacionId, estado.planes)}
          onClick={() => { setRotacion(p.rotacionId); setCiclo(1); setCultivoPincel(null); }}>{i + 1}</button>)}
        <button type="button" className="lab-tip lab-rotacion-mas" data-tip={t('cultivos.nuevaTip')} aria-label={t('cultivos.nuevaEtiqueta')}
          onClick={() => estado.agregarRotacion(nuevaRotacion(plan, estado.planes, datos.parcela, datos.calendario))}><IconoMas /></button>
        {estado.planes.length > 1 && <button type="button" className="lab-tip lab-rotacion-borrar" data-tip={t('cultivos.borrar', { nombre: nombreRotacion(plan.rotacionId, estado.planes) })} aria-label={t('cultivos.borrar', { nombre: nombreRotacion(plan.rotacionId, estado.planes) })}
          onClick={() => estado.quitarRotacion(plan.rotacionId)}><IconoBasura /></button>}
      </div>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="ciclos-etiqueta">{t('cultivos.ciclosDe', { nombre: idioma === 'en' ? nombreRotacion(plan.rotacionId, estado.planes) : nombreRotacion(plan.rotacionId, estado.planes).toLowerCase() })}</p>
      <ol className="lab-ciclos" aria-labelledby="ciclos-etiqueta">
        {plan.ciclos.map((c) => {
          const extra = [...conteoPintado(plan, c.ciclo)].reduce((s, [, n]) => s + n, 0);
          return <li key={c.ciclo}>
            <button type="button" aria-pressed={c.ciclo === visible.ciclo} onClick={() => { setCiclo(c.ciclo); setCultivoPincel(null); setErrorFecha(''); }}>
              <span className="lab-ciclo-num">{c.ciclo}</span>
              <IconoCultivo cultivo={c.cultivo} tamano={26} />
              <span className="lab-ciclo-texto"><strong>{nombreCultivo(c.cultivo)}</strong><small>{fechaCorta(c.siembra)}</small>{extra > 0 && <small className="lab-ciclo-extra">{t('cultivos.pintadas', { n: extra })}</small>}</span>
            </button>
            {plan.ciclos.length > 1 && <button type="button" className="lab-tip lab-ciclo-quitar" data-tip={t('cultivos.quitarCiclo', { n: c.ciclo })} aria-label={t('cultivos.quitarCiclo', { n: c.ciclo })}
              onClick={() => { if (aplicar(quitarCiclo(plan, datos.parcela, c.ciclo, datos.calendario))) setCiclo(Math.max(1, Math.min(c.ciclo, plan.ciclos.length - 1))); }}><IconoQuitar /></button>}
          </li>;
        })}
        <li>
          <button type="button" className="lab-tip lab-ciclo-mas" data-tip={t('cultivos.agregarCiclo')} aria-label={t('cultivos.agregarCiclo')}
            onClick={() => { const nuevo = agregarCiclo(plan, datos.parcela, datos.calendario, datos.catalogo); if (aplicar(nuevo)) setCiclo(nuevo.ciclos.length); }}><IconoMas /></button>
        </li>
      </ol>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="paleta-etiqueta">{t('cultivos.brocha')}</p>
      <input className="lab-buscar" type="search" placeholder={t('cultivos.buscarEntre', { n: listos.length })} aria-label={t('cultivos.buscar')} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      <div className="lab-paleta" role="radiogroup" aria-labelledby="paleta-etiqueta">
        {visibles.map(({ c, v }) => {
          const tip = `${nombreCultivo(c.id)}: ${t(`cultivos.${v.nivel}` as ClaveTexto)}. ${v.motivos.join(' ')}`;
          return <button type="button" role="radio" key={c.id} className={`lab-tip lab-conv-${v.nivel}`} data-tip={tip} aria-checked={cultivoActivo === c.id && herramienta !== 'goma'} aria-disabled={v.demasiadoLargo}
            onClick={() => { if (v.demasiadoLargo) return; setCultivoPincel(c.id); if (herramienta !== 'brocha') setHerramienta('brocha'); }}>
            <IconoCultivo cultivo={c.id} tamano={30} />
            <span>{nombreCultivo(c.id)}</span>
            <span className="lab-conv-punto" aria-hidden="true" />
            <span className="sr-only">. {tip}</span>
          </button>;
        })}
      </div>
      {filtrados.length === 0 && <p className="panel-ayuda">{t('cultivos.ninguno', { busqueda })}</p>}
      {!q && filtrados.length > 8 && <button type="button" className="lab-enlace" aria-expanded={verTodos} onClick={() => setVerTodos((x) => !x)}>{verTodos ? t('cultivos.verMenos') : t('cultivos.verMas', { n: filtrados.length - 8 })}</button>}
      <p className="lab-conv-leyenda" aria-hidden="true"><span className="lab-conv-buena" />{t('cultivos.leyBuena')}<span className="lab-conv-regular" />{t('cultivos.leyRegular')}<span className="lab-conv-mala" />{t('cultivos.leyMala')}</p>
    </div>

    {pintado.size > 0 && <p className="panel-ayuda">{t('cultivos.pintadasResumen', { lista: [...pintado].map(([c, n]) => `${nombreCultivo(c)} ${n}`).join(' · '), cultivo: nombreCultivo(visible.cultivo) })}</p>}
    {riesgos.length > 0 && <div className="lab-plagas" role="status">
      <p className="lab-plagas-titulo"><IconoBicho />{t('cultivos.plagasTitulo')}</p>
      <ul>{riesgos.map((r) => <li key={`${r.plaga.id}:${r.cultivo}`}><strong>{nombrePlaga(r.plaga.nombreComun)}</strong>{t('cultivos.plagaAtaca', { cultivo: nombreCultivo(r.cultivo).toLowerCase(), n: r.sinProteger.length, bloques: r.sinProteger.length === 1 ? t('cultivos.bloque') : t('cultivos.bloques') })}</li>)}</ul>
      <p className="panel-ayuda">{t('cultivos.plaga20')}</p>
      {onProteger && <button type="button" className="lab-boton lab-boton-suave lab-boton-ancho" onClick={onProteger}><IconoInsecticida />{t('cultivos.proteger', { n: riesgos.reduce((n, r) => n + r.sinProteger.length, 0), bloques: riesgos.reduce((n, r) => n + r.sinProteger.length, 0) === 1 ? t('cultivos.bloque') : t('cultivos.bloques') })}</button>}
      <p className="panel-ayuda">{t('cultivos.sinCosto')}</p>
    </div>}
    {riesgos.length === 0 && hayPlagas && <p className="lab-protegido"><IconoEscudo />{t('cultivos.protegido')}</p>}

    <details className="panel-bloque lab-siembra">
      <summary>
        <span className="lab-siembra-resumen"><IconoCalendario />{t('cultivos.siembra', { fecha: fechaCorta(visible.siembra) })}{visible.dentroDeVentana === true ? t('cultivos.buenaFecha') : visible.dentroDeVentana === false ? t('cultivos.fueraEpoca') : ''}</span>
      </summary>
      {ventana && <p className="panel-ayuda">{t('cultivos.mejorEpoca', { ventana: rangoVentana(ventana) })}</p>}
      <label className="lab-campo">{t('cultivos.fechaSiembra')}
        <input type="date" value={visible.siembra} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, e.target.value, datos.calendario)); }} />
      </label>
      {inicioVentana && inicioVentana !== visible.siembra && <button type="button" className="lab-boton lab-boton-suave" onClick={() => aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, inicioVentana, datos.calendario))}>{t('cultivos.usarMejor', { fecha: fechaCorta(inicioVentana) })}</button>}
    </details>
    {errorFecha && <Aviso tipo="error" onCerrar={() => setErrorFecha('')}>{errorFecha}</Aviso>}
    {nota && <Aviso tipo="info" onCerrar={() => setNota('')}>{nota}</Aviso>}
    {local?.presencia.estado === 'no_registrado' && <Aviso tipo="aviso"><strong>{nombreCultivo(visible.cultivo)}</strong>{t('cultivos.casiNo')}</Aviso>}
    <div className="lab-datos"><AvisosDatos avisos={datos.avisosDatos} advertenciasParcela={datos.parcela.advertencias ?? []} /></div>
    {datos.ejemplo && <details className="lab-ejemplo">
      <summary>{t('cultivos.ejemplo', { nombre: datos.ejemplo.nombre, pais: `pais.${datos.ejemplo.pais}` in diccionarioPaises ? t(`pais.${datos.ejemplo.pais}` as ClaveTexto) : datos.ejemplo.pais })}</summary>
      <p className="panel-ayuda">{datos.ejemplo.porQue}</p>
      <ul>{datos.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
    </details>}

    <footer className="panel-pie">
      {estado.error ? <Aviso tipo="error" accion={{ texto: t('cultivos.reintentar'), onClick: estado.reintentar }}>{estado.error}</Aviso>
        : calculando ? <Cargando>{t('cultivos.calculando')}</Cargando>
        : <p className="lab-listo" role="status"><span aria-hidden="true">●</span>{t('cultivos.listo')}</p>}
      <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('escenarios')}>{t('cultivos.verEscenarios')}<span aria-hidden="true">→</span></button>
    </footer>
  </PanelIzq>;
}
