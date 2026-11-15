# 06 · Experiencia de usuario, mapa y visualización 2D/3D

## Interfaz central: tres paneles `[DECIDIDO]`

Acuerdo de la reunión: **mapa / escena 3D, selector de cultivos y dashboard**. El selector es el corazón del "what if".

```text
+--------------------+-----------------------------------+--------------------+
| SELECTOR "WHAT IF" |                                   | DASHBOARD          |
| - Cultivo por ciclo|      Escena 3D con relieve        | - Déficit / exceso |
|   (1, 2, 3)        |      (o mapa / cuadrícula 2D)     | - Gráficas lluvia, |
| - Rotaciones R0..  |                                   |   demanda, balance |
| - Escenario seco / |      [2D | 3D]   leyenda          | - Tarjetas de      |
|   habitual /       |                                   |   rotación         |
|   lluvioso         |                                   | - Evaluabilidad y  |
| - Suelo            |                                   |   fuentes          |
+--------------------+-----------------------------------+--------------------+
|  Ciclo 1 | 2 | 3   ·   Slider de tiempo [EN EVENTO]   ·   Año real usado    |
+-----------------------------------------------------------------------------+
```

La disposición exacta (qué panel va a la izquierda) es `[PROPUESTA]`. En móvil: mismas decisiones mediante pestañas; no depender de hover ni de arrastrar para operar.

## Flujo de pantallas `[PROPUESTA]`

| ID | Vista | Propósito |
| --- | --- | --- |
| **P0** | Inicio | Qué hace AgroHive, aviso de que usa historia y no predice. Botón "Explorar". Sin cuentas. |
| **P1** | Caso / terreno | Parcela de demo (Isla, 2 ha ficticias) o, si entra, dibujar polígono propio. Qué viene de NASA, qué es supuesto. |
| **P2** | Laboratorio | La pantalla de tres paneles. Aquí se juega el "what if". |
| **P3** | Comparación y conclusión | Tabla de rotaciones: evaluabilidad, peor caso, habitual, pilares disponibles, evidencia y riesgos. |
| **Selector (A3.4), fechas** | Para cada ciclo, el selector **sugiere la fecha de siembra desde el calendario local** y el usuario la elige. Junto a la fecha se explica **por qué se sugiere y de dónde sale** (municipio, temporada PV/OI, fuente SIAP o INIFAP), o se dice "sin calendario local". Un cultivo no registrado en el lugar se muestra con aviso de "no recomendado aquí" y su fuente. El texto sale del plan (`porQue`) y del resultado (`cultivosNoRecomendados`); la interfaz no lo inventa. |
| **A1** | Método y fuentes | NASA POWER, coordenada, ventana, unidades, Kc/ET0/ETc, supuestos. Modal sin perder estado. |
| **A2** | Editar rotación | Elegir cultivo de cada ciclo; "Aplicar y reevaluar" invalida resultados viejos; "Cancelar" no cambia nada. |
| **A3** | Advertencias | API caída, dato faltante, `NO_EVALUABLE`, WebGL no disponible, falta de validación local. Cada aviso indica qué hacer. |

```text
P0 → P1 → P2 ⇄ P3
          ├─ A2 editar / selector
          ├─ 2D ⇄ 3D
          ├─ A1 método
          └─ A3 advertencias
```

### Acciones en P2
- `SELECT_CROP` / `EDIT_ROTATION`: cambia el cultivo de un ciclo; invalida y recalcula.
- `SELECT_ROTATION`: cambia a otra rotación; reutiliza resultados si nada cambió.
- `SELECT_CYCLE`: la escena muestra **el cultivo de ese ciclo**, no tres a la vez.
- `SELECT_SCENARIO`: cambia a otra serie histórica real con su año visible; no es predicción.
- `TOGGLE_VIEW`: 2D ⇄ 3D sin recalcular ni alterar indicadores.
- `PAINT_BLOCK` (pintar por bloques `[DECIDIDO]` 14/11 noche, ver "Laboratorio por pasos"): asigna cultivo a celdas con brocha; borrar y reemplazar.
- `OPEN_RESULT_DETAILS`: a P3 conservando rotación, ciclo y escenario.

**Prueba crítica:** R1 + ciclo 2 + escenario seco ⇒ la escena muestra **frijol** con la etapa y estado de ese mismo resultado; al pasar a 2D las métricas no cambian.

## Qué significa el 3D en el MVP

- Escena **low-poly voxel original** de la parcela, con **relieve real** (altura por bloque con exageración vertical ajustable).
- Modelos propios por cultivo y etapa, creados con el agente `modelador-voxel` (ver 07).
- Estados visuales **cualitativos** producidos por el motor: etapa, estrés, marchitez, podrido. El render nunca decide el resultado.
- Bloques de suelo que se oscurecen con humedad y se aclaran si está seco.
- Indicadores de estado con color **más icono o patrón** (legible con daltonismo) y leyenda siempre visible.
- Cámara isométrica o casi isométrica, rotación limitada y zoom.
- ~~Botón 2D/3D y **fallback 2D** automático si WebGL o el rendimiento fallan.~~ Retirado el 15/11 a pedido de Eduardo (ver "Vistas de la base"): sin WebGL, el laboratorio avisa y deja las cifras en los paneles.

### Implementación (A3.1, A3.2; base de A3.3) — 14/11

Código en `web/src/escena/` (componente `EscenaParcela`; punto de integración propuesto en `web/src/escena/INTEGRACION.md`).

- **Relieve:** altura de cada bloque = (elevación − elevación medida más baja) / lado de la celda × exageración vertical. La exageración por defecto es ×10 `[PROPUESTA]`, ajustable de 1 a 30 y siempre declarada en pantalla.
- **Orientación:** filas y columnas se orientan con las coordenadas de los centros (norte al fondo, este a la derecha), con cualquiera de las dos convenciones de `i`.
- **Huecos:** una celda sin elevación se dibuja como bloque hundido con cruces (`NO_EVALUABLE`), nunca a nivel cero. Una celda sin registro del motor queda "Sin resultado" y no se supone "Normal". Si se pasa del tope de 1 600 celdas, la escena no dibuja la parcela recortada: avisa.
- **Tamaño de la placa `[DECIDIDO]` (Mompin, 14/11):** 0.6 del lado de la celda (antes 0.82), para que alrededor se vea la losa de suelo y su humedad. La textura no cambia: mismos iconos, patrones, borde doble y contraste, y los mínimos de `daltonismo.ts`.
- **Estados:** placa sobre cada bloque con color (paleta Okabe-Ito), patrón e icono propios por estado, y la tinta negra o blanca con contraste ≥ 4.5:1 verificado en pruebas. La tabla vive en `escena/estilos-estado.ts`. Leyenda siempre visible, con texto accesible.
- **Legible con daltonismo (A3.3):** `escena/daltonismo.ts` simula protanopia, deuteranopia y tritanopia (Machado, Oliveira y Fernandes 2009, matrices de la Tabla 1 con severidad 1.0, aplicadas a RGB lineal) y mide la diferencia de color CIE76 (dE\*ab). Las pruebas exigen que ningún par de estados baje de **dE 15** `[PROPUESTA]` con visión normal ni en las tres simulaciones, y que sus íconos difieran en al menos 16 de 64 píxeles y sus patrones en 48 de 256. Con la tabla provisional el peor par era `podrida` / `NO_EVALUABLE` bajo deuteranopia (dE 7.1; `NO_EVALUABLE` contra `normal`, 12): el gris medio de `NO_EVALUABLE` pasó a casi blanco (`#ececec`) y la distancia mínima sube a 15.3. Los cuatro colores de plantas siguen siendo los de Okabe-Ito. Íconos finales de 8 × 8: hoja (`normal`), gota partida (`estresada`), hoja colgando (`marchita`), equis (`podrida`), surcos (`suelo_desnudo`), interrogación, alerta y círculo. El color nunca va solo: patrón, ícono y texto siempre acompañan. La leyenda lee el texto completo para lectores de pantalla una sola vez.
- **Suelo (A2.12):** tono y losa (`modelos/suelos/suelo_<tipo>_<humedad>.bbmodel`, de Mafer, un `InstancedMesh` por losa) según el tipo del contrato `suelo` (`textura.grupo`: arenoso, franco o arcilloso) y la `humedad` del motor (fracción de TAW). Cortes `[PROPUESTA]` en tercios: seco por debajo de 1/3, húmedo desde 2/3, medio entre ambos; solo para el dibujo, el estrés lo dice la placa. Sin humedad: gris fuera de la escala y sin losa. Sin tipo de suelo: tonos genéricos (los del franco), sin losas, y la leyenda lo dice. La losa queda a la altura del relieve (la columna baja lo que mide su cuerpo) y la placa va por encima de su detalle.
- **Plantas:** un `InstancedMesh` por cultivo + etapa con los `.bbmodel` de `modelos/cultivos/` (cubos unidos en una geometría); `podrida` usa su modelo; `estresada` y `marchita` usan el de su etapa más la placa. Sin `.bbmodel`, planta provisional declarada. Escala 85 % a 100 % según `avanceEtapa` y giro de 90° estable por celda.
- **Ficha por celda (A3.8, con balam):** al tocar o hacer clic en un bloque, al elegirlo en la lista de celdas, con los botones N/O/E/S o con Enter sobre la escena, se muestran estado (y motivo), cultivo, etapa, humedad (% del agua disponible), déficit y exceso acumulados (mm), demanda del día (mm), calor sobre el umbral, riesgo de erosión (índice 0 a 1), pendiente (%), elevación (m) y la fecha. Lo que falta dice `NO_EVALUABLE` y por qué (borde punteado y cursiva, no solo color). Con ratón, un globo breve al pasar el cursor; no hace falta para nada. La celda elegida lleva un marco negro y blanco fijo, sin animación, y se conserva al cambiar de fecha, ciclo o escenario. Escape la quita. La ficha va debajo de la escena: no la tapa.
- **Avisos de datos (pedido de Eduardo):** franja plegable sobre la escena con los avisos de `usarDatosParcela` (clima de respaldo, suelo `SUPUESTO`, próxima temporada no disponible) y los del terreno (relieve interpolado, elevación de respaldo). Muestra etiquetas cortas de lo importante y los avisos, cuenta las notas y deja el texto completo de la API al abrirla. La severidad se distingue también por el borde (punteado o grueso); se abre sola si hay algo importante. Prop `avisosDatos` de `EscenaParcela`.
- **No recomendado en el lugar:** banderín blanco con borde negro en la esquina noroeste de la celda, con su entrada en la leyenda; la ficha cita la fuente.
- **Cámara y rendimiento:** ortográfica casi isométrica, giro limitado (20° a 70°), zoom, flechas del teclado para desplazar; dibuja solo cuando algo cambia. "Reducir movimiento" quita la inercia y respeta `prefers-reduced-motion`. Sin WebGL, aviso y leyenda.
- **Rendimiento medido (14/11, Chrome headless con SwiftShader, es decir, render por software; no sustituye la medición en la computadora más modesta, A5.4):** con 1 600 celdas (prueba de carga sintética marcada como tal en la vista previa) la escena usa 3 draw calls para 4 800 instancias (suelo, placas y plantas de maíz en crecimiento, unos 464 000 triángulos); el motor simula las 1 600 celdas en unos 45 ms dentro del Worker. En reposo no se dibuja ningún cuadro; con inercia la cámara sigue unos cuadros al soltar y con "reducir movimiento" se detiene al soltar. `window.escenaPrueba.estadisticas()` en la vista previa da estas cifras.
- **Medición en el equipo real (A5.4):** `web/medir.html` (se abre a mano, también en el celular) y `herramientas/medir-escena/medir.mjs` (Node, laptop) miden GPU, WebGL, triángulos, draw calls, cuadros en reposo y con viento, memoria, tiempo hasta la primera escena y la pérdida y recuperación del contexto WebGL. Instrucciones en `herramientas/medir-escena/README.md`. Si el contexto se pierde y no vuelve en 5 s, la escena muestra el aviso de usar el modo 2D.

- **Requisitos medidos (A5.4, 15/11, Eduardo, `medir.mjs`, misma versión de la escena y 518 celdas con los bloques de 24 cubos; evidencia en `docs/capturas/medicion-a5-4/`):**

| Equipo | Caso (518 celdas) | Triángulos | Draw calls | Con viento | Reposo | Memoria |
| --- | --- | --- | --- | --- | --- | --- |
| Apple M5 Max, 32 GB, Chrome 157, GPU real (ANGLE Metal, WebGL2) | maíz en madurez | 191 416 | 5 | 114.8 cuadros/s | ver nota | 70 MB |
| Apple M5 Max, 32 GB, Chrome 157, GPU real | mezcla de 4 cultivos | 191 416 | 8 | 105.1 cuadros/s | ver nota | 68 MB |
| Mismo equipo, **sin GPU** (render por software, SwiftShader) | maíz en madurez | 191 416 | 5 | 9.4 cuadros/s | 0 cuadros en 3 s | 63 MB |
| Mismo equipo, sin GPU | mezcla de 4 cultivos | 191 416 | 8 | 9.4 cuadros/s | 0 cuadros en 3 s | 62 MB |

  La primera escena aparece en 0.3 s con GPU y entre 0.6 y 1.2 s sin ella; la parcela demo de 4 celdas da 120 cuadros/s con GPU y 60 sin ella. La pérdida del contexto WebGL se provoca y se recupera en los tres casos, sin errores. **Lectura para los jueces:** el requisito es un navegador con WebGL2; con 518 celdas la escena usa 191 mil triángulos y 5 a 8 draw calls, y aun dibujando por software (el peor caso, equivalente a un equipo sin GPU) la fluidez es de unos 9 cuadros/s con el viento encendido, que es la animación continua; sin ella solo se dibuja al interactuar. Sin WebGL2 se abre el modo 2D solo, con los mismos valores. **Límites:** esta Mac es de gama alta (18 núcleos), así que la cifra con GPU es una cota superior y la de software es la pesimista; no se midió un celular ni una laptop modesta física. Para hacerlo basta abrir `/medir.html` en ese equipo (en el sitio público una vez desplegado) y copiar el JSON. **Nota de reposo:** con GPU real la escena no se queda en 0 cuadros en reposo en todos los casos (demo y mezcla siguieron dibujando 91 y 157 cuadros en 3 s, 218 y 143 en 12 s; el polígono de maíz sí llegó a 0 en 12 s); con software siempre fue 0. No se identificó la causa (animación residual de la mascota o la lluvia, o eventos de la ventana); se pasa a Mompin como observación, no cambia el requisito.
- **Desglose del reposo (14/11):** con GPU real (Apple M5 Max, A5.4 de Eduardo) el reposo dio 91 y 157 cuadros en 3 s; con SwiftShader siempre 0 (también emulando pantallas de densidad 1.5 y 2 con anchos impares). Sin causa identificada todavía. La escena cuenta ahora quién pide cada cuadro (`estadisticas().cuadrosPorMotivo`: visible, controles, opciones, vista, selección, terreno, losas, plantas, mascota, pestaña, contexto, lluvia, tamaño, inercia, transición, viento, lluvia animada) y `medir.html` reporta los motivos de los cuadros en reposo para la siguiente corrida.
- **Cultivos nuevos:** sorgo (5 etapas y 5 bloques de Mafer) revisado en la escena, en manchón y en la celda elegida. Sandía, camote y cacahuate (14/11 noche, MF2 de `docs/16`: 5 etapas, 5 bloques y 5 iconos 2D cada uno) entraron igual, sin tocar código, al dejar sus `.bbmodel` y sus SVG: revisados en la vista previa con las 15 combinaciones de cultivo y etapa en manchón (todas con su `.bbmodel`, ningún respaldo provisional) y el detallado de madurez en la celda elegida; capturas en `docs/capturas/cultivos-nuevos/` (asignación de cultivos de prueba, no son datos del motor). Con `npm run dev` corriendo hay que reiniciarlo para que Vite vea modelos nuevos. El respaldo provisional mide ahora la altura del detallado con sus rotaciones (`voxel/bloque.ts`); con las cajas sin girar, las hojas tendidas de la sandía lo hacían más alto que la planta.
- **Manchón de plantas por celda (idea de balam, aprobada por Mompin, 14/11):** cada celda se dibuja con el bloque de su cultivo y etapa (`modelos/cultivos/bloques/<cultivo>_<etapa>_bloque.bbmodel`, de Mafer: los 20 hechos, como mucho 24 cubos y sin caras de abajo `[DECIDIDO]`; 630 vértices por bloque, 3 surcos con lomo bajo y columnas continuas entre vecinas). La celda elegida muestra el modelo detallado de su planta, como mucho 1.6 veces la altura del manchón `[PROPUESTA]`, con su marco. Los manchones giran 0° o 180° por celda para que los surcos queden paralelos. Si faltara un bloque, la escena usa uno provisional hecho en código desde el detallado y lo avisa. La leyenda dice que la densidad es visual, no a escala. **Medido (14/11, `web/medir.html`, SwiftShader, 518 celdas):** con maíz en madurez, 191 416 triángulos y 6.7 cuadros/s con viento. Antes daba 449 380 y 3.2 con el detallado en cada celda, y 424 516 y 3.3 con los bloques de 51 cubos. Con la mezcla de los 4 cultivos, 191 416 triángulos, 8 draw calls y 6.5 cuadros/s. En reposo, 0 cuadros.
- **Nota:** la exageración es relativa al lado de la celda; con celdas pequeñas (3.5 m en la prueba de carga) ×10 se ve muy alta y conviene bajarla con el control.
- **Vista previa:** `web/escena.html` con el motor real y el paquete de demo. En `npm run dev`, los `.bbmodel` necesitan `server.fs.allow` en `vite.config.ts` (ver `INTEGRACION.md`).

### Bordes diagonales y escala de celda `[DECIDIDO]` (Mompin, 14/11 noche; IA de Mompin, sesión "bordes")

Problema: sobre el mapa real cada celda cubría mucha zona y las orillas diagonales del polígono quedaban como escalones.

- **Medio cuadrado en el borde:** cada celda trae `forma` (contrato `parcela` 0.14.0): `completa` o un triángulo `SO`, `SE`, `NE` o `NO` (la esquina del ángulo recto es la mitad que queda). La calcula el generador de cuadrícula (`web/src/geo/forma-celda.ts`, regla en `docs/08` y `docs/01`); la escena solo la representa. **Es solo dibujo:** en el motor pesa `fraccionDentro`, igual que antes, y la ficha sigue diciendo "Dentro de la parcela: N % de la celda".
- **3D:** columna de suelo y hueco como prisma triangular; manchón de plantas, losa y detallado de la celda elegida recortados por la diagonal (`docs/07`); placa de estado de 0.42 en la esquina del ángulo recto `[PROPUESTA]`, con la misma textura, iconos y patrones; banderín en esa esquina. Una malla más por forma presente (hasta 4 más por tipo), el mismo material.
- **2D:** la celda sigue siendo un botón cuadrado de 80 px (toque, teclado, foco y lista sin cambios); el fondo pinta solo la mitad que queda, con la diagonal marcada, y deja la otra transparente (`web/src/escena/media-2d.ts` y `.css`). El dibujo de cultivo y la placa no se recortan.
- **Mapa al dibujar:** el contorno de cada celda que se pinta sobre el mapa ya es el triángulo (`contornos` del generador).
- **Selector de escala (Terreno, al dibujar):** "Tamaño de celda": Automático, 10, 20, 30, 50 o 100 m (`web/src/ui/SelectorTamanoCelda.tsx`). Cambiarlo con la cuadrícula ya generada la vuelve a generar. Si el tamaño pedido pasa de 1 600 celdas, se usa el menor que cabe (redondeado a 0.1 m) y se avisa en pantalla y en `parcela.advertencias` (`TAMANO_CELDA_AJUSTADO`), que la escena muestra en sus avisos. Automático conserva la regla de siempre.
- **Comprobado** (15/11, Chrome sin pantalla con SwiftShader, vista previa `escena.html?fuente=bordes`, octágono de prueba de unas 3 ha junto a la demo con elevación de la API): con 10 m y con 30 m las orillas a 45° quedan rectas; antes eran escalones. Capturas antes y después en `docs/capturas/bordes-diagonales/` (3D lejos y cerca a 10 m, 3D girado a 30 m y 2D a 30 m). `?tamano=N` pide otro lado, `?formas=0` quita el campo (como una parcela 0.13) y `?vista=2d` agrega la 2D debajo. En la vista previa la 2D sale sin los colores de la app (no carga `ui/tokens.css`); para la captura se definieron a mano.
- **Límites:** las orillas en otros ángulos (no 45°) se ven como escalones más finos, con triángulos en las esquinas; el dibujo cubre un poco más que el polígono (la regla prefiere que toda celda con área dentro se vea y se pueda tocar). El marco de la celda elegida y la marca de la brocha siguen siendo cuadrados. Rendimiento medido (15/11, SwiftShader, octágono con un solo cultivo, maíz): con 10 m (1 516 celdas), de 6 a 18 draw calls y de 316 120 a 311 535 triángulos; con 30 m (190 celdas), de 6 a 18 draw calls y de 40 312 a 38 692 triángulos. Cada forma presente suma una malla por tipo (suelo, placa, losa y planta por cultivo y etapa): con varios cultivos en el borde los draw calls suben más. No se midió en hardware real.

## Animaciones (según tiempo)

### Plan de ejecución A5.2 / A5.3 (balam, 14/11)

Alcance autorizado en el chat al continuar con las tareas siguientes: control temporal común para 2D/3D, reproducción manual y revisión móvil/accesibilidad sobre el sistema global de `DESIGN.md`.

- [x] A5.2: probar primero fechas UTC, fin de mes, años bisiestos, límites y ciclos sin serie. Crear `ui/tiempo.ts` y `tiempo.test.ts`; las fechas disponibles salen de `SerieBalance.ciclos[].desde` y la longitud de sus columnas, sin asumir la duración de un cultivo.
- [x] Crear `ui/ControlTiempo.tsx`: rango diario, fecha exacta, paso mensual y reproducir/pausar. No inicia solo; un único temporizador espera el resultado de celdas antes de avanzar. Se cancela al desmontar/cambiar contexto, ocultar la pestaña o activar movimiento reducido. Reutilizar controles y tokens globales; sin nuevas bibliotecas.
- [x] Extraer la consulta compartida a `ui/useSerieBalance.ts`; el laboratorio (`ui/lab/`, antes `LaboratorioConectado`), `DashboardBalance` y la lluvia 3D consumen la misma respuesta guardada. Fecha y vista no invalidan simulación ni descargan clima. Consultas de celdas al arrastrar se agrupan con un retardo corto; respuestas antiguas se descartan.
- [x] A5.3: recorrer Inicio, Terreno, Laboratorio, Comparación y Método con teclado, 320 px, escritorio, zoom/texto ampliado y movimiento reducido. Corregir en `ui/system.css` y componentes de UI/páginas los problemas demostrados de foco, tamaño táctil, legibilidad o desborde. No cambiar motor, contratos ni escena.
- [x] Verificar pruebas, build, flujos reales y axe; pedir revisión independiente, documentar evidencia y actualizar `docs/14` y sus vistas generadas. Commit y push a `balam`, aviso a Mompin y sin push a `main`.

**Implementado (A5.1, con Mafer, 14/11):** al cambiar de etapa, la planta vieja se encoge mientras la nueva crece (450 ms `[PROPUESTA]`). Dentro de la misma etapa, la escala pasa suave al nuevo `avanceEtapa`. Hay viento leve en el shader, apagado por defecto y activable en la escena. Con "reducir movimiento" (control de la escena o `prefers-reduced-motion`, también si cambia con la escena abierta) no hay transiciones, viento ni inercia. Un cambio nuevo corta la transición en curso, sin acumular. Se dibuja solo mientras algo se mueve. La cámara ya no vuelve a la vista inicial al cambiar fecha o escenario, solo al cambiar de parcela. La mascota de Mafer (`modelos/props/mascota_feliz.bbmodel`) va fuera de la parcela, en la esquina noreste, al 60 %; prop `mascota` de `EscenaParcela`, y si no hay modelo no aparece.


- **Mínimo:** cambiar de modelo por etapa al cambiar de ciclo o escenario.
- **Deseable:** escala continua entre etapas (~85 % a 100 %), brote con rebote suave, balanceo leve por viento, marchitez (inclinación y color seco), cosecha con destello y regreso a suelo desnudo.
- **Slider de meses** `[EN EVENTO]`: al reproducir, fluido; al arrastrar, saltar al estado correcto sin acumular animaciones.
- Duraciones cortas; opción de **reducir movimiento**.

**Lluvia del día (Mompin, 14/11):** si el día que muestra la escena tuvo lluvia según la serie del motor (`serieBalance`, columna `lluviaMm` del clima del escenario, con su día real de clima y su fuente), se dibuja lluvia con gotas proporcionales a los mm. Es un solo `LineSegments` con shader: un draw call, y solo se anima con la escena a la vista y la pestaña visible. Cortes `[PROPUESTA]` en mm/día: menos de 0.1 sin lluvia; llovizna hasta 5; moderada hasta 20; fuerte desde 20; la intensidad se llena en 50 mm. Un indicador fijo siempre visible dice los mm, la clase, la fecha del plan, el día real del clima y la fuente (por ejemplo "Lluvia: 43.8 mm, lluvia fuerte, el 2016-06-16 (clima real del 2024-06-16). Fuente: NASA POWER"). Día sin lluvia: nada y el indicador lo dice. Dato faltante o fecha fuera de los ciclos: sin lluvia y `NO_EVALUABLE` con motivo. Con reducir movimiento: solo el indicador, sin animación. Mientras se ve, la lluvia es animación continua a propósito, como el viento: el reposo (0 cuadros) se mide sin ella en `medir.html` y en `herramientas/prueba-movimiento` (M4, 14/11). Prop `serieBalance` de `EscenaParcela` (la misma rotación y escenario que `resultado`).

## Modo 2D ligero

> Retirado de la interfaz el 15/11 a pedido de Eduardo (`ui/Parcela2D.tsx` y su prueba se borraron). Lo que sigue queda como historial de A3.6.

Mapa o cuadrícula 2D coloreada con los **mismos** valores del motor. Es el respaldo si el 3D no está listo y la opción para equipos modestos (una computadora de campo puede tener 4 GB de RAM). **Medir requisitos mínimos** y tener la cifra para los jueces.

**A3.6 implementada (balam, 14/11):** selector 2D/3D en el laboratorio; la selección se conserva al navegar. `ui/Parcela2D.tsx` usa el mismo `ResultadoCeldas` ya consultado y los módulos puros de la escena (`construirEscena`, `rgbaPlaca`, `entradasLeyenda`, `fichaBloque`). No importa Three.js ni usa canvas. Las placas SVG comparten exactamente colores, patrones e iconos del 3D. Norte arriba según los centros de las celdas; conserva huecos de la cuadrícula y marca elevación faltante sin convertirla en cero. La ficha repite valores, unidades, motivos y fuentes recibidos. No muestra exageración vertical porque es una vista plana.

Hasta 1600 botones cuadrados de 80 px en un área con desplazamiento interno: toque, flechas, Inicio/Fin y lista nativa para acceder a cualquier celda. Un solo botón entra en el orden de tabulación. Si la prueba inicial de WebGL2 falla, se abre 2D automáticamente y no se descarga la escena 3D. Fallos posteriores del contexto o rendimiento insuficiente conservan el selector manual; la medición de requisitos mínimos y ese seguimiento corresponden a A5.4 (Eduardo).

Verificación: R1 + ciclo 2 + seco muestra frijol; alternar 2D/3D conserva métricas y no manda mensajes nuevos al Worker ni peticiones nuevas. Sin WebGL: 2D operativo sin canvas ni descarga de `EscenaParcela`. A 320 px sin desborde horizontal; revisión axe de los criterios WCAG A/AA configurados sin incidencias. Prueba de render con 1600 celdas, orientación y ficha con datos faltantes. Evidencia en `web/evidencia/a3-6-*`; esto no sustituye medir hardware real en A5.4.

## Valores en pantalla

| Dónde | Qué muestra |
| --- | --- |
| Tooltip / toque en bloque | Cultivo, etapa, humedad, déficit o exceso, riesgo de erosión, pendiente |
| Dashboard | Valores agregados, gráficas mensuales (lluvia, demanda, balance) |
| Etiquetas flotantes en 3D | Alertas por bloque o zona |
| Tarjetas de rotación | Resultado por escenario, evidencia, riesgos |

## Reglas de interacción
- Mostrar **siempre** el cultivo y el ciclo seleccionados, y el escenario con su año real.
- Si `NO_EVALUABLE`: no mostrar números ni recomendación ficticia; explicar la causa.
- Cambiar pestaña o 2D/3D no vuelve a descargar datos ni altera la simulación.
- Explicar brevemente **qué cambió y por qué** en cada cambio importante.
- Controles táctiles y de teclado.

## Principios visuales
- Pensado para agricultores sin conocimientos técnicos: español sencillo, iconos claros, tooltips para términos científicos.
- **UI propia** (colores, botones, tipografía definidos por el equipo), sin plantillas genéricas, para que no se vea "hecho con IA".
- Siempre visible: la herramienta apoya, no reemplaza, la decisión del agricultor.
- Referencia visual: vista isométrica de bloques con etiquetas flotantes.

### Sistema visual compartido y laboratorio conectado — 14/11

Balam aprobó usar `DESIGN.md` (referencia Duna) para toda la interfaz y el diseño de A3.4/A4.9 en el chat. `ui/tokens.css` contiene colores, tipografía, espaciado y radios; `ui/system.css` define controles, superficies, foco, tablas y estados comunes. Inicio y Terreno consumen sus roles mediante alias. La paleta semántica de las placas 3D se conserva; su contenedor y controles usan la capa global. GT America no está disponible y no se añadió una fuente remota.

`ui/useLaboratorio.ts` conserva planes y selecciones al navegar. La demo carga el paquete precargado de Isla; para una parcela propia usa el cargador `api/datosParcela.ts` de Eduardo con centroide y ventana estándar. El calendario de Isla solo se usa en la demo; otros contornos muestran sin calendario local. Fallas obligatorias ofrecen reintentar; próxima temporada es opcional.

El laboratorio vive en `ui/lab/` (antes `ui/LaboratorioConectado.tsx`; ver "Laboratorio por pasos"). Los cultivos y fechas editables forman planes tipados con `temporada_tipica`, `porQue` y referencia de calendario. No se ofrece NO_EVALUABLE como cultivo. Los planes iniciales R1 a R4 siguen los casos de regresión del motor, trasladados a 2026/2027 como fechas del plan. R4 usa fechas dentro de ventana para comparar; no es una recomendación agrícola. La UI muestra el motivo y fuente de cultivos no recomendados y los motivos de exclusión de pilares devueltos por el motor.

Cambiar un plan invalida de inmediato el cálculo visible y crea una nueva sesión del Worker. Las respuestas antiguas se ignoran. Escenario, ciclo y fecha solo consultan celdas del resultado almacenado. Navegar entre P2/P3 reutiliza datos y planes; la banda se apaga sin descargar ni recalcular. La escena se carga diferida y recibe `parcela`, `resultado` y `fecha`; los .bbmodel se sirven en desarrollo mediante server.fs.allow.

A4.9 muestra rangos mensuales y resultados de años análogos del motor, estados EXPLORATORIO/NO_EVALUABLE, fuentes, ciclos fuera del horizonte y advertencia de que no es predicción. No se suman los extremos mensuales ni se inventan valores para datos faltantes.

Revisión de diseño: better-interface y sus seis áreas, better-ui, con el stack existente (React/Vite/TS y CSS). La plantilla System Design fue localizada y su flujo documental leído; su render falló por falta de LibreOffice/soffice.exe, por lo que no se entrega un DOCX sin verificar ni se sustituyó su plantilla. Esto no afecta al sistema web. Evidencia de interfaz y comprobaciones en web/README.md y web/evidencia.

### Entrega A5.2 / A5.3: comprobaciones y límites

`ControlTiempo` ofrece fecha exacta, rango diario nativo y saltos/reproducción mensual. El horizonte sale de `SerieBalance` para el ciclo seleccionado; sin días, solo permite fecha manual y explica el hueco. Fechas UTC para no desplazar días por horario de verano, con finales de mes y bisiestos probados. La fecha elegida se conserva entre 2D/3D y navegación. Cambiar fecha consulta celdas guardadas, sin simular ni pedir clima. `useSerieBalance` comparte la respuesta del Worker con las gráficas y la lluvia 3D.

No hay reproducción automática al cargar. Pausa visible, un único temporizador, espera al resultado antes del siguiente mes; desmontar/cambiar ciclo, escenario, rotación o vista, ocultar pestaña, errores y movimiento reducido cancelan el recorrido. El arrastre agrupa peticiones durante 120 ms, y una respuesta vieja no sustituye la fecha vigente. Hay reintentos separados para serie y celdas; un éxito limpia su aviso previo.

A5.3: foco del h1 conservado al completar la carga; opciones táctiles de 44 px; controles de formulario de al menos 16 px en puntero grueso; palabras largas e imagen de Terreno adaptables con texto ampliado. Better-interface (sus seis dominios), better-ui y revisión React aplicados sobre el sistema global. Verificado en Chrome automatizado: cinco pantallas a 320/720/1440 px con tamaño base de texto al 200%, sin desborde; axe sin incidencias WCAG A/AA configuradas; teclado para recorrido y diálogo con retorno de foco por Escape. Movimiento reducido probado al activarse con reproducción abierta. Errores/retrasos del Worker y visibilidad de pestaña simulados. Capturas en `web/evidencia/a5-2-tiempo-*`.

No equivale a certificación: lector de pantalla real, zoom de navegador fuera de las comprobaciones descritas y hardware táctil físico no verificados. A5.4 mantiene la medición de requisitos y pérdida de contexto WebGL a cargo de Eduardo.

### Iconos de cultivos en 2D (Mafer + balam, 14/11)

`ui/iconosCultivo2D.ts` carga por URL los SVG de `modelos/iconos2d/` (5 por cultivo con modelo; la lista de cultivos con modelo está en `docs/07`; un cultivo nuevo entra al dejar sus SVG); Vite los emite como archivos compartidos para no repetir su contenido en cada celda. La vista muestra cultivo/etapa recibidos a 32 px, con la placa de estado íntegra debajo, también a 32 px; celdas cuadradas de 80 px mantienen las proporciones de la cuadrícula. El dibujo no sustituye color, patrón, icono de estado, leyenda ni ficha. `podrida` usa ese sprite solo cuando el motor declara el estado. No se inventa dibujo con datos faltantes, suelo desnudo ni cultivos/etapas sin recurso. Imágenes decorativas para el lector de pantalla: el botón sigue anunciando cultivo, etapa y estado mediante la descripción compartida.

Comprobado en producción sin WebGL y sin Three.js: cambio maíz/frijol, etapa según fecha, todas las placas presentes, solo consulta de celdas al cambiar fecha (sin simular ni llamadas API), teclado y 320 px sin desborde. Pruebas de los 20 recursos y casos sin dato; axe sin incidencias en criterios revisados. Fuente, generación con IA y límites de revisión humana conservados en `modelos/iconos2d/README.md`.

### Laboratorio por pasos y brocha `[DECIDIDO]` (Eduardo, 14/11 noche)

Pedido de Eduardo en la fase de revisión del front; el equipo aprobó todos los cambios el 14/11 noche. Cambia la disposición de los tres paneles, no su contenido: selector, escena y dashboard siguen, repartidos en pasos.

- **Stepper obligatorio** (`ui/BarraPasos.tsx`, `ui/navigation.ts`): barra superior fija con 1 Terreno → 2 Cultivos (`#/laboratorio`) → 3 Escenarios (`#/escenarios`) → 4 Comparación (`#/comparacion`). Un paso se abre solo al completar el anterior (elegir o guardar parcela; "Ver escenarios" con el plan evaluado; "Comparar rotaciones"). Una ruta cerrada lleva al paso abierto más lejano y lo anuncia. Elegir otra parcela vuelve a cerrar los pasos 3 y 4. Método y fuentes queda como enlace fijo, fuera de la secuencia. Recargar vuelve al paso 1 (la parcela vive en memoria).
- **Escena de fondo** (`EscenaParcela` con `modo="fondo"`): el lienzo cubre la pantalla y los paneles flotan encima. Abajo a la derecha quedan las vistas de la base y la brújula (ver "Vistas de la base"); el modo panel sigue igual para `escena.html` y la vista previa. La cámara se corre (`desplazamiento`, `setViewOffset`) para centrar la parcela en el espacio libre; en pantalla vertical encuadra por el ancho.
- **Menos captura**: en Cultivos solo se elige el cultivo. La temporada se deduce de la fecha (SIAP: PV de abril a septiembre, OI de octubre a marzo) y "Sembrar X en toda la parcela" toma el inicio de la ventana del calendario local (SIAP/INIFAP o GGCMI vía API) si no choca con otro ciclo; si choca o no hay ventana con fuente, conserva la fecha del plan. Fecha, fuente y "Usar inicio de ventana" siguen disponibles plegados en "Siembra del ciclo". Fuentes y avisos de la parcela, plegados en "Sobre estos datos".
- **Brocha** (`escena/pincel.ts`, `ui/planes.ts`): Brocha, Goma o Mover; tamaño fino (1), medio (3 × 3) o ancho (5 × 5). Pinta `porCelda` del plan (contrato `plan-siembra`), que el motor ya evaluaba. Con brocha, el botón principal o un dedo pintan; girar pasa al botón derecho o a dos dedos; con teclado, Enter pinta alrededor de la celda elegida. Pintar con el cultivo general o con la goma devuelve la celda al general. Antes de enviar el plan se revisa lo que el motor rechazaría (ciclos fuera de orden o un cultivo que no termina antes del siguiente) para no perder el cálculo de todas las rotaciones; los cultivos que no caben se muestran deshabilitados con el motivo, y un "!" marca los que la fuente local no registra en el lugar.
- **Marcas mientras calcula**: lo pintado se cubre con un azulejo translúcido del color del cultivo (entrada del usuario, no un resultado) hasta que llega el resultado del motor. Solo en Cultivos la escena conserva el último resultado mientras recalcula, para que pintar no vacíe la parcela; Escenarios y Comparación muestran únicamente el resultado vigente. La fecha que se ve en Cultivos es el 60 % del ciclo (plantas crecidas); en Escenarios se recorre con el dock del tiempo.
- **Paleta**: `ui/tokens.css` pasa de la referencia Duna (casi acromática) a verdes de campo con neutros salvia y acento trigo; los nombres de variables se conservan. Los colores de estado del motor en la escena no cambian. Los colores de la brocha por cultivo (`coloresCultivo`) solo identifican lo pintado.
- **Comprobado** en Chrome sin GPU (SwiftShader) a 1440 × 900, 1280 × 800 y 390 × 844: guardia del stepper, pintar, recálculo del motor, escenarios con lluvia y comparación; sin desborde horizontal. Pruebas nuevas en `ui/planes.test.ts` y `escena/pincel.test.ts`. Falta lector de pantalla real y hardware táctil.

### Cámara de juego de granja (Eduardo, 14/11 noche)

`escena/render/camara.ts` (`CamaraGranja`, sobre `OrbitControls`) reemplaza la órbita libre por los controles de los juegos de granja y colonias en 3D (Timberborn, Anno, Townscaper; Hay Day en móvil). Vale en el laboratorio y en la vista previa.

- **Ratón:** arrastrar con el botón principal desplaza sobre el suelo; derecho o central giran; la rueda acerca hacia el cursor. Con la brocha, el principal pinta, el central desplaza y el derecho gira.
- **Táctil:** un dedo desplaza (o pinta con brocha); dos dedos pellizcan y giran.
- **Teclado** (con el lienzo enfocado): W A S D o flechas desplazan de forma continua según hacia dónde mira la cámara; Q y E giran 45° con transición; + y − acercan; Inicio restablece.
- **Inclinación ligada al zoom** `[PROPUESTA]`: de 42° desde la vertical con el zoom mínimo (0,6) a 66° con el máximo (5), en escala logarítmica. No se arrastra por separado.
- **Doble clic** en una celda: vuela hacia ella y acerca a 2,4 si estaba más lejos (no con la brocha).
- **Límites:** el punto que se mira no sale de la parcela más una celda de margen.
- **Brújula** en el panel de la escena: la aguja roja marca el norte (−z) y gira con la vista; tocarla restablece. Botones ↺ y ↻ giran 45°. En modo panel, botones de giro y una línea de ayuda.
- **Movimiento reducido:** sin inercia y sin vuelos (los giros y el restablecer saltan al destino). El desplazamiento con teclado sigue, porque lo maneja el usuario.
- **Comprobado** en Chrome sin GPU: arrastrar desplaza sin cambiar el azimut, Q/E y los botones giran ±45°, Inicio vuelve a 45°, la rueda acerca e inclina, el doble clic enfoca y abre la ficha, y la brocha sigue pintando. `herramientas/prueba-movimiento`: 33 de 33 desde M4 (14/11 noche). A2 y G1b (reposo sin reducir) fallaban también sin este cambio: la vista previa muestra un día con lluvia (19.9 mm) y `lluvia-animada`, que anima a propósito, seguía pidiendo cuadros; la prueba ahora apaga la lluvia antes de medir el reposo, como `medir.html`, y la comprueba aparte (L1 a L3). Sus F1 a F5 (inercia de cámara) pasan; F1 y F3 dicen "girar" pero miden movimiento de cámara, y arrastrar ahora desplaza.

### Vistas de la base y retiro del 2D (Eduardo, 15/11)

El panel de abajo a la derecha del laboratorio deja Celda, Leyenda y Vista, y queda con tres vistas más la brújula de la cámara. Al activar una vista, la base de cada bloque (columna y azulejo superior) toma su color, las placas de estado se ocultan y aparece la escala. Al pasar el cursor, el globo da la información de esa vista; al tocar una celda, la misma información queda fija. Código: `escena/vistas.ts` (puro, con pruebas) y `EscenaThree.colorearBase`.

- **Cultivos:** color de cada cultivo (el mismo de la brocha). Globo: cultivo, ciclo, etapa y celda.
- **Validación** `[PROPUESTA]`: de verde (muy buena) a rojo (muy mala idea) en 5 niveles. Parte del estado de la planta que calcula el motor en esa fecha (normal 4, estresada 2, marchita 1, podrida 0). Baja un nivel si la siembra cae fuera de la ventana local o si ese día hay calor sobre el umbral. Si la fuente local no registra el cultivo en el lugar, queda como mucho en "Mala". Sin ventana con fuente no castiga: lo dice. Globo: el nivel y sus motivos. Es una clasificación visual de salidas del motor, no un indicador nuevo, y no entra al ranking.
- **Agua:** demanda del cultivo ese día (ETc del motor), de gris (0 mm/día) a azul marino (8 mm/día o más, tope `[PROPUESTA]`). Globo: ETc, humedad del suelo, déficit y exceso acumulados.
- **Sin dato del motor** la celda conserva su suelo y no se colorea; la escala dice cuántas celdas quedan así.
- Los avisos de datos de la parcela (antes en Leyenda) pasan al panel del paso, en "Sobre estos datos".
- Teclado: Mayúsculas + flechas eligen la celda vecina (las flechas solas mueven la cámara).
- **Sin modo 2D:** se quitó el selector 3D/2D del laboratorio. `Parcela2D` se conserva solo para la vista previa de la escena (`escena.html?vista=2d`, capturas de bordes diagonales de Mompin). Sin WebGL, el laboratorio muestra un aviso y los paneles con cifras del motor siguen. Los íconos 2D de cultivo se siguen usando en la paleta de la brocha.
- **Catálogo de 40 cultivos:** la paleta de la brocha muestra sugeridos (los del plan y los que la fuente local registra en el lugar), un buscador por nombre común o científico y "Ver los 40 cultivos por tipo" (cereales, leguminosas según `esLeguminosa`, cucurbitáceas, raíces y tubérculos, hortalizas, industriales y oleaginosas; los grupos solo ordenan la interfaz). Los 8 cultivos originales tienen color elegido a mano; los demás reciben uno estable derivado de su id. Los nombres con acentos salen de una sola tabla (`NOMBRES_CULTIVO_ESCENA` en `escena/ficha.ts`, ya con los 40).
- Comprobado en Chrome sin GPU: las tres vistas colorean, el globo y la ficha muestran los datos del motor (por ejemplo, frijol pintado: ETc 4,8 mm/día, humedad 87 %), y pintar sigue funcionando.

### Terreno, rotaciones sin límite y comparación directa (Eduardo, 15/11)

Pedido de Eduardo (dueño del front por D1 de `docs/16`, con control administrativo dado por Mompin).

- **Terreno** (`MapaParcela.tsx`, `DibujarParcela.tsx`, `terreno.css`): "Dibujar mi parcela" baja al mapa. Satélite / Mapa es un interruptor sobre el mapa. Los vértices se arrastran; arrastrar el punto medio de un lado agrega uno; doble clic, clic derecho o Suprimir lo borra. Los botones y el formulario de abajo se cambiaron por una barra de íconos con globo (deshacer, borrar todo, coordenadas en un popover, centrar, acercar, alejar, ayuda). La cuadrícula se genera sola desde 3 vértices; un chip da vértices, hectáreas y celdas; "Usar esta parcela" consulta la elevación, guarda y abre Cultivos ("Continuar sin elevación" si la consulta falla).
- **Rotaciones** (`planes.ts`, `useLaboratorio.ts`): se llaman Rotación 1, 2, 3 (ids R1, R2, R3; la de ejemplo antes R4 es ahora R3) y un ícono explica qué son. "+" crea una copia de la actual y la papelera la borra. Los ciclos no tienen límite: "+" agrega uno al final (alterna cultivo, se siembra al quedar libre la parcela o en la ventana local si empieza en 90 días o menos) y cada ciclo se puede quitar (los siguientes se renumeran, también lo pintado). Las rotaciones se guardan en el navegador (`localStorage`, por parcela) y se cargan al volver.
- **Herramientas con íconos:** brocha, goma, mover, tamaños y "sembrar en toda la parcela" son íconos; un globo único (`ui/lab/Globo.tsx`) da su nombre al pasar el cursor o al enfocar. Los cultivos que no caben muestran el motivo en el globo.
- **Sin fuentes en pantalla:** el laboratorio ya no muestra de dónde sale cada dato; da la información directa ("Mejor época para sembrar aquí: 1 jun – 15 jul", "casi no se siembra en esta zona"). Las fuentes siguen completas en Método y fuentes.
- **Escenarios en palabras simples:** "Año seco / normal / lluvioso" con su año real y la frase "Lo probamos con tres años reales del pasado en tu zona". Cifras: agua que faltó, sed del cultivo (demanda no cubierta) y agua de más, con globo que explica cada una.
- **Piso verde sin cultivo:** en el laboratorio, las celdas sin cultivo (entre ciclos o sin resultado aún) llevan pasto encima y lados de tierra, sin placa gris. En las vistas de color se conserva el suelo para no confundir el pasto con "muy buena".
- **Línea de tiempo:** al arrastrar solo cambia la fecha que se lee; la parcela cambia al soltar (puntero, tecla o foco). Mientras llega el resultado de la fecha nueva, la escena conserva el anterior con su fecha (sin parpadeo gris). Botones del recorrido como íconos.
- **Comparación** (`PanelComparacion.tsx`): una tarjeta por rotación en el orden del motor con su lugar, cultivos, barras de agua que faltó en los tres años, su peor año, hasta 2 debilidades y 1 fortaleza (textos del motor) y dos acciones: "Ver su peor año" y "Mejorarla". Gráficas de agua, próxima temporada y "Lo que este cálculo no ve" quedan plegados.
- **Comprobado** en Chrome sin GPU: rotación nueva y ciclo 4 sin traslapes, guardado tras recargar, globo de herramientas, pasto entre ciclos, slider que aplica al soltar (con teclado) y comparación. Pruebas nuevas en `planes.test.ts`.

### Mascota en pantalla, consejos y evidencia satelital (Eduardo, 15/11)

- **Mascota fuera de la parcela:** en el laboratorio la escena ya no dibuja el elote dentro del 3D (`mascota={false}`; `escena.html` lo conserva). Aparece arriba a la derecha de la pantalla con su retrato, que se dibuja una sola vez desde el mismo `mascota_feliz.bbmodel` con un renderer aparte (`escena/render/retrato.ts`). Tocarla da otro consejo; se puede ocultar. En pantallas chicas empieza plegada.
- **Consejos** (`ui/lab/consejos.ts`, puro y con pruebas): frases cortas por paso con datos que ya existen. Cultivos: cómo pintar, la mejor época del calendario local o si la siembra cae fuera, si el cultivo casi no se siembra en la zona, sugerencia de comparar con una leguminosa si la rotación no tiene (sin afirmar su aporte), humedad SMAP y verdor NDVI. Escenarios: la línea de tiempo, el agua que faltó (desde 20 mm), el agua que sobró (desde 500 mm, no en el año seco) y el NDVI del año de prueba contra el del año normal. Comparación: cuál aguanta mejor su peor año, su primera debilidad (texto del motor) y "Mejorarla". Si falta un dato, ese consejo no aparece.
- **Evidencia satelital nueva en el front** (`ui/lab/useEvidencia.ts`, `api/cliente.ts`: `obtenerNdvi`, `obtenerSmap`): NDVI de MODIS (verdor de la zona, píxel de 250 m; la demo usa `datos/demo/respuestas/ndvi.json`, las parcelas propias piden los últimos 395 días) y humedad del suelo SMAP de los últimos días (36 km, en vivo; sin token o sin red no hay consejo). Es evidencia: no entra al motor ni al ranking, y el texto dice que es de la zona, no del cultivo. Cortes `[PROPUESTA]`: NDVI < 0,2 casi sin vegetación, < 0,5 moderada, si no densa (rangos que describe el Earth Observatory de NASA); SMAP < 0,15 m³/m³ seco, < 0,30 medio, si no húmedo.
- **Entorno 3D** (`escena/render/entorno.ts`, opción `entorno` de la escena, solo en el laboratorio): cielo con degradado detrás de un lienzo transparente, una isla de pasto bajo la parcela (por debajo de la base de las columnas, no tapa bloques ni huecos), de 6 a 10 árboles y arbustos voxel en posiciones fijas fuera de las celdas, y luz más cálida. Es decorativo: no representa datos ni recibe clics; todo instanciado y sin animación nueva. `escena.html`, `medir.html` y las pruebas de herramientas no cambian (`prueba-movimiento` 33/33).
- **Color:** verdes un poco más vivos en `tokens.css`, botones principales con degradado y cifras de Escenarios teñidas por lo que miden (falta en naranja, sed en ámbar, exceso en azul).

### Herramientas flotantes, plagas, vida en la escena, biomas y "Tu plan" (Eduardo, 15/11)

- **Barra de herramientas flotante** (`ui/lab/BarraHerramientas.tsx`): vertical a la orilla izquierda de la escena (horizontal arriba en móvil), solo en Cultivos. Brocha (B), goma (X), insecticida (I), mover (M), tamaños 1 a 3, sembrar el cultivo en toda la parcela, insecticida en todo el ciclo, deshacer (Ctrl/Cmd + Z) y rehacer (Ctrl + Y). El panel queda para rotación, ciclos y cultivo. Deshacer y rehacer cubren los cambios del plan (hasta 50 pasos, `useLaboratorio`).
- **Paleta por conveniencia** (`ui/lab/conveniencia.ts`, `[PROPUESTA]`): de más a menos conveniente para la tierra y la fecha del ciclo, con punto verde, amarillo o rojo y el porqué en el globo. Suma si la temperatura media climatológica del ciclo (NASA POWER) cae en el rango óptimo de FAO EcoCrop del catálogo, si la lluvia anual de la zona está en el rango que tolera, si el calendario local registra el cultivo en el lugar y si la fecha cae en su ventana; resta si sale del rango absoluto, si casi no se siembra ahí, si la fecha queda fuera o si hay una plaga registrada que lo ataca. Lo que no termina antes del siguiente ciclo va al final. Se ven 8 y "Ver más" despliega el resto en el mismo orden. No es un indicador del motor ni entra al ranking.
- **Bioma** (`biomaDe`, `[PROPUESTA]`): trópico húmedo, trópico seco, zona árida, templado o frío según la temperatura media y la lluvia anual de NASA POWER de la parcela (simplificación tipo Köppen; Isla da trópico húmedo). Cambia el cielo, los colores de la isla, la vegetación decorativa (palmeras, arbustos, cactus, árboles de hoja ancha, pinos) y la luz (`escena/render/entorno.ts`), y la mascota lo menciona en un consejo.
- **Plagas** (`/api/plagas`, contrato `plagas` 0.15.0; `ui/lab/plagas.ts`, `escena/render/plagas.ts`): registros de presencia de GBIF en una caja de ±1.5° (unos 165 km) desde 2000 para seis plagas de `datos/plagas/plagas.json`, con cultivos hospederos citados (EPPO; el chapulín, por Quesada-Béjar et al. 2017, solo maíz) o vacíos sin fuente verificada (diabrótica, pulgón). Demo de Isla con datos reales de GBIF (15/11): chapulín 34 registros, diabrótica 16, gusano elotero 7, gusano cogollero 2, mosca blanca y pulgón 0. Si una plaga registrada ataca el cultivo de una celda y el usuario no aplica insecticida en esa celda y ciclo (herramienta, o "Proteger los N bloques en riesgo", que cubre solo las celdas atacadas en ese ciclo; la barra conserva "Insecticida en toda la parcela"), la escena dibuja los insectos comiéndose la planta (hojas mordidas, movimiento si no hay reducir movimiento); al rociar sale una nube breve. La protección se guarda en el navegador por parcela, rotación y ciclo, y va ligada a la malla de celdas: si cambia el tamaño de celda empieza vacía, en vez de proteger celdas que ya no son las mismas. El insecticida no tiene costo ni efecto en el rendimiento: el simulador no lo modela, porque no hay datos con fuente para cuantificarlo. Es una **capa ilustrativa**: un registro de presencia no es un pronóstico de daño y no cambia el motor ni el ranking. Aparece en el panel ("Plagas en tu zona"), en el globo de la celda, en los consejos de la mascota y como debilidad en Comparación.
- **Vida en la escena** (`escena/render/vida.ts`, solo en el laboratorio): bandadas de aves voxel que cruzan el cielo y ráfagas de viento. Con reducir movimiento no se anima nada; se pausa con la pestaña oculta. A unos 30 cuadros por segundo mientras hay ambiente, contados con el motivo `ambiente`. `escena.html` y las pruebas de herramientas no cambian (`prueba-movimiento` 33/33).
- **Cámara al dar clic en una celda:** vuela y hace zoom a la celda; al salir (Escape, clic en vacío o cerrar la ficha) regresa a la vista anterior. Si el usuario mueve la cámara mientras está enfocada, ya no lo regresa.
- **"Tu plan"** (`ui/lab/PlanElegido.tsx`): en Comparación, "Elegir este plan" abre un resumen imprimible: por ciclo, siembra y cosecha aproximada (siembra + días del ciclo del catálogo), cultivos pintados y plagas pendientes; agua que faltó en cada año de prueba y lo que hay que vigilar. "Imprimir o guardar PDF".
- **Comprobado** en Chrome sin GPU: barra y atajos, aviso de plagas y globo con "Chapulín de la milpa (sin tratar)", insecticida que protege el ciclo, paleta ordenada (maíz primero) con "Ver más" a 40, zoom y regreso de cámara, palmeras del trópico húmedo, aves y viento, y "Tu plan". Pruebas nuevas: `plagas.test.ts`, `conveniencia.test.ts`, `api/tests/test_plagas.py`.
