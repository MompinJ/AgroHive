// Control de escala (sesion bordes, [DECIDIDO] Mompin 14/11 noche): el usuario elige el lado de
// la celda. El generador (geo/cuadricula.ts) respeta el tope de 200 celdas: si el lado pedido
// lo rebasa, lo sube y avisa. Componente nuevo para tocar poco DibujarParcela.tsx.
import { useId } from 'react';
import { TAMANOS_CELDA_M, TOPE_CELDAS, type PedidoTamano } from '../geo/tamano-celda';
import type { EscalaCelda } from '../geo/tamano-celda';
import { describirCelda } from '../geo/escala-celda';
import { useIdioma } from './i18n/Idioma';
import { textoCelda } from './i18n/textos/terreno';

export function SelectorTamanoCelda({ valor, onCambio, escala }: { valor: PedidoTamano; onCambio: (v: PedidoTamano) => void; escala?: EscalaCelda | null }) {
  const id = useId();
  const { t } = useIdioma();
  return <div className="parcel-scale">
    <label htmlFor={id}>{t('celda.etiqueta')}</label>
    <select id={id} value={String(valor)} onChange={(e) => onCambio(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} aria-describedby={`${id}-nota`}>
      <option value="auto">{t('celda.automatico')}</option>
      {TAMANOS_CELDA_M.map((t) => <option key={t} value={t}>{t} m</option>)}
    </select>
    {escala && describirCelda(escala.ladoM) && <p className="parcel-scale-leyenda" role="status"><strong>{textoCelda(describirCelda(escala.ladoM)!)}</strong>{t('celda.leyenda')}</p>}
    <p id={`${id}-nota`} className="quiet-note">
      {t('celda.nota', { tope: TOPE_CELDAS.toLocaleString('es-MX') })}
      {escala?.subido ? t('celda.subido', { pedido: escala.pedido, lado: escala.ladoM.toFixed(1) }) : ''}
    </p>
  </div>;
}
