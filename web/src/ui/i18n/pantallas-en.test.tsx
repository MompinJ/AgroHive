// B7: en ingles no quedan textos en espanol en las pantallas de las tomas del trailer (docs/trailer-30s.md, columna EN).
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProveedorIdioma } from './Idioma';
import { enEspanol } from './sin-espanol';
import { Terreno } from '../../paginas/Terreno';
import { DibujarParcela } from '../DibujarParcela';
import { SelectorTamanoCelda } from '../SelectorTamanoCelda';
import { koppenEn, mensajeCuadricula } from './textos/terreno';
import { fijarIdiomaActual } from './actual';
import { fotosEjemplos } from '../fotosEjemplos';

const en = (nodo: React.ReactNode) => renderToStaticMarkup(<ProveedorIdioma idiomaInicial="en">{nodo}</ProveedorIdioma>);
const es = (nodo: React.ReactNode) => renderToStaticMarkup(<ProveedorIdioma idiomaInicial="es">{nodo}</ProveedorIdioma>);

describe('B7, Terreno en ingles (T3a y T6g)', () => {
  it('los nombres propios de las fotos no ocultan texto sin traducir', () => {
    expect(enEspanol('<p>Landscape in Belmonte de Campos, near Cerro Culiacán.</p>')).toEqual([]);
    expect(enEspanol('<p>Campos de cultivo cerca de Cerro Culiacán.</p>')).not.toEqual([]);
  });
  it.each([
    ['en', en, 'Sample plots, not field surveys', 'Photo credits'],
    ['es', es, 'Parcelas de ejemplo, no son levantamientos', 'Créditos de fotografías'],
  ] as const)('conserva aviso y atribuciones visibles en %s', (_idioma, render, aviso, titulo) => {
    const html = render(<Terreno polygonMode={false} onElegirEjemplo={() => {}} ejemplo={null} parcela={null} onGuardar={() => {}} />);
    expect(html).toContain(aviso);
    expect(html).toContain(titulo);
    expect(html).not.toContain('<details');
    for (const foto of fotosEjemplos) {
      expect(html).toContain(foto.autor);
      expect(html).toContain(foto.licenciaUrl);
      expect(html).toContain(foto.fuente);
    }
  });
  it('la lista de ejemplos y el dibujo no dejan espanol', () => {
    const html = en(<Terreno polygonMode={false} onElegirEjemplo={() => {}} ejemplo={null} parcela={null} onGuardar={() => {}} />);
    expect(html).toContain('Six places around the world');
    expect(html).toContain('Mexico');
    expect(html).toContain('temperate, dry winter, hot summer climate');
    expect(html).toContain('maize');
    expect(enEspanol(html)).toEqual([]);
    expect(enEspanol(en(<DibujarParcela onGuardar={() => {}} guardada={null} />))).toEqual([]);
    expect(enEspanol(en(<SelectorTamanoCelda valor="auto" onCambio={() => {}} escala={{ pedido: 10, ladoM: 14.1, subido: true } as never} />))).toEqual([]);
  });
  it('en espanol sigue igual', () => {
    const html = es(<Terreno polygonMode={false} onElegirEjemplo={() => {}} ejemplo={null} parcela={null} onGuardar={() => {}} />);
    expect(html).toContain('Seis lugares del mundo');
    expect(html).toContain('clima templado, invierno seco y verano cálido');
    expect(enEspanol(html).length).toBeGreaterThan(5); // el detector si ve el espanol
  });
  it('Koppen y mensajes de la cuadricula', () => {
    expect(koppenEn('Aw')).toBe('tropical, savannah');
    expect(koppenEn('Dfa')).toBe('cold, no dry season, hot summer');
    fijarIdiomaActual('en');
    expect(mensajeCuadricula('Hay vértices repetidos.')).toBe('There are repeated vertices.');
    expect(mensajeCuadricula('La cuadrícula pasa de 200 celdas; elige un tamaño de celda mayor.')).toMatch(/^The grid has more than 200 cells/);
    fijarIdiomaActual('es');
    expect(mensajeCuadricula('Hay vértices repetidos.')).toBe('Hay vértices repetidos.');
  });
});

import { TarjetaTutorial } from '../tutorial/Tutorial';
import { TUTORIALES } from '../tutorial/pasos';
import { TUTORIALES_EN } from './textos/tutorial';
import { BarraHerramientas } from '../lab/BarraHerramientas';
import { PanelHistorial } from '../lab/PanelHistorial';
import { ControlTiempo } from '../ControlTiempo';
import { eventoCosecha, eventoMuerte, eventoPlaga } from '../lab/eventos';
import { textoHecho } from '../lab/historial';
import { consejos } from '../lab/consejos';
import { fechaCorta, nombreCultivo, nombreEscenario, rangoVentana } from '../lab/piezas';
import { nombrePlaga } from './textos/laboratorio';
import { nombreRotacion } from '../planes';
import { conveniencia } from '../lab/conveniencia';

const nada = () => {};
/** Corre `f` con el idioma activo en ingles (lo que hace ProveedorIdioma) y lo regresa a espanol. */
function enIngles<T>(f: () => T): T {
  fijarIdiomaActual('en');
  try { return f(); } finally { fijarIdiomaActual('es'); }
}
const sinEspanol = (textos: string[]) => textos.filter((x) => enEspanol(`<p>${x}</p>`).length > 0);

describe('B7, Laboratorio en ingles (T3b, T4a, T4b y T4c)', () => {
  it('el tutorial de Esquilote tiene los mismos pasos, resaltes e iconos en los dos idiomas', () => {
    for (const id of Object.keys(TUTORIALES) as (keyof typeof TUTORIALES)[]) {
      expect(TUTORIALES_EN[id].map((p) => p.destacar)).toEqual(TUTORIALES[id].map((p) => p.destacar));
      const iconos = (t: string) => (t.match(/\{[a-z]+\}/g) ?? []).join();
      expect(TUTORIALES_EN[id].map((p) => iconos(p.texto))).toEqual(TUTORIALES[id].map((p) => iconos(p.texto)));
      for (let k = 0; k < TUTORIALES_EN[id].length; k++) {
        expect(enEspanol(en(<TarjetaTutorial pasos={TUTORIALES_EN[id]} paso={k} onSiguiente={nada} onAnterior={nada} onCerrar={nada} />))).toEqual([]);
      }
    }
  });
  it('la barra de la brocha, la linea de tiempo y el historial no dejan espanol', () => {
    expect(enEspanol(en(<BarraHerramientas herramienta="brocha" setHerramienta={nada} tamano={1} setTamano={nada} onSembrarTodo={nada} sembrarTexto="Plant maize on the whole plot" onRociarTodo={nada} deshacer={nada} rehacer={nada} puedeDeshacer puedeRehacer />))).toEqual([]);
    const rango = { desde: '2016-06-20', hasta: '2016-10-17', pasos: 120 };
    expect(enEspanol(en(<ControlTiempo fecha="2016-07-01" rango={rango as never} listo onFecha={nada} />))).toEqual([]);
    expect(enEspanol(en(<PanelHistorial hechos={[]} onBorrar={nada} abiertoInicial />))).toEqual([]);
  });
  it('cosecha, plaga, muertes, historial, consejos y fechas en ingles', () => {
    const textos = enIngles(() => {
      const plaga = { plaga: nombrePlaga('Gusano cogollero'), cultivo: nombreCultivo('maiz'), bloques: 3 };
      const c = eventoCosecha('2016-10-17', [{ nombre: nombreCultivo('maiz'), celdas: 40, fecha: '2016-10-17' }], plaga, 'k');
      const c2 = eventoCosecha('2016-10-17', [{ nombre: nombreCultivo('maiz'), celdas: 40, fecha: '2016-10-17' }, { nombre: nombreCultivo('frijol'), celdas: 1, fecha: '2016-10-17' }], null, 'k');
      const p = eventoPlaga('2016-08-10', plaga, 'k');
      const m = eventoMuerte('2016-08-10', [{ nombre: nombreCultivo('maiz'), estado: 'marchita', celdas: 2 }, { nombre: nombreCultivo('sorgo'), estado: 'podrida', celdas: 1 }], 'k');
      expect(c.titulo).toBe('Maize is harvested on October 17, 2016');
      expect(p.titulo).toBe('Fall armyworm is eating your maize');
      const hechos = [
        textoHecho({ id: 1, tipo: 'siembra', cuando: 0, sujeto: nombreCultivo('maiz'), celdas: 5, ciclo: 1 }),
        textoHecho({ id: 2, tipo: 'siembra', cuando: 0, sujeto: null, celdas: 1, ciclo: 1 }),
        textoHecho({ id: 3, tipo: 'insecticida', cuando: 0, celdas: 2, ciclo: 2 }),
      ];
      const consejosEn = (['cultivos', 'escenarios'] as const).flatMap((paso) => consejos({
        paso, plan: null, ciclo: 1, calendario: null, escenario: 'seco', resultado: null, ordenadas: [], nombreRotacion: (id) => nombreRotacion(id, [{ rotacionId: id }]),
        leguminosas: new Set(), ndvi: null, smap: null, riesgos: [plaga], bioma: { nombre: 'temperate climate', tMedia: 19, lluvia: 700 },
      }).map((x) => x.texto));
      const conv = conveniencia({ id: 'maiz', umbrales: {} } as never, { clima: { lluviaAnualMm: null, tMediaDia: [] } as never, siembra: '2016-06-20', temporada: 'PV', dias: 400, disponibles: null, calendario: null, plagas: [{ nombreComun: 'Gusano cogollero', cultivos: ['maiz'] }] }).motivos;
      return [c.titulo, c.detalle, c2.titulo, c2.detalle, p.titulo, p.detalle, m.titulo, m.detalle, ...hechos, ...consejosEn, ...conv,
        fechaCorta('2016-06-20'), rangoVentana({ desdeMes: 6, desdeDia: 1, hastaMes: 7, hastaDia: 15 }), rangoVentana({ desdeMes: 5, desdeDia: 29, hastaMes: 5, hastaDia: 29 }),
        nombreEscenario.seco!, nombreEscenario.habitual!, nombreEscenario.lluvioso!, nombreRotacion('R2', [{ rotacionId: 'R1' }, { rotacionId: 'R2' }])];
    });
    expect(sinEspanol(textos)).toEqual([]);
    expect(textos).toContain('Jun 20, 2016');
    expect(textos).toContain('around May 29');
    expect(textos).toContain('Normal year');
    expect(textos).toContain('Rotation 2');
    // Y en espanol, igual que antes.
    expect(fechaCorta('2016-06-20')).toBe('20 jun 2016');
    expect(nombreEscenario.habitual).toBe('Año normal');
  });
});

import { NOMBRE_NIVEL_GRAFICOS, AJUSTES_GRAFICOS } from '../../escena/graficos';
import { NIVELES_VALIDACION, validarBloque, detalleVista } from '../../escena/vistas';
import { NIVELES_TEMPERATURA } from '../../escena/clima-vista';
import { textoProblema, NOMBRE_GRAVEDAD } from '../../escena/problemas';
import { resumirAvisos, NOMBRE_SEVERIDAD } from '../../escena/avisos-datos';

describe('B7, HUD de la escena en ingles', () => {
  it('graficos, vistas, validacion, temperatura, problemas y avisos de datos', () => {
    const textos = enIngles(() => {
      const bloque = { celdaId: 'c1', cultivo: 'maiz', etapa: 'crecimiento', registro: { estado: 'EVALUABLE', estadoPlanta: 'estresada', ciclo: 1, etcMm: 4.2, humedad: 0.5, deficitMm: 3, excesoMm: 0 } } as never;
      return [
        ...Object.values(NOMBRE_NIVEL_GRAFICOS), ...Object.values(AJUSTES_GRAFICOS).map((a) => a.detalle),
        ...NIVELES_VALIDACION.map((n) => n.etiqueta), ...NIVELES_TEMPERATURA.map((n) => n.etiqueta),
        ...validarBloque(bloque, () => false).motivos,
        ...(['cultivo', 'validacion', 'agua'] as const).flatMap((v) => { const d = detalleVista(bloque, v, () => true); return [d.titulo, ...d.lineas]; }),
        textoProblema({ cultivo: 'maiz', celdas: 4, conProblema: 3, calor: 1, estados: { estresada: 2, marchita: 1 }, gravedad: 'alto' } as never, nombreCultivo('maiz')),
        ...Object.values(NOMBRE_GRAVEDAD), ...Object.values(NOMBRE_SEVERIDAD),
        ...resumirAvisos([{ origen: 'suelo', codigo: 'SUELO_SUPUESTO', mensaje: 'x', severidad: 'aviso' }] as never, []).etiquetas.map((e) => e.texto),
      ];
    });
    // "Soil SUPUESTO (assumed)" lleva la etiqueta del contrato, que no se traduce.
    expect(sinEspanol(textos)).toEqual([]);
    expect(textos).toContain('Maize: 3 of 4 cells with problems (1 wilted, 2 stressed, heat above the threshold in 1)');
    expect(textos).toContain('High');
  });
});

import { construirResumenPdf } from '../pdf/resumenComparacion';
import { armarDatosResumen } from '../lab/armarResumen';

describe('B7, Comparacion en ingles (T5): resumen en PDF', () => {
  it('el PDF en ingles no deja espanol (fuera de lo que redacta el motor, que llega ya en ingles)', () => {
    const texto = enIngles(() => {
      const r = { rotacionId: 'R1', estado: 'EVALUABLE', ranking: { posicion: 1 }, peorCaso: { escenario: 'seco' }, explicacion: { riesgos: ['Its worst year is the dry year (2009).'], beneficios: ['Water: even in the dry year (2009) the soil gave the crop 78.9% of the water it needed.'] },
        porEscenario: Object.fromEntries((['seco', 'habitual', 'lluvioso'] as const).map((e) => [e, { anioReal: 2009, pilares: { deficitHidrico: { deficitTotalMm: 181 } } }])) } as never;
      const plan = { rotacionId: 'R1', ciclos: [{ ciclo: 1, cultivo: 'maiz', siembra: '2016-06-20', temporada: 'PV' }], porCelda: null } as never;
      const datos = armarDatosResumen({ ordenadas: [r], planes: [plan], catalogo: { cultivos: [] } as never, nombreRotacion: (id) => nombreRotacion(id, [{ rotacionId: id }]),
        plagasDe: () => [{ ciclo: 1, plaga: nombrePlaga('Gusano cogollero'), cultivo: nombreCultivo('maiz'), bloques: 2 }], parcela: { nombre: 'Bajío, Guanajuato', areaHa: 2.8, celdas: [], tamanoCeldaM: 20 } as never,
        esDemo: false, ponderacion: 'The winner is the one that suffers least in its worst year.', limites: [], hechos: [], elegida: 'R1', fecha: new Date('2026-11-15T12:00:00Z') });
      const bytes = construirResumenPdf(datos);
      return [...new TextDecoder('latin1').decode(bytes).matchAll(/\((.*?)\) Tj/g)].map((m) => m[1]!.replace(/\\\(/g, '(').replace(/\\\)/g, ')'));
    });
    expect(texto).toContain('AgroHive · Comparison summary');
    expect(texto.join(' ')).toContain('Rank 1');
    expect(sinEspanol(texto.filter((x) => !/Bajío|Guanajuato/.test(x)))).toEqual([]);
  });
});
