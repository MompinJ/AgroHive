// Paso 2: que se siembra en cada ciclo. Solo se elige el cultivo y se pinta; la temporada y
// la fecha salen del calendario local (SIAP/INIFAP o GGCMI via API) y se pueden ajustar.
import { useState } from 'react';
import type { Cultivo } from '../../../../contratos/tipos/contratos';
import type { LaboratorioEstado } from '../useLaboratorio';
import { agregarCiclo, agruparCultivos, cambiarSiembra, conflictosPlan, conteoPintado, cultivosDelCiclo, diasCultivo, inicioDeVentana, nombreRotacion, nuevaRotacion, quitarCiclo, referenciaSiembra, rellenarCiclo } from '../planes';
import { Aviso, Cargando, EncabezadoPanel, IconoCultivo, fechaCorta, nombreCultivo, rangoVentana } from './piezas';
import { IconoBrocha, IconoCalendario, IconoCubeta, IconoGoma, IconoInfo, IconoMano, IconoMas, IconoQuitar, IconoBasura, IconoTamano } from './iconos';
import type { PasoLab } from './Laboratorio';
import { AvisosDatos } from '../../escena/AvisosDatos';

export type Herramienta = 'brocha' | 'goma' | 'mover';

const tamanos = [{ valor: 1, texto: 'Fina', ayuda: '1 bloque' }, { valor: 2, texto: 'Media', ayuda: '3 × 3 bloques' }, { valor: 3, texto: 'Ancha', ayuda: '5 × 5 bloques' }] as const;

export function PanelCultivos({ estado, onAvanzar, herramienta, setHerramienta, cultivoActivo, setCultivoPincel, tamano, setTamano, calculando }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void;
  herramienta: Herramienta; setHerramienta: (h: Herramienta) => void;
  cultivoActivo: string | null; setCultivoPincel: (c: string | null) => void;
  tamano: number; setTamano: (n: number) => void; calculando: boolean;
}) {
  const { rotacion, setRotacion, ciclo, setCiclo } = estado.seleccion;
  const [errorFecha, setErrorFecha] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [verTodos, setVerTodos] = useState(false);
  const datos = estado.datos;
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const encabezado = <EncabezadoPanel indice={1} titulo="Pinta tus cultivos">Elige un cultivo y pinta los bloques de tu parcela.</EncabezadoPanel>;

  if (!datos || !plan || !visible) {
    return <aside className="panel panel-izq" aria-label="Cultivos">
      {encabezado}
      {estado.error ? <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso> : <Cargando>Preparando clima, suelo y cultivos…</Cargando>}
    </aside>;
  }

  const indice = plan.ciclos.indexOf(visible);
  const siguiente = plan.ciclos[indice + 1];
  const pintado = conteoPintado(plan, visible.ciclo);
  const local = referenciaSiembra(visible.cultivo, visible.temporada, datos.calendario);
  const ventana = local?.ventana.estado === 'EVALUABLE' ? local.ventana : null;
  const inicioVentana = ventana ? inicioDeVentana(ventana, Number(visible.siembra.slice(0, 4))) : null;
  const disponibles = siguiente ? Math.round((Date.parse(siguiente.siembra) - Date.parse(visible.siembra)) / 86400000) : null;

  // Paleta: sugeridos (los del plan, el de la brocha y los que la fuente local registra aqui),
  // busqueda por nombre o todos agrupados por tipo. El orden del catalogo se conserva.
  const normal = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const gruposPaleta: { nombre: string; cultivos: Cultivo[] }[] = (() => {
    const todos = datos.catalogo.cultivos;
    if (busqueda.trim()) {
      const q = normal(busqueda.trim());
      const hallados = todos.filter((c) => normal(nombreCultivo(c.id)).includes(q) || normal(c.nombreComun).includes(q) || normal(c.nombreCientifico ?? '').includes(q));
      return hallados.length ? [{ nombre: '', cultivos: hallados }] : [];
    }
    if (verTodos) return agruparCultivos(todos);
    const enPlan = new Set(plan!.ciclos.flatMap((c) => cultivosDelCiclo(plan!, c.ciclo)));
    const sugeridos = todos.filter((c) => enPlan.has(c.id) || c.id === cultivoActivo || referenciaSiembra(c.id, visible!.temporada, datos.calendario)?.presencia.estado === 'registrado');
    const base = sugeridos.length >= 4 ? sugeridos : [...sugeridos, ...todos.filter((c) => !sugeridos.includes(c))].slice(0, 8);
    return [{ nombre: '', cultivos: base.slice(0, 12) }];
  })();

  function aplicar(nuevo: typeof plan) {
    const conflictos = conflictosPlan(nuevo!, datos!.catalogo);
    if (conflictos.length) { setErrorFecha(conflictos[0]!); return false; }
    setErrorFecha('');
    estado.actualizar(nuevo!);
    return true;
  }

  return <aside className="panel panel-izq" aria-label="Cultivos">
    {encabezado}

    <div className="panel-bloque">
      <div className="lab-etiqueta-fila">
        <p className="panel-etiqueta" id="rot-etiqueta">Rotación</p>
        <span className="lab-tip lab-info" tabIndex={0} data-tip="Una rotación es el orden de cultivos que siembras en la parcela, ciclo tras ciclo. Arma varias para compararlas; se guardan en este navegador." aria-label="Qué es una rotación: el orden de cultivos que siembras, ciclo tras ciclo. Arma varias para compararlas."><IconoInfo /></span>
      </div>
      <div className="lab-rotaciones" role="radiogroup" aria-labelledby="rot-etiqueta">
        {estado.planes.map((p, i) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} aria-label={nombreRotacion(p.rotacionId, estado.planes)}
          onClick={() => { setRotacion(p.rotacionId); setCiclo(1); setCultivoPincel(null); }}>{i + 1}</button>)}
        <button type="button" className="lab-tip lab-rotacion-mas" data-tip="Nueva rotación (copia de la actual)" aria-label="Nueva rotación, copia de la actual"
          onClick={() => estado.agregarRotacion(nuevaRotacion(plan, estado.planes, datos.parcela, datos.calendario))}><IconoMas /></button>
        {estado.planes.length > 1 && <button type="button" className="lab-tip lab-rotacion-borrar" data-tip={`Borrar ${nombreRotacion(plan.rotacionId, estado.planes)}`} aria-label={`Borrar ${nombreRotacion(plan.rotacionId, estado.planes)}`}
          onClick={() => estado.quitarRotacion(plan.rotacionId)}><IconoBasura /></button>}
      </div>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="ciclos-etiqueta">Ciclos de la {nombreRotacion(plan.rotacionId, estado.planes).toLowerCase()}</p>
      <ol className="lab-ciclos" aria-labelledby="ciclos-etiqueta">
        {plan.ciclos.map((c) => {
          const extra = [...conteoPintado(plan, c.ciclo)].reduce((s, [, n]) => s + n, 0);
          return <li key={c.ciclo}>
            <button type="button" aria-pressed={c.ciclo === visible.ciclo} onClick={() => { setCiclo(c.ciclo); setCultivoPincel(null); setErrorFecha(''); }}>
              <span className="lab-ciclo-num">{c.ciclo}</span>
              <IconoCultivo cultivo={c.cultivo} tamano={26} />
              <span className="lab-ciclo-texto"><strong>{nombreCultivo(c.cultivo)}</strong><small>{fechaCorta(c.siembra)}</small>{extra > 0 && <small className="lab-ciclo-extra">+{extra} pintadas</small>}</span>
            </button>
            {plan.ciclos.length > 1 && <button type="button" className="lab-tip lab-ciclo-quitar" data-tip={`Quitar ciclo ${c.ciclo}`} aria-label={`Quitar ciclo ${c.ciclo}`}
              onClick={() => { if (aplicar(quitarCiclo(plan, datos.parcela, c.ciclo, datos.calendario))) setCiclo(Math.max(1, Math.min(c.ciclo, plan.ciclos.length - 1))); }}><IconoQuitar /></button>}
          </li>;
        })}
        <li>
          <button type="button" className="lab-tip lab-ciclo-mas" data-tip="Agregar un ciclo al final" aria-label="Agregar un ciclo al final"
            onClick={() => { const nuevo = agregarCiclo(plan, datos.parcela, datos.calendario, datos.catalogo); if (aplicar(nuevo)) setCiclo(nuevo.ciclos.length); }}><IconoMas /></button>
        </li>
      </ol>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="paleta-etiqueta">Cultivo de la brocha</p>
      <input className="lab-buscar" type="search" placeholder={`Buscar entre ${datos.catalogo.cultivos.length} cultivos`} aria-label="Buscar cultivo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      {gruposPaleta.map((g) => <div key={g.nombre} className="lab-paleta-grupo">
        {g.nombre && <p className="lab-paleta-titulo">{g.nombre}</p>}
        <div className="lab-paleta" role="radiogroup" aria-labelledby="paleta-etiqueta">
        {g.cultivos.map((c) => {
          const dias = diasCultivo(c.id, datos.catalogo);
          const noCabe = disponibles != null && dias != null && dias > disponibles;
          const presencia = referenciaSiembra(c.id, visible.temporada, datos.calendario)?.presencia;
          const noRegistrado = presencia?.estado === 'no_registrado';
          const motivo = noCabe ? `Tarda ${dias} días: no termina antes del ciclo ${siguiente?.ciclo}` : noRegistrado ? 'Casi no se siembra en esta zona' : dias ? `Tarda ${dias} días` : 'Duración desconocida';
          return <button type="button" role="radio" key={c.id} className="lab-tip" data-tip={motivo} aria-checked={cultivoActivo === c.id && herramienta !== 'goma'} aria-disabled={noCabe}
            onClick={() => { if (noCabe) return; setCultivoPincel(c.id); if (herramienta !== 'brocha') setHerramienta('brocha'); }}>
            <IconoCultivo cultivo={c.id} tamano={30} />
            <span>{nombreCultivo(c.id)}</span>
            {noRegistrado && <span className="lab-marca-aviso" aria-label="Casi no se siembra aquí">!</span>}
            <span className="sr-only">. {motivo}</span>
          </button>;
        })}
        </div>
      </div>)}
      {gruposPaleta.length === 0 && <p className="panel-ayuda">Ningún cultivo coincide con “{busqueda}”.</p>}
      {!busqueda && <button type="button" className="lab-enlace" aria-expanded={verTodos} onClick={() => setVerTodos((v) => !v)}>{verTodos ? 'Ver solo los sugeridos' : `Ver los ${datos.catalogo.cultivos.length} cultivos por tipo`}</button>}
    </div>

    <div className="panel-bloque lab-herramientas">
      <div className="lab-iconos" role="radiogroup" aria-label="Herramienta">
        {([['brocha', 'Brocha: pinta bloques', <IconoBrocha key="b" />], ['goma', 'Goma: regresa al cultivo del ciclo', <IconoGoma key="g" />], ['mover', 'Mover la cámara', <IconoMano key="m" />]] as const).map(([id, tip, icono]) =>
          <button type="button" role="radio" key={id} className="lab-tip" data-tip={tip} aria-label={tip} aria-checked={herramienta === id} onClick={() => setHerramienta(id)}>{icono}</button>)}
        <span className="lab-iconos-separador" aria-hidden="true" />
        {tamanos.map((t) => <button type="button" role="radio" key={t.valor} className="lab-tip" data-tip={`Brocha ${t.texto.toLowerCase()} (${t.ayuda})`} aria-label={`Brocha ${t.texto.toLowerCase()}, ${t.ayuda}`} aria-checked={tamano === t.valor} disabled={herramienta === 'mover'} onClick={() => setTamano(t.valor)}><IconoTamano nivel={t.valor} /></button>)}
        {cultivoActivo && cultivoActivo !== visible.cultivo && herramienta !== 'goma' && <>
          <span className="lab-iconos-separador" aria-hidden="true" />
          <button type="button" className="lab-tip" data-tip={`Sembrar ${nombreCultivo(cultivoActivo)} en toda la parcela`} aria-label={`Sembrar ${nombreCultivo(cultivoActivo)} en toda la parcela`} onClick={() => {
            const nuevo = rellenarCiclo(plan, datos.parcela, visible.ciclo, cultivoActivo, datos.calendario, datos.catalogo);
            if (aplicar(nuevo)) setCultivoPincel(null);
          }}><IconoCubeta /></button>
        </>}
      </div>
      {pintado.size > 0 && <p className="panel-ayuda">Pintadas: {[...pintado].map(([c, n]) => `${nombreCultivo(c)} ${n}`).join(' · ')}. El resto lleva {nombreCultivo(visible.cultivo)}.</p>}
    </div>

    <details className="panel-bloque lab-siembra">
      <summary>
        <span className="lab-siembra-resumen"><IconoCalendario /> Siembra: {fechaCorta(visible.siembra)}{visible.dentroDeVentana === true ? ' · buena fecha' : visible.dentroDeVentana === false ? ' · fuera de la mejor época' : ''}</span>
      </summary>
      {ventana && <p className="panel-ayuda">Mejor época para sembrar aquí: {rangoVentana(ventana)}.</p>}
      <label className="lab-campo">Fecha de siembra
        <input type="date" value={visible.siembra} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, e.target.value, datos.calendario)); }} />
      </label>
      {inicioVentana && inicioVentana !== visible.siembra && <button type="button" className="lab-boton lab-boton-suave" onClick={() => aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, inicioVentana, datos.calendario))}>Usar la mejor fecha ({fechaCorta(inicioVentana)})</button>}
    </details>
    {errorFecha && <Aviso tipo="error" onCerrar={() => setErrorFecha('')}>{errorFecha}</Aviso>}
    {local?.presencia.estado === 'no_registrado' && <Aviso tipo="aviso"><strong>{nombreCultivo(visible.cultivo)}</strong> casi no se siembra en esta zona.</Aviso>}
    <div className="lab-datos"><AvisosDatos avisos={datos.avisosDatos} advertenciasParcela={datos.parcela.advertencias ?? []} /></div>

    <footer className="panel-pie">
      {estado.error ? <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso>
        : calculando ? <Cargando>Calculando…</Cargando>
        : <p className="lab-listo" role="status"><span aria-hidden="true">●</span> Listo</p>}
      <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('escenarios')}>Ver escenarios <span aria-hidden="true">→</span></button>
    </footer>
  </aside>;
}
