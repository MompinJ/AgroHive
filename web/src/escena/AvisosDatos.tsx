// Franja de avisos de datos sobre la escena (pedido de Eduardo): clima de respaldo, suelo
// SUPUESTO, relieve interpolado, proxima temporada no disponible... Compacta y plegable para
// no tapar la escena; la severidad va en texto, no solo en color.
import type { Advertencia } from '../../../contratos/tipos/contratos';
import type { AvisoDatos } from '../api/datosParcela';
import { NOMBRE_SEVERIDAD, resumirAvisos } from './avisos-datos';
import { useIdioma } from '../ui/i18n/Idioma';

export function AvisosDatos({ avisos, advertenciasParcela = [] }: { avisos: readonly AvisoDatos[]; advertenciasParcela?: readonly Advertencia[] }) {
  const { t } = useIdioma();
  const r = resumirAvisos(avisos, advertenciasParcela);
  if (!r.maxima) return null;
  return (
    <details className={`escena-datos escena-datos-${r.maxima}`} open={r.maxima === 'critico'}>
      <summary>
        <span className="escena-datos-titulo">{t('datos.titulo')}</span>{' '}
        {r.etiquetas.map((e) => (
          <span key={e.texto} className={`escena-etiqueta escena-etiqueta-${e.severidad}`}>
            {e.texto}
          </span>
        ))}
        {r.notas > 0 && (
          <span className="escena-etiqueta">
            {r.notas} {r.notas === 1 ? t('datos.nota') : t('datos.notas')}
          </span>
        )}
      </summary>
      <ul>
        {r.filas.map((f, k) => (
          <li key={`${f.origen}-${f.codigo}-${k}`}>
            <strong>
              {NOMBRE_SEVERIDAD[f.severidad]} · {f.origen}:
            </strong>{' '}
            {f.mensaje}
          </li>
        ))}
      </ul>
    </details>
  );
}
