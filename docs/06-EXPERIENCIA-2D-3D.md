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
- `PAINT_BLOCK` (si se pinta por bloques `[EN EVENTO]`): asigna cultivo a celdas con brocha; borrar y reemplazar.
- `OPEN_RESULT_DETAILS`: a P3 conservando rotación, ciclo y escenario.

**Prueba crítica:** R1 + ciclo 2 + escenario seco ⇒ la escena muestra **frijol** con la etapa y estado de ese mismo resultado; al pasar a 2D las métricas no cambian.

## Qué significa el 3D en el MVP

- Escena **low-poly voxel original** de la parcela, con **relieve real** (altura por bloque con exageración vertical ajustable).
- Modelos propios por cultivo y etapa, creados con el agente `modelador-voxel` (ver 07).
- Estados visuales **cualitativos** producidos por el motor: etapa, estrés, marchitez, podrido. El render nunca decide el resultado.
- Bloques de suelo que se oscurecen con humedad y se aclaran si está seco.
- Indicadores de estado con color **más icono o patrón** (legible con daltonismo) y leyenda siempre visible.
- Cámara isométrica o casi isométrica, rotación limitada y zoom.
- Botón 2D/3D y **fallback 2D** automático si WebGL o el rendimiento fallan.

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
- **Nota:** la exageración es relativa al lado de la celda; con celdas pequeñas (3.5 m en la prueba de carga) ×10 se ve muy alta y conviene bajarla con el control.
- **Vista previa:** `web/escena.html` con el motor real y el paquete de demo. En `npm run dev`, los `.bbmodel` necesitan `server.fs.allow` en `vite.config.ts` (ver `INTEGRACION.md`).

## Animaciones (según tiempo)

- **Mínimo:** cambiar de modelo por etapa al cambiar de ciclo o escenario.
- **Deseable:** escala continua entre etapas (~85 % a 100 %), brote con rebote suave, balanceo leve por viento, marchitez (inclinación y color seco), cosecha con destello y regreso a suelo desnudo.
- **Slider de meses** `[EN EVENTO]`: al reproducir, fluido; al arrastrar, saltar al estado correcto sin acumular animaciones.
- Duraciones cortas; opción de **reducir movimiento**.

## Modo 2D ligero
Mapa o cuadrícula 2D coloreada con los **mismos** valores del motor. Es el respaldo si el 3D no está listo y la opción para equipos modestos (una computadora de campo puede tener 4 GB de RAM). **Medir requisitos mínimos** y tener la cifra para los jueces.

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

`ui/LaboratorioConectado.tsx` se usa en P2 y P3. Los cultivos y fechas editables forman planes tipados con `temporada_tipica`, `porQue` y referencia de calendario. No se ofrece NO_EVALUABLE como cultivo. Los planes iniciales R1 a R4 siguen los casos de regresión del motor, trasladados a 2026/2027 como fechas del plan. R4 usa fechas dentro de ventana para comparar; no es una recomendación agrícola. La UI muestra el motivo y fuente de cultivos no recomendados y los motivos de exclusión de pilares devueltos por el motor.

Cambiar un plan invalida de inmediato el cálculo visible y crea una nueva sesión del Worker. Las respuestas antiguas se ignoran. Escenario, ciclo y fecha solo consultan celdas del resultado almacenado. Navegar entre P2/P3 reutiliza datos y planes; la banda se apaga sin descargar ni recalcular. La escena se carga diferida y recibe `parcela`, `resultado` y `fecha`; los .bbmodel se sirven en desarrollo mediante server.fs.allow.

A4.9 muestra rangos mensuales y resultados de años análogos del motor, estados EXPLORATORIO/NO_EVALUABLE, fuentes, ciclos fuera del horizonte y advertencia de que no es predicción. No se suman los extremos mensuales ni se inventan valores para datos faltantes.

Revisión de diseño: better-interface y sus seis áreas, better-ui, con el stack existente (React/Vite/TS y CSS). La plantilla System Design fue localizada y su flujo documental leído; su render falló por falta de LibreOffice/soffice.exe, por lo que no se entrega un DOCX sin verificar ni se sustituyó su plantilla. Esto no afecta al sistema web. Evidencia de interfaz y comprobaciones en web/README.md y web/evidencia.
