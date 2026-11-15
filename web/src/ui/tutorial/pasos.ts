// Tutorial guiado por Esquilote, el elote mascota. Datos y logica pura: que pasos tiene cada pantalla,
// como se avanza y que se recuerda. Los textos solo describen lo que la app hace hoy; no prometen
// resultados agricolas (AgroHive explora escenarios con historia climatica, no predice cosechas).

export type IdTutorial = 'terreno' | 'cultivos' | 'escenarios' | 'comparacion';

export interface PasoTutorial {
  titulo: string;
  texto: string;
  /** Selector CSS del elemento que se resalta mientras dura el paso; si no esta en pantalla, no se resalta. */
  destacar?: string;
}

export const TUTORIALES: Record<IdTutorial, readonly PasoTutorial[]> = {
  terreno: [
    { titulo: '¡Hola, soy Esquilote!', texto: 'Te acompaño a probar qué pasaría si cambias lo que siembras, con la historia del clima de NASA. Empecemos por tu terreno.' },
    { titulo: 'Elige por dónde empezar', texto: 'Abre una de las seis parcelas de ejemplo en distintos lugares del mundo o dibuja tu propio terreno en el mapa.', destacar: '.terrain-options' },
    { titulo: 'Tamaño de celda', texto: 'Tu terreno se parte en celdas, hasta 200. Cerca del selector te digo cuánto equivale cada una en el terreno real.', destacar: '.dibujo-escala' },
  ],
  cultivos: [
    { titulo: 'Aquí siembras', texto: 'Elige un cultivo y pinta las celdas con la brocha {brocha} (B). La goma {goma} (X) las devuelve al cultivo general.', destacar: '.barra-herr' },
    { titulo: 'Mueve y corrige', texto: 'La mano {mover} (M) mueve la vista. Si te equivocas, deshaz {deshacer} o rehaz {rehacer} tus cambios.', destacar: '.barra-herr' },
    { titulo: 'Cuidado con las plagas', texto: 'Si hay registros de plagas cerca, verás insectos {bicho} en las celdas atacadas. Usa el insecticida {insecticida} (I) o "Proteger los bloques en riesgo". Aquí el insecticida no cuesta ni cambia el rendimiento: el simulador no lo modela.', destacar: '.lab-plagas' },
    { titulo: 'La zona de plagas', texto: 'Los insectos solo aparecen alrededor de la celda que elijas. Cambia el radio o toca otra celda para mover la zona.', destacar: '.lab-zona-plaga' },
    { titulo: 'Si se traba', texto: 'Abajo a la derecha puedes bajar el nivel de gráficos. Cambia la resolución, las aves, el viento y cuántos insectos se dibujan; no cambia tus resultados.', destacar: '.escena-hud-graficos' },
    { titulo: 'Sigue con los escenarios', texto: 'Cuando termines de sembrar, avanza al siguiente paso.' },
  ],
  escenarios: [
    { titulo: 'Años de prueba', texto: 'Mira cómo le iría a tu plan en un año seco, uno normal y uno lluvioso, con clima real de NASA.', destacar: '.lab-escenarios' },
    { titulo: 'Semana a semana', texto: 'Cada paso de la línea de tiempo {calendario} es una semana. Al moverla cambian las plantas y el cielo: se pone gris cuando llueve, y cálido o fresco según la época del año de tu parcela. En el último día del ciclo verás la cosecha; si quedan plagas sin insecticida, a la mitad del ciclo verás una ilustración de plaga.' },
    { titulo: 'Sigue con la comparación', texto: 'Cuando hayas visto tus años de prueba, avanza para comparar tus rotaciones.' },
  ],
  comparacion: [
    { titulo: '¿Cuál resiste mejor?', texto: 'Comparamos tus rotaciones por su peor caso, no por el promedio: una rotación robusta aguanta también el año difícil.' },
    { titulo: 'Elige tu plan', texto: 'Con "Elegir este plan" ves un resumen para imprimir con siembras, plagas pendientes y qué vigilar.', destacar: '.lab-boton-primario' },
    { titulo: 'Recuerda', texto: 'AgroHive explora escenarios con datos históricos. No predice cosechas ni ingresos y no reemplaza a un agrónomo.' },
  ],
};

const RUTAS: Record<string, IdTutorial> = {
  '/terreno': 'terreno',
  '/laboratorio': 'cultivos',
  '/escenarios': 'escenarios',
  '/comparacion': 'comparacion',
};

/** Tutorial de una ruta; null en el inicio y en Metodo, donde no hay tutorial. */
export function tutorialDeRuta(path: string): IdTutorial | null {
  return RUTAS[path] ?? null;
}

export interface EstadoTutorial { id: IdTutorial; paso: number }
export type AccionTutorial = 'siguiente' | 'anterior' | 'cerrar';

/** Siguiente estado, o null si el tutorial termina (despues del ultimo paso o al cerrarlo). */
export function navegar(estado: EstadoTutorial, accion: AccionTutorial): EstadoTutorial | null {
  const total = TUTORIALES[estado.id].length;
  if (accion === 'cerrar') return null;
  if (accion === 'anterior') return { ...estado, paso: Math.max(0, estado.paso - 1) };
  return estado.paso + 1 >= total ? null : { ...estado, paso: estado.paso + 1 };
}

const LLAVE = 'agrohive:tutorial:v1:';

export function tutorialVisto(id: IdTutorial): boolean {
  try { return localStorage.getItem(LLAVE + id) === '1'; } catch { return false; }
}

export function marcarVisto(id: IdTutorial): void {
  try { localStorage.setItem(LLAVE + id, '1'); } catch { /* sin almacenamiento: se vuelve a ofrecer, no pasa nada */ }
}
