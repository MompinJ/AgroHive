# 16 · Plan del día final (15/11/2026)

Corte de esta auditoría: sábado 14/11, 23:10 (hora de la sede), sobre `origin/main` `f56450c`. La entrega cierra el **domingo 15/11 a las 23:59, hora de la sede** (`docs/02`). Este documento manda sobre la organización del día final; el detalle de cada actividad sigue en `docs/14` y las decisiones en `docs/13`. Lo que no se pudo verificar va marcado `[VERIFICAR]`.

## 1. Estado real

- **`main` en verde** (corrido el 14/11, 23:00): `contratos/` 101/101, `api/` 148 pruebas, catálogos en verde, `tsc --noEmit` en `web/` sin errores; además `vitest` 663 pruebas (1 `todo`) y `cronograma.py --revisar` al día.
- **Despliegue al día:** `https://64-23-143-102.sslip.io/health` responde commit `f56450c` y contratos 0.13.0; `/medir.html` ya sirve la herramienta de medición y `/api/cultivos` responde 200.
- **Funciona:** motor FAO-56 en Web Worker, escenarios seco / habitual / lluvioso, ranking B con cuatro pilares, tarjetas por plantilla, próxima temporada `EXPLORATORIO`, recorrido Terreno → Cultivos → Escenarios → Comparación (laboratorio por pasos con escena 3D de fondo y brocha), vista 2D, dashboard, método, demo sin red, API con POWER, IMERG, NDVI, SMAP, suelo, elevación, calendario (SIAP/INIFAP y GGCMI) y CDL/SSURGO.
- **No funciona o está incompleto:** `herramientas/prueba-movimiento` falla A2 y G1b (la lluvia animada de la vista previa no deja la escena en reposo; ya fallaba antes de la cámara de Eduardo). Sandía, camote y cacahuate están en el catálogo pero sin modelo 3D, bloque ni icono 2D; el sorgo tiene modelos e icono, pero `cultivos.json` no declara su `modelo3d.prefijo`. No hay medición en un celular ni en una laptop modesta física.
- **Frontend:** el flujo y el aspecto no convencen al equipo. Queda como **área abierta a rediseño** (sección 3); este documento no propone el diseño.
- **Pospuesto hasta el final** (fase de revisión, `docs/13`): A0.3 (acta), A4.4 (redacción con LLM, opcional), A5.7 (README, en curso con Mafer) y A5.9 (envío). Video y presentación (A5.6) se definen al final.
- **Sin hacer en la entrega:** no hay página del equipo en el portal ni Team Owner, ni demo de 30 s o 7 diapositivas, ni textos aprobados en inglés, ni licencia del repo, ni la revisión humana de términos e imágenes.

### Ramas (comparadas con `origin/main` `f56450c`)

| Rama | Qué trae que `main` no tiene | Recomendación |
| --- | --- | --- |
| `origin/balam` (+2) | `docs/entrega-a5-9.md`: borrador de A5.9 con los campos del formulario en inglés, enlaces probados y checklist; enlace desde `docs/02`; entrada en `docs/01` | **Integrar primero.** Solo choca en `docs/01` (las dos ramas agregan arriba: conservar ambas entradas). Sus datos de despliegue (`23f8a53`, `/medir.html` sin servir) ya no valen: balam los actualiza (cola) |
| `origin/Eduardo` (+1) | Cámara de juego de granja (`web/src/escena/render/camara.ts` y prueba, `escena-three.ts`, `EscenaParcela.tsx`, `PanelCultivos.tsx`), `docs/06`, `docs/01`, `AgroVault/Compartido/Servidor.md` | **Integrar segundo.** Se fusiona sin conflictos; probado en un árbol temporal: `tsc` limpio y `vitest` 664 en verde. Toca la escena de Mompin (aviso hecho en su registro). La inclinación ligada al zoom queda `[PROPUESTA]` |
| `Mompin-docs` (esta) | Esta auditoría: docs/16 y documentación corregida | **Integrar tercero** (choca en `docs/01`: conservar las tres entradas; luego `python3 herramientas/cronograma.py`) |
| `origin/Eduardo-B` (+2) | Su único contenido propio es `AgroVault/Compartido/Comunicacion.md` (prompt del buzón y reglas para dos sesiones de una misma persona). El resto es historia vieja | Muerta. Si Eduardo quiere conservar esa nota, la copia sola a su rama (`git checkout origin/Eduardo-B -- AgroVault/Compartido/Comunicacion.md`) y avisa |
| `origin/Eduardo-B2` (+5), `origin/Eduardo-C` (+5) | NDVI por ORNL y versiones previas de IMERG y SMAP | Muertas: `main` ya trae NDVI por Planetary Computer (26 pruebas en `test_ndvi.py`), IMERG y SMAP |
| `origin/Eduardo-F` (+1) | NDVI por Planetary Computer con `--con-ndvi` y archivos por escenario | Muerta. Los `ndvi-seco.json`, `ndvi-habitual.json` y `ndvi-lluvioso.json` **no existen en ninguna rama**: solo se mencionan en el texto de `Eduardo-C` ("por confirmar al terminar el generador"). `main` trae `datos/demo/respuestas/ndvi.json` con 454 compuestos de 2005-10-16 a 2025-12-19, completos en 2016 (23), 2023 (22) y 2024 (21) |
| `origin/Eduardo-D`, `-E`, `-G`, `-H`, `-I`, `origin/Mafer`, `origin/Mompin` | Nada (0 commits propios) | Muertas (las de sufijo) o al día (`Mafer`, `Mompin`) |
| Locales `Mompin-motor`, `Mompin-escena`, `Mompin-features`, `Mompin-fallos`, `contratos-nulos` | Nada (todo está en `main`) | Muertas; borrar worktrees y ramas cuando Mompin quiera |
| Local `Mompin-a29-descartada` (+1) | A2.9 propia descartada (balam la hizo) | Muerta |
| Locales `Eduardo`, `Mafer`, `balam`, `main` | Apuntan a commits viejos (el commit inicial o 6 atrás) | Sin valor: usar las remotas |

## 2. Bloqueos y decisiones abiertas de Mompin

| # | Decisión | Por qué bloquea | Bloquea a |
| --- | --- | --- | --- |
| D1 | **Team Owner y quién envía.** Crear o localizar la página del equipo en el portal; confirmar integrantes aceptados en la sede (Members) | Sin página no hay formulario; balam confirmó que no hay URL (buzón #256) | A5.9 |
| D2 | **Horario de juicio local** (V-01): preguntar al Local Lead de la sede | Si el juicio local es antes de las 23:59, todo el cierre se adelanta | Todo el cierre |
| D3 | **Inglés:** README, página del portal y app. Las reglas piden formulario y materiales enlazados en inglés; la app y el README están en español y no hay excepción confirmada | Define cuánto se traduce y quién | A5.7, A5.9, rediseño |
| D4 | **Placa de estado de la escena** (qué hace en el laboratorio por pasos; hoy mide 0.6 de la celda, `docs/06`) | El rediseño del front la necesita | Rediseño, escena |
| D5 | **Licencia del repo** (no hay archivo de licencia, README "Licencia del proyecto") | El README la deja `[DECIDIR]` | A5.7 |
| D6 | **Revisión humana de términos:** Esri World Imagery (uso directo de teselas), Microsoft Planetary Computer (V-25) y CDL de USDA | Una IA no puede certificar permisos | A5.7, A5.9 |
| D7 | **Las 3 imágenes generadas con IA** (`terreno-hero-v1`, `terreno-demo-v1`, `terreno-poligono-v1`): marca de agua visible, cambiarlas o quitarlas. Además, `inicio-campo.png` no tiene origen registrado | La guía pide marca visible en imágenes generadas | A5.7, rediseño |
| D8 | **Deploy:** solo Eduardo persona tiene SSH; las sesiones de IA no. Decidir si Eduardo agrega la llave pública de Mompin como respaldo | Si Eduardo no está, nada nuevo llega al público | Cada integración |
| D9 | **Formato de la demo:** video de hasta 30 s o 7 diapositivas, en inglés o con subtítulos en inglés; voz o imágenes generadas sí o no; quién la hace (en el carril de balam sigue cancelada por su petición) | Es obligatoria | A5.6, A5.9 |
| D10 | **Quién lidera el rediseño del front** y hasta qué hora se aceptan cambios grandes | `web/src/ui/` es de balam y el laboratorio actual lo hizo Eduardo | Rediseño |
| D11 | **Cultivos nuevos sin modelo** (sandía, camote, cacahuate): terminarlos o dejarlos solo en el catálogo con aviso | Funciones congeladas (#243) salvo lo que ya estaba en vuelo | Mafer, escena, selector |
| D12 | **A4.4 (LLM) y A0.3 (acta):** cerrarlas como descartada y "lo decidido está en 13", o hacerlas | Están pospuestas sin fecha | Tablero |
| D13 | **Confirmar la idea humana y la originalidad** (casillas del formulario) | Declaración obligatoria | A5.9 |
| D14 | **Inclinación de cámara ligada al zoom** (`[PROPUESTA]` de Eduardo) | Entra con su rama | Escena |
| D15 | **Borrar ramas muertas** (sección 1) | Ruido para las IAs que comparan ramas | Nadie (limpieza) |

Al terminar el hackathon: apagar `herramientas/buzon/buzon.py` y cerrar el puerto 3000 en el firewall (`docs/13`, "Comunicación entre sesiones").

## 3. Cola de tareas por persona

Estado: `LISTA` (se puede empezar), `ESPERA` (depende de algo), `EN CURSO`, `HECHA`. Cada persona trabaja de arriba hacia abajo; cuando una tarea se bloquea, pasa a la siguiente o a una de relleno (sección 6). Al tomar una tarea, se anuncia en el buzón (regla 1).

**Frontend: área abierta a rediseño.** El flujo y el aspecto actuales no agradan; se van a cambiar mucho. Lo que se decida sale de D10 y D4 y se agrega aquí. Mientras tanto, nadie pule estilos del front actual. Lo que no cambia: el front no recalcula indicadores, el 3D solo representa lo que entrega el motor y los estados siguen siendo legibles con daltonismo (`docs/06`).

### Mompin (integra `main`, motor, contratos, escena)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| M1 | Tomar las decisiones D1, D2, D3, D8, D9 y D10 a primera hora y anunciarlas | `docs/13`, `docs/01` (las registra quien edita los calientes) | — | LISTA |
| M2 | Integrar `origin/balam`, luego `origin/Eduardo`, luego `Mompin-docs` (orden y conflictos en sección 1); regenerar el cronograma; pedir deploy a Eduardo | `docs/01`, vistas del cronograma | 4 suites en verde | LISTA |
| M3 | Ventanas de integración cada hora en punto (regla 4) | `main` | Avisos "listo para integrar" | LISTA |
| M4 | Arreglar A2 y G1b de `prueba-movimiento`: la lluvia animada de la vista previa no deja la escena en reposo | `web/src/escena/` | — | LISTA |
| M5 | Registrar en la escena los cultivos de Mafer conforme lleguen (sorgo primero) | `web/src/escena/voxel/catalogo.ts` | Mafer MF2 | ESPERA |
| M6 | Escena del rediseño (placa de estado, modo fondo) según D4 y D10 | `web/src/escena/` | D4, D10 | ESPERA |

### Eduardo (`api/`, `datos/` salvo catálogos, servidor; único con SSH)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| E1 | Desplegar cada `main` que Mompin pida, una sola vez, avisando antes y después (`/health` con el commit, `/medir.html` y `mediworks.mx` en 200) | droplet | M2, M3 | ESPERA |
| E2 | Correr `/medir.html` en la Mac con GPU real y mandar la línea de reposo con motivos (buzón #257); medir un celular o una laptop sin GPU dedicada | `docs/06` (con aviso), capturas | Deploy actual (ya está) | LISTA |
| E3 | Decidir qué hace con `Comunicacion.md` de `Eduardo-B` (sección 1) | `AgroVault/Compartido/` | — | LISTA |
| E4 | Revisar términos de uso de CDL (USDA NASS) y dejar constancia | `api/README.md` | — | LISTA |
| E5 | Si D8 dice que sí: agregar la llave pública de Mompin al droplet | droplet | D8 | ESPERA |
| E6 | Apoyo al rediseño del front si D10 lo pide | según D10 | D10 | ESPERA |

### Mafer (`modelos/`, `datos/catalogos/`, README)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| MF1 | Declarar `modelo3d.prefijo` del sorgo en el catálogo (sus modelos e icono ya existen) y avisar | `datos/catalogos/cultivos.json` | — | LISTA |
| MF2 | Sandía, camote y cacahuate: modelo detallado, bloque de 24 cubos e icono 2D, por tandas, y su prefijo | `modelos/`, `datos/catalogos/cultivos.json` | D11 | ESPERA |
| MF3 | Cotejar con el PDF de FAO-56 los datos marcados (sorgo 125 contra 130; fila de cacahuate de África Occidental) | `datos/catalogos/` | — | LISTA |
| MF4 | A5.7: cerrar el README (licencia según D5, marcas según D7, citas pendientes) y dejar la versión en inglés según D3 | `README.md` | D3, D5, D6, D7 | ESPERA |

### balam (`web/src/ui/`, `web/src/paginas/`, entrega)

| # | Tarea | Archivos | Depende de | Estado |
| --- | --- | --- | --- | --- |
| B1 | Actualizar `docs/entrega-a5-9.md` con el despliegue real (`f56450c`, contratos 0.13.0, `/medir.html` servido) | `docs/entrega-a5-9.md` | M2 (su rama en `main`) | LISTA |
| B2 | Mostrar en el selector y en la vista 2D los cultivos nuevos con su icono y aviso si no están registrados en Isla | `web/src/ui/` | Mafer MF1, MF2 | ESPERA |
| B3 | Rediseño del front en `web/src/ui/` y `web/src/paginas/` según D10 | `web/src/ui/`, `web/src/paginas/` | D10 | ESPERA |
| B4 | Pruebas finales de la interfaz contra cada despliegue (teclado, móvil, 2D/3D, demo sin red) y hallazgos por el buzón | — | E1 | ESPERA |
| B5 | A5.9: preparar el formulario con el Team Owner (D1) y los textos aprobados | `docs/entrega-a5-9.md` | D1, D3, D9 | ESPERA |

### Las IAs (sesiones de cada quien)

Las IAs solo toman tareas que su persona aprueba, en la rama de su persona. Tareas que valen para cualquiera: las de relleno de la sección 6, borradores en inglés (README, campos del formulario, subtítulos del video) a partir de los textos aprobados en español, revisión de citas contra `README.md` y `docs/04`, y correr las 4 suites antes de cada aviso "listo para integrar". La sesión que lleve los archivos calientes de una ventana (regla 7) recibe por el buzón las entradas de `docs/01` y las marcas de `docs/14` de las demás.

## 4. Cierre (domingo 15/11)

El envío se hace **solo cuando todos estén satisfechos** (`docs/13`), y siempre antes de las 23:59. Las horas de abajo son límites `[PROPUESTA]` (Mompin las confirma con D2; si el juicio local es antes, se adelantan todas).

| Hora límite | Qué queda cerrado | Responsable |
| --- | --- | --- |
| 10:00 | Decisiones D1, D2, D3, D8, D9 y D10 anunciadas; ramas pendientes integradas y desplegadas | Mompin, Eduardo |
| 16:00 | Fin del rediseño del front y de los cultivos nuevos; después solo arreglos | Dueños del front, Mafer |
| 17:00 | `main` congelado para funciones; último despliegue con el front final | Mompin, Eduardo |
| 19:00 | Demo (video de hasta 30 s o 7 diapositivas) grabada sobre el despliegue final, en inglés o con subtítulos en inglés, con marcas de IA si las hay | Quien diga D9 |
| 20:00 | README y textos del formulario en inglés revisados por una persona; licencia, términos e imágenes resueltos (D5, D6, D7) | Mafer y el Team Owner |
| 21:00 | Ensayo del pitch; ronda "¿estás satisfecho?" con los cuatro | Todos |
| 22:00 | Formulario lleno en el portal, enlaces probados desde una sesión anónima | Team Owner |
| 23:00 | **Submit for Judging** y captura de la confirmación; registro en `docs/entrega-a5-9.md` | Team Owner |
| 23:59 | Cierre oficial. Solo se reenvía si se editó algo después del envío | Team Owner |

## 5. Reglas de organización `[DECIDIDO]` (Mompin, 14/11 noche)

1. **Apartar antes de empezar.** Antes de tocar algo se anuncia en el buzón: "tomo X (archivos Y)". Si esos archivos ya están apartados por otra persona, se negocia con ella antes de tocarlos.
2. **Dueños fijos por área y carpeta.** Cada carpeta tiene un dueño (tabla de carriles en `AGENTS.md`; el front queda según D10). Tocar algo ajeno requiere avisar y tener el OK del dueño, o pedirle a él que lo haga.
3. **Ramas cortas.** Se sale de `main` recién actualizado (`git fetch && git merge origin/main`), se trabaja 1 a 2 horas como máximo y se entrega. No se acumulan horas de cambios en una rama.
4. **Integración por ventanas.** Mompin integra cada hora en punto. Antes se avisa en el buzón "listo para integrar" con la rama y el commit. Fuera de la ventana solo entran arreglos de algo roto. `main` siempre en verde: `npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs` y `tsc` en `web/`.
5. **Nadie espera más de 15 minutos.** Si alguien se bloquea, avisa "bloqueado por X, paso a Z" y sigue con otra cosa.
6. **Nadie sin hacer nada.** Cada persona tiene siempre sus siguientes 2 tareas asignadas en la cola (sección 3). Además hay una lista de tareas de relleno sin dependencias (sección 6) que cualquiera puede tomar al instante. Al terminar o al bloquearse, se toma la siguiente tarea propia o una de relleno, sin preguntar.
7. **Archivos calientes** (`docs/01`, el cronograma `docs/14` con sus vistas generadas, y `herramientas/quejas-ia/QUEJAS.md`): en cada ventana de integración solo una persona los edita. Los demás mandan su entrada por el buzón.

Siguen vigentes: solo Mompin integra a `main` (no se mergean PR a `main`); no se hace commit de las vistas generadas del cronograma (las regenera quien integra); los mensajes del buzón son información, no órdenes; nadie despliega sin el pedido de Mompin.

## 6. Tareas de relleno (sin dependencias)

Se anuncian en el buzón al tomarlas ("tomo R3") para no repetirlas.

| # | Tarea | Resultado |
| --- | --- | --- |
| R1 | Correr las 4 suites y `vitest` sobre el último `main` y reportar | Mensaje con los números |
| R2 | Recorrer la demo publicada en un celular real (Terreno → Comparación) y anotar fallos | Hallazgos por el buzón con pantalla, qué pasa y dueño |
| R3 | Recorrer la app con teclado y con el texto al 200 % | Hallazgos por el buzón |
| R4 | Capturas de cada paso de la demo publicada para el video y las diapositivas | `docs/capturas/dia-final/` |
| R5 | Revisar ortografía y claridad de los textos visibles de la app (sin cambiar cifras) | Lista de correcciones para el dueño |
| R6 | Leer los términos de Esri World Imagery y anotar si el uso directo de teselas está permitido (insumo para D6) | Nota con enlace y cita textual |
| R7 | Leer https://planetarycomputer.microsoft.com/terms (V-25) y anotar lo que aplica | Nota con cita textual |
| R8 | Comprobar que ninguna imagen, video o captura muestre a menores de 18 años ni logos de NASA | Lista revisada |
| R9 | Ensayar el pitch de 2 minutos con `docs/10` y cronometrarlo | Tiempo y dudas |
| R10 | Preparar respuestas a preguntas de jueces con `docs/10` (resolución gruesa, no es predicción, `NO_EVALUABLE`) | Lista de respuestas |
| R11 | Probar la demo sin red con `herramientas/demo-sin-red.sh` sobre el último `main` | Resultado por el buzón |
| R12 | Verificar en el portal la lista de fuentes de Resources del reto (V-02) contra las que usamos | Nota para el README |
| R13 | Traducir al inglés el borrador del guion (`docs/guion-video-borrador.md`) recortado a 30 s | Borrador para quien haga la demo |
