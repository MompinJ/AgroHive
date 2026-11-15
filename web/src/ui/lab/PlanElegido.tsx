// "Tu plan": resumen imprimible de la rotacion elegida en Comparacion. Por ciclo: cultivo, siembra
// y cosecha estimada (siembra + dias del ciclo del catalogo), cultivos pintados y estado de plagas;
// el agua que falto en cada anio de prueba (motor) y sus puntos debiles. No calcula nada nuevo.
import { useEffect, useRef } from 'react';
import type { CatalogoCultivos, Escenario, PlanSiembra, ResultadoRotacion } from '../../../../contratos/tipos/contratos';
import { conteoPintado, diasCultivo } from '../planes';
import { IconoCultivo, fechaCorta, nombreCultivo, nombreEscenario, numero } from './piezas';
import { IconoBicho, IconoEscudo } from './iconos';
import { useIdioma } from '../i18n/Idioma';

const escenarios: Escenario[] = ['seco', 'habitual', 'lluvioso'];
const sumarDias = (f: string, d: number) => new Date(Date.parse(`${f}T00:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

export function PlanElegido({ nombre, plan, resultado, catalogo, plagas, onCerrar, onDescargar }: {
  nombre: string; plan: PlanSiembra; resultado: ResultadoRotacion | undefined; catalogo: CatalogoCultivos;
  plagas: readonly { ciclo: number; plaga: string; cultivo: string; bloques: number }[]; onCerrar: () => void;
  /** Descarga el resumen de la comparacion en PDF (con este plan marcado como elegido). */
  onDescargar?: () => void;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { t } = useIdioma();
  const bloques = (n: number) => (n === 1 ? t('cultivos.bloque') : t('cultivos.bloques'));
  useEffect(() => { dialogo.current?.showModal(); }, []);
  const debilidades = resultado?.explicacion?.riesgos.slice(0, 2) ?? [];
  return <dialog ref={dialogo} className="plan-elegido" aria-labelledby="plan-titulo" onClose={onCerrar} onClick={(e) => { if (e.target === e.currentTarget) dialogo.current?.close(); }}>
    <div className="plan-contenido">
      <header className="plan-cabeza">
        <div>
          <p className="panel-paso">{t('plan.tuPlan')}</p>
          <h2 id="plan-titulo">{nombre}</h2>
          {resultado?.ranking?.posicion && <p className="panel-ayuda">{t('plan.lugar', { n: resultado.ranking.posicion })}</p>}
        </div>
        <button type="button" className="lab-aviso-cerrar" onClick={() => dialogo.current?.close()} aria-label={t('plan.cerrar')}>×</button>
      </header>

      <ol className="plan-ciclos">
        {plan.ciclos.map((c) => {
          const dias = diasCultivo(c.cultivo, catalogo);
          const pintados = [...conteoPintado(plan, c.ciclo)];
          const sinProteger = plagas.filter((p) => p.ciclo === c.ciclo);
          return <li key={c.ciclo}>
            <IconoCultivo cultivo={c.cultivo} tamano={34} />
            <div>
              <strong>{t('plan.ciclo', { n: c.ciclo, cultivo: nombreCultivo(c.cultivo) })}</strong>
              <span>{t('plan.siembra', { fecha: fechaCorta(c.siembra) })}{dias ? t('plan.cosecha', { fecha: fechaCorta(sumarDias(c.siembra, dias)), dias }) : ''}</span>
              {pintados.length > 0 && <span>{t('plan.tambien', { lista: pintados.map(([cu, n]) => t('plan.enBloques', { cultivo: nombreCultivo(cu), n, bloques: bloques(n) })).join(', ') })}</span>}
              {sinProteger.length
                ? sinProteger.map((p) => <span key={p.plaga + p.cultivo} className="plan-plaga"><IconoBicho />{t('plan.plaga', { plaga: p.plaga, n: p.bloques, bloques: bloques(p.bloques), cultivo: p.cultivo.toLowerCase() })}</span>)
                : <span className="plan-ok"><IconoEscudo />{t('plan.sinPlagas')}</span>}
            </div>
          </li>;
        })}
      </ol>

      {resultado && <div className="plan-anios">
        {escenarios.map((e) => <div key={e}><span>{nombreEscenario[e]} {resultado.porEscenario[e].anioReal ?? ''}</span><strong>{numero(resultado.porEscenario[e].pilares.deficitHidrico.deficitTotalMm, ' mm')}</strong><small>{t('plan.falto')}</small></div>)}
      </div>}

      {debilidades.length > 0 && <div className="cmp-lista cmp-debil"><h3>{t('plan.vigilar')}</h3><ul>{debilidades.map((d, i) => <li key={i}>{d}</li>)}</ul></div>}

      <footer className="plan-pie">
        <button type="button" className="lab-boton lab-boton-suave" onClick={() => dialogo.current?.close()}>{t('plan.seguir')}</button>
        {onDescargar && <button type="button" className="lab-boton lab-boton-primario" onClick={onDescargar}>{t('cmp.descargar')}</button>}
        <button type="button" className={`lab-boton ${onDescargar ? 'lab-boton-suave' : 'lab-boton-primario'}`} onClick={() => window.print()}>{t('plan.imprimir')}</button>
      </footer>
      <p className="panel-legal">{t('plan.legal')}</p>
    </div>
  </dialog>;
}
