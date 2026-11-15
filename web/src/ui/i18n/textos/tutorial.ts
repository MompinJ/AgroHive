// B7: tutorial de Esquilote en ingles. Misma estructura que TUTORIALES de ui/tutorial/pasos.ts (mismos pasos, mismos
// selectores y mismos iconos {brocha}); la prueba de pantallas comprueba que no se separen.
import type { IdTutorial, PasoTutorial } from '../../tutorial/pasos';

export const TUTORIALES_EN: Record<IdTutorial, readonly PasoTutorial[]> = {
  terreno: [
    { titulo: "Hi, I'm Esquilote!", texto: "I'll help you test what would happen if you changed what you plant, using NASA's climate history. Let's start with your land." },
    { titulo: 'Choose where to start', texto: 'Open one of the six sample plots in different places around the world, or draw your own plot on the map.', destacar: '.terrain-options' },
    { titulo: 'Cell size', texto: 'Your plot is split into cells, up to 200. Next to the selector I tell you how much land each one covers.', destacar: '.dibujo-escala' },
  ],
  cultivos: [
    { titulo: 'This is where you plant', texto: 'Pick a crop and paint the cells with the brush {brocha} (B). The eraser {goma} (X) returns them to the main crop.', destacar: '.barra-herr' },
    { titulo: 'Move and fix', texto: 'The hand {mover} (M) moves the view. If you make a mistake, undo {deshacer} or redo {rehacer} your changes.', destacar: '.barra-herr' },
    { titulo: 'Watch out for pests', texto: 'If there are pest records nearby, you will see insects {bicho} on the attacked cells. Use the insecticide {insecticida} (I) or "Protect the blocks at risk". Here the insecticide has no cost and does not change the yield: the simulator does not model it.', destacar: '.lab-plagas' },
    { titulo: 'The pest is not everywhere', texto: 'In each group of cells with the same crop, the pest shows up in only about 20% of them, close together. "Protect the blocks at risk" covers exactly those.', destacar: '.lab-plagas' },
    { titulo: 'If it lags', texto: 'At the bottom right you can lower the graphics level. It changes the resolution, the birds, the wind and how many insects are drawn; it does not change your results.', destacar: '.escena-hud-graficos' },
    { titulo: 'On to the scenarios', texto: 'When you finish planting, go to the next step.' },
  ],
  escenarios: [
    { titulo: 'Test years', texto: 'See how your plan would do in a dry year, a normal one and a wet one, with real NASA climate data.', destacar: '.lab-escenarios' },
    { titulo: 'Week by week', texto: 'Each step of the timeline {calendario} is one week. As you move it, the plants and the sky change: it turns gray when it rains, and warm or cool with the season at your plot. On the last day of the cycle you will see the harvest; if pests are left without insecticide, halfway through the cycle you will see a pest illustration.' },
    { titulo: 'On to the comparison', texto: 'When you have seen your test years, go on to compare your rotations.' },
  ],
  comparacion: [
    { titulo: 'Which one holds up best?', texto: 'We compare your rotations by their worst case, not their average: a robust rotation also holds up in the hard year.' },
    { titulo: 'Choose your plan', texto: 'With "Choose this plan" you get a printable summary with plantings, pending pests and what to watch.', destacar: '.lab-boton-primario' },
    { titulo: 'Remember', texto: 'AgroHive explores scenarios with historical data. It does not predict harvests or income and does not replace an agronomist.' },
  ],
};

export const tutorialEs = {
  'tutorial.paso': 'Esquilote · paso {paso} de {total}',
  'tutorial.cerrar': 'Cerrar',
  'tutorial.saltar': 'Saltar tutorial',
  'tutorial.anterior': 'Anterior',
  'tutorial.entendido': '¡Entendido!',
  'tutorial.siguiente': 'Siguiente',
  'tutorial.abrir': 'Abrir el tutorial con Esquilote',
  'tutorial.boton': 'Tutorial',
} as const;

export const tutorialEn: Record<keyof typeof tutorialEs, string> = {
  'tutorial.paso': 'Esquilote · step {paso} of {total}',
  'tutorial.cerrar': 'Close',
  'tutorial.saltar': 'Skip tutorial',
  'tutorial.anterior': 'Back',
  'tutorial.entendido': 'Got it!',
  'tutorial.siguiente': 'Next',
  'tutorial.abrir': 'Open the tutorial with Esquilote',
  'tutorial.boton': 'Tutorial',
};
