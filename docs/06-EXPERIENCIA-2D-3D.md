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
- **Huecos:** una celda sin elevación se dibuja como bloque hundido con cruces (`NO_EVALUABLE`), nunca a nivel cero. Una celda sin registro del motor queda "Sin resultado" y no se supone "Normal". Si se pasa del tope de 1 600 celdas, la escena no dibuja la parcela recortada: avisa.
- **Estados:** placa sobre cada bloque con color (paleta Okabe-Ito), patrón e icono propios por estado, y la tinta negra o blanca con contraste ≥ 4.5:1 verificado en pruebas. La tabla vive en `escena/estilos-estado.ts`; A3.3 la ajusta ahí. Leyenda siempre visible, con texto accesible.
- **Suelo:** el bloque se aclara si está seco y se oscurece si está húmedo según `humedad` del motor; humedad `NO_EVALUABLE` = gris, fuera de la escala.
- **Plantas:** un `InstancedMesh` por cultivo + etapa con los `.bbmodel` de `modelos/cultivos/` (cubos unidos en una geometría); `podrida` usa su modelo; `estresada` y `marchita` usan el de su etapa más la placa. Sin `.bbmodel`, planta provisional declarada. Escala 85 % a 100 % según `avanceEtapa` y giro de 90° estable por celda.
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
