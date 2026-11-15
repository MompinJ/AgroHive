// Control de escala (sesion bordes, [DECIDIDO] Mompin 14/11 noche): el usuario elige el lado de
// la celda. El generador (geo/cuadricula.ts) respeta el tope de 200 celdas: si el lado pedido
// lo rebasa, lo sube y avisa. Componente nuevo para tocar poco DibujarParcela.tsx.
import { useId } from 'react';
import { TAMANOS_CELDA_M, TOPE_CELDAS, type PedidoTamano } from '../geo/tamano-celda';
import type { EscalaCelda } from '../geo/tamano-celda';
import { describirCelda } from '../geo/escala-celda';

export function SelectorTamanoCelda({ valor, onCambio, escala }: { valor: PedidoTamano; onCambio: (v: PedidoTamano) => void; escala?: EscalaCelda | null }) {
  const id = useId();
  return <div className="parcel-scale">
    <label htmlFor={id}>Tamaño de celda</label>
    <select id={id} value={String(valor)} onChange={(e) => onCambio(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} aria-describedby={`${id}-nota`}>
      <option value="auto">Automático</option>
      {TAMANOS_CELDA_M.map((t) => <option key={t} value={t}>{t} m</option>)}
    </select>
    {escala && describirCelda(escala.ladoM) && <p className="parcel-scale-leyenda" role="status"><strong>{describirCelda(escala.ladoM)!.texto}</strong> en el mapa trazado. Las celdas del borde pueden quedar cortadas por el contorno.</p>}
    <p id={`${id}-nota`} className="quiet-note">
      Celdas más chicas siguen mejor el contorno, pero son más. El tope es de {TOPE_CELDAS.toLocaleString('es-MX')} celdas.
      {escala?.subido ? ` Pediste ${escala.pedido} m: se usan ${escala.ladoM.toFixed(1)} m para no pasar del tope.` : ''}
    </p>
  </div>;
}
