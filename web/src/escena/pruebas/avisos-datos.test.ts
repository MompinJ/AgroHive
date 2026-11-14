import { describe, expect, it } from 'vitest';
import type { AvisoDatos } from '../../api/datosParcela';
import { resumirAvisos } from '../avisos-datos';

const aviso = (origen: string, codigo: string, severidad: AvisoDatos['severidad'], mensaje = 'texto de la API'): AvisoDatos => ({ origen, codigo, mensaje, severidad });

describe('avisos de datos de la parcela', () => {
  it('nombra lo importante en corto y cuenta las notas', () => {
    const r = resumirAvisos(
      [
        aviso('clima', 'CLIMA_RESPALDO_HISTORICO', 'aviso'),
        aviso('clima', 'CLIMA_RESPALDO_OPEN_METEO', 'aviso'),
        aviso('suelo', 'SUELO_SUPUESTO', 'aviso'),
        aviso('proxima temporada', 'PROXIMA_TEMPORADA_NO_DISPONIBLE', 'info'),
        aviso('clima', 'LLUVIA_SATELITAL_EVIDENCIA', 'info'),
      ],
      [{ codigo: 'RESOLUCION_DEM_GRUESA', mensaje: 'El modelo de elevacion tiene unos 30 m...', severidad: 'info' }],
    );
    expect(r.etiquetas.map((e) => e.texto)).toEqual(['Clima de respaldo (no NASA POWER)', 'Suelo SUPUESTO']);
    expect(r.notas).toBe(3);
    expect(r.maxima).toBe('aviso');
    expect(r.filas.find((f) => f.origen === 'terreno')?.codigo).toBe('RESOLUCION_DEM_GRUESA');
    // El texto de la API no se cambia.
    expect(r.filas.every((f) => f.mensaje.length > 0)).toBe(true);
  });

  it('un error de elevacion es importante y se ordena primero', () => {
    const r = resumirAvisos([aviso('suelo', 'SUELO_SUPUESTO', 'aviso')], [{ codigo: 'ELEVACION_ERROR_DATOS', mensaje: 'No se obtuvo la elevacion', severidad: 'critico' }]);
    expect(r.maxima).toBe('critico');
    expect(r.etiquetas[0]).toEqual({ texto: 'Elevación: revisar aviso', severidad: 'critico' });
  });

  it('sin avisos no hay franja', () => {
    expect(resumirAvisos([], [{ codigo: 'DATOS_DE_EJEMPLO', mensaje: 'x', severidad: 'critico' }]).maxima).toBeNull();
  });
});
