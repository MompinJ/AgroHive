# 16 · Plan del día final (15/11/2026)

Corte de esta auditoría: sábado 14/11, 23:10 (hora de la sede), sobre `origin/main` `f56450c`; decisiones y reparto actualizados después, con `main` en `582e482`. Este documento manda sobre la organización del trabajo del día final; la entrega es una fase posterior y queda fuera de este plan (sección 5); el detalle de cada actividad sigue en `docs/14` y las decisiones en `docs/13`. Lo que no se pudo verificar va marcado `[VERIFICAR]`.

## 1. Estado real

- **`main` en verde** (corrido el 14/11, 23:00): `contratos/` 101/101, `api/` 148 pruebas, catálogos en verde, `tsc --noEmit` en `web/` sin errores; además `vitest` 663 pruebas (1 `todo`) y `cronograma.py --revisar` al día.
- **Despliegue al día:** `https://64-23-143-102.sslip.io/health` responde commit `f56450c` y contratos 0.13.0; `/medir.html` ya sirve la herramienta de medición y `/api/cultivos` responde 200.
- **Funciona:** motor FAO-56 en Web Worker, escenarios seco / habitual / lluvioso, ranking B con cuatro pilares, tarjetas por plantilla, próxima temporada `EXPLORATORIO`, recorrido Terreno → Cultivos → Escenarios → Comparación (laboratorio por pasos con escena 3D de fondo y brocha), vista 2D, dashboard, método, demo sin red, API con POWER, IMERG, NDVI, SMAP, suelo, elevación, calendario (SIAP/INIFAP y GGCMI) y CDL/SSURGO.
- **No funciona o está incompleto:** `herramientas/prueba-movimiento` falla A2 y G1b (la lluvia animada de la vista previa no deja la escena en reposo; ya fallaba antes de la cámara de Eduardo). Sandía, camote y cacahuate están en el catálogo pero sin modelo 3D, bloque ni icono 2D; el sorgo tiene modelos e icono, pero `cultivos.json` no declara su `modelo3d.prefijo`. No hay medición en un celular ni en una laptop modesta física.
- **Frontend:** el flujo y el aspecto no convencen al equipo. Queda como **área abierta a rediseño**, a cargo de Eduardo (D1, sección 3); este documento no propone el diseño.
- **Pospuesto hasta el final** (fase de revisión, `docs/13`): A0.3 (acta), A4.4 (redacción con LLM, opcional), A5.7 (README, en curso con Mafer) y A5.9 (envío). Lo que toca a la entrega está en la sección 5, fuera de este plan.

### Ramas (comparadas con `origin/main` `f56450c`)

| Rama | Qué trae que `main` no tiene | Recomendación |
| --- | --- | --- |
| `origin/balam` (+2) | `docs/entrega-a5-9.md`: borrador de A5.9 con los campos del formulario en inglés, enlaces probados y checklist; enlace desde `docs/02`; entrada en `docs/01` | **Integrar primero.** Solo choca en `docs/01` (las dos ramas agregan arriba: conservar ambas entradas). Sus datos de despliegue (`23f8a53`, `/medir.html` sin servir) ya no valen; se actualizan en la fase de entrega |
| `origin/Eduardo` (+1) | Cámara de juego de granja (`web/src/escena/render/camara.ts` y prueba, `escena-three.ts`, `EscenaParcela.tsx`, `PanelCultivos.tsx`), `docs/06`, `docs/01`, `AgroVault/Compartido/Servidor.md` | **Integrar segundo.** Se fusiona sin conflictos; probado en un árbol temporal: `tsc` limpio y `vitest` 664 en verde. Toca la escena de Mompin (aviso hecho en su registro). La inclinación ligada al zoom queda `[PROPUESTA]` |
| `Mompin-docs` (esta) | Esta auditoría: docs/16 y documentación corregida | **Integrar tercero** (choca en `docs/01`: conservar las tres entradas; luego `python3 herramientas/cronograma.py`) |
| `origin/Eduardo-B` (+2) | Su único contenido propio es `AgroVault/Compartido/Comunicacion.md` (prompt del buzón y reglas para dos sesiones de una misma persona). El resto es historia vieja | Muerta. Si Eduardo quiere conservar esa nota, la copia sola a su rama (`git checkout origin/Eduardo-B -- AgroVault/Compartido/Comunicacion.md`) y avisa |
| `origin/Eduardo-B2` (+5), `origin/Eduardo-C` (+5) | NDVI por ORNL y versiones previas de IMERG y SMAP | Muertas: `main` ya trae NDVI por Planetary Computer (26 pruebas en `test_ndvi.py`), IMERG y SMAP |
| `origin/Eduardo-F` (+1) | NDVI por Planetary Computer con `--con-ndvi` y archivos por escenario | Muerta. Los `ndvi-seco.json`, `ndvi-habitual.json` y `ndvi-lluvioso.json` **no existen en ninguna rama**: solo se mencionan en el texto de `Eduardo-C` ("por confirmar al terminar el generador"). `main` trae `datos/demo/respuestas/ndvi.json` con 454 compuestos de 2005-10-16 a 2025-12-19, completos en 2016 (23), 2023 (22) y 2024 (21) |
| `origin/Eduardo-D`, `-E`, `-G`, `-H`, `-I`, `origin/Mafer`, `origin/Mompin` | Nada (0 commits propios) | Muertas (las de sufijo) o al día (`Mafer`, `Mompin`) |
| Locales `Mompin-motor`, `Mompin-escena`, `Mompin-features`, `Mompin-fallos`, `contratos-nulos` | Nada (todo está en `main`) | Muertas; borrar worktrees y ramas cuando Mompin quiera |
| Local `Mompin-a29-descartada` (+1) | A2.9 propia descartada (balam la hizo) | Muerta |
| Locales `Eduardo`, `Mafer`, `balam`, `main` | Apuntan a commits viejos (el commit inicial o 6 atrás) | Sin valor: usar las remotas |

## 2. Decisiones de Mompin para el plan de trabajo

Decididas el 14/11 por la noche `[DECIDIDO]` (Mompin; también en `docs/13`):

| # | Decisión |
| --- | --- |
| D1 | **Eduardo lleva el rediseño del front**: `web/src/ui/`, `web/src/paginas/` y la parte de la escena que el front necesite. Los demás no tocan el front |
| D4 | **Sandía, camote y cacahuate se terminan**: modelo, bloque, icono 2D y registro en la escena |
| H-B6 | Plazo de unos 20 s y 2 intentos por fuente, más un plazo total por petición, para que la cadena de respaldos del clima quepa en los 90 s del front (`docs/hallazgos-back.md`) |
| H-M1 | En el ranking, `entran` se calcula solo sobre las rotaciones que se ordenan; una `EXPLORATORIO` a la que le falta un pilar lleva puntaje `null` |
| H-M9 | Se sigue doc 05: con un escenario `NO_EVALUABLE`, todos sus indicadores (también `proteccionSuelo` y `aporteIndirecto`) van en `null` |
| Reparto IA | La IA de Mompin (sesión maestra y sus especialistas) toma esta noche las tareas de motor, API y cultivos que nadie está haciendo: **cazafallos** (rama `Mompin-fallos`) arregla los hallazgos del back y del motor; **cultivos** (rama `Mompin-escena`) hace MF1, MF2, M4, M5 y la versión de los catálogos |

Siguen abiertas:

| # | Decisión | Por qué bloquea | Bloquea a |
| --- | --- | --- | --- |
| D2 | **Placa de estado de la escena** (hoy mide 0.6 de la celda, `docs/06`): ahora la decide Eduardo con el front (D1) | El rediseño la necesita | Rediseño |
| D3 | **Deploy:** solo Eduardo persona tiene SSH; las sesiones de IA no. Decidir si Eduardo agrega la llave pública de Mompin como respaldo | Si Eduardo no está, nada nuevo llega al público | Cada integración |
| D5 | **Inclinación de cámara ligada al zoom** (`[PROPUESTA]` de Eduardo, ya en `main`) | Queda como propuesta | Escena |
| D6 | **A4.4 (LLM) y A0.3 (acta):** cerrarlas como descartada y "lo decidido está en 13", o hacerlas | Están pospuestas sin fecha | Tablero |
| D7 | **Borrar ramas muertas** (sección 1) | Ruido para las IAs que comparan ramas | Nadie (limpieza) |

Las decisiones que son solo de la entrega están en la sección 5.

Al terminar el hackathon: apagar `herramientas/buzon/buzon.py` y cerrar el puerto 3000 en el firewall (`docs/13`, "Comunicación entre sesiones").

## 3. Cola de tareas por persona

Estado: `LISTA` (se puede empezar), `ESPERA` (depende de algo), `EN CURSO`, `HECHA`. Cada persona trabaja de arriba hacia abajo; cuando una tarea se bloquea, pasa a la siguiente o a una de relleno (sección 6). Al tomar una tarea, se anuncia en el buzón (regla 1). Corte del reparto: 14/11 noche, `main` en `582e482`.

**Frontend: área abierta a rediseño, a cargo de Eduardo (D1).** El flujo y el aspecto actuales no agradan; se van a cambiar mucho. Eduardo decide el diseño y la placa de estado (D2); los demás no tocan el front y, si Eduardo lo pide, apoyan. Lo que no cambia: el front no recalcula indicadores, el 3D solo representa lo que entrega el motor y los estados siguen siendo legibles con daltonismo (`docs/06`).

**Hallazgos del back y del motor** (`docs/hallazgos-back.md`): los arreglados ya están en `main`. Los propuestos o recién decididos van en la cola de su dueño, `EN CURSO` con cazafallos (rama `Mompin-fallos`); cuando cazafallos termine, lo que quede propuesto vuelve al dueño como `LISTA`.

### Mompin (integra `main`, motor, contratos, escena)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| M1 | Decidir D1 a D7 y anunciarlas | `docs/13`, `docs/01` | — | EN CURSO (D1 y D4 tomadas; D3, D5, D6 y D7 abiertas; D2 pasa a Eduardo) |
| M2 | Integrar `origin/balam`, `origin/Eduardo`, `Mompin-docs` y `Mompin-fallos`; regenerar el cronograma | `main` | 4 suites en verde | HECHA (`582e482`) |
| M3 | Ventanas de integración cada hora en punto (regla 4) | `main` | Avisos "listo para integrar" | EN CURSO |
| M4 | Arreglar A2 y G1b de `prueba-movimiento`: la lluvia animada de la vista previa no deja la escena en reposo | `web/src/escena/` | — | EN CURSO (IA de Mompin, cultivos, `Mompin-escena`) |
| M5 | Registrar en la escena sorgo, sandía, camote y cacahuate | `web/src/escena/voxel/catalogo.ts` | MF1, MF2 | EN CURSO (IA de Mompin, cultivos, `Mompin-escena`) |
| M6 | Hallazgos del motor: H-M1 y H-M9 (decididos), H-M2 (fin del ciclo por duración del catálogo), H-M4 (fecha inválida), H-M5 (errores del Worker), H-M6, H-M7, H-M8, H-M10 y H-M11 (fuente de la ventana en la tarjeta) | `web/src/motor/` | — | HECHA en `Mompin-fallos` salvo H-M7, que queda propuesto (`docs/hallazgos-back.md`). H-M11 no cambió la regresión A5.5 |

### Eduardo (rediseño del front, `api/`, `datos/` salvo catálogos, servidor; único con SSH)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| E1 | Desplegar `582e482` como primera acción de mañana, una sola vez, avisando antes y después (`/health` con el commit, `/medir.html` y `mediworks.mx` en 200); después, cada `main` que Mompin pida | droplet | — | LISTA |
| E2 | Rediseño del front (antes B2, D1) y decisión de la placa de estado (D2) | `web/src/ui/`, `web/src/paginas/`, la parte de `web/src/escena/` que el front necesite | — | LISTA |
| E3 | Correr `/medir.html` en la Mac con GPU real y mandar la línea de reposo con motivos (buzón #257); medir un celular o una laptop sin GPU dedicada | `docs/06` (con aviso), capturas | Deploy | LISTA |
| E4 | Hallazgos del back: H-B6 (decidido), H-B8 (503 sin catálogo), H-B9 (regenerar el paquete de demo), H-B10 (país en la costa de Veracruz), H-B11 (aviso `NDVI_EN_CACHE`) | `api/`, `datos/demo/` | — | HECHA en `Mompin-fallos` (cazafallos, con OK de Mompin; falta integrar a `main` y desplegar) |
| E5 | Decidir qué hace con `Comunicacion.md` de `Eduardo-B` (sección 1) | `AgroVault/Compartido/` | — | LISTA |
| E6 | Si D3 dice que sí: agregar la llave pública de Mompin al droplet | droplet | D3 | ESPERA |

### Mafer (`modelos/`, `datos/catalogos/`, README)

MF1, MF2 y la versión de los catálogos tocan archivos de Mafer: las hace la IA de Mompin por el reparto de esta noche.

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| MF1 | Declarar `modelo3d.prefijo` del sorgo en el catálogo (sus modelos e icono ya existen) | `datos/catalogos/cultivos.json` | — | EN CURSO (IA de Mompin, cultivos, `Mompin-escena`) |
| MF2 | Sandía, camote y cacahuate: modelo detallado, bloque de 24 cubos, icono 2D y prefijo (D4) | `modelos/`, `datos/catalogos/cultivos.json` | — | EN CURSO (IA de Mompin, cultivos, `Mompin-escena`) |
| MF3 | Cotejar con el PDF de FAO-56 los datos marcados (sorgo 125 contra 130; fila de cacahuate de África Occidental) | `datos/catalogos/` | — | LISTA |
| MF4 | `versionContrato` real en los catálogos (H-B9) | `datos/catalogos/*.json` | — | EN CURSO (IA de Mompin, cultivos, `Mompin-escena`) |

### balam

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| B1 | Mostrar en el selector y en la vista 2D los cultivos nuevos con su icono y aviso si no están registrados en Isla | `web/src/ui/` (coordinar con Eduardo, D1) | MF1, MF2 | ESPERA |
| B3 | Pruebas finales de la interfaz contra cada despliegue (teclado, móvil, 2D/3D, demo sin red) y hallazgos por el buzón | — | E1 | ESPERA |
| B4 | Apoyo al rediseño del front si Eduardo lo pide | según Eduardo | E2 | ESPERA |

B2 (rediseño) pasó a Eduardo (E2) por D1.

### Las IAs (sesiones de cada quien)

Las IAs solo toman tareas que su persona aprueba, en la rama de su persona. La IA de Mompin lleva esta noche cazafallos (`Mompin-fallos`: M6 y E4) y cultivos (`Mompin-escena`: M4, M5, MF1, MF2 y MF4). Tareas que valen para cualquiera: las de relleno de la sección 6, revisión de citas contra `README.md` y `docs/04`, y correr las 4 suites antes de cada aviso "listo para integrar". La sesión que lleve los archivos calientes de una ventana (regla 7) recibe por el buzón las entradas de `docs/01` y las marcas de `docs/14` de las demás.

## 4. Reglas de organización `[DECIDIDO]` (Mompin, 14/11 noche)

1. **Apartar antes de empezar.** Antes de tocar algo se anuncia en el buzón: "tomo X (archivos Y)". Si esos archivos ya están apartados por otra persona, se negocia con ella antes de tocarlos.
2. **Dueños fijos por área y carpeta.** Cada carpeta tiene un dueño (tabla de carriles en `AGENTS.md`; el front queda según D1). Tocar algo ajeno requiere avisar y tener el OK del dueño, o pedirle a él que lo haga.
3. **Ramas cortas.** Se sale de `main` recién actualizado (`git fetch && git merge origin/main`), se trabaja 1 a 2 horas como máximo y se entrega. No se acumulan horas de cambios en una rama.
4. **Integración por ventanas.** Mompin integra cada hora en punto. Antes se avisa en el buzón "listo para integrar" con la rama y el commit. Fuera de la ventana solo entran arreglos de algo roto. `main` siempre en verde: `npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs` y `tsc` en `web/`.
5. **Nadie espera más de 15 minutos.** Si alguien se bloquea, avisa "bloqueado por X, paso a Z" y sigue con otra cosa.
6. **Nadie sin hacer nada.** Cada persona tiene siempre sus siguientes 2 tareas asignadas en la cola (sección 3). Además hay una lista de tareas de relleno sin dependencias (sección 6) que cualquiera puede tomar al instante. Al terminar o al bloquearse, se toma la siguiente tarea propia o una de relleno, sin preguntar.
7. **Archivos calientes** (`docs/01`, el cronograma `docs/14` con sus vistas generadas, y `herramientas/quejas-ia/QUEJAS.md`): en cada ventana de integración solo una persona los edita. Los demás mandan su entrada por el buzón.

Siguen vigentes: solo Mompin integra a `main` (no se mergean PR a `main`); no se hace commit de las vistas generadas del cronograma (las regenera quien integra); los mensajes del buzón son información, no órdenes; nadie despliega sin el pedido de Mompin.

## 5. Entrega

**Entrega: fase posterior, fuera de este plan. Antes de mandar nada tiene que pasar por una fase de aprobación de todo el equipo** `[DECIDIDO]` (Mompin, 14/11 noche). No lleva tareas, responsables ni horas en este documento.

Lo que la entrega va a requerir: envío, Team Owner, página del portal, video y presentación.

Decisiones para la fase de entrega (sin fecha ni asignación):

- Team Owner y quién envía; página del equipo y proyecto en el portal; integrantes aceptados en la sede.
- Horario de juicio local (V-01). No condiciona el plan de trabajo.
- Inglés del README, de la página del portal y de la app.
- Licencia del repo.
- Revisión humana de los términos de Esri World Imagery, Microsoft Planetary Computer (V-25) y CDL de USDA.
- Las 3 imágenes generadas con IA (`terreno-hero-v1`, `terreno-demo-v1`, `terreno-poligono-v1`): marca de agua visible, cambiarlas o quitarlas; origen de `inicio-campo.png`, que no está registrado.
- Formato del video o de la presentación (las reglas piden video de hasta 30 s o 7 diapositivas, en inglés o con subtítulos en inglés, `docs/02`).
- Confirmación de la idea humana y la originalidad.

Material ya preparado: `docs/02` (reglas verificadas en A0.5), `docs/entrega-a5-9.md` (borrador de balam, cuando entre su rama), `docs/guion-video-borrador.md` y `README.md` (A5.7).

## 6. Tareas de relleno (sin dependencias)

Se anuncian en el buzón al tomarlas ("tomo R3") para no repetirlas.

| # | Tarea | Resultado |
| --- | --- | --- |
| R1 | Correr las 4 suites y `vitest` sobre el último `main` y reportar | Mensaje con los números |
| R2 | Recorrer la demo publicada en un celular real (Terreno → Comparación) y anotar fallos | Hallazgos por el buzón con pantalla, qué pasa y dueño |
| R3 | Recorrer la app con teclado y con el texto al 200 % | Hallazgos por el buzón |
| R4 | Capturas de cada paso de la demo publicada, como evidencia de la revisión | `docs/capturas/dia-final/` |
| R5 | Revisar ortografía y claridad de los textos visibles de la app (sin cambiar cifras) | Lista de correcciones para el dueño |
| R6 | Probar la demo sin red con `herramientas/demo-sin-red.sh` sobre el último `main` | Resultado por el buzón |
| R7 | Correr `herramientas/prueba-movimiento` sobre el último `main` y reportar cuáles fallan | Resultado por el buzón |
| R8 | Comprobar que cada cifra visible en tarjetas y dashboard tenga su fuente en la pantalla de método | Lista de cifras sin fuente para el dueño |
| R9 | Dibujar una parcela propia fuera de México y comprobar que lo que falta sale `NO_EVALUABLE` con motivo, nunca un número | Hallazgos por el buzón |
| R10 | Comparar nombres y textos de la app con los docs (rotaciones R1, R2, R4; escenarios; estados) y anotar diferencias | Lista para el dueño |
