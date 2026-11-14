# Escena 3D: punto de integración propuesto `[PROPUESTA]`

Para balam (dueño de `web/src/ui/` y `web/src/paginas/`). La carpeta `web/src/escena/` no edita sus archivos; lo de abajo es lo que haría falta tocar en ellos, y se hace solo con su OK (o lo hace balam).

## Qué expone la escena

```tsx
import { EscenaParcela } from '../escena/EscenaParcela';

<EscenaParcela
  parcela={parcela}       // contrato parcela (front + POST /api/elevacion)
  resultado={resultado}   // contrato resultado-celda del motor, o null si aún no hay
  fecha={fecha}           // opcional: fecha de los registros (slider de meses, A5.2)
  suelo={suelo}           // opcional: contrato suelo (GET /api/suelo o selector manual); su tipo elige tono y losas
  avisosDatos={avisos}    // opcional: los avisos de usarDatosParcela (state 'ready'), web/src/api/
  serieBalance={serie}    // opcional: cliente.serieBalance(rotacion, escenario) del motor; de ahi sale la lluvia del dia
/>
```

- Solo recibe contratos (`contratos/tipos/`). No pide datos ni recalcula indicadores: cambiar 2D/3D o de pestaña no vuelve a consultar nada.
- Trae la ficha por celda (A3.8): clic, toque, lista de celdas, botones N/O/E/S y teclado. No hace falta conectar nada para eso.
- Trae su leyenda (color, patrón, icono y texto), sus avisos (datos de ejemplo, celdas sin elevación, exageración vertical, modelo provisional), los controles (exageración, reducir movimiento, restablecer vista), la descripción del bloque tocado en una región `aria-live` y una lista de celdas en texto.
- Si no hay WebGL, muestra el aviso y deja la leyenda; el modo 2D (A3.6) puede leer los mismos módulos puros (`adaptador.ts`, `estilos-estado.ts`, `placa.ts`, `leyenda.ts`).
- Sus estilos van bajo `.escena` en `escena/escena.css`; no usa clases de `ui/styles.css`.

## Dónde montarla

`web/src/paginas/Laboratorio.tsx`, tarjeta "Parcela demo · Isla" (`terrain-panel`): reemplazar el contenido de `.terrain-preview` (hoy `<FieldIllustration compact />` y la etiqueta "Espacio reservado para el terreno") por `<EscenaParcela … />`. El `selection-readout` y el `CycleSelector` se quedan como están.

Cargarla diferida para que three.js no entre en el paquete inicial de P0 y P1:

```tsx
const EscenaParcela = lazy(() => import('../escena/EscenaParcela').then((m) => ({ default: m.EscenaParcela })));
// <Suspense fallback={<DataState state="loading">Cargando escena 3D</DataState>}> … </Suspense>
```

## Qué datos pasarle

- **Mientras el selector (A3.4) no arme planes reales:** `resultado={null}`. La escena muestra el relieve y todas las celdas como "Sin resultado", coherente con lo que hoy promete `ui/demo.ts` (no importa mediciones ficticias). El resultado de `contratos/ejemplos/` es uno solo (R1, seco, 2015-12-01) y **no cambia** con lo elegido: déjalo solo en la vista previa.
- **Con el selector (A3.4):** el motor ya está en `main` (`crearClienteMotor()` en `web/src/motor/`). Flujo: `escenarios(serie)` una vez, `simular({ plan, parcela, suelo, tablaSuelos, catalogo, escenarios })` cuando cambia el plan, y `celdas(rotacionId, escenario, fecha)` cuando cambian el escenario o la fecha; el `ResultadoCeldas` que devuelve va directo a `resultado`. `SELECT_CYCLE` es elegir una `fecha` dentro de ese ciclo (doc 06). Prueba crítica A3.5: R1, ciclo 2, seco muestra frijol con su etapa y estado. `escena/demo-motor.ts` y `escena/vista-previa.tsx` tienen un ejemplo completo.
- **Con polígono (A2.9, A2.10, balam):** la parcela que guarda `DibujarParcela` (cuadrícula de `ui/cuadricula.ts` más elevación de `POST /api/elevacion`) entra tal cual en `parcela`. Las celdas sin elevación se dibujan como hueco `NO_EVALUABLE`. La escena orienta filas y columnas con los `centro` de las celdas (norte al fondo, este a la derecha), así que acepta tanto `i = 0` al sur (cuadrícula de balam) como `i = 0` al norte (ejemplo de contratos). Probado en `escena/pruebas/cuadricula-balam.test.ts` y en la vista previa (opción "Cuadrícula de balam", con la API local: `VITE_API_URL`).

## Requisito en `vite.config.ts` (modo desarrollo)

Los `.bbmodel` viven en `modelos/`, fuera de `web/`. `vite build` los empaqueta sin problema, pero `npm run dev` solo sirve archivos dentro de `web/` y los devuelve sin transformar: la escena cae a la planta provisional y avisa `MODELO_ILEGIBLE`. Hace falta una línea en `web/vite.config.ts` (archivo de balam, por eso no lo toqué):

```ts
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs: { allow: ['..'] } }, // raiz del repo: modelos/, contratos/ y datos/ (solo afecta a npm run dev)
});
```

Probado con un servidor temporal con esa opción: los cinco `maiz_*.bbmodel` cargan y se ven en la escena.

## Vista previa sin tocar la app

`npm run dev` en `web/` y abrir `http://127.0.0.1:5173/escena.html` (con la línea de arriba para ver los modelos). Por defecto usa el **motor real** en su Web Worker (`crearClienteMotor`) con el paquete de demo sin internet (`datos/demo/respuestas/`: clima de NASA POWER y terreno de Terrarium) y un plan de prueba R1 (maíz, frijol, maíz); se elige suelo (mapa, con TAW de Saxton y Rawls `SUPUESTO`, o selector manual franco `SUPUESTO`), escenario y fecha del plan. También puede mostrar el ejemplo de `contratos/`. Las entradas están en `escena/demo-motor.ts`. Es solo de desarrollo: `vite build` no la incluye.
