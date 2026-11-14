// Fuentes que cita el motor. Cada formula y cada regla de calendario sale de aqui.
import type { Fuente } from './tipos';

const CONSULTADO = '2026-11-14';

export const FAO56_URL = 'https://www.fao.org/4/x0490e/x0490e00.htm';

export function fao56(cita: string, url = FAO56_URL): Fuente {
  return {
    nombre: 'FAO-56 (Allen, Pereira, Raes y Smith, 1998), Crop evapotranspiration, FAO Irrigation and Drainage Paper 56',
    url,
    cita,
    consultado: CONSULTADO,
  };
}

/**
 * Ciclos agricolas de SIAP. Normatividad tecnica 2022, p. 20 (Cuadro No. 1): las siembras OI del anio agricola t
 * van de octubre de t-1 a marzo de t; las siembras PV, de abril a septiembre de t. p. 46: las siembras OI se dan por
 * concluidas en marzo y las PV en septiembre.
 */
export const SIAP_CICLOS: Fuente = {
  nombre:
    'SIAP (Servicio de Informacion Agroalimentaria y Pesquera), Normatividad Tecnica para la Generacion de Estadistica Basica Agropecuaria 2022',
  url: 'https://www.gob.mx/cms/uploads/attachment/file/789519/NTGEBAP_2022.pdf',
  cita: 'p. 10 (anio agricola de 18 meses: OI inicia con las siembras de octubre, PV con las de abril), p. 20 (Cuadro No. 1, Estructura del anio agricola) y p. 46 (siembras OI concluidas en marzo, PV en septiembre)',
  consultado: CONSULTADO,
};

export const HYNDMAN_FAN: Fuente = {
  nombre: 'Hyndman, R. J. y Fan, Y. (1996). Sample quantiles in statistical packages. The American Statistician 50(4): 361-365',
  url: 'https://doi.org/10.1080/00031305.1996.10473566',
  cita: 'Definicion 7 (interpolacion lineal entre estadisticos de orden; la predeterminada de R y NumPy)',
  consultado: CONSULTADO,
};
