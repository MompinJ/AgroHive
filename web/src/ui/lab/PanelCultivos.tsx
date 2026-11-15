// Paso 2: que se siembra en cada ciclo. Solo se elige el cultivo y se pinta; la temporada y
// la fecha salen del calendario local (SIAP/INIFAP o GGCMI via API) y se pueden ajustar.
import { useState } from 'react';
import type { LaboratorioEstado } from '../useLaboratorio';
import { cambiarSiembra, conflictosPlan, conteoPintado, diasCultivo, explicarFecha, inicioDeVentana, referenciaSiembra, rellenarCiclo } from '../planes';
import { Aviso, Cargando, EncabezadoPanel, FuenteVisible, IconoCultivo, fechaCorta, nombreCultivo, nombreTemporada } from './piezas';
import type { PasoLab } from './Laboratorio';

export type Herramienta = 'brocha' | 'goma' | 'mover';

const tamanos = [{ valor: 1, texto: 'Fina', ayuda: '1 bloque' }, { valor: 2, texto: 'Media', ayuda: '3 × 3 bloques' }, { valor: 3, texto: 'Ancha', ayuda: '5 × 5 bloques' }];

export function PanelCultivos({ estado, onAvanzar, herramienta, setHerramienta, cultivoActivo, setCultivoPincel, tamano, setTamano, calculando }: {
  estado: LaboratorioEstado; onAvanzar: (d: PasoLab) => void;
  herramienta: Herramienta; setHerramienta: (h: Herramienta) => void;
  cultivoActivo: string | null; setCultivoPincel: (c: string | null) => void;
  tamano: number; setTamano: (n: number) => void; calculando: boolean;
}) {
  const { rotacion, setRotacion, ciclo, setCiclo } = estado.seleccion;
  const [errorFecha, setErrorFecha] = useState('');
  const datos = estado.datos;
  const plan = estado.planes.find((p) => p.rotacionId === rotacion) ?? estado.planes[0];
  const visible = plan?.ciclos.find((c) => c.ciclo === ciclo) ?? plan?.ciclos[0];
  const encabezado = <EncabezadoPanel indice={1} titulo="Pinta tus cultivos">Elige un cultivo y pinta los bloques. Las fechas salen del calendario local.</EncabezadoPanel>;

  if (!datos || !plan || !visible) {
    return <aside className="panel panel-izq" aria-label="Cultivos">
      {encabezado}
      {estado.error ? <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso> : <Cargando>Preparando clima, suelo y cultivos…</Cargando>}
    </aside>;
  }

  const indice = plan.ciclos.indexOf(visible);
  const siguiente = plan.ciclos[indice + 1];
  const pintado = conteoPintado(plan, visible.ciclo);
  const referencia = explicarFecha(visible, datos.calendario);
  const local = referenciaSiembra(visible.cultivo, visible.temporada, datos.calendario);
  const ventana = local?.ventana.estado === 'EVALUABLE' ? local.ventana : null;
  const inicioVentana = ventana ? inicioDeVentana(ventana, Number(visible.siembra.slice(0, 4))) : null;
  const disponibles = siguiente ? Math.round((Date.parse(siguiente.siembra) - Date.parse(visible.siembra)) / 86400000) : null;

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
      <p className="panel-etiqueta" id="rot-etiqueta">Rotación</p>
      <div className="lab-segmentado" role="radiogroup" aria-labelledby="rot-etiqueta">
        {estado.planes.map((p) => <button type="button" role="radio" key={p.rotacionId} aria-checked={p.rotacionId === plan.rotacionId} onClick={() => { setRotacion(p.rotacionId); setCiclo(1); setCultivoPincel(null); }}>{p.rotacionId}</button>)}
      </div>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="ciclos-etiqueta">Ciclo que pintas</p>
      <ol className="lab-ciclos" aria-labelledby="ciclos-etiqueta">
        {plan.ciclos.map((c) => {
          const extra = [...conteoPintado(plan, c.ciclo)].reduce((s, [, n]) => s + n, 0);
          return <li key={c.ciclo}>
            <button type="button" aria-pressed={c.ciclo === visible.ciclo} onClick={() => { setCiclo(c.ciclo); setCultivoPincel(null); setErrorFecha(''); }}>
              <span className="lab-ciclo-num">{c.ciclo}</span>
              <IconoCultivo cultivo={c.cultivo} tamano={26} />
              <span className="lab-ciclo-texto"><strong>{nombreCultivo(c.cultivo)}</strong><small>{fechaCorta(c.siembra)}</small>{extra > 0 && <small className="lab-ciclo-extra">+{extra} pintadas</small>}</span>
            </button>
          </li>;
        })}
      </ol>
    </div>

    <div className="panel-bloque">
      <p className="panel-etiqueta" id="paleta-etiqueta">Cultivo de la brocha</p>
      <div className="lab-paleta" role="radiogroup" aria-labelledby="paleta-etiqueta">
        {datos.catalogo.cultivos.map((c) => {
          const dias = diasCultivo(c.id, datos.catalogo);
          const noCabe = disponibles != null && dias != null && dias > disponibles;
          const presencia = referenciaSiembra(c.id, visible.temporada, datos.calendario)?.presencia;
          const noRegistrado = presencia?.estado === 'no_registrado';
          const motivo = noCabe ? `Dura ${dias} días y no termina antes del ciclo ${siguiente?.ciclo}` : noRegistrado ? 'La fuente local no registra este cultivo aquí' : dias ? `${dias} días de ciclo` : 'Duración no evaluable';
          return <button type="button" role="radio" key={c.id} aria-checked={cultivoActivo === c.id && herramienta !== 'goma'} disabled={noCabe} title={motivo}
            onClick={() => { setCultivoPincel(c.id); if (herramienta !== 'brocha') setHerramienta('brocha'); }}>
            <IconoCultivo cultivo={c.id} tamano={30} />
            <span>{nombreCultivo(c.id)}</span>
            {noRegistrado && <span className="lab-marca-aviso" aria-label="No recomendado aquí">!</span>}
            <span className="sr-only">. {motivo}</span>
          </button>;
        })}
      </div>
    </div>

    <div className="panel-bloque lab-herramientas">
      <div className="lab-segmentado" role="radiogroup" aria-label="Herramienta">
        <button type="button" role="radio" aria-checked={herramienta === 'brocha'} onClick={() => setHerramienta('brocha')}>Brocha</button>
        <button type="button" role="radio" aria-checked={herramienta === 'goma'} onClick={() => setHerramienta('goma')}>Goma</button>
        <button type="button" role="radio" aria-checked={herramienta === 'mover'} onClick={() => setHerramienta('mover')}>Mover</button>
      </div>
      <div className="lab-segmentado lab-segmentado-chico" role="radiogroup" aria-label="Tamaño de la brocha">
        {tamanos.map((t) => <button type="button" role="radio" key={t.valor} aria-checked={tamano === t.valor} title={t.ayuda} disabled={herramienta === 'mover'} onClick={() => setTamano(t.valor)}>{t.texto}</button>)}
      </div>
      <p className="panel-ayuda">{herramienta === 'mover' ? 'Arrastra para desplazar; clic derecho o dos dedos para girar; doble clic para ir a una celda. Teclado: WASD, Q y E.' : 'Arrastra sobre la parcela para pintar. Clic derecho o dos dedos giran; rueda acerca.'}</p>
      {cultivoActivo && cultivoActivo !== visible.cultivo && herramienta !== 'goma' && (
        <button type="button" className="lab-boton lab-boton-suave lab-boton-ancho" onClick={() => {
          const nuevo = rellenarCiclo(plan, datos.parcela, visible.ciclo, cultivoActivo, datos.calendario, datos.catalogo);
          if (aplicar(nuevo)) setCultivoPincel(null);
        }}>Sembrar {nombreCultivo(cultivoActivo)} en toda la parcela</button>
      )}
      {pintado.size > 0 && <p className="panel-ayuda">Pintadas en este ciclo: {[...pintado].map(([c, n]) => `${nombreCultivo(c)} ${n}`).join(' · ')}. El resto lleva {nombreCultivo(visible.cultivo)}.</p>}
    </div>

    <details className="panel-bloque lab-siembra">
      <summary>
        <span className="panel-etiqueta">Siembra del ciclo {visible.ciclo}</span>
        <span className="lab-siembra-resumen">{fechaCorta(visible.siembra)} · {nombreTemporada(visible.temporada)}{visible.dentroDeVentana === true ? ' · en ventana' : visible.dentroDeVentana === false ? ' · fuera de ventana' : ''}</span>
      </summary>
      <p className="panel-ayuda">{referencia.texto}</p>
      {referencia.fuente && <FuenteVisible fuente={referencia.fuente} />}
      <label className="lab-campo">Fecha de siembra
        <input type="date" value={visible.siembra} onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, e.target.value, datos.calendario)); }} />
      </label>
      {inicioVentana && inicioVentana !== visible.siembra && <button type="button" className="lab-boton lab-boton-suave" onClick={() => aplicar(cambiarSiembra(plan, datos.parcela, visible.ciclo, inicioVentana, datos.calendario))}>Usar inicio de ventana ({fechaCorta(inicioVentana)})</button>}
      <p className="panel-ayuda">La temporada se deduce de la fecha (SIAP: primavera–verano de abril a septiembre).</p>
    </details>
    {errorFecha && <Aviso tipo="error" onCerrar={() => setErrorFecha('')}>{errorFecha}</Aviso>}
    {local?.presencia.estado === 'no_registrado' && <Aviso tipo="aviso"><strong>{nombreCultivo(visible.cultivo)}: no recomendado aquí.</strong> La fuente no registra este cultivo en el lugar. <FuenteVisible fuente={local.presencia.fuente} /></Aviso>}

    <details className="panel-bloque lab-datos">
      <summary><span className="panel-etiqueta">Sobre estos datos</span></summary>
      <p className="panel-ayuda">{datos.parcela.meta.aviso}</p>
      {datos.avisos.map((m) => <p className="panel-ayuda" key={m}>{m}</p>)}
      <p className="panel-ayuda">Clima: {datos.serie.estado} · <FuenteVisible fuente={datos.serie.fuente} /></p>
      <p className="panel-ayuda">{datos.suelo?.aviso ?? 'Sin suelo evaluable.'}</p>
    </details>

    <footer className="panel-pie">
      {estado.error ? <Aviso tipo="error" accion={{ texto: 'Reintentar', onClick: estado.reintentar }}>{estado.error}</Aviso>
        : calculando ? <Cargando>El motor está evaluando tu plan…</Cargando>
        : <p className="lab-listo" role="status"><span aria-hidden="true">●</span> Plan evaluado por el motor</p>}
      <button type="button" className="lab-boton lab-boton-primario" disabled={!estado.calculo} onClick={() => onAvanzar('escenarios')}>Ver escenarios <span aria-hidden="true">→</span></button>
    </footer>
  </aside>;
}
