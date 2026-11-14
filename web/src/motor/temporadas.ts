// Temporadas de SIAP (PV, OI) y su anio dentro del anio agricola del escenario (A2.8, temporada_tipica).
import { esBisiesto, mesDe } from './fechas';
import type { Temporada } from './tipos';

/** Fecha de siembra en el clima del escenario (anio agricola t), segun la temporada del ciclo. */
export function siembraEnEscenario(siembra: string, temporada: Temporada, anioAgricola: number): { fecha: string; aviso?: string } {
  const mes = mesDe(siembra);
  const anio = temporada === 'OI' && mes >= 10 ? anioAgricola - 1 : anioAgricola;
  let md = siembra.slice(5);
  let aviso: string | undefined;
  if (md === '02-29' && !esBisiesto(anio)) {
    md = '02-28';
    aviso = `La siembra del 29 de febrero se simula el 28 de febrero de ${anio} (anio no bisiesto).`;
  }
  const enVentana = temporada === 'PV' ? mes >= 4 && mes <= 9 : mes >= 10 || mes <= 3;
  if (!enVentana) {
    const v = temporada === 'PV' ? 'abril a septiembre' : 'octubre a marzo';
    aviso = `${aviso ? `${aviso} ` : ''}La siembra del ${siembra} esta fuera de la ventana de siembras ${temporada} de SIAP (${v}).`;
  }
  return aviso ? { fecha: `${anio}-${md}`, aviso } : { fecha: `${anio}-${md}` };
}
