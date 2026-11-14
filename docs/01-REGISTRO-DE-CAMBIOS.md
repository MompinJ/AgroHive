# 01 · Registro de cambios

Toda edición de esta carpeta se anota aquí. No borrar entradas anteriores.

## Formato de entrada

```text
Fecha: AAAA-MM-DD
Archivos:
Cambio y motivo:
Fuente / evidencia:
Decisiones afectadas:
```

### 2026-11-14 — Herramienta de medición de la escena para A5.4 (Mompin)

- **Archivos:** `web/medir.html` y `web/src/escena/medir/medir.tsx` (nuevos), `herramientas/medir-escena/` (`medir.mjs` y `README.md`), `render/escena-three.ts` y `EscenaParcela.tsx` (recuperación ante pérdida del contexto WebGL); `docs/06`, `docs/14` (nota en A5.4).
- **Cambio:** página y script que miden la escena en el equipo real: GPU, WebGL, triángulos, draw calls, reposo, viento, memoria, primera escena y pérdida de contexto. La escena se reconstruye si el navegador devuelve el contexto; si no, avisa que se use el modo 2D.
- **Fuente / evidencia:** corrida en headless con SwiftShader (tabla en el README); falta la del hardware real (Eduardo). Para publicar `medir.html` en el droplet hace falta una línea en `web/vite.config.ts` (de balam).

### 2026-11-14 (noche) — `/health` lee la version de contratos (Eduardo)

- **Archivos:** `api/app/config.py`, `api/tests/test_basico.py`.
- **Cambio:** `VERSION_CONTRATO` ya no va escrito en la API. Al arrancar se lee `version` de `contratos/package.json` (ruta por `AGROHIVE_CONTRATOS_PACKAGE`, si no el paquete del repo). Si el archivo no esta, no es JSON o no trae `version`, la API no arranca. No se inventa un numero. `/health` sigue publicando ese valor.
- **Fuente / evidencia:** `contratos/package.json` esta en `0.12.2`. Antes el codigo tenia el mismo texto fijo: coincidia hoy y se desfasaba en el siguiente bump hasta correr pytest.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 — Prueba de los dos primeros bloques de Mafer en la escena (Mompin)

- **Archivos:** `web/src/escena/voxel/catalogo.ts` (`giroSurcos`), `render/escena-three.ts` (altura del detallado elegido), `demo-motor.ts` (días de siembra en la vista previa); `docs/06`.
- **Medido:** 518 celdas con maíz en madurez: bloque de Mafer 424 516 triángulos y 3.3 cuadros/s; detallado 449 380 y 3.2; provisional (21 cubos) 216 280 y 4.8. Vértices por modelo: madurez detallado 1 980, bloque 1 836 (1 530 sin caras de abajo), provisional 630.
- **Cambio:** surcos paralelos (giro 0° o 180°) y detallado de la celda elegida a lo sumo 1.6 veces el manchón.
- **Pendiente (decisión de Mompin con Mafer):** el tope de 55 cubos no aligera la escena; se propone bajarlo y quitar las caras de abajo antes de hacer los otros 18 bloques.

### 2026-11-14 (noche) — Merge de main y estado de A5.4 (Eduardo)

- **Archivos:** `docs/14` (marca y vistas regeneradas), `docs/01`, `docs/04`, `docs/11` (resolución del merge).
- **Cambio:** entra `origin/main`, incluido A3.6 (modo 2D y fallback inicial sin WebGL). A5.4 queda `[BLOQUEADO]`: no se repitieron mediciones de escena. Las cifras de SwiftShader están en `docs/06` (Mompin, buzón #202): polígono de 518 celdas, maíz en madurez de 449 380 a 216 280 triángulos y de 3.2 a 5.0 cuadros/s con manchones, 6 draw calls (8 con celda), en reposo no se dibuja. Falta hardware real (laptop sin GPU dedicada y celular) y la pérdida de contexto WebGL. El 2D de balam es el respaldo inicial, no el seguimiento de un contexto que se pierde después.
- **Fuente / evidencia:** `docs/06` y el mensaje #202. Sin medición nueva.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — A4.13: calendario GGCMI fuera de México (Eduardo)

- **Archivos:** `api/app/calendario.py`, `api/app/rutas/calendario.py`, `api/tests/test_calendario.py`, `datos/calendario/` (Natural Earth 110m, recuadro OSM de Isla, `mai_rf` de GGCMI), `docs/14`, `docs/04`, `docs/11`, `api/README.md`.
- **Cambio:** `GET /api/calendario`. Isla sigue con SIAP/INIFAP. Fuera de México el maíz de temporal es el día de siembra de GGCMI fase 3 (`mai_rf`, doi:10.5281/zenodo.5062513); la madurez va en la nota porque el contrato no tiene ese campo. Un solo ciclo: la otra temporada es `NO_EVALUABLE`. El frijol no se lee de `bea_rf`: la ficha y el NetCDF no dicen que sea frijol. Calabaza y chile, `NO_EVALUABLE`. En México, fuera del recuadro de Isla, tampoco se usa GGCMI.
- **Pedido a Mompin:** si la madurez debe ir en un campo propio de `calendario-local`, hay que agregarlo. Hoy vive en `fuente.nota`.
- **Fuente / evidencia:** `pytest` de `api/` (121 pruebas), incluidas Isla, Iowa (día 133 = 13 de mayo) y Ciudad de México.
- **Decisiones afectadas:** ninguna nueva. Sigue `[VERIFICAR]` qué cultivo es `bea`.

### 2026-11-14 (noche) — Revisión de A4.6, A4.7, A4.8 y A5.8 (Eduardo)

- **Archivos:** `docs/14` (notas; vistas regeneradas), `docs/demo-sin-red.md`, `docs/capturas/noche-14/`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** se volvió a correr la demo de Isla con la salida de la API y del navegador bloqueada. P0 a P3 quedan con datos del paquete y el motor (criterio B). La API local sin red responde el paquete y da 503 fuera de él. A4.6 y A5.8 siguen `[HECHO]` con esa evidencia. A4.7 sigue `[EN CURSO]`: la URL pública responde en el commit `d182af4` y el SSH de esta sesión fue rechazado, así que no hubo despliegue. A4.8 sigue `[EN CURSO]`: 503 sin token, sin poner `EARTHDATA_TOKEN`. A4.12 sigue pendiente de C5. A4.13 quedó `[HECHO]` en la entrada de arriba (`GET /api/calendario`; esta pasada volvió a correr `test_calendario.py`, 4 pruebas). A5.4 sigue bloqueada: A3.6 está `[HECHO]` en `origin/main` (`58fab7a`) y esta rama todavía no lo tiene.
- **Fuente / evidencia:** `bash herramientas/demo-sin-red.sh --solo-api`; `pytest` de `test_demo.py`, `test_ndvi.py` y `test_smap.py` (46); `npm run build` en `web/`; Chrome headless. No se apagó el wifi.

### 2026-11-14 — Manchón de plantas por celda en la escena (Mompin; idea de balam, modelos de Mafer)

- **Archivos:** `web/src/escena/voxel/bloque.ts` (nuevo), `render/escena-three.ts` (bloque por celda, detallado en la celda elegida, marco unido en una malla), `voxel/fuente-modelos.ts` (`modelos/cultivos/bloques/`), `EscenaParcela.tsx` (nota en la leyenda), `demo-motor.ts` (la vista previa usa el polígono de 518 celdas), prueba `bloque.test.ts`; `docs/06`.
- **Cambio:** cada celda lleva el modelo ligero de bloque y la celda elegida el detallado. Si falta el bloque, se usa uno provisional en código (21 cubos, tope de 55 y lomo por surco `[DECIDIDO]` por Mompin con Mafer). La leyenda dice que la densidad es visual, no a escala.
- **Fuente / evidencia:** con 518 celdas, maíz en madurez pasa de 449 380 a 216 280 triángulos y de 3.2 a 5.0 cuadros/s (SwiftShader); 6 draw calls antes y después. Pendiente: medir con los bloques de Mafer (`maiz_siembra` y `maiz_madurez` primero).

### 2026-11-14 — A3.6: vista 2D con el mismo resultado del motor (balam)

- **Archivos:** `web/src/ui/Parcela2D.tsx`, `parcela2d.css`, `Parcela2D.test.tsx`, `LaboratorioConectado.tsx`, `useLaboratorio.ts`; `docs/06`, `docs/14`, vistas generadas del tablero y `web/README.md`.
- **Cambio:** selector 2D/3D conservado al navegar. La cuadrícula reutiliza el adaptador, las placas SVG, la leyenda y la ficha del 3D, sin importar Three.js, sin recalcular indicadores y sin consultas nuevas al alternar. Controles táctiles de 48 px, flechas, Inicio/Fin y lista de celdas; huecos y motivos NO_EVALUABLE explícitos. Fallback inicial automático si no hay WebGL2. A5.4 deja de estar bloqueada por A3.6; la medición de hardware sigue pendiente con Eduardo.
- **Fuente / evidencia:** pruebas de contrato de ejemplo, 1600 celdas y orientación; navegador con R1/ciclo 2/seco muestra frijol, métricas idénticas y cero mensajes/peticiones nuevos al alternar. Sin WebGL: cero canvas y sin descargar el módulo 3D. 320 px sin desborde y axe sin incidencias en los criterios revisados. Capturas `web/evidencia/a3-6-*`.
- **Decisiones afectadas:** se ejecuta el alcance 2D/3D aprobado de doc 06; no cambia el contrato ni el motor. Para el trabajo de Balam, video y presentación siguen cancelados por su petición expresa. La sincronización conserva también la decisión del equipo registrada por Mompin de definirlos al final; no reactiva trabajo de Balam.

### 2026-11-14 — Corrección: video y presentación se definen al final, no están canceladas (Mompin, sesión features)

- **Archivos:** `docs/13` (fila "Video y presentación"), `docs/14` (línea bajo F5 y sección "Actividades canceladas" renombrada a "Fuera del tablero hasta el final", A5.6 como "Se define al final"; vistas regeneradas), `docs/guion-video-borrador.md` (encabezado) y `AgroVault/Compartido/Resumen.md`.
- **Cambio y motivo:** la entrada "Cancelación de video y presentación y ajustes de revisión de Balam" registró video y presentación como CANCELADAS. La decisión de Mompin es otra: se definen al final, cuando el front esté conforme, fuera del tablero y sin asignar. Siguen sin contar en el reparto ni en los porcentajes. La entrada anterior se conserva como historial.
- **Decisiones afectadas:** "Video y presentación" (13), A5.6.

### 2026-11-14 — IMERG desde 1998-01-01 y cita exacta de NDVI (Eduardo, buzón de Mompin y Mafer)

- **Archivos:** `api/app/clientes/power.py` (`INICIO_IMERG`), `api/tests/test_clima.py`, `api/app/clientes/planetary.py` (cita), `api/app/ndvi.py`, `api/tests/test_ndvi.py`, `api/tests/test_contratos_api.py`, `datos/demo/respuestas/ndvi.json` (solo el campo `cita`), `AgroVault/Compartido/APIs.md`, `api/README.md`, `docs/04`, `docs/13` (filas nuevas y V-25).
- **Cambio:** la API recorta IMERG a 1998-01-01, no a 1998-06-01 ni a 2000-06-01. Una llamada a POWER (`time-standard=UTC`, parcela demo) dio último `-999` el 1997-12-31 y primer valor el 1998-01-01 (0.0), igual que CMR y que la medición de Mafer. Los 0.0 del 25 al 31 de mayo de 1998 se documentan como lluvia cero: la prueba pide esa fecha sin recortar y `parsear_imerg` conserva el 0. La demo desde 2005 no cambia. `APIs.md` (~línea 152) deja de decir 2000-06-01 y 1998-06-01.
- **NDVI:** se aplica la decisión de Mompin. Cita exacta de Didan (2021), doi:10.5067/MODIS/MOD13Q1.061, más "Datos servidos por Microsoft Planetary Computer." El token SAS y las URL firmadas no se guardan. La caché y el paquete son el respaldo que usa la demo; ORNL no se llama en vivo. `[VERIFICAR]` V-25: una persona lee https://planetarycomputer.microsoft.com/terms antes de la entrega final.
- **No se tocó:** `contratos/` (la descripción de `ndvi.schema.json` sigue en ORNL y doi:10.3334/ORNLDAAC/1600; la calidad del píxel ya está en 0.12.0 y el paquete es 0.12.1), `openlandmap.py` (el DOI de la colección STAC 10.5281/zenodo.15528399 no es el de las capas 2020-2022 que cita el código; no se "corrigió"), `features/imerg/LEEME.md` (sigue hablando del recorte al 1998-06-01; es de Mompin), archivos de Balam.
- **Fuente / evidencia:** llamadas a POWER el 14/11/2026, parcela 18.03, -95.53, `time-standard=UTC`: 1997-12-28 a 1998-01-05 (último `-999` el 1997-12-31, primer valor 0.0 el 1998-01-01) y 1998-05-25 a 1998-05-31 (los siete días en 0.0). `pytest` en `api/`: 121 pruebas.
- **Decisiones afectadas:** inicio de IMERG y NDVI por Planetary Computer, registradas en 13. El PR con las cuatro verificaciones en verde no se abrió: no hay commit ni push en esta sesión.

### 2026-11-14 — A4.11 cerrado con Planetary Computer; la API declara contratos 0.12.1 (Eduardo)

- **Archivos:** `api/app/clientes/planetary.py`, `api/app/ndvi.py`, `api/app/rutas/ndvi.py`, `api/app/config.py` (`versionContrato` 0.12.1), `api/tests/test_ndvi.py`, `api/tests/test_basico.py`, `datos/demo/respuestas/ndvi.json`, `docs/14` (A4.11 `[HECHO]`; se corrige el `||` que vaciaba el nombre de A4.10 y A4.11), `docs/04`, `api/README.md`, `AgroVault/Compartido/{APIs,Codigo,Contratos,Pendientes,Resumen}.md`.
- **Cambio:** ORNL DAAC no sirve la serie. `GET /api/ndvi` lee MOD13Q1 V061 en Microsoft Planetary Computer, con caché, calidad (pixel reliability) y el paquete de demo. `/health` deja de anunciar 0.10.0. La cita quedó después en el texto exacto de Didan (2021); ver la entrada de arriba.
- **Pedido a Mompin (no se editó `contratos/`):** la descripción de `ndvi.schema.json` sigue diciendo ORNL DAAC y doi:10.3334/ORNLDAAC/1600. El schema no obliga ese DOI; conviene alinearlo con la fuente real.
- **Fuente / evidencia:** pruebas de `api/tests/test_ndvi.py` con respuestas guardadas y validación cruzada de 4 fechas; `datos/demo/respuestas/ndvi.json`.
- **Decisiones afectadas:** ninguna en esta entrada. A4.8 sigue `[EN CURSO]` (falta `EARTHDATA_TOKEN` en el droplet y la interfaz). A4.12 sigue después de C5. A4.13 sigue pendiente.

### 2026-11-14 — Lluvia del día en la escena con datos reales (Mompin)

- **Archivos:** `web/src/escena/lluvia.ts` (nuevo), `render/escena-three.ts`, `EscenaParcela.tsx` (prop `serieBalance`), `escena.css`, `vista-previa.tsx`, prueba `lluvia.test.ts`; `docs/06`, `docs/14` (nota en A5.1), `INTEGRACION.md`.
- **Cambio:** lluvia animada proporcional a los mm del día, tomados de la serie del motor (`serieBalance.lluviaMm`). La escena no inventa ni recalcula nada. Hay un indicador fijo con mm, clase, día real del clima y fuente. Sin dato: sin lluvia y `NO_EVALUABLE`. Con reducir movimiento solo queda el indicador. Cortes `[PROPUESTA]`.
- **Fuente / evidencia:** prueba contra la serie real del motor con el paquete de demo; headless: 43.8 mm el 2024-06-16 (igual a `serie-clima.json`), 1 576 gotas y unos 31 cuadros por segundo; día seco y reducir movimiento: 0 gotas y 0 cuadros en reposo; 400 px sin desborde; cero errores.

### 2026-11-14 — A5.1 animaciones de la escena y lugar de la mascota (Mompin, con Mafer)

- **Archivos:** `web/src/escena/animacion.ts` (nuevo), `render/escena-three.ts`, `EscenaParcela.tsx` (control "Viento leve", prop `mascota`), `voxel/fuente-modelos.ts` (también `modelos/props/`), prueba `animacion.test.ts`; `docs/06`, `docs/14` (A5.1 pasa a Mompin, con Mafer).
- **Cambio:** transición suave al cambiar de etapa, escala continua al crecer y viento leve opcional (shader). Con reducir movimiento no hay ninguna animación. Las animaciones no se acumulan y la escena sigue dibujando bajo demanda. La cámara se conserva al cambiar fecha o escenario. Mascota fuera de la parcela, si existe el modelo.
- **Fuente / evidencia:** headless: unos 12 cuadros en la transición y luego cero; 0 cuadros en reposo sin viento, unos 36 por segundo con viento; con reducir movimiento, 0 transiciones, sin viento ni inercia. Mafer revisa que respete reducir movimiento.

### 2026-11-14 — A4.1, parte del motor: series del balance de agua para el dashboard (Mompin, rama `Mompin-motor`)

- **Archivos:** `web/src/motor/series.ts` (nuevo), `motor.ts` (cada ciclo guarda su lluvia y ET0 diarias), `protocolo.ts` y `cliente.ts` (operación `serieBalance`), `tipos.ts` (tipo local con la forma propuesta), `index.ts`; prueba `series.test.ts`; regresión; `docs/05` y `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** a pedido de balam, el Worker entrega, bajo demanda y por rotación y escenario, las series diarias (en columnas) y mensuales de lluvia, ET0, ETc, ETc ajustada, agotamiento, RAW, humedad (fracción de TAW), percolación y déficit de cada ciclo, con unidades, fechas (del plan y del clima), estado y fuente. Contrato `serie-balance` 0.11.0 (sesión de contratos): el motor usa el tipo generado, recorta a ≥ 0 el ruido de redondeo y valida sus salidas contra el schema y el chequeo de largos de `contratos/validar.mjs`. Las sumas cuadran con los pilares.
- **Regresión:** el ranking y las tarjetas de referencia pasan al conjunto por defecto de la demo `[DECIDIDO]`, R1, R2 y R4 (R4, R2, R1, con los cuatro pilares); R1 a R4 queda como caso adicional. Se suman las series mensuales de R4 en el año seco. Los números de antes no cambian; solo cambia el texto de las tarjetas por el conjunto comparado.
- **Fuente / evidencia:** `cd web && npm test` (316 pruebas).

### 2026-11-14 — Avisos de datos en la escena (Mompin, pedido de Eduardo)

- **Archivos:** `web/src/escena/avisos-datos.ts` y `AvisosDatos.tsx` (nuevos), `EscenaParcela.tsx` (prop `avisosDatos`), `escena.css`, `vista-previa.tsx`, `escena.html`, prueba `avisos-datos.test.ts`; `docs/06`, `INTEGRACION.md`.
- **Cambio:** franja plegable con los avisos de `usarDatosParcela` y del terreno: clima de respaldo, suelo `SUPUESTO`, relieve interpolado y próxima temporada no disponible. Los avisos del terreno ya no se repiten en la lista general de la escena.
- **Fuente / evidencia:** prueba con los códigos reales de la API; vista previa con los avisos del paquete de demo, a 400 px sin desborde.

### 2026-11-14 — A3.8: ficha por celda en la escena (Mompin, con balam)

- **Archivos:** `web/src/escena/ficha.ts` (nuevo), `EscenaParcela.tsx`, `render/escena-three.ts`, `escena.css`, prueba `ficha.test.ts`; `docs/06`, `docs/14` (A3.8 pasa del tablero de balam al de Mompin, con balam).
- **Cambio:** ficha con los valores del motor y de la parcela, con unidades y `NO_EVALUABLE` explicado. Se abre con clic, toque, lista de celdas, botones N/O/E/S o teclado (Enter y Escape). Con ratón hay además un globo al pasar el cursor. Marco fijo en la celda elegida. Banderín para "cultivo no recomendado en el lugar", que antes solo salía en texto. Los colores de `escena.css` pasan a variables para adaptar después el modo oscuro.
- **Fuente / evidencia:** 184 pruebas de escena; headless en el Laboratorio con calabaza (no registrada en Isla): clic, globo, teclado, lista y cambio de fecha; 400 px sin desborde; cero errores de consola.

### 2026-11-14 — Placa de estado más chica en la escena `[DECIDIDO]` (Mompin)

- **Archivos:** `web/src/escena/render/escena-three.ts`, `docs/06`.
- **Cambio:** la placa pasa de 0.82 a 0.6 del lado de la celda para que se vea la losa de suelo (A2.12) y su humedad. La textura es la misma (contraste WCAG y mínimos de `daltonismo.ts`).
- **Decisiones afectadas:** decidido por Mompin el 14/11.

### 2026-11-14 — A4.3: tarjetas de rotación, parte lógica (Mompin, rama `Mompin-motor`)

- **Archivos:** `web/src/motor/tarjetas.ts` (nuevo), `protocolo.ts` (`rankear` devuelve las rotaciones con su tarjeta), `index.ts`; pruebas `tarjetas.test.ts` y la regresión (`regresion/demo-isla.json` suma el ranking R1 a R4 y las tarjetas de R4 y R2; los números anteriores no cambian); `docs/05` (paso 8), `docs/13`, `docs/14` (vistas regeneradas) y `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** plantilla sin LLM que llena `explicacion` de `resultado-rotacion` (no hizo falta un contrato nuevo): por qué, evidencia con fuente por cifra, beneficios medidos, huecos y riesgos, en español para un agricultor. Nada sin número o fuente: no se habla de plagas, nitrógeno, rendimiento ni precios, y una rotación `NO_EVALUABLE` solo dice su motivo.
- **Decisión `[DECIDIDO]` (Mompin):** la demo compara R1 a R4 con R4 (milpa en ventana de INIFAP) como sugerida; con el suelo real el ranking la pone primera por sí solo (arrepentimiento 0).
- **Fuente / evidencia:** `cd web && npm test` (303 pruebas).

### 2026-11-14 — Losas de suelo de A2.12 en la escena (Mompin, rama `Mompin-escena`)

- **Archivos:** `web/src/escena/suelo.ts`, `adaptador.ts`, `modelo.ts`, `render/escena-three.ts`, `voxel/fuente-modelos.ts`, `EscenaParcela.tsx` (nueva prop `suelo`), `vista-previa.tsx`, prueba `suelo-escena.test.ts`; `docs/06`, `INTEGRACION.md`.
- **Cambio:** la escena carga las 9 losas de Mafer (`modelos/suelos/`) y pinta la columna con el tono del tipo de suelo. La losa sale de `textura.grupo` del contrato `suelo` y de la `humedad` del motor, con cortes en tercios de TAW `[PROPUESTA]`. Si falta el tipo o la humedad no hay losa, y sin humedad la columna va en gris.
- **Fuente / evidencia:** tonos tomados de `modelos/paleta.md` (verificado en prueba); 159 pruebas de escena; headless con el motor real: suelo del mapa de Isla (arcilloso) y selector manual (franco).

### 2026-11-14 — Video y presentación fuera del cronograma (Mompin)

- **Archivos:** `docs/14` (sin A5.6; A5.9 solo envío y sin depender de A5.6; C6, A0.5, área R4 y camino crítico sin video ni pitch; tablero de Mafer; vistas regeneradas), `docs/13` (fila "Video y presentación" `[DECIDIDO]`; V-24 sin dueño), `AgroVault/Compartido/Pendientes.md`, `AgroVault/Compartido/Resumen.md`, `AgroVault/Compartido/Codigo.md` y `docs/guion-video-borrador.md` (aviso de borrador).
- **Cambio y motivo:** el equipo veía el video y la presentación como pendientes y eso confundía los roles. Se definen al final, cuando el front esté conforme, y no se asignan ahora.
- **Decisiones afectadas:** A5.6 (eliminada), A5.9, compuerta C6, V-24.

### 2026-11-14 — Calendario y aptitud fuera de México: GGCMI fase 3 y GAEZ v4 (Mompin, sesión features)

- **Archivos:** `docs/13` (fila "Calendario y aptitud fuera de México" `[DECIDIDO]`), `docs/11` (tabla de recursos y riesgo del calendario), `docs/14` (A4.13 y tablero de Eduardo; vistas regeneradas).
- **Decisión (Mompin):** GGCMI fase 3 (CC BY 4.0, 0.5°) es el respaldo del calendario de siembra fuera de México, a cargo de Eduardo después de C4 (A4.13). GAEZ v4 entra solo como evidencia por su licencia CC BY-NC-SA 4.0 (no comercial).
- **Fuente / evidencia:** investigación del 14/11 (sesión features). GAEZ: servicio `gaez-services.fao.org/server/rest/services/res05` probado por punto y licencia leída en el catálogo de FAO (`data.apps.fao.org`). GGCMI fase 3: doi:10.5281/zenodo.5062513. GEOGLAM, SAGE y FAO Crop Calendar se evaluaron y quedaron como alternativas (11).
- **Decisiones afectadas:** "Alcance geográfico" (13); pilar de compatibilidad fuera de México; calabaza y chile `NO_EVALUABLE` fuera de México.

### 2026-11-14 — Alcance mundial, recursos del reto evaluados e IMERG vía POWER (Mompin, sesión features)

- **Archivos:** `docs/13` (fila "Alcance geográfico" `[DECIDIDO]`), `docs/11` (recursos del reto evaluados y tres riesgos), `docs/14` (A1.7, A4.10, A4.11, A4.12; plan de recorte; tablero), `docs/04` (filas de GPM IMERG y MODIS), `docs/03` (extra de fase 2), `AgroVault/Compartido/APIs.md`; prototipo en `features/imerg/` y encargo en `features/encargos/eduardo-datos-globales.md`.
- **Decisión (Mompin):** arquitectura mundial con fuentes globales y demo validada en Isla; las fuentes de cada país se suman encima. Los recursos del reto que solo cubren EE. UU. pasan a extra de fase 2 (A4.12, Eduardo). IMERG vía POWER (A4.10) y NDVI de MODIS (A4.11) para Eduardo; contratos para el alcance mundial (A1.7) para Mompin.
- **Hallazgo:** NASA POWER entrega GPM IMERG (`IMERG_PRECTOT`, 0.1°) sin cuenta Earthdata si se pide con `time-standard=UTC`; en hora local responde `-999`. Con 20 años agrícolas en Isla, IMERG tiene máximos diarios de hasta 241.5 mm (`PRECTOTCORR`: 125.4 mm como máximo) y correlación mensual de 0.923, pero elegiría otros años de escenario (2019, 2024 y 2017). No se cambia la fuente de los escenarios; queda como riesgo en 11.
- **Fuente / evidencia:** `python3 features/imerg/comparar_imerg.py` (respuesta cruda de POWER guardada, consultada el 14/11/2026) y `python3 -m unittest discover -s features/imerg`.
- **Decisiones afectadas:** 05 paso 1 (sin cambio, riesgo declarado), A4.8 (IMERG vía POWER es la ruta barata), V-09 y calendario fuera de México (`NO_EVALUABLE`).

### 2026-11-14 — Escena con la cuadrícula de balam (A2.9) y revisión de A3.3/A2.11 (Mompin, rama `Mompin-escena`)

- **Archivos:** `web/src/escena/adaptador.ts`, `placa.ts`, `demo-motor.ts`, `vista-previa.tsx`, `INTEGRACION.md`, pruebas `cuadricula-balam.test.ts` y `estados.test.ts`; `docs/06`.
- **Cambio:** la escena orienta filas y columnas con los `centro` de las celdas: la cuadrícula de balam numera `i` desde el sur y el ejemplo de contratos desde el norte, y sin esto el relieve salía invertido norte-sur respecto al mapa. Las placas de estado llevan borde doble negro y blanco: con humedad media del suelo, Normal, Marchita y Podrida bajaban a 2.1-2.6:1 frente al suelo, por debajo del 3:1 de WCAG 1.4.11.
- **Fuente / evidencia:** pruebas de integración con `generarCuadricula` (contrato, tope, huecos, orientación); en la vista previa en headless, polígono en L con 559 celdas, elevación de la API local con el paquete de demo y motor real.

### 2026-11-14 — A5.5: pruebas de regresión del motor y de contratos (Mompin)

- **Archivos:** `web/src/motor/pruebas/regresion.test.ts` y `web/src/motor/pruebas/regresion/demo-isla.json` (referencia); `docs/05`, `docs/14` (vistas regeneradas) y `AgroVault/Compartido/Pendientes.md`.
- **Qué fija:** con el paquete de demo y el suelo real de Isla:
  - escenarios seco 2023, habitual 2016 y lluvioso 2024, con su lluvia de temporadas y sus percentiles;
  - pilares de la milpa por escenario: déficit, exceso, compatibilidad y suelo desnudo;
  - estados y `filtroClima` de las rotaciones R1 a R4;
  - un registro de `resultado-celda`;
  - ranking de tres rotaciones (R1, R3, R2) y con cuatro pilares (R4, R2, R1), con su arrepentimiento;
  - años análogos de la próxima temporada (2006, 2008, 2013, 2019, 2022, 2025) y su rango.
- **Guardas de contrato:** `VERSION_CONTRATO` del motor = versión de `contratos/`; el plan de ejemplo de `contratos/` pasa por el motor y todas las salidas validan contra los schemas.
- **Cómo cambiar un número a propósito:** `ACTUALIZAR_REGRESION=1 npx vitest run src/motor/pruebas/regresion.test.ts`, revisar el diff de `demo-isla.json` y anotarlo aquí en el mismo commit. Se comprobó que la prueba falla si cambia, por ejemplo, el año habitual.
- **Fuente / evidencia:** `cd web && npm test` (224 pruebas).

### 2026-11-14 — A3.7: pilares de compatibilidad de ciclo y protección del suelo (Mompin)

- **Archivos:** `web/src/motor/pilares.ts` (nuevo), `temporadas.ts` (nuevo: `siembraEnEscenario` sale de `motor.ts`), `motor.ts`, `ranking.ts`; pruebas `c2.test.ts` y `ranking.test.ts`; `docs/05`, `docs/13`, `docs/14` (vistas regeneradas) y `AgroVault`.
- **Compatibilidad de ciclo:** cuenta las siembras fuera de la ventana del calendario local de Isla (INIFAP; A0.6). Si alguna siembra no tiene ventana con fuente (frijol PV, chile, calabaza), el pilar es `NO_EVALUABLE` con motivo; sin calendario, también. `filtroClima` queda lleno. Subpuntaje del ranking: fracción de siembras en ventana.
- **Protección del suelo:** cuenta los días de suelo desnudo del año agrícola de SIAP. El índice de erosión queda en `null` porque RUSLE necesita I30 y factores C y LS con fuente, que no hay; no se inventan. Subpuntaje: fracción del año con cultivo. Riesgo por calor: el cálculo está listo, pero sigue `NO_EVALUABLE` sin umbral con fuente en el catálogo.
- **Cómo cambia el ranking (suelo real de Isla):** antes, con déficit y exceso, el orden era maíz-maíz, milpa, frijol-frijol. Con la protección del suelo (la compatibilidad queda fuera por el frijol PV) es milpa (0), frijol-frijol (0.047), maíz-maíz (0.091): pesan los 257 días de suelo desnudo del monocultivo. Con una milpa sembrada dentro de las ventanas de INIFAP entran los cuatro pilares: milpa en ventana (0), maíz-maíz (0.077), milpa con el frijol fuera de ventana (0.099). El orden no cambia con la sensibilidad del TAW (122.3 a 127.4 mm/m).
- **Fuente / evidencia:** `cd web && npm test` (159 pruebas).

### 2026-11-14 — A2.13: escenario de próxima temporada con años análogos y contratos 0.9.0 en el motor (Mompin)

- **Archivos:** `web/src/motor/analogos.ts` (nuevo), `motor.ts` (`preparar`, `pilaresAguaEnClima`, entrada opcional `proximaTemporada`), `proxima.ts`, `protocolo.ts`, `index.ts`, `tipos.ts` (`VERSION_CONTRATO` 0.9.0); prueba `analogos.test.ts`; `docs/05`, `docs/13`, `docs/14` (vistas regeneradas) y `AgroVault`. Se integra la rama `contratos-nulos` (0.9.0).
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** escenario "próxima temporada" con años análogos reales. Son los años agrícolas cuya lluvia mensual cae dentro de la banda p10-p90 en todos los meses del horizonte; si ninguno, los que caen en más meses, declarado. Solo se simulan los ciclos sembrados dentro del horizonte. Va en `resultado-rotacion.proximaTemporada` (contratos 0.8.0): `EXPLORATORIO`, `esPrediccion: false`, rango mínimo-máximo sin cifra única, fuera del ranking, con el aviso "años parecidos a lo que se espera, no es predicción".
- **Con el paquete de demo** (noviembre de 2026 a abril de 2027, suelo real de Isla, milpa): años análogos 2006, 2008, 2013, 2019, 2022 y 2025; solo se evalúa el frijol OI. Demanda sin cubrir de 0 a 10.6 %, fracción percolada de 0.09 a 0.54.
- **Sin capa no se emite el bloque:** sin fecha de emisión ni horizonte, cualquier fecha sería inventada. Queda la advertencia `PROXIMA_TEMPORADA_NO_DISPONIBLE`.
- **Contratos 0.9.0:** los pilares no evaluables del motor ya llevaban los indicadores en `null` y su motivo; todas las salidas validan contra 0.9.0.
- **Fuente / evidencia:** `cd web && npm test` (157 pruebas).

### 2026-11-14 — Motor con el suelo real de Isla y desempate del p50 al año más reciente (Mompin)

- **Archivos:** `web/src/motor/escenarios.ts` (desempate), pruebas `escenarios.test.ts`, `motor.test.ts` y `c2.test.ts`; `docs/05`, `docs/13`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`. Se integra `origin/Eduardo` (A2.15 OpenLandMap, A2.16 en `/api/suelo` y paquete de demo regenerado).
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** si dos años quedan a la misma distancia del percentil, gana el **más reciente** (antes, el más antiguo). Se sigue declarando el segundo más cercano. Con la serie del paquete de demo (20 años) el p50 empata siempre entre los dos años centrales: el habitual pasa de **2008 a 2016**. Seco 2023 y lluvioso 2024 no cambian.
- **Suelo real de Isla en la evidencia de C2:** `datos/demo/respuestas/suelo.json` trae TAW 122.3 mm/m y retención por Saxton y Rawls (θsat 0.454, θFC 0.293, θWP 0.171). La rotación pasa a `EVALUABLE` en los tres escenarios y cada ciclo arranca con la humedad de POWER (GWETROOT convertida; advertencia `CONDICION_INICIAL_GWETROOT`) en lugar del supuesto de capacidad de campo. Milpa en el seco (2023): 2.4 % de la demanda sin cubrir, 46 días, 25.3 mm de déficit y 1 052.8 mm de exceso (coincide con lo que reportó Eduardo). Un suelo sin TAW sigue dando `NO_EVALUABLE`.
- **Ranking B con el suelo real:** 1.º maíz-maíz (arrepentimiento máximo 0.0065), 2.º milpa (0.013), 3.º frijol-frijol (0.060); para las tres el peor escenario es el lluvioso (2024). Con el selector franco y el arranque a capacidad de campo el frijol iba primero: el orden depende del suelo y de la condición inicial.
- **Fuente / evidencia:** `cd web && npm test` (145 pruebas; la de escena `demo-motor.test.ts` la ajusta su sesión, porque suponía el TAW de Isla en `NO_EVALUABLE`).

### 2026-11-14 — A3.1 y A3.2: escena 3D con relieve y cargador de `.bbmodel` (Mompin, rama `Mompin-escena`)

- **Archivos:** `web/src/escena/` (nuevo), `web/escena.html`, `web/package.json` (three 0.187.0, @types/three 0.187.0, vitest 5.1.0), `docs/06`, `docs/07`, `docs/14`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** escena 3D en Three.js sin React Three Fiber `[DECIDIDO]` (Mompin): relieve por bloque desde `elevacionM`, un `InstancedMesh` por tipo, placas de estado con color + patrón + icono (base de A3.3), suelo según la humedad del motor, plantas desde los `.bbmodel` de Mafer. Lo que falta se muestra como `NO_EVALUABLE` o "Sin resultado", nunca como cero. Exageración vertical ×10 por defecto `[PROPUESTA]`.
- **Fuente / evidencia:** 76 pruebas en `web/src/escena/pruebas/`, incluida la escena con el motor real y el paquete de demo (con el suelo del mapa todo `NO_EVALUABLE`; con el selector manual, el maíz con sus modelos). Vista previa revisada en Chrome headless (perfil temporal): relieve, modelos, selección por clic y caso `NO_EVALUABLE`.
- **Pendiente:** montarla en Laboratorio (balam, propuesta en `web/src/escena/INTEGRACION.md`), una línea `server.fs.allow` en `web/vite.config.ts` para ver los modelos en `npm run dev`, modelos de frijol y calabaza (A2.11) y el ajuste fino de estados (A3.3, Mafer).

### 2026-11-14 — Pilar de exceso de agua en el ranking B y capa de próxima temporada en el motor (Mompin)

- **Archivos:** `web/src/motor/` (`balance.ts`, `motor.ts`, `ranking.ts`, `tipos.ts`, `proxima.ts` nuevo, `protocolo.ts`, `cliente.ts`, `index.ts`; pruebas `ranking.test.ts`, `c2.test.ts`, `proxima.test.ts`), `docs/05`, `docs/13`, `docs/14` (con las vistas de `herramientas/cronograma.py` regeneradas), `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **Decisión `[DECIDIDO]` (Mompin, 14/11):** el exceso de agua entra como pilar del ranking B. El motor emite `excesoHidrico` (contratos 0.7.0) con `excesoTotalMm`, `diasExceso` y `fraccionLluviaPercolada` (percolación de FAO-56 ec. 88 entre la lluvia de los días de ciclo). Subpuntaje = 1 − fracción percolada; la normalización queda `SUPUESTO` porque no hay un umbral publicado de encharcamiento por cultivo (FAO-56 no lo trae y EcoCrop solo da clases de drenaje), y no se inventan umbrales por cultivo. Peso igual que los demás pilares (`SUPUESTO`), salvo que el usuario dé el suyo.
- **Efecto:** con déficit y exceso hay dos pilares con número y el ranking pasa del respaldo A al criterio B. Con el paquete de demo (suelo franco del selector): 1.º frijol-frijol (arrepentimiento máximo 0.007), 2.º milpa (0.051), 3.º maíz-maíz (0.064); para las tres el peor escenario es el lluvioso (2024). Con A el orden era el inverso.
- **A2.13, parte del motor:** `vistaProximaTemporada` valida la banda (`esPrediccion: false`, 6 meses, sin cifra única ni bandas invertidas; si falla, `NO_EVALUABLE`) y la compara mes a mes con la lluvia real del mismo mes en los años de los tres escenarios. No suma bandas ni genera días a partir de ellas. Con el paquete de demo el habitual cae dentro de la banda en 6 de 6 meses y el seco y el lluvioso en 5 de 6. El escenario "próxima temporada" con años análogos queda propuesto, sin implementar.
- **Fuente / evidencia:** 67 pruebas en verde (`cd web && npm test`), salidas validadas contra contratos 0.7.0.

### 2026-11-14 — Modelos ligeros de bloque: los dos primeros, de maíz (Mafer)

- **Archivos:** nuevos `modelos/cultivos/bloques/` (`bloques.py`, `maiz_siembra_bloque.bbmodel`, `maiz_madurez_bloque.bbmodel` y `visor_bloques.html`) y `web/src/escena/pruebas/bloques.test.ts`. Sin cambios en la paleta ni en modelos existentes.
- **Qué es:** encargo de Mompin (#183, idea de balam): cada bloque de la escena se ve como un manchón de varias plantas y no como una sola. Por rendimiento no se repite el modelo detallado: cada bloque usa un modelo ligero con 12 plantas simplificadas en 3 surcos. **Es una representación visual, no a escala** (el bloque de maíz maduro mide ~12.5 unidades de alto contra ~36 del detallado, a propósito).
- **Criterios (decididos por Mompin, #187):** tope fijo de 55 cubos por bloque, comprobado también en vértices reales con `unirCubos` (36 por cubo, 1980 para el tope), y un lomo bajo por surco, de 1 unidad de alto. **Interpretación mía** de "1 cubo de alto": 1 unidad (el lomo detallado es de 2); si él quería otra cosa, es un parámetro.
- **Resultado:** `maiz_siembra_bloque` 18 cubos (648 vértices) y `maiz_madurez_bloque` 51 cubos (1836 vértices); 12 plantas y 3 lomos cada uno. La variación de altura (±15 %), posición y giro es determinista (regenerar da los mismos bytes, comprobado con md5). Surcos en z = -5.33, 0 y 5.33 y plantas cada 4 unidades, para que los bloques vecinos continúen los surcos.
- **Verificación:** la prueba nueva exige paleta, huella de 16 × 16, base en y = 0, tope de cubos y de vértices, mínimo de 12 cubos y al menos 3 lomos; `cd web && npm test`: 359 pruebas; `tsc` sin errores. Revisado con renders (solo, sobre la losa de suelo, junto al detallado y en una cuadrícula de 3 × 3: se lee como una parcela continua).
- **Pendiente:** los otros 18 modelos (4 cultivos × 5 etapas) y que la escena los conecte. **Riesgo declarado:** si todos los bloques son idénticos, un campo grande puede mostrar un patrón repetido (sobre todo las mazorcas cada 16 unidades); lo más barato es girar cada bloque 180° según la celda, o hacer 2 o 3 variantes con otra semilla (no se hicieron porque la prueba fija los nombres). No se vio dentro de la escena real ni en Blockbench.
- **Decisiones afectadas:** ninguna del equipo; amplía A3.9 (extras de modelado).

### 2026-11-14 — A5.7: correcciones de citas del README, verificadas (Mafer)

- **Archivos:** `README.md`, este registro. A pedido de Mompin (#163), con hallazgos de Eduardo-B. Cada corrección se contrastó con su fuente; **quien contrastó fue una sesión de IA**.
- **(1) IMERG: confirmado, con matiz.** El producto que se usa es el **diario** (`GPM_3IMERGDF` V07, doi:10.5067/GPM/IMERGDF/DAY/07; mismos autores y año; catálogo CMR de NASA), no el semihorario que citaba el README. **La fecha de inicio no coincide con ninguna de las dos que circulaban:** `APIs.md` dice 2000-06-01 y el aviso decía 1998-06-01, pero llamando a la API real de POWER (14/11/2026, parcela demo, `time-standard=utc`) el último día con `-999` es 1997-12-31 y el primero con dato es **1998-01-01**, igual que la cobertura del catálogo CMR. La línea de `AgroVault/Compartido/APIs.md` es de Eduardo y no la edité.
- **(2) OpenLandMap: confirmado.** El registro `15535762` contiene el archivo `..._p84_...` (percentil 84) y el `15535759` contiene `p16` y `m` (mediana); el README ahora cita el segundo. Todos los archivos de Zenodo son de 120 m, y la API lee 30 m del STAC. **El STAC declara `CC-BY-4.0` en las cinco colecciones** (arcilla, arena, limo, pH y carbono orgánico) y es la fuente real de la licencia de lo que se lee. Queda `[VERIFICAR]` qué registro de Zenodo corresponde a cada capa de 30 m.
- **Corrección a mi aviso a Eduardo (#sobre `openlandmap.py`):** dije que el DOI de la constante era un error por citar la arcilla 2000-2005. **No lo es:** es el DOI que el propio STAC declara para la colección (`15528399`), y los cinco DOI del STAC apuntan a registros de 2000-2005 aunque las capas leídas son de 2020-2022. Lo que sí es cierto es esa diferencia de años; la constante es fiel a la fuente.
- **(3) SMAP: confirmado.** Los metadatos del DOI en DataCite dan *O'Neill, P., Chan, S., Njoku, E., Jackson, T., Bindlish, R. y Chaubell, J. (2023), SMAP L3 Radiometer Global Daily 36 km EASE-Grid Soil Moisture, Version 9*. La página de cita recomendada de NSIDC sigue dando 404.
- **(4) Mapas base: agregados, con dos pendientes.** La interfaz usa Esri World Imagery (por defecto) y OpenStreetMap (opción «calles»), ambos con atribución. Esri: licencia *Esri Master License Agreement* y créditos que coinciden con los de la interfaz (leídos del ítem y del servicio de ArcGIS). OSM: ODbL y política de tiles leídas en sus páginas. **Pendiente:** (a) la interfaz muestra «© OpenStreetMap» y la política dice «© OpenStreetMap contributors» (de balam); (b) si el uso directo de los tiles de Esri desde una web que no es de ArcGIS cumple su acuerdo, que no pude leer completo: lo valida una persona.
- **Fuente / evidencia:** catálogo CMR de NASA; DataCite; API de Zenodo; `collection.json` del STAC de OpenLandMap; llamada a POWER; ítem y servicio de ArcGIS Online; `openstreetmap.org/copyright` y `operations.osmfoundation.org/policies/tiles/`.
- **Decisiones afectadas:** A5.7 (sigue en curso: falta revisión humana).

### 2026-11-14 — A5.1: revisión de "reducir movimiento" (Mafer)

- **Archivos:** ninguno de código; solo este registro. La revisión la pidió Mompin al pasar A5.1 a la sesión de la escena.
- **Qué se revisó:** el código (`escena/animacion.ts`, `render/escena-three.ts`, `EscenaParcela.tsx` y todo el CSS) y el comportamiento real en **Chrome** (headless con SwiftShader, conducido por CDP) sobre `web/escena.html`, la vista previa con el motor real y el paquete de demo. 30 comprobaciones; los controles (sin reducir) hacen que la prueba no sea vacía.
- **Resultado: cumple.** (1) Sin reducir, al cambiar de etapa hay transición y termina; con la preferencia del sistema o el checkbox, **no hay transición** ni mallas "saliendo", y las plantas quedan de inmediato en su escala final. (2) Con la preferencia activa **en el arranque** y **en vivo** (incluso a media transición): las transiciones terminan al instante, el viento se apaga y su control se deshabilita, y la escena queda en **0 cuadros** en reposo. (3) **Inercia real:** al arrastrar y soltar, sin reducir la cámara sigue 11.1 unidades; con reducir, 0.00000 (la vista sigue girando mientras se arrastra). (4) **Cambios rápidos:** 8 cambios en 0.3 s, con y sin reducir, no dejan mallas de más, salientes ni transiciones colgadas. (5) El checkbox manual funciona igual que la preferencia, y al desmarcarlo la animación vuelve. (6) La mascota es estática. (7) El CSS no define animaciones propias y las transiciones de botones solo existen bajo `prefers-reduced-motion: no-preference`.
- **Observaciones (no son fallas):** (a) si el sistema quita la preferencia con la escena abierta, el control **no** se desmarca solo (conservador: queda reducido hasta que la persona lo desmarque). (b) Las transiciones CSS de botones fuera de la escena obedecen solo a la preferencia del sistema, no al checkbox, que es de la escena. (c) La duración observada fue de ~500 ms contra los 450 ms nominales: lo explican la carga asíncrona del modelo y el muestreo cada 25 ms, no un fallo.
- **Límites de la prueba:** Chrome headless con render por software, no un navegador interactivo ni un móvil; la demo solo tiene una malla de plantas (un cultivo y una etapa a la vez); se midió el estado interno y la posición de la cámara, no los píxeles; la duración de 450 ms y el lugar de la mascota no se juzgaron (son `[PROPUESTA]`). El script de la prueba está en `herramientas/prueba-movimiento/` (pedido de Mompin, #154): lanza su propio Chrome, necesita Node 22 o más y tiene su README.
- **Decisiones afectadas:** A5.1 (de Mompin, con Mafer): revisión de Mafer hecha.

### 2026-11-14 — A5.7: README con licencias y reglas oficiales verificadas (Mafer)

- **Archivos:** `README.md` (reemplaza al anterior, a partir de `docs/README-borrador.md` de Mompin); nuevo `datos/catalogos/fuentes/LEEME.md`; `docs/02` (un enlace); `docs/14`, Pendientes. El borrador queda como historial.
- **Cambio:** los `[VERIFICAR]` de licencias del borrador se contrastaron con las páginas oficiales, y se agregó la sección de datos NASA que pide el reto, la declaración de IA con las categorías de la guía oficial y la lista de lo no verificado. **Quien leyó las fuentes fue una sesión de IA: falta la revisión humana de licencias y de la declaración de IA.**
- **Correcciones al borrador:** (1) **POWER no declara CC BY 4.0** en su guía de referencia: pide un texto de cita con servicio, versión y fecha (versión observada: v2.10.3); la afirmación de `AgroVault/Compartido/APIs.md` no pude confirmarla. (2) **SMAP, MODIS y IMERG** no se pueden presentar como usados: SMAP está en curso (A4.8) y no está en la demo, MODIS pendiente (A4.11); IMERG sí, vía POWER (A4.10). (3) **OpenLandMap:** el registro de Zenodo que citaba el borrador (15470432) es solo carbono orgánico 2000-2005; las capas que lee la API son de 2020-2022 (todas CC BY 4.0). (4) **Terrarium:** la atribución a Mapzen solo se exige para su servicio alojado; aplican las fuentes del DEM (para México, INEGI Relieve continental 2016). (5) El enlace del reto en `docs/02` estaba roto (404); el correcto no lleva `field-shift-`.
- **Hallazgos para el equipo:** (a) **Reglas de entrega (leídas con Chrome; Python y curl fallan por el certificado):** la demo es un deck de 7 slides o un video de 30 segundos o menos, en inglés (un video hablado en otro idioma lleva subtítulos en inglés); el guion de ~2:55 no cabe como demo. La guía llama «Super Intelligence (SI)» a la IA: permitida, no para idear la solución, sin branding de NASA, marca de agua visible en imágenes y video, y reconocimiento en texto y metadatos para audio, código y datos. La entrega cierra el 15/11 a las 23:59 (hora local del evento). (b) Tres ilustraciones de la interfaz se generaron con IA (`web/src/ui/assets/terreno-prompts.md`) y la guía exige marca de agua visible. (c) `api/app/clientes/openlandmap.py` cita el DOI de la arcilla 2000-2005 aunque lee 2020-2022. (d) El repo no tiene archivo de licencia.
- **Fuente / evidencia:** páginas oficiales leídas el 14/11/2026: POWER (guía de referencia), Earthdata (guía de uso de datos), catálogo CMR de NASA (SMAP SPL3SMP V009, GPM IMERG V07, MOD13Q1 V061), ISRIC, Zenodo (API), Tilezen y el registro de AWS, Open-Meteo, FAO (términos), SIAP, Recocrop (GitHub) y la guía de entrega de Space Apps. Marca `Co-Authored-By` de IA en los commits: varios la llevan y no todos (comprobado con `git log`).
- **Pendiente:** revisión humana de licencias y de la declaración de IA; decidir la licencia del repo y la marca de agua; recortar el guion a la duración oficial; las citas incompletas (NSIDC, versión de IMERG en POWER).
- **Decisiones afectadas:** V-03 y V-04 (reglas leídas, sin cerrar: las confirma una persona); A0.5, A5.6 y A5.7.

### 2026-11-14 — A3.9 (parte mascota): elote con cara feliz (Mafer)

- **Archivos:** nuevos `modelos/props/` (`mascota.py`, `mascota_feliz.bbmodel`, `visor_mascota.html`) y `web/src/escena/pruebas/props.test.ts`; `modelos/paleta.py` y `paleta.md` (1 color, índice 85); los 29 `.bbmodel` de plantas y suelos (solo cambia la textura incrustada); `docs/07`, Pendientes.
- **Cambio:** la mascota básica del doc 03 ("verdura con cara feliz") como un elote con cara feliz, de 66 cubos. **La verdura la eligió A3.9, no el equipo**: los docs no la fijan. Va en `modelos/props/` porque no es una planta ni va en una celda.
- **Props:** pozo, casa, árboles y pájaro **no se hacen**; son extras de fase 2 y de lo primero que cae en el plan de recorte. Mompin está de acuerdo (mensaje #112).
- **Verificación:** los 29 modelos existentes se compararon con `HEAD`: solo cambia `textures`. `cd web && npm test`: 292 pruebas (4 nuevas); `tsc` sin errores. Render con Chrome headless; la cara se lee feliz de frente, de 3/4 y a 64 px de alto.
- **Pendiente:** la escena aún no la muestra (Mompin reservará un lugar opcional). Una persona debe abrir `visor_mascota.html` y decidir si la verdura y la cara convencen. Colores y formas a ojo.
- **Decisiones afectadas:** A3.9 (chile y mascota hechos; props descartados).

### 2026-11-14 — A3.9 (parte chile): cuarto cultivo en catalogo y en voxel (Mafer)

- **Archivos:** `datos/catalogos/` (`generar.py`, `cultivos.json`, `validar.mjs`, `README.md`); nuevos `modelos/cultivos/chile.py`, 5 `chile_*.bbmodel` y `visor_chile.html`; `visor_milpa.html` (ahora 20 modelos); `modelos/paleta.py` y `paleta.md` (7 colores, indices 78 a 84); los 24 `.bbmodel` de plantas y suelos (solo cambia la textura incrustada); `web/src/motor/pruebas/motor.test.ts` y `ranking.test.ts` (una linea cada una); `docs/14`, Pendientes.
- **Cambio:** el chile entra al catalogo con ciclo y etapas (FAO-56 Tabla 11), Kc (Tabla 12), raiz y p (Tabla 22) y temperaturas y lluvia anual (EcoCrop), cada valor con su fuente. Sus 5 etapas en voxel (siembra, brote, crecimiento, madurez, podrida).
- **Equivalencia, para revisar:** FAO-56 y EcoCrop no traen "chile verde"; todos los parametros salen del **pimiento dulce** (*Capsicum annuum*, la misma especie). No son datos medidos en chile serrano o jalapeno. `Hot pepper` de EcoCrop es otra especie (*C. frutescens*) y no se uso. La etapa inicial de Tabla 11 se imprime `25/30` y el total 125 solo cuadra con 30.
- **Pruebas de Mompin tocadas:** usaban `chile` como ejemplo de cultivo que no esta en el catalogo (Prueba 5 del motor y la rotacion R5 del ranking). Al tener parametros dejo de serlo y fallaban 5 pruebas; se cambia el id por `cultivo_sin_parametros`, que restablece exactamente lo que probaban. Segun la regla de `main` en verde, el arreglo va en el mismo cambio y se avisa al dueno.
- **Fuera de esta entrega:** la mascota y los props (pozo, casa, arboles, pajaro) de A3.9 son extras de fase 1 y 2 y no se hicieron. La lista de cultivos de la interfaz (`web/src/ui/demo.ts`) todavia no incluye el chile.
- **Fuente / evidencia:** FAO-56 (Allen et al. 1998), Tablas 11, 12 y 22 (HTML original); EcoCrop (copia de Recocrop, fila `Sweet pepper`). `cd web && npm test`: 278 pruebas; `tsc` sin errores; catalogos y contratos en verde. Los 24 modelos regenerados se compararon con `HEAD`: solo cambia `textures`.
- **Pendiente:** una persona debe revisar la equivalencia del chile y abrir `visor_chile.html`. Colores y formas a ojo.
- **Decisiones afectadas:** A3.9 (parcial).

### 2026-11-14 — A2.12: losas de suelo por tipo y humedad; visor corregido (Mafer)

- **Archivos:** nuevos `modelos/suelos/` (`suelos.py`, 9 `.bbmodel` y `visor_suelos.html`) y `web/src/escena/pruebas/suelos.test.ts`; `modelos/paleta.py` y `paleta.md` (18 colores nuevos, índices 60 a 77); los 15 `.bbmodel` de `modelos/cultivos/` (solo cambia la textura incrustada); `herramientas/voxelkit.py` (plantilla del visor); `docs/07`, `docs/14`, Pendientes.
- **Cambio:** 9 losas (arenoso, franco, arcilloso × seco, medio, húmedo) para ponerse encima de la columna de suelo de la escena. Se hacen losas y no bloques porque la columna se estira con el relieve y un bloque voxel se deformaría; ver `docs/07`. El franco usa solo colores que ya existían para coincidir con la columna.
- **Visor (pedido de Mompin, #69):** la vista "todos" pasa de una fila diagonal a una cuadrícula por familia y encuadra la esfera envolvente del conjunto (antes `calabaza_podrida` quedaba casi fuera de cuadro); el plano del visor baja a y = −0.14 (tapaba el cuerpo de las losas y parpadeaba); aviso si no llega a cargar. **No se reprodujo el "visor en blanco" con `file://`**: en Chrome se ve completo; la causa en el equipo de Mompin no se conoce (conexión, otro navegador). Se documentó cómo servirlo en local.
- **Verificación:** `cd web && npm test`: 231 pruebas (19 nuevas: 9 losas × paleta y medidas); `tsc` sin errores. Los 15 `.bbmodel` de plantas se compararon con `HEAD`: solo cambia `textures`; los `elements` son idénticos. Capturas en Chrome headless de los visores de milpa y suelos.
- **Pendiente:** la escena no carga todavía las losas ni pinta la columna por tipo de suelo. Colores a ojo. Falta que una persona abra `visor_suelos.html`.
- **Decisiones afectadas:** A2.12 (en revisión).

### 2026-11-14 — A3.3: estados visuales legibles con daltonismo; A2.11: frijol y calabaza (Mafer)

- **Archivos:** `web/src/escena/estilos-estado.ts`, `patrones.ts`, `EscenaParcela.tsx` (una línea), nuevos `daltonismo.ts` y `pruebas/daltonismo.test.ts`; `modelos/` (frijol, calabaza, paleta y los 5 `.bbmodel` del maíz); `docs/06`, `docs/14`, `AgroVault/Compartido/Pendientes.md`. Los archivos de `escena/` son de Mompin, que dejó escrito que A3.3 los ajusta ahí.
- **A3.3, cambio:** simulación de daltonismo con la fuente publicada (Machado et al. 2009) y pruebas con mínimos de color, íconos y patrones. Solo se cambia un color: `NO_EVALUABLE` (y "sin elevación", que lo repite) de `#9a9a9a` a `#ececec`. Íconos finales: gota partida, hoja colgando, equis (reemplaza a "moho", que no se entendía en 8 × 8) y surcos. La leyenda deja de leerse dos veces en lectores de pantalla.
- **A3.3, hallazgo:** con los colores provisionales, bajo deuteranopia `podrida` y `NO_EVALUABLE` casi se confundían (dE 7.1) y `NO_EVALUABLE` con `normal` (12): confundir "sin dato" con "normal" es justo lo que el proyecto no debe permitir. Los umbrales (dE 15; 16 y 48 píxeles) son del equipo `[PROPUESTA]`, no de la fuente.
- **A2.11, cambio:** `frijol` y `calabaza` con las 5 etapas del maíz (siembra, brote, crecimiento, madurez, podrida) y paleta de 60 colores (16 nuevos al final, índices 44 a 59); visores `visor_frijol.html`, `visor_calabaza.html` y `visor_milpa.html`. `estresada` y `marchita` no tienen modelo propio: la escena usa el de su etapa más la placa de estado.
- **Corrección:** la prueba de Mompin que compara la paleta incrustada con `modelos/paleta.md` falló para el maíz, porque el agente de modelado había revertido los `.bbmodel` del maíz para que git no los marcara. Se regeneran con `python modelos/cultivos/maiz.py`: solo cambia la textura incrustada (ahora con los 60 colores) y las piezas son idénticas.
- **Fuente / evidencia:** Machado, G. M., Oliveira, M. M. y Fernandes, L. A. F. (2009), IEEE TVCG 15(6): 1291-1298 (matrices de https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html; cada fila suma 1, comprobado en pruebas). `cd web && npm test`: 189 pruebas; `tsc` y `npm run build` sin errores.
- **Pendiente:** los modelos de frijol y calabaza se revisaron con renders propios del agente, no en Three.js ni en Blockbench; falta que una persona abra `visor_milpa.html`. Los colores de los modelos son a ojo.
- **Decisiones afectadas:** A2.11 y A3.3 (en revisión).

### 2026-11-14 — A2.16: pedotransferencia de Saxton y Rawls verificada contra el artículo (Mafer)

- **Archivos:** nuevos `datos/catalogos/saxton_rawls.py` y `test_saxton_rawls.py`; `datos/catalogos/README.md`; `docs/14` (tablero) y `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** `retencion(arena, arcilla, materia_organica)` calcula θsat, θFC, θWP y TAW (ecuaciones [1] a [5] de la Tabla 1) y `agua_pedotransferencia(...)` arma el objeto `agua` del contrato `suelo` (`tawMmPorM`, `metodoTaw`, `retencion`, todo `SUPUESTO`). Si falta una entrada o cae fuera del rango del artículo, `NO_EVALUABLE` con motivo, sin número por defecto. Falta que Eduardo la conecte a `/api/suelo` (la API todavía no obtiene la materia orgánica).
- **Verificación:** coeficientes copiados de la Tabla 1 del artículo (PDF de Saxton y Rawls 2006 bajado por Mafer) y reproducida la **Tabla 3** (12 clases texturales, 2.5 %w de materia orgánica): diferencia máxima 0.5 puntos de humedad, conductividad y densidad también coinciden. Cierra el `[VERIFICAR]` de la entrada de las decisiones de suelo.
- **Hallazgo:** arena y arcilla entran como fracción y la **materia orgánica como porcentaje (2.5 para 2.5 %)**, sin dividir entre 100. Una implementación de código abierto (`pedotri`) la divide entre 100 y falla la Tabla 3 (saturación hasta 11 puntos abajo, conductividad 74 %). Las otras dos que se compararon (`rcropmod`, `pedon`) coinciden con el artículo. El carbono orgánico de SoilGrids se convierte a materia orgánica con el factor 1.724, que hay que citar.
- **Límites del artículo:** se derivó sin muestras con materia orgánica mayor a 8 %w ni arcilla mayor a 60 %w; fuera de ese rango no se extrapola. Densidad normal, sin grava ni salinidad.
- **Fuente / evidencia:** Saxton, K. E. y Rawls, W. J. (2006), Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117, Tablas 1 y 3. `python -m unittest discover -s datos/catalogos`: 9 pruebas; salida validada contra `contratos/suelo.schema.json` (`agua`).
- **Decisiones afectadas:** A2.16 (parte de datos y método hecha; integración en la API pendiente de Eduardo).

### 2026-11-14 — A0.6: calendario de Isla cargado desde SIAP e INIFAP (Mafer)

- **Archivos:** nuevos `datos/catalogos/calendario-isla.json` y `datos/catalogos/fuentes/siap_isla_2021_2025.csv`; `generar.py` y `validar.mjs` (valida el calendario); `README.md` de catálogos; `docs/04` (SIAP), `docs/13` y `AgroVault/Compartido/Pendientes.md` (V-20).
- **Cambio:** el calendario va en un archivo con la forma del contrato `calendario-local` (0.5.0), no en el catálogo de cultivos. Por cultivo y temporada, la ventana con fuente y la presencia en SIAP 2021-2025 (calculada desde el CSV). Con ventana: maíz PV (1 jun-15 jul, INIFAP, DDR San Andrés Tuxtla), maíz OI (nov-dic) y frijol OI (20 sep-20 oct), estos dos de la Agenda Técnica de Veracruz (recomendación estatal). Sin ventana, `NO_EVALUABLE` con motivo: frijol PV, chile y calabaza.
- **Hallazgo:** SIAP no registra calabaza en Isla (`no_registrado`); se muestra en la demo como no recomendable (decisión de Mompin). SIAP no tiene API: es un CSV por año, anotado en `docs/04`.
- **Fuente / evidencia:** CSV de cierre agrícola municipal de SIAP y los PDF de INIFAP citados en `datos/catalogos/README.md`; consultado el 14/11/2026.
- **Decisiones afectadas:** V-20 cerrado (calendario cargado); la zona demo de 13 pasa a verificada.

### 2026-11-14 — A4.2 ranking, contratos 0.6.0 en el motor y escenarios con el paquete de demo (Mompin)

- **Archivos:** `web/src/motor/ranking.ts` (nuevo), `motor.ts`, `balance.ts`, `escenarios.ts`, `protocolo.ts`, `cliente.ts`, `index.ts`, `tipos.ts`; pruebas `ranking.test.ts` y `c2.test.ts`; se borra el fixture propio `web/src/motor/pruebas/datos/power-isla-2006-2025.json` (las pruebas usan `datos/demo/respuestas/`); `docs/05`, `docs/13`, `docs/14`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **A4.2:** criterio B (puntaje compuesto por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio) con respaldo automático A cuando solo el pilar hídrico tiene número, que es el caso hasta A3.7. Normalización definida en A4.2 (doc 05, paso 7): déficit hídrico = fracción de la demanda cubierta; compatibilidad = fracción de siembras en ventana; protección del suelo = 1 − índice de erosión; calor y aporte indirecto son complementarios y quedan fuera del puntaje. Pesos iguales `SUPUESTO` si no hay pesos del usuario ni con fuente. Las rotaciones `EXPLORATORIO` no reciben posición.
- **Exceso de agua:** se calcula y se expone (`excesoTotalMm`, `excesoMm` por celda; los días con exceso van en la evidencia de la tarjeta y en `ResultadoMotor.exceso`, porque el contrato no tiene campo para ellos). No entra al ranking hasta que el equipo lo decida.
- **Contratos 0.6.0:** el motor llena `seleccion.lluviaTemporadasMm` (PV, OI y total con la fuente SIAP) y deja `etapa: null` en los registros sin parámetros del cultivo.
- **Cambio de escenario habitual:** con la ventana del paquete de demo (2005-10-01 a 2025-12-31: 20 años agrícolas) el habitual pasa de **2016 a 2008**; seco 2023 y lluvioso 2024 no cambian. Con 20 años el p50 es el punto medio de los dos años centrales (2016: 1 912.0 mm; 2008: 1 932.1 mm), que empatan, y la regla de desempate elige el más antiguo. Reemplaza el "habitual 2016" de la entrada anterior.
- **Evidencia de C2:** con `suelo.json` del paquete (franco arcillo arenoso) la rotación es `NO_EVALUABLE` (TAW hasta A2.16); con el selector manual declarado (franco) da resultados por celda y por rotación conformes al contrato y el ranking A de tres rotaciones. 59 pruebas en verde.

### 2026-11-14 — A2.5, A2.6 y A2.7: motor de agua y escenarios (Mompin)

- **Archivos:** `web/src/motor/` (escenarios, ET0, cultivo y Kc, cubeta, suelo, estados, motor, protocolo y Web Worker, cliente; pruebas en `web/src/motor/pruebas/` con un fixture real de POWER), `web/package.json` (vitest 5.1.0 y script `test`), `docs/05`, `docs/04`, `docs/13`, `docs/14`, `AgroVault/Compartido/Resumen.md` y `Pendientes.md`.
- **Decisión `[DECIDIDO]` (Mompin, 14/11) sobre los escenarios:** el percentil p10 / p50 / p90 se calcula sobre la **lluvia de las temporadas de siembra PV y OI**, no del año calendario. **Ventanas:** año agrícola de SIAP, con OI = siembras de octubre de *t*-1 a marzo de *t* y PV = siembras de abril a septiembre de *t*; la lluvia del año *t* es la suma del 1 de octubre de *t*-1 al 30 de septiembre de *t*. Fuente: SIAP, *Normatividad Técnica para la Generación de Estadística Básica Agropecuaria 2022*, p. 10, p. 20 (Cuadro No. 1) y p. 46. **Percentil:** definición 7 de Hyndman y Fan (1996), sobre los años con las dos temporadas completas (mínimo 10, doc 04). **Desempate:** año más cercano al percentil; si dos quedan a la misma distancia (menos de 0.05 mm) gana el más antiguo, y siempre se declara el segundo más cercano. La serie del escenario cubre los 18 meses del año agrícola de SIAP (oct *t*-1 a mar *t*+1).
- **Resultado con datos reales** (POWER, celda de la parcela demo, 2006-2025): seco 2023, habitual 2016, lluvioso 2024 (2025 queda a 2 mm de 2024).
- **Cambio (A2.6):** ET0 Penman-Monteith FAO-56 desde POWER (Hargreaves si faltan variables, ET0 de Open-Meteo si viene), Kc por la curva FAO-56 y cubeta FAO-56 cap. 8 con TAW del suelo y p del cultivo. Cada ciclo se simula en su temporada dentro del año agrícola del escenario (A2.8); las fechas de `resultado-celda` son las del plan.
- **Cambio (A2.7):** pilar de déficit hídrico y estados de evaluabilidad (`ERROR_DATOS` > `NO_EVALUABLE` > `EXPLORATORIO` > `RESPALDO_HISTORICO` > `EVALUABLE`), con salida validada contra `resultado-rotacion` y `resultado-celda`.
- **Supuestos declarados en el resultado:** cada ciclo arranca a capacidad de campo (FAO-56 cap. 8) hasta que A2.16 dé θsat y θFC para convertir GWETROOT (la conversión ya está en el motor); sin escurrimiento por pendiente hasta A3.7; Kc sin ajuste climático (falta la altura del cultivo); `estadoPlanta` nunca `podrida` (sin umbral con fuente).
- **Fuente / evidencia:** 45 pruebas en verde (`cd web && npm test`), entre ellas las pruebas 1 a 5 de doc 05 (la parte de erosión de la 2 queda como `todo` para A3.7) y los ejemplos 2, 3, 8 y 18 de FAO-56.
- **Decisiones afectadas:** doc 05, paso 1 (de `[PROPUESTA]` a `[DECIDIDO]`); doc 04, escenarios; doc 13, fila nueva "Escenarios (A2.5)". Pedido a A2.4: que la serie de la demo empiece el 2005-10-01 para tener 20 años agrícolas.

### 2026-11-14 — API: suelo con la tabla de A1.6 y CORS para el front (Eduardo)

- **Archivos:** `api/app/textura.py`, `api/app/servicios.py`, `api/app/modelos.py`, `api/app/config.py`, pruebas, `api/README.md`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio:** `GET /api/suelo` toma el grupo y el TAW de `datos/catalogos/suelos.json` (Mafer, A1.6) cuando el archivo esta presente, en vez de mi propuesta de agrupamiento (que difería: ahora `franco_arenoso` es `franco` y `franco_arcillo_arenoso` es `arcilloso`). CORS acepta `127.0.0.1:5173` ademas de `localhost`, porque `npm run dev` de balam sirve en `127.0.0.1`.
- **Hallazgo para el equipo:** el suelo de la zona de prueba de Isla (franco arcillo arenoso) y otras zonas medias caen en clases **sin fila en FAO-56 Tabla 19**, asi que su TAW es `NO_EVALUABLE`. Sin TAW el motor no puede hacer el balance de agua con el suelo del mapa; solo con el selector manual (arena franca, franco, arcilla). No lo resolvi: es una decision agronomica (ver Pendientes).
- **Fuente / evidencia:** probado con el `suelos.json` real de la rama `Mafer`; 39 pruebas.

### 2026-11-14 — A2.13 proxima temporada aproximada, parte del backend (Eduardo)

- **Archivos:** `api/app/proxima.py`, `api/app/rutas/proxima.py`, cliente estacional en `api/app/clientes/openmeteo.py`, pruebas, `docs/14`.
- **Cambio:** `GET /api/proxima-temporada?lat&lon` entrega el contrato `proxima-temporada`: banda p10 a p90 por mes, 7 meses, `esPrediccion: false`, sin cifra unica.
- **Metodo (decision mia, a confirmar por el equipo):** el pronostico estacional de Open-Meteo no entrega miembros ni dispersion en las variables probadas, asi que no se usa el ensamble para el ancho. La banda es la distribucion historica de cada mes (20 anios de POWER) desplazada por la anomalia mensual de SEAS5. Respaldo: la misma distribucion sin desplazar. No incluye tendencia (advertencia `SIN_TENDENCIA`). La anomalia es respecto de ECMWF y se suma a la climatologia de POWER, que no coinciden en magnitud (advertencia).
- **Fuente / evidencia:** `monthly=precipitation_anomaly,temperature_2m_anomaly&forecast_days=210&models=ecmwf_seas5` probado en vivo (7 meses); 36 pruebas, el documento completo se valida contra `contratos/proxima-temporada.schema.json`.
- **Pendiente:** la parte del motor (A2.13, Mompin) y la interfaz (A4.9, balam). V-21 queda con evidencia: 7 meses.

### 2026-11-14 — A2.14 textura y pH estimados (Eduardo)

- **Archivos:** `api/app/clientes/isric.py`, `api/app/textura.py`, `api/app/rutas/suelo.py`, pruebas, `docs/04` y `docs/14`.
- **Cambio:** `GET /api/suelo?lat&lon` devuelve el contrato `suelo` con textura (clase USDA y fracciones) y pH de 0 a 30 cm desde SoilGrids por WCS, siempre `SUPUESTO`. `agua.tawMmPorM` queda `NO_EVALUABLE` hasta la tabla de A1.6. Sin dato responde 503 y el front usa el selector manual.
- **Fuente / evidencia:** WCS de ISRIC probado en vivo (Isla: franco arcillo arenoso, pH 5.4; datos reales guardados en `datos/pruebas-apis/respuestas/`); conversion de unidades de la FAQ de ISRIC; clase textural con el triangulo USDA (probado sobre las 5 151 combinaciones posibles).
- **Pendiente de otros:** el grupo arenoso/franco/arcilloso del selector es una propuesta mia y debe coincidir con la tabla de suelos de Mafer (A1.6).
- **Decisiones afectadas:** V-23 (el WCS de ISRIC responde; OpenLandMap queda de respaldo sin implementar).

### 2026-11-14 — A1.3, A2.1, A2.2 y A2.3: API FastAPI (Eduardo)

- **Archivos:** `api/` (app, tests, README, cliente TypeScript generado), `docs/14-CRONOGRAMA.md` (marcas).
- **Cambio:** `GET /health`, `GET /api/clima` (NASA POWER con cache y respaldo Open-Meteo), `POST /api/elevacion` (Terrarium con respaldo Open-Meteo y pendiente por celda), `GET /api/cultivos` (lee `datos/catalogos/cultivos.json`). OpenAPI exportado y tipos TS generados en `api/cliente/`.
- **Decisiones tomadas dentro de mi carril, a confirmar por el equipo:** (1) la cache usa el centro de la celda MERRA-2 como clave (verificado: puntos de la misma celda dan la misma serie); (2) `/api/clima` devuelve la serie del periodo y **no** elige escenarios (eso es A2.5, del motor); (3) la elevacion sale de Terrarium z14 y no de Open-Meteo (90 m), porque con celdas de unos 20 m el DEM de 90 m daria un plano; el respaldo es Open-Meteo; (4) la respuesta de clima es una `SerieClima` con el mismo `dia` que `clima-escenario`, pero no esta en `contratos/`: se pide a Mompin si debe entrar.
- **Fuente / evidencia:** 21 pruebas en `api/tests/` (respuestas reales de A0.7, validadas contra los schemas de `contratos/`) y una corrida en vivo: 20 anios de POWER en 1.8 s, 18 ms desde cache.
- **Decisiones afectadas:** V-08 (propuesta: Terrarium por defecto), V-22 (el clima pasa por el backend).

### 2026-11-14 — A0.4 servidor en el droplet (Eduardo)

- **Archivos:** `AgroVault/Compartido/Servidor.md`, `docs/14-CRONOGRAMA.md` (marca A0.4). Cambios en el droplet, no en el repo.
- **Cambio:** usuario `agrohive`, clon del repo en `/opt/agrohive/repo`, servicio `agrohive-api` (uvicorn en `127.0.0.1:8010`), server block de nginx propio y certificado de Let's Encrypt para `64-23-143-102.sslip.io`. Solo hay un `/health` provisional hasta A1.3.
- **Fuente / evidencia:** `https://64-23-143-102.sslip.io/health` responde 200; `mediworks.mx` sigue respondiendo 200.
- **Decisiones afectadas:** V-15, V-16, V-17 (opción 1 de `docs/13`, `sslip.io`, funciona). Siguen abiertas hasta que el equipo las cierre.

### 2026-11-14 — A0.7 pruebas reales de APIs (Eduardo)

- **Archivos:** `docs/04-DATOS-Y-METODO.md`, `docs/14-CRONOGRAMA.md` (marca A0.7), `datos/pruebas-apis/`, `AgroVault/Compartido/APIs.md` y `Pendientes.md`. Editado con aviso a Mafer (dueña de `docs/`).
- **Cambio:** se anotan los resultados de llamadas reales a NASA POWER, Open-Meteo (archivo, elevación, estacional) y Terrarium. Se cambian varios `[VERIFICAR]` de 04 por el resultado probado.
- **Fuente / evidencia:** `datos/pruebas-apis/LEEME.md` y `respuestas/`, consulta del 2026-11-14, coordenada de prueba 18.03, -95.53 (no es la parcela demo).
- **Decisiones afectadas:** V-06 (`GWETROOT` en AG, radiación en MJ/m²/día), V-08 (Open-Meteo Elevation y Terrarium responden), V-21 (7 meses con `forecast_days=210`), V-22 (GET simple con CORS abierto, backend sigue siendo el camino). Siguen abiertas hasta que el equipo las cierre en 11 y 13.

### 2026-11-14 — Marcas de Eduardo en el cronograma

- **Archivos:** `docs/14-CRONOGRAMA.md` y las vistas que regenera `herramientas/cronograma.py`.
- **Cambio:** revisión de `api/` y `datos/demo/` en la rama `Eduardo`. A4.11 pasa a `[HECHO]`: `GET /api/ndvi` con caché y el paquete `datos/demo/respuestas/ndvi.json` completo. ORNL DAAC no respondió; la serie es MOD13Q1 V061 vía Microsoft Planetary Computer, cita doi:10.5067/MODIS/MOD13Q1.061. A4.6, A4.7 y A4.8 siguen abiertas, con la nota puesta al día (el código del laboratorio ya llama al Worker; el droplet sigue en `d182af4`; SMAP no está en la interfaz ni tiene token en el servidor).
- **Fuente / evidencia:** `datos/demo/respuestas/ndvi.json` (estado `EXPLORATORIO`, límites del píxel), `api/app/rutas/ndvi.py`, `https://64-23-143-102.sslip.io/health` (`commit: d182af4`).
- **Decisiones afectadas:** ninguna.

## Historial

### 2026-11-14 (noche) — Contratos 0.12.2: fuente principal de NDVI en Microsoft Planetary Computer

- **Archivos:** `contratos/ndvi.schema.json` (descripciones), ejemplo e inválidos de NDVI, tipos, README; fila de MODIS en `04`; `docs/README-borrador.md`; vault; `web/src/motor/tipos.ts` (`VERSION_CONTRATO` 0.12.2, en un commit aparte).
- **Cambio y motivo:** pedido de Eduardo. La fuente principal de NDVI pasa a ser Microsoft Planetary Computer: colección `modis-13Q1-061`, MOD13Q1 V061 de NASA LP DAAC servido por Microsoft, con la cita Didan, K. (2021), doi:10.5067/MODIS/MOD13Q1.061. ORNL DAAC queda de respaldo y no se llama en vivo; la demo usa caché y paquete. El schema no fijaba el servicio en ningún enum: solo cambian las descripciones y el ejemplo, así que es compatible. `[VERIFICAR]`: una persona lee https://planetarycomputer.microsoft.com/terms antes de la entrega.
- **Fuente / evidencia:** pedido de Eduardo transmitido por la sesión maestra; la cita de Didan (2021) ya está en `README.md`.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Contratos 0.12.1: inicio de IMERG en 1998-01-01

- **Archivos:** `contratos/clima-escenario.schema.json` (descripción de `lluviaSatelital`, que también usa `serie-clima`), versión en ejemplos e inválidos, tipos, README; vault; `web/src/motor/tipos.ts` (`VERSION_CONTRATO` 0.12.1, en un commit aparte).
- **Cambio y motivo:** Mafer hizo una llamada real a POWER (`time-standard=utc`) en la parcela demo: el último día con -999 es el 1997-12-31 y el primer día con dato, el 1998-01-01, igual que la cobertura del catálogo CMR. La descripción fija el inicio en 1998-01-01 según POWER y CMR, quita el 1998-06-01 y deja el 2000-06-01 como dato del espejo de UCAR. Solo cambia la descripción: es compatible.
- **Fuente / evidencia:** llamada real de Mafer del 14/11, transmitida por la sesión maestra.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Contratos 0.12.0: correcciones de citas de IMERG, SMAP y MOD13 (compatible)

- **Archivos:** `contratos/clima-escenario.schema.json` (`lluviaSatelital`, que también usa `serie-clima`), `contratos/smap.schema.json`, `contratos/ndvi.schema.json`, ejemplo de SMAP, un caso inválido, tipos, README; vault (`Contratos.md`, `Pendientes.md`); `web/src/motor/tipos.ts` (`VERSION_CONTRATO` 0.12.0, en un commit aparte).
- **Cambio y motivo:** correcciones que encontró Eduardo-B.
  1. **IMERG:** la descripción decía que empieza el 2000-06-01. Ahora registra las tres fechas que dan las fuentes: POWER 1998-06-01, el catálogo de NASA 1998-01-01 y el espejo de UCAR 2000-06-01, con `[VERIFICAR]` contra GES DISC. Agrega el producto GPM_3IMERGDF V07 y su DOI, 10.5067/GPM/IMERGDF/DAY/07, que confirma el catálogo de NASA (data.nasa.gov).
  2. **SMAP:** campo opcional `pases[].calidad` (alta, baja o desconocida): alta si `retrieval_qual_flag` vale 0 u 8, baja si el bit 0 está en 1. Lo confirman el ATBD de O'Neill y Bindlish (rev. F, 2020) y la guía de NSIDC. El DOI 10.5067/4XXOGX0OOW1S y la Tabla 6 de la guía de 2023 no se pudieron confirmar: `[VERIFICAR]`. Ojo: "cualquier bit en 1 es malo" no es exacto, porque el 8 tiene un bit en 1 y es de alta calidad.
  3. **MOD13:** se documenta la pixel reliability: 0 bueno, 1 marginal, 2 nieve o hielo y 3 nublado, confirmados para v061. El -1 de relleno solo consta para V005: `[VERIFICAR]` en v6.1 y en ORNL DAAC.
- **Fuente / evidencia:** data.nasa.gov (GPM_3IMERGDF V07); ATBD L2/L3 SM P rev. F (smap.jpl.nasa.gov); NSIDC, interpretación de banderas de los productos pasivos; documentación de MOD13Q1 v061 (Earth Engine) y página de QA de V005 del LP DAAC. `npm test` 92/92.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Contratos 0.11.0: `serie-balance` para el dashboard (A4.1)

- **Archivos:** nuevo `contratos/serie-balance.schema.json`, ejemplo, 8 casos inválidos, `contratos/validar.mjs` (chequeos extra), tipos, README; `13`; vault; `web/src/motor/tipos.ts` (`VERSION_CONTRATO` 0.11.0, en un commit aparte).
- **Cambio y motivo:** el borrador del motor, aprobado por Mompin para el dashboard de balam, entra con estos ajustes de convención:
  1. Las columnas diarias admiten `null` cuando falta un dato de entrada, nunca 0, como el resto de los contratos.
  2. Las columnas que no pueden ser negativas llevan `minimum: 0`.
  3. Los subesquemas llevan `title`, para que los tipos tengan nombre, y cada columna lleva descripción con la ecuación de FAO-56 donde aplica (80, 85, 88).
  4. JSON Schema no puede exigir que las columnas tengan el mismo largo. `validar.mjs` lo comprueba con un chequeo extra, junto con que la suma de días del resumen mensual cuadre.
- **Fuente / evidencia:** propuesta del motor; FAO-56, capítulo 8. `npm test` 91/91.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Comparación por defecto de la demo: R1, R2 y R4 `[DECIDIDO]` (corrige "R1 a R4")

- **Archivos:** `13` (fila "Rotaciones de la demo"), `docs/guion-video-borrador.md`, `docs/README-borrador.md`, `AgroVault/Compartido/Resumen.md`.
- **Cambio y motivo:** Mompin corrigió la decisión anterior. La demo compara por defecto R1, R2 y R4, porque R3 (frijol-frijol) tiene una siembra sin ventana con fuente (frijol PV) y saca el pilar de compatibilidad. Con R1, R2 y R4 entran los cuatro pilares y el orden es R4 (0), R2 (0.077) y R1 (0.099). R3 sigue en el selector. Se quitó del guion la nota de "si se comparan las cuatro" y se actualizó la fila de rotaciones de ejemplo de la vault, que seguía con R0 a R2.
- **Fuente / evidencia:** decisión transmitida por la sesión maestra; `web/src/motor/pruebas/regresion/demo-isla.json` (`rankingCuatroPilares`); doc 05, paso 7.
- **Decisiones afectadas:** "Rotaciones de la demo" en 13.

### 2026-11-14 (noche) — Guion base del video de demo (A5.6)

- **Archivos:** nuevo `docs/guion-video-borrador.md`.
- **Cambio y motivo:** pedido de Mafer (dueña de A5.6) a través de la sesión maestra. Son 10 escenas, unos 2:55 en total, con lo que se ve, el texto de la voz y la duración de cada una. La duración y el formato quedan `[VERIFICAR]` (V-03, V-04).
- **Cifras:** salen de `web/src/motor/pruebas/regresion/demo-isla.json`:
  - Escenarios: 2023 seco, 2016 habitual y 2024 lluvioso.
  - TAW: 122.3 mm/m.
  - Ranking B con R1, R2 y R4: R4, R2, R1, con arrepentimientos 0, 0.077 y 0.099.
  - Próxima temporada: los tres escenarios caen dentro de la banda en 5 de 6 meses, con 6 años análogos y un déficit de 0 % a 10.6 %.
  El orden R4, R2, R1 es el de comparar esas tres; si en pantalla se comparan las cuatro, se lee de la interfaz. Lo que todavía no está en la interfaz (A4.3, A4.8, A4.10, A4.11) queda marcado para revisar antes de grabar.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Borrador del README para A5.7

- **Archivos:** nuevo `docs/README-borrador.md` (no se tocó `README.md`).
- **Cambio y motivo:** pedido de Mompin. Es un borrador para Mafer (dueña de A5.7) con qué es AgroHive, cómo correr la web, la API y la demo sin internet, el método (escenarios, balance FAO-56, pilares, ranking B, próxima temporada), las fuentes NASA y no NASA con licencias, los límites y supuestos, y una declaración de uso de IA marcada `[VERIFICAR]` hasta conocer las reglas oficiales (V-03, V-04). Cada punto remite a `docs/` o `contratos/`. Las licencias que no constan en el repo quedan `[VERIFICAR]`. La IP del servidor no se repite (hallazgo de la revisión de merges).
- **Fuente / evidencia:** `docs/00`, `04`, `05`, `10`, `11`, `13`, `14`; `api/README.md`, `web/README.md`, `datos/demo/LEEME.md`, `datos/catalogos/README.md`, `AgroVault/Compartido/APIs.md`.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Orientación de la cuadrícula y rotaciones de la demo `[DECIDIDO]`

- **Archivos:** `contratos/parcela.schema.json` (descripción de `celda`, `i` y `j`), `contratos/ejemplos/parcela.ejemplo.json` y los dos inválidos de parcela, tipos; `13`.
- **Cambio y motivo:** Mompin decidió dos cosas.
  1. **Cuadrícula:** `i` se cuenta desde el sur (0 = fila más al sur, crece hacia el norte) y `j` desde el oeste (crece hacia el este), igual que `web/src/ui/cuadricula.ts` de balam (verificado: `y = sur + i * lado`, `x = oeste + j * lado`). El ejemplo tenía `i = 0` al norte; se corrigieron los centros. Solo cambian la descripción y el ejemplo, así que es compatible.
  2. **Demo:** compara R1 a R4 y muestra como sugerida R4 (milpa dentro de las ventanas de INIFAP).
- **Fuente / evidencia:** decisión transmitida por la sesión maestra; `web/src/ui/cuadricula.ts`; doc 05, paso 7. `npm test` 82/82.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — A1.7: contratos 0.10.0 para el alcance mundial (compatible)

- **Archivos:** `contratos/{serie-clima,clima-escenario,calendario-local}.schema.json`, nuevos `contratos/ndvi.schema.json` y `contratos/smap.schema.json`, ejemplos (uno fuera de México y uno con IMERG), 11 casos inválidos, tipos, README; `13`, `14` (A1.7 `[HECHO]`); vault.
- **Cambio y motivo:** A1.7 (decisión de Mompin, 13 "Alcance geográfico").
  1. `lluviaSatelital` {variable `IMERG_PRECTOT`, estandarHora `UTC`, fuente, dias [{fecha, lluviaMm o null}]}, opcional: evidencia que no entra al balance ni a los escenarios; el -999 va como `null`.
  2. `calendario-local.ubicacion` acepta la forma INEGI (como el calendario de Isla de Mafer, que sigue validando) o la forma genérica `paisIso` + `unidadAdministrativa` {sistema, clave, nombre, nivel}.
  3. `ndvi`: punto, producto MOD13Q1 (250 m, 16 días, escala), serie con estado por dato (sin dato, `null` y motivo, nunca 0), fuente con cita doi:10.3334/ORNLDAAC/1600 y los tres límites obligatorios (píxel mayor que la parcela, no muestra el cultivo, no entra al ranking).
  4. `smap`: forma tomada de `api/app/modelos_smap.py` de Eduardo (rama `Eduardo`), más `producto` opcional (36 o 9 km, ~0-5 cm, m3/m3). Es contraste y no entra al ranking ni al balance.
  No se tocó la descripción de las celdas de la parcela (pendiente de Mompin).
- **Fuente / evidencia:** `features/encargos/eduardo-datos-globales.md`. `npm test` 82/82; el calendario de Isla y los catálogos validan.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Contratos 0.9.0 (rama `contratos-nulos`): regla de pilar sin dato para todos los pilares `[DECIDIDO]`

- **Archivos:** `contratos/resultado-rotacion.schema.json`, versión en ejemplos e inválidos, 5 casos inválidos nuevos, README; `13`.
- **Cambio y motivo:** Mompin extendió a todos los pilares la regla del pilar de exceso. Si el pilar es `NO_EVALUABLE` o `ERROR_DATOS`, el motivo es obligatorio y todos sus indicadores van en `null`:
  - `deficitHidrico`: `proporcionDemandaNoCubierta`, `diasDeficit`, `diasDeficitEtapasSensibles`, `deficitTotalMm` y `excesoTotalMm`.
  - `compatibilidadCiclo`: `siembrasFueraDeVentana`.
  - `proteccionSuelo`: `indiceErosionRelativo` y `diasSueloDesnudo`.
  - `riesgoCalor`: `diasEstresCalor`.
  - `aporteIndirecto`: `incluyeLeguminosa` y `especiesDistintas`.
  - `excesoHidrico`: ya la tenía.
  En `resultado-celda` la regla ya regía para los registros, así que no cambia. Es más estricto y puede rechazar salidas del motor que hoy pasan: va en la rama `contratos-nulos`, que el motor mezcla y ajusta antes de integrarse a `main`. Los tipos TS no cambian.
- **Fuente / evidencia:** decisión transmitida por la sesión maestra. `npm test` 68/68.
- **Decisiones afectadas:** ninguna más.

### 2026-11-14 (noche) — Escenario "próxima temporada" por rotación `[DECIDIDO]`; contratos 0.8.0 (compatible)

- **Archivos:** `contratos/resultado-rotacion.schema.json`, ejemplo, 5 casos inválidos, tipos, README; `13`; vault.
- **Cambio y motivo:** Mompin decidió evaluar cada rotación en una "próxima temporada" con años análogos reales, como `EXPLORATORIO` y sin ranking. Se agrega `proximaTemporada` (opcional) con la propuesta del motor: estado (`EXPLORATORIO`, `NO_EVALUABLE` o `ERROR_DATOS`), `esPrediccion: false`, aviso, horizonte, criterio de análogos, ciclos evaluados y fuera, años análogos con sus pilares de déficit y exceso, rango entre análogos y fuentes. En `NO_EVALUABLE` o `ERROR_DATOS` el motivo es obligatorio, no hay análogos y el rango va en `null`.
- **Fuente / evidencia:** propuesta del motor transmitida por la sesión maestra. `npm test` 63/63.
- **Decisiones afectadas:** ninguna cambia; el ranking B sigue usando solo los tres escenarios históricos.

### 2026-11-14 (noche) — Pilar de exceso de agua `[DECIDIDO]`; contratos 0.7.0 (compatible)

- **Archivos:** `contratos/resultado-rotacion.schema.json`, ejemplos, casos inválidos, tipos, README; `13`; vault.
- **Cambio y motivo:** Mompin decidió sumar un pilar de exceso de agua al ranking B, según la propuesta del motor. Se agrega `$defs.pilarExcesoHidrico` con `excesoTotalMm`, `diasExceso` y `fraccionLluviaPercolada`. En `NO_EVALUABLE` o `ERROR_DATOS` todo va en `null` y el motivo es obligatorio. También se suma `excesoHidrico` a los pilares por escenario, a los pesos de `ponderacion` y a `pilaresExcluidos`. Todo es opcional: lo que validaba sigue validando. Nota: los otros pilares no tienen esa regla condicional; se agregó solo a este, como se pidió.
- **Fuente / evidencia:** FAO-56 (Allen et al., 1998), capítulo 8, "Soil water balance", subsección "Deep percolation (DP)", ecuación 88: DPi = (Pi - ROi) + Ii - ETc,i - Dr,i-1 ≥ 0, verificada en https://www.fao.org/4/x0490e/x0490e0e.htm el 14/11. La normalización 1 - fracción queda como `SUPUESTO`. `npm test` 58/58.
- **Decisiones afectadas:** ranking B (un pilar más).

### 2026-11-14 (noche) — Contratos 0.6.0 (compatible): lluvia por temporadas y etapa nula

- **Archivos:** `contratos/clima-escenario.schema.json`, `contratos/resultado-celda.schema.json`, ejemplos, casos inválidos, tipos, README; versión en la vault.
- **Cambio y motivo:** pedido del motor. (1) `seleccion.lluviaTemporadasMm` {pv, oi, total, fuente}, opcional: la lluvia del año agrícola con la que se elige el escenario (ventanas PV y OI de SIAP), separada de `lluviaAnualMm`, que sigue siendo la del año calendario. (2) `etapa` puede ser `null` cuando no hay parámetros del cultivo; en ese caso el registro no puede ser `EVALUABLE` y lleva motivo (antes el motor ponía `siembra`). Las dos cosas amplían el contrato: lo que ya validaba sigue validando.
- **Fuente / evidencia:** `npm test` 55/55; `pytest` en `api/` 39; `validar.mjs` de los catálogos; `npm test` (45) y `npm run build` (incluye `tsc --noEmit`) en `web/`.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — A1.1 `[HECHO]`; A2.16 asignada a Mafer

- **Archivos:** `14` (fila de A1.1, fila de A2.16 y tablero), `AgroVault/Compartido/{Pendientes,Resumen}.md`.
- **Cambio y motivo:** decisiones de Mompin. A1.1 pasa a `[HECHO]` porque `main` está en verde y el equipo revisó los contratos en persona. A2.16 (TAW por pedotransferencia de Saxton y Rawls, 2006) la hace Mafer. Se actualizó además el estado del repo en `Resumen.md`, que todavía decía que no había código en `web/` ni en `api/`.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `main` de vuelta en verde tras contratos 0.4.0 y 0.5.0; regla de cambios de contrato

- **Archivos:** `api/app/{proxima,modelos,servicios}.py`, `api/tests/test_proxima.py`, `api/openapi.json`, `api/cliente/api.d.ts` (Eduardo); `web/src/ui/demo.ts` (balam); `datos/catalogos/{generar.py,cultivos.json,README.md}` (Mafer); `AGENTS.md`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** `main` (3a9a697) quedó en rojo porque los contratos 0.4.0 y 0.5.0 entraron sin ajustar lo que dependía de ellos. Con autorización de Mompin y aviso a cada dueño, se hicieron cambios mínimos:
  - **API (Eduardo):** la próxima temporada se recorta a 6 meses (`HORIZONTE_MESES`), `/api/suelo` agrega `agua.metodoTaw` (`tabla_fao56` con la fuente de la tabla) cuando el TAW es evaluable, y dos aserciones de prueba pasan de 7 a 6 meses. Se regeneraron el OpenAPI y el cliente.
  - **Web (balam):** el tipo de los ciclos del ejemplo en `demo.ts`.
  - **Catálogos (Mafer):** sin `ventanasSiembra`. Las tres ventanas estaban en `NO_EVALUABLE`, así que no se perdió ningún dato; queda anotado en el README.
  - **Regla nueva:** ningún cambio de contrato que rompa algo entra a `main` sin las cuatro verificaciones en verde.
- **Fuente / evidencia:** `npm test` en `contratos/` 52/52; `pytest` en `api/` 39 pruebas; `validar.mjs` de los catálogos y `tsc --noEmit` en `web/`, en verde.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — `.vscode/` fuera del repo `[DECIDIDO]`

- **Archivos:** `.gitignore`; se dejan de versionar `.vscode/tasks.json`, `.vscode/settings.json`, `.vscode/agrohive.code-snippets` y `.vscode/mascota/clawd.py`.
- **Cambio y motivo:** decision de Mompin. `tasks.json` ejecutaba la mascota al abrir la carpeta en VS Code (`runOn: folderOpen`): codigo que corre solo en la maquina de todos. La configuracion de editor es personal. El repo sigue publico.
- **Efecto:** al hacer pull, git borra esos archivos de las copias locales. Quien los quiera conservar los recupera del historial (`git show dfd4d40:.vscode/mascota/clawd.py`) y quedan ignorados.

### 2026-11-14 (noche) — A4.11: NDVI de MODIS escrito pero BLOQUEADO por ORNL DAAC; DOI de OpenLandMap corregidos (Eduardo)

- **Archivos:** `api/app/clientes/ornl.py`, `api/app/ndvi.py`, `api/app/modelos_ndvi.py`, `api/app/rutas/ndvi.py`, `api/app/http.py`, `api/tests/test_ndvi.py`, `datos/demo/generar.py`, `datos/pruebas-apis/respuestas/ornl_*.json`, `api/README.md`, `AgroVault/Compartido/APIs.md`, `docs/14`.
- **A4.11 `[BLOQUEADO]`:** el servicio REST de ORNL DAAC no respondio de forma usable (502, 503 y una llamada de 40 s sin recibir un byte). **Decision del usuario: no usar ORNL.** El cliente y `GET /api/ndvi` quedaron escritos y con 15 pruebas con respuestas reales guardadas (valores, relleno, rango, calidad, ventanas, cache, fallos parciales, contrato `ndvi`), pero **no entran al paquete de demo** (`generar.py` solo los incluye con `--con-ndvi`) y el front no debe llamarlos.
- **Lo verificado contra el propio servicio antes de que cayera:** maximo **10 fechas por llamada**; NDVI valido de -2000 a 10000, **relleno -3000** (escalado seria -0.3, por eso se descarta explicitamente), escala 0.0001; calidad valida 0 a 3, relleno -1. Tiempo limite de 20 s por llamada a ORNL para que una consulta no se cuelgue minutos.
- **Correccion de cita (aviso de Mafer #130, verificada en Zenodo):** `OpenLandMap` citaba `doi:10.5281/zenodo.15528399`, que es la **arcilla 2000-2005**, porque lo tome del campo `doi` de la coleccion STAC (que apunta al primer periodo). Las capas que se leen son 2020-2022: arcilla `15528401`, arena `15528413`, limo `15528425`, pH `15471105` y carbono organico `15535759` y `15535761` (el conjunto esta partido en dos mitades en Zenodo). Todas CC BY 4.0. Corregido en `openlandmap.py`, en `suelo.json` del paquete y en `APIs.md`; la prueba ahora exige cada DOI correcto y rechaza el viejo.
- **Verificaciones:** api 98, contratos 82/82, catalogos y unittest; el paquete salio igual salvo la fecha de generacion.

### 2026-11-14 (noche) — A4.10: lluvia satelital IMERG en /api/clima y paquete de demo regenerado (Eduardo)

- **Archivos:** `api/app/clientes/power.py`, `api/app/servicios.py`, `api/app/modelos.py`, `api/tests/` (test_clima, test_proxima, test_contratos_api), `datos/demo/` (regenerado), `datos/pruebas-apis/respuestas/power_imerg_*.json`, `api/README.md`, `AgroVault/Compartido/APIs.md`, `docs/14`.
- **Cambio:** `GET /api/clima` devuelve `lluviaSatelital` (contrato 0.10.0 ya en `main`, A1.7) con `IMERG_PRECTOT` de POWER pedida en UTC. **Evidencia**: no entra al balance ni a los escenarios. `-999` es `null`, nunca 0. Si IMERG falla, el clima sale igual sin el bloque (`IMERG_NO_DISPONIBLE`).
- **Hallazgo nuevo, no estaba en el encargo:** la celda de IMERG es de **0.1 grados**, no la de MERRA-2 (0.5 x 0.625): cuatro celdas vecinas dieron cuatro series distintas (por ejemplo, 57.67, 55.83, 77.51 y 67.38 mm el mismo dia). Por eso se pide el centro de la celda de 0.1 y la cache va por esa celda, no por la de POWER.
- **Paquete de demo regenerado** (lo pidio Mompin, #110): trae IMERG (7 397 dias, ninguno en -999 porque 2025 ya esta publicado) y el `terreno.json` **corregido a la orientacion nueva** (i=0 al sur): antes `c-0-0` valia 63.1 m y ahora 62.0 m (filas norte y sur cruzadas). El generador ahora aborta si las celdas no cumplen "i crece al norte, j al este" y una prueba nueva recalcula cada elevacion desde los tiles guardados y falla si el terreno esta cruzado (verificado cruzandolo a proposito).
- **Evidencia:** 83 pruebas de la API (10 nuevas de IMERG y 1 de orientacion), con respuestas reales de POWER (incluida una con `-999`); el bloque valida contra `serie-clima.schema.json`.
- **Efecto en el front, a avisar:** `serie-clima-*.js` pasa de 1.27 a **1.55 MB** (224 KB comprimido) por llevar IMERG dentro del bundle. Y **una prueba de la escena de Mompin falla** (`web/src/escena/pruebas/demo-motor.test.ts`, "la parcela usa el terreno real del paquete"): tiene escritas las elevaciones viejas `[63.1, 62.6, 62, 63.3]`; con el paquete corregido son `[62, 63.3, 63.1, 62.6]`. El archivo es de Mompin: debe actualizarlo en el mismo merge (cambio atomico).
- **Pendiente mio:** A4.11 (NDVI de MODIS por ORNL DAAC), que ademas necesita su contrato.

### 2026-11-14 (noche) — Tercer despliegue: main d182af4 con la escena montada (Eduardo, aviso de Mompin #102)

- **Despliegue:** el droplet corre `main` en `d182af4`: escena 3D montada en el Laboratorio, selector A3.4 conectado al motor, banda A4.9, sistema visual de balam, chile de Mafer y `GET /api/smap`. Anunciado antes por el buzon; una sola sesion desplego. Front construido en el droplet y publicado con respaldo del anterior.
- **Pregunta de Mompin respondida:** los `.bbmodel` **no hay que copiarlos**: `import.meta.glob(..., { query: '?raw' })` los empaqueta como trozos de JS (31 archivos `maiz_*`, `frijol_*`, `calabaza_*`, `chile_*` y `suelo_*`), verificado en el `dist` local y en produccion (por ejemplo `chile_madurez-*.js` y `frijol_madurez-*.js` responden 200). `fs.allow` de `vite.config.ts` solo aplica a `npm run dev`.
- **Verificado desde fuera:** `/` 200 con el bundle nuevo; `EscenaParcela` y `serie-clima` 200; `/health` trae `commit: d182af4`; `/api/suelo` de Isla da TAW 122.3 mm/m con ISRIC y OpenLandMap; `mediworks.mx` sigue en 200. `/api/smap` sin token responde 503 visible. `earthaccess` 0.19.0, `h5py` 3.16.0 y `rasterio` 1.5.2 instalados.
- **Sin cambiar:** no hay `EARTHDATA_TOKEN` en el servidor (falta el OK explicito del usuario); `nginx` sin cambios.
- **Dato nuevo:** el bundle trae el paquete de clima completo en `serie-clima-*.js` (1.27 MB, 190 KB comprimido), la pantalla inicial baja eso aunque no lo use todavia.
- **Nota:** `/health` dice `versionContrato 0.9.0` porque ese es el valor en `main`; mi rama ya trae 0.10.0 y llegara en el proximo deploy.

### 2026-11-14 (noche) — Cronograma al dia tras mezclar main ce58cc4 (Eduardo)

- **Archivos:** `docs/14`, `docs/cronograma.html`, `AgroVault/Compartido/Cronograma.md`, `herramientas/quejas-ia/QUEJAS.md` (regenerados), `api/app/config.py`, `api/tests/test_basico.py`, `datos/demo/` (regenerado).
- **Estado:** 34 de 60 actividades hechas (57 %): Mompin 14 de 15, Mafer 8 de 12, Eduardo 10 de 18, balam 3 de 16. Entraron 4 actividades nuevas al reparto (A1.7 hecha por Mompin; A4.10, A4.11 y A4.12, del alcance mundial, en mi fila).
- **Marcas que NO cambian, verificadas:** A3.6 (modo 2D) sigue pendiente, asi que A5.4 sigue bloqueada; ninguna pagina usa aun `usarDatosParcela`, asi que A4.6 y A4.7 siguen en curso; A5.8 sigue bloqueada por A4.6.
- **API:** `VERSION_CONTRATO` pasa a 0.10.0 (el contrato vigente) y se regenero el paquete de demo.
- **Pendiente mio:** A4.10 (lluvia IMERG por POWER) y A4.11 (NDVI de MODIS por ORNL DAAC), segun el encargo de Mompin (#91, `features/encargos/eduardo-datos-globales.md`).

### 2026-11-14 (noche) — A4.8: GET /api/smap (SMAP L3 36 km), contraste informativo (Eduardo, sesion B)

- **Archivos:** `api/app/clientes/earthdata.py`, `api/app/rutas/smap.py`, `api/app/modelos_smap.py`, `api/tests/test_smap.py`, `api/app/main.py`, `api/requirements.txt` (earthaccess y h5py), OpenAPI y cliente regenerados, `api/README.md`, `docs/14`. Hecho en la rama `Eduardo-B` y mezclado en `Eduardo` por la sesion A tras revisarlo.
- **Cambio:** `GET /api/smap?lon&lat&desde&hasta` devuelve la humedad del suelo superficial (~5 cm) de SMAP L3 (SPL3SMP, 36 km) por dia y pase AM/PM, con la bandera de calidad sin interpretar, fuente, resolucion y periodo. Alcance acordado con Mompin (#82): **contraste informativo, EXPLORATORIO, fuera del ranking y del balance**. Maximo 10 dias, hasta hoy menos 3 (SMAP publica con retraso).
- **Token:** solo por la variable de entorno `EARTHDATA_TOKEN`; no esta en el repo, la cache ni los logs (revisado el diff: sin credenciales literales). Sin token, 503 `ERROR_DATOS` con motivo.
- **Evidencia:** 73 pruebas de la API (13 nuevas, sin red ni token); lectura real en Isla el 2025-06-15: celda (140, 226), humedad PM 0.1754 m3/m3, coincide con el granulo completo.
- **Limites a decir:** ~20 s por dia (lectura por rangos HTTP) y celda de 36 km (una parcela cabe entera en una celda); mide ~5 cm y **no** es la zona de raices que usa el motor.
- **Pendiente:** el schema `smap.schema.json` en `contratos/` (propuesta a Mompin; hasta entonces la forma de la respuesta es una propuesta y no hay prueba contra contratos) y el OK **explicito del usuario** para poner `EARTHDATA_TOKEN` en el droplet; no se desplegara antes.

### 2026-11-14 (noche) — A4.6: cargador de datos de la parcela (Eduardo)

- **Archivos:** `web/src/api/datosParcela.ts`, `usarDatosParcela.ts`, `datosParcela.test.ts` y el README de esa carpeta. No se tocan `ui`, `paginas`, `motor` ni `escena`.
- **Hallazgo:** el **terreno ya estaba conectado** por balam (`DibujarParcela` y `escena/demo-motor` llaman a `obtenerTerreno` con la cuadricula). Lo que falta para cerrar A4.6 es que `Laboratorio` y `Comparacion` (que siguen diciendo "faltan los datos") carguen clima, suelo y cultivos.
- **Cambio:** `cargarDatosParcela([lon, lat])` trae en paralelo clima de la ventana estandar, suelo, cultivos y proxima temporada; `fallaObligatoria` nombra el dato obligatorio que fallo; `avisosDe` junta las advertencias y el respaldo (que siempre debe verse, docs/04); `usarDatosParcela` lo expone como un solo estado `loading | ready | error`. La proxima temporada es opcional y no bloquea.
- **Evidencia:** 15 pruebas de `web/src/api` (5 nuevas: exito, falla obligatoria, capa opcional, avisos de respaldo, sin red); typecheck en verde.
- **Falta (de otros):** que balam use el hook en `Laboratorio`/`Comparacion` y que Mompin pase `datos.clima`, `datos.suelo` y `datos.cultivos` al motor (`crearClienteMotor`). Con eso A4.6 y A4.7 se cierran.

### 2026-11-14 (noche) — A4.8 desbloqueada (Eduardo)

- **Cambio:** A4.8 pasa de `[BLOQUEADO]` a `[EN CURSO]`: el usuario entrego un token de Earthdata a la segunda sesion, que confirmo en un directorio temporal el login, la descarga de un granulo SMAP L3 (31.7 MB) y la lectura de humedad en Isla. Corrige mi marca anterior (2f78bd1), que se basaba en que no habia cuenta.
- **Reglas:** el token vive **solo** en variables de entorno (`EARTHDATA_TOKEN` o usuario y contrasena), nunca en el repo, en `.env` subido, en logs ni en mensajes del buzon; sin token, la ruta debe responder `NO_EVALUABLE` o `ERROR_DATOS` visible, no fallar ni inventar.
- **Trabajo:** la segunda sesion lo implementa en la rama `Eduardo-B` (un `git worktree` aparte) para no pisar la rama `Eduardo`; yo hago el merge.

### 2026-11-14 (noche) — Segundo despliegue de main 9ad0443 (Eduardo, aviso de Mompin #68)

- **Despliegue:** el droplet corre `main` en `9ad0443` (A3.3 y A2.11 de Mafer, API 0.9.0 y cliente A4.6). Se anuncio antes por el buzon; una sola sesion desplego.
- **Verificado desde fuera:** `/health` trae `commit: 9ad0443` y `versionContrato: 0.9.0`; `/api/suelo` de Isla da TAW 122.3 mm/m con ISRIC y OpenLandMap; `/api/clima` da 7 397 dias `EVALUABLE` con contrato 0.9.0; `mediworks.mx` sigue en 200.
- **Front:** se construyo en el droplet y su huella es **identica** a la publicada, asi que no se copio nada: los cambios de la escena y los modelos de frijol y calabaza aun no entran al bundle de la app.
- **Tropiezo:** el script temporal del build en `/tmp` fallo con `Permission denied` (un archivo de la vez anterior de otro usuario). Se movio a `/opt/agrohive/` y el procedimiento queda en `api/despliegue/actualizar-servidor.sh` (sin probar de punta a punta hasta el proximo despliegue).

### 2026-11-14 (noche) — A4.8: sondeo de viabilidad de los extras NASA (Eduardo)

- **Archivos:** `docs/14` (A4.8). Sin cambios de codigo: el sondeo se hizo en un directorio temporal.
- **Resultado:** `earthaccess` 0.19.0 instala bien y la **busqueda** de granulos sin iniciar sesion responde sobre Isla (-95.53, 18.03) para SMAP L3 36 km (`SPL3SMP`), SMAP L3 9 km (`SPL3SMP_E`), GPM IMERG diario (`GPM_3IMERGDF`) y MODIS NDVI (`MOD13Q1`). La **descarga exige una cuenta de NASA Earthdata**; no hay credenciales y no se piden por el repo.
- **Estado:** A4.8 queda `[BLOQUEADO]` hasta que alguien del equipo confirme una cuenta Earthdata (usuario y contrasena, o token, como variables de entorno `EARTHDATA_USERNAME` y `EARTHDATA_PASSWORD`, nunca subidas). No es camino critico: en el plan de recorte de `docs/14` es de lo primero que se sacrifica.
- **No se reviso** que variables traen los productos ni se descargo ningun dato, asi que no se afirma nada sobre su utilidad para el motor.

### 2026-11-14 (noche) — Despliegue unico de main cd3fed2 y API a contratos 0.9.0 (Eduardo)

- **Despliegue (pedido de Mompin #36 y #46):** el droplet corre `main` en `cd3fed2`: API con OpenLandMap, Saxton-Rawls y el paquete de demo; front con la escena 3D y el Worker del motor, construido en el propio droplet (`npm ci` + `npm run build`, node 20.20.1) y copiado a `/var/www/agrohive-web` con respaldo del anterior; `rasterio` 1.5.2 instalado sin problemas (probado antes en un entorno temporal). nginx sin cambios.
- **Verificado desde fuera:** `/` 200 con el bundle nuevo, `/health` trae `commit: cd3fed2`, `/api/suelo` de Isla da TAW 122.3 mm/m por Saxton-Rawls con ISRIC y OpenLandMap, `/api/proxima-temporada` da 6 meses, `mediworks.mx` sigue en 200.
- **Cambio en la API:** `VERSION_CONTRATO` pasa a 0.9.0 (el contrato actual; `/health` del servidor dice 0.7.0 hasta que este cambio llegue a `main`).
- **Incidente:** la segunda sesion de Eduardo anuncio un despliegue paralelo cuando el mio ya iba a la mitad; se avisó por el buzon y el servidor quedo sin cambios de ella. Regla para la proxima: una sola sesion despliega y anuncia antes por el buzon.

### 2026-11-14 (noche) — API a contratos 0.8.0 y cronograma al dia (Eduardo)

- **Archivos:** `api/app/config.py`, `api/tests/test_basico.py`, `docs/14`, vistas del cronograma.
- **Cambio:** `VERSION_CONTRATO` de la API pasa a 0.8.0. Los schemas que usa la API (`serie-clima`, `suelo`, `proxima-temporada`, `cultivo`, `parcela`) no cambiaron en 0.8.0 (cambia `resultado-rotacion`, del motor), asi que no hay otro ajuste.
- **Cronograma:** A4.8 pasa a `[EN CURSO]` (sondeo de viabilidad de SMAP/GPM por la segunda sesion de Eduardo, sin tocar el repo). Estado: 22 de 56 hechas (39 %); Eduardo 9 de 15, Mompin 10 de 14, Mafer 3 de 12, balam 0 de 16.
- **Verificaciones:** api 60, contratos 63/63, catalogos y unittest de Mafer, build de web ok. `npm test` de web falla 2 pruebas del motor y la escena que afirman `NO_EVALUABLE` para el suelo de Isla: las actualiza Mompin en el merge atomico con mi `suelo.json`.

### 2026-11-14 (noche) — A4.6: cliente de la API para el front (Eduardo, con balam)

- **Archivos:** `web/src/api/` (`cliente.ts`, `usarApi.ts`, `cliente.test.ts`, `README.md`), `docs/14`. Carpeta nueva, sin tocar `web/src/ui`, `paginas`, `motor` ni `escena`.
- **Cambio:** funciones tipadas para `/api/clima`, `/api/suelo`, `/api/proxima-temporada`, `/api/cultivos`, `/api/elevacion` y `/health`, que devuelven `{ok, datos}` o `{ok: false, error: ERROR_DATOS}` y nunca lanzan; hook `usarApi` con los estados de `<DataState>`; `VENTANA_ESTANDAR` (2005-10-01 a 2025-12-31). Los datos usan `contratos/tipos`; el cliente generado de OpenAPI solo describe `/api/elevacion` (regla del 14/11).
- **Evidencia:** 10 pruebas nuevas con `fetch` simulado (exito, 503, 422, red caida, cuerpo no JSON, tiempo agotado, cancelacion, POST de terreno); typecheck en verde.
- **Pendiente:** conectar las paginas de balam y el motor de Mompin. A4.6 queda tambien en mi fila del tablero (Mompin la asigno a los dos); la fila de Mompin sigue listandola.
- **Nota:** `npm test` en `web/` falla hoy 2 pruebas del motor y la escena que afirman `NO_EVALUABLE` para el suelo de Isla: es el cambio atomico que Mompin integra con mi `suelo.json`.

### 2026-11-14 (noche) — A2.16 conectada: TAW y retencion en /api/suelo; /health con commit (Eduardo)

- **Archivos:** `api/app/pedotransferencia.py` (nuevo), `api/app/servicios.py`, `api/app/modelos.py`, `api/app/config.py`, `api/app/main.py`, pruebas, `datos/demo/` (paquete regenerado), `api/README.md`.
- **Cambio:** `GET /api/suelo` devuelve `agua.tawMmPorM`, `metodoTaw` y `retencion` por Saxton y Rawls (2006), usando `datos/catalogos/saxton_rawls.py` de Mafer sin copiarlo. Para la parcela demo (franco arcillo arenoso, que FAO-56 Tabla 19 no cubre): **TAW 122.3 mm/m**, thetaSat 0.454, thetaFC 0.293, thetaWP 0.171 m3/m3, con arena 48.4 %, arcilla 25.7 % y materia organica 2.79 % (de 16.2 g/kg de carbono organico de ISRIC x 1.724). `suelo.json` del paquete de demo ya los trae, validado contra `suelo.schema.json`.
- **Decisiones mias, a confirmar:** (1) Saxton-Rawls va **antes** que la tabla FAO-56 porque da la retencion que el motor necesita para GWETROOT; la tabla queda de respaldo; (2) con estimacion EXPLORATORIA (pixeles a mas de 1 km) o sin carbono organico el TAW es NO_EVALUABLE con su motivo; (3) el factor 1.724 (MO = 1.724 x C organico) **cita cerrada el 14/11**: Batjes y van Oostrum (2023), *WoSIS Procedures Manual*, ISRIC Report 2023/01, p. 25 ("soil organic matter contains 58% C hence the commonly used conversion factor of 1.724 ... may be up to 2.0 for topsoils and even 2.5 for subsoils"; leida del PDF, https://files.isric.org/public/documents/WoSIS_analytical_method_descriptions_2023.pdf). La atribucion a van Bemmelen (1890) es la convencional; hay un articulo de 2020 que la discute. **Sensibilidad en Isla:** con 1.724, 2.0 y 2.5 la materia organica es 2.79, 3.24 y 4.05 % y el TAW 122.3, 124.1 y 127.4 mm/m (+4 % en el extremo). Se cito la fuente de ISRIC y no la hoja del NRCS (que menciona 1.72) porque esa no se pudo abrir.
- **Tambien:** `VERSION_CONTRATO` de la API pasa a 0.7.0 y `/health` incluye `versionContrato` y `commit` (pedido de Mompin #42).
- **Pendiente:** un solo PR con A2.15 + esta conexion + paquete regenerado; Mompin integra y yo despliego una vez.

### 2026-11-14 (noche) — A2.15: OpenLandMap en /api/suelo (Eduardo)

- **Archivos:** `api/app/clientes/openlandmap.py`, `api/app/servicios.py`, `api/requirements.txt` (rasterio), pruebas, `api/README.md`, `AgroVault/Compartido/APIs.md` y `Pendientes.md`, `datos/pruebas-apis/respuestas/openlandmap_estimacion.json`.
- **Cambio:** `GET /api/suelo` devuelve en `estimaciones` las dos fuentes (ISRIC 250 m y OpenLandMap 30 m) y `estimacionUsada` (ISRIC por defecto; OpenLandMap si ISRIC no responde, con la advertencia `SUELO_ISRIC_NO_DISPONIBLE`). Si OpenLandMap falla, el endpoint sigue con ISRIC y `OPENLANDMAP_NO_DISPONIBLE`.
- **Fuente / evidencia:** lectura real del 14/11 en (-95.53, 18.03): OpenLandMap da arcilla 28 %, arena 48 %, limo 24 % (la **misma clase** que ISRIC, franco arcillo arenoso), pH 5.9 contra 5.4 de ISRIC y carbono 8.2 g/kg contra 16.2 g/kg de ISRIC (ambos 0-30 cm): **coinciden en textura y difieren en pH y sobre todo en carbono (el doble)**, dato relevante para A2.16 (Saxton-Rawls usa materia organica).
- **Decision mia, a confirmar:** ISRIC sigue como estimacion usada (es la verificada con su documentacion); cambiar a OpenLandMap es una linea.
- **Ojo para el despliegue:** nueva dependencia `rasterio` (rueda con GDAL); la primera consulta en frio tarda unos 12 s.

### 2026-11-14 (noche) — Marcador de chamba en el buzon de quejas (Eduardo, pedido de Mompin #28)

- **Archivos:** `herramientas/cronograma.py`, `herramientas/quejas-ia/QUEJAS.md` (bloque entre marcadores) y `README.md`.
- **Cambio:** `cronograma.py` ahora tambien escribe, al inicio de `QUEJAS.md`, un "Marcador de chamba": avance por persona ponderado por esfuerzo (XS=1, S=2, M=3, L=5), hechas, en curso y pendientes, ordenado de mas a menos, con una linea por lugar. Reutiliza el parser de `docs/14`; corre cada vez que se regenera el cronograma y `--revisar` tambien lo vigila.
- **Regla de la casa:** las lineas solo usan numeros reales del tablero y hablan del trabajo, no de la persona.

### 2026-11-14 (noche) — A2.4: paquete de demo conforme a contratos (Eduardo)

- **Archivos:** `datos/demo/` (generador, cache, `respuestas/`, manifiesto y LEEME), `api/app/servicios.py`, `api/app/proxima.py`, pruebas, `api/README.md`, `docs/14`.
- **Cambio:** el paquete se regenera con la **ventana `2005-10-01` a `2025-12-31`** que pidio el motor (Mompin, #27): 20 anios agricolas completos. Es `servicios.VENTANA_ESTANDAR` y tambien la usa la proxima temporada. El generador llama a la API por dentro, **valida las 4 respuestas contra `contratos/`** y guarda el cuerpo de cada una en `datos/demo/respuestas/` para que el motor las lea directo, ademas de la cache. Sin red: `/api/clima`, `/api/suelo` y `/api/proxima-temporada` responden 200 (probado con un proxy inexistente); con otro periodo, 503.
- **Evidencia para C2:** el selector de escenarios del motor (`seleccionarEscenarios`) corre con `respuestas/serie-clima.json` y devuelve `EVALUABLE`: seco 2023, **habitual 2008**, lluvioso 2024 (Mompin reporto 2016 como habitual; la diferencia viene de la ventana, que ahora incluye oct-dic 2005, a revisar por el motor).
- **Zona:** Isla (INEGI 30/077, A0.6 de Mafer, que da el municipio y no coordenadas). La parcela sigue siendo ficticia (2 ha); su centroide `(-95.53, 18.03)` coincide con la localidad de Isla (`VERIFICAR`).
- **A avisar:** el front debe pedir esas fechas exactas; la cache de POWER y suelo cambio de clave, asi que el paquete anterior (ventana 2006) ya no sirve.

### 2026-11-14 (tarde-noche) — API: contratos 0.5.0, GWETROOT y revision de Mompin (Eduardo)

- **Archivos:** `api/` (modelos, servicios, clientes, rutas, pruebas, OpenAPI y cliente TS), `datos/pruebas-apis/`, `docs/14`, `AgroVault/Compartido/Pendientes.md`.
- **Cambio, siguiendo la revision de Mompin (mensaje #4):** (1) las respuestas de clima, suelo, proxima temporada, elevacion y cultivos se validan **completas** contra los schemas de `contratos/` (`serie-clima`, `suelo`, `proxima-temporada`, `cultivo`, `parcela`); (2) modelos mas estrictos: `esEjemplo`, `etiqueta` y `estado` obligatorios y `clase` de textura limitada a las 12 clases; (3) los 503 devuelven `{estado: ERROR_DATOS, motivo}` como declara el OpenAPI, ya no `{detail}`; (4) `/api/cultivos` tiene `response_model`; (5) ISRIC con pixeles a mas de 1 km sale `EXPLORATORIO`, no `EVALUABLE`; (6) V-06: POWER pide `GWETROOT` y la API lo devuelve como `humedadRaizFraccionSat` (sin convertir) con el metadato `humedadSuelo`; (7) `/api/suelo` devuelve `estimaciones` (hoy solo ISRIC, con carbono organico en g/kg) y `estimacionUsada`.
- **Fuente / evidencia:** GWETROOT real de POWER (fraccion 0 a 1, `datos/pruebas-apis/respuestas/power_ag.json`); carbono organico de ISRIC `soc` (dg/kg dividido entre 10, FAQ de ISRIC); 51 pruebas en verde.
- **Cambio de comportamiento a avisar:** los 503 ya no traen `detail`; la clave de cache de POWER y de suelo cambio (`power_v2`, `suelo_isric_v2`), asi que el paquete de demo anterior no sirve y hay que regenerarlo.
- **Pendiente mio:** regenerar el paquete de demo (A2.4) con la zona real de Mafer y el periodo `2005-10-01` a `2025-12-31` pedido por Mompin, y el cliente de OpenLandMap (A2.15).

### 2026-11-14 (noche) — Cronograma por persona y marcas al dia (Eduardo)

- **Archivos:** `herramientas/cronograma.py` (nuevo), `docs/14-CRONOGRAMA.md`, `docs/cronograma.html` (regenerado), `AgroVault/Compartido/Cronograma.md` (nueva), `AgroVault/Bienvenido.md`, `AgroVault/Compartido/Lectura.md`.
- **Cambio:** el cronograma ahora se ve por persona (Mompin, Eduardo, Mafer, balam) con estado por actividad, en tres vistas generadas desde las marcas de `docs/14`: una seccion nueva "Estado por persona", la pagina `docs/cronograma.html` (ya no filtra por R1 a R4 ni guarda marcas en el navegador) y una nota de Obsidian. El HTML dejo de tener datos propios: no se desfasa de `docs/14`.
- **Marcas puestas (verificadas):** A0.1 y A0.2 hechas (repo con `main` y 4 ramas; `docs/` en el repo); A1.4, A1.5 y A1.6 ya estaban marcadas por Mafer solo en el tablero y se copiaron a sus filas; A1.2 `[EN CURSO]` (build y rutas P0 a P3 verificados, falta el Worker del motor segun el README de balam); A5.4 y A5.8 `[BLOQUEADO]`.
- **Estado:** 11 de 54 hechas (20 %): Mompin 2, Eduardo 6, Mafer 3, balam 0. A0.3 queda sin responsable unico.
- **Pendiente de otros:** balam debe confirmar si A1.2 pasa a hecha cuando exista el Worker; Mafer, que `[HECHO]` de A1.4 a A1.6 ahora tambien esta en sus filas.

### 2026-11-14 (noche) — A2.4: paquete de demo sin internet (Eduardo)

- **Archivos:** `datos/demo/` (generador, manifiesto, cache y LEEME), `api/app/cache.py`, `api/app/clientes/terrarium.py`, `api/app/proxima.py`, `api/app/config.py`, pruebas, `api/README.md`, `docs/14`.
- **Cambio:** la API lee `datos/demo/cache/` cuando falta su cache local. Con el paquete responden sin red clima 2006-2025, elevacion, suelo y proxima temporada de la parcela demo (probado con la red forzada a fallar: 200 en milisegundos; sin paquete, 503). El pronostico estacional guarda ahora su fecha de consulta y, si esta vencido y no hay red, se sirve con la advertencia `ESTACIONAL_EN_CACHE` y su fecha real en `emitido`.
- **Limite:** la parcela es la de `contratos/ejemplos/parcela.ejemplo.json` (coordenadas ilustrativas cerca de Isla); los datos son reales para esa coordenada. Hay que regenerar con `datos/demo/generar.py` cuando A0.6 confirme la zona.
- **Fuente / evidencia:** 43 pruebas, incluidas las del paquete; generado el 2026-11-14 desde NASA POWER, ISRIC, Terrarium y Open-Meteo.
- **Pendiente:** A5.8 (capturas y demo completa con la red apagada) depende de que el front llame a la API (A4.6).

### 2026-11-14 (noche) — A4.7: front servido desde el droplet (Eduardo)

- **Archivos:** `api/despliegue/` (nginx, proxy y script), `AgroVault/Compartido/Servidor.md`, `docs/14`. Cambios en el droplet: `/var/www/agrohive-web`, `/etc/nginx/agrohive-proxy.conf` y el server block de AgroHive.
- **Cambio:** `https://64-23-143-102.sslip.io/` sirve el build de `web/` (esqueleto de balam, A1.2) y la API sigue en `/api/`, `/health` y `/docs` del mismo origen. No hace falta CORS para esa ruta.
- **Verificacion:** `/` 200 html, asset 200, `/health` y `/api/cultivos` 200, `mediworks.mx` sigue en 200; `nginx -t` antes de recargar y respaldo del bloque anterior en el droplet.
- **Pendiente:** la demo real depende de que el front llame a la API (A4.6, balam y Eduardo).

### 2026-11-14 (noche) — Calendario local, fecha elegida por el usuario y A2.8 `[DECIDIDO]`; contratos 0.5.0

- **Archivos:** `03`, `05` (paso 2), `06` (selector), `08`, `13`, `14` (A0.6, A2.8, A3.4); `contratos/` 0.5.0 (`cultivo`, nuevo `calendario-local`, `plan-siembra`, `resultado-rotacion`, `resultado-celda`, `comun.temporada`); vault.
- **Cambio y motivo:** decisiones de Mompin.
  1. Las ventanas de siembra dependen del lugar: salen del catálogo de cultivos y pasan a `calendario-local` (municipio con clave INEGI, cultivo, temporada PV/OI, ventana con fuente y presencia del cultivo en el lugar).
  2. La fecha de siembra la elige el usuario. El plan guarda el calendario usado (o "sin calendario local") y un `porQue` por ciclo para la interfaz.
  3. Un cultivo se puede mostrar sin recomendarlo en el lugar (caso: calabaza en Isla, que SIAP 2021-2025 no registra). Va en `cultivosNoRecomendados` en la rotación y en `noRecomendadoEnLugar` en la celda, con motivo y fuente; con eso la rotación no puede ser `EVALUABLE`. Los estados actuales no bastaban porque no llevan cultivo ni fuente.
  4. A2.8: opción (c) `temporada_tipica`, fija en el plan.
- **Fuente / evidencia:** decisión del evento transmitida por la sesión maestra. El caso de calabaza en Isla es un dato de SIAP que reportó el equipo; en los ejemplos aparece como ficticio. `npm test` pasa 52/52.
- **Decisiones afectadas:** A2.8 y V-20 (forma). **Cambio incompatible:** `datos/catalogos/cultivos.json` deja de validar hasta que se quite `ventanasSiembra`.

### 2026-11-14 (noche) — Decisiones de suelo, clima, pronóstico y servidor `[DECIDIDO]`; contratos 0.4.0

- **Archivos:** `11`, `13`, `14` (A2.13 y nuevas A2.15 y A2.16); `contratos/` 0.4.0 (`suelo`, `clima-escenario`, `proxima-temporada` y nuevo `serie-clima`); `AgroVault/Compartido/{Pendientes,Resumen,APIs,Contratos}.md`.
- **Cambio y motivo:** decisiones de Mompin en el evento.
  1. **TAW:** se calcula con la pedotransferencia de Saxton y Rawls (2006) para cualquier textura, incluidas las tres clases sin fila en FAO-56 Tabla 19, desde arena, arcilla y materia orgánica de SoilGrids, como `SUPUESTO`. Mientras no esté, la demo usa el selector manual. El contrato `suelo` declara `metodoTaw` con su fuente y la retención θsat, θFC y θWP.
  2. **`serie-clima`:** nuevo contrato para la respuesta de `GET /api/clima`, tomado de `SerieClima` en `api/app/modelos.py`.
  3. **A2.13:** queda aprobado el método de Eduardo (distribución histórica por mes desplazada por la anomalía de SEAS5, sin tendencia y con advertencia).
  4. **V-21:** horizonte de 6 meses; `horizonteMeses` pasa a ser fijo en 6.
  5. **V-23:** se usan ISRIC y OpenLandMap; `suelo.estimaciones` y `estimacionUsada`.
  6. **V-08:** Terrarium por defecto y Open-Meteo de respaldo.
  7. **V-06:** `GWETROOT` entra como condición inicial y como comparación (`humedadRaizFraccionSat` y `humedadSuelo`).
  8. **V-15 a V-17:** cerrados con `sslip.io` y Let's Encrypt.
- **Riesgo registrado:** `GWETROOT` es fracción de saturación (MERRA-2, ~100 cm; el metadato de POWER que dice 200 cm es un error reportado), no fracción de TAW. Se convierte con θsat, θFC y θWP; sin ellos, `NO_EVALUABLE`.
- **Fuente / evidencia:** Saxton, K. E. y Rawls, W. J. (2006), Soil Sci. Soc. Am. J. 70(5): 1569-1578, doi:10.2136/sssaj2005.0117 (registro bibliográfico verificado; tabla y ecuaciones `[VERIFICAR]` contra el artículo). Foro de Earthdata sobre las unidades y la profundidad de `GWETROOT`. `npm test` en `contratos/` pasa 42/42.
- **Decisiones afectadas:** V-06, V-08, V-15, V-16, V-17, V-21 y V-23 quedan cerradas. A2.13 queda con el método aprobado.

### 2026-11-14 (noche) — Integracion de Mafer, balam y Eduardo en main (Eduardo)

- **Archivos:** toda la mezcla (merges `0e4411f`, `aa4d059`, `a57b98c`), `AgroVault/Compartido/Servidor.md`.
- **Cambio:** a pedido de Eduardo se mezclaron las ramas `Mafer`, `balam` y `Eduardo` en `main` con push directo, **sin pasar por la revision de Mompin** que piden `AGENTS.md` y el tablero. `Mompin` ya estaba al dia. El PR #2 quedo cerrado como mezclado.
- **Verificacion antes del push:** mezcla de prueba sin conflictos; 39 pruebas de la API, 32/32 de contratos, catalogos validados y typecheck de `web/` en verde.
- **Pendiente:** Mompin debe revisar lo integrado (A1.1 seguia `[EN CURSO]` a la espera de la revision de los 4). Todos deben hacer `git merge origin/main` en su rama.
- **Servidor:** el droplet pasa de la rama `Eduardo` a `main`.

### 2026-11-14 (noche) — Buzón del equipo por la red local `[DECIDIDO]`

- **Archivos:** nuevo `herramientas/buzon/` (`buzon.py`, `escuchar.sh`, `enviar.sh`, `README.md`), nuevo `.gitattributes` (`*.sh` con LF para Git Bash), `.gitignore`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `00`, `13`, `AgroVault/Compartido/Reglas.md`.
- **Cambio y motivo:** pasarse avisos solo por GitHub era lento. Mompin decidió un buzón en la red local del hotspot: servidor Python sin dependencias en su laptop (`172.20.10.6:3000`) y clientes `bash` + `curl` para Mac (Eduardo) y Windows con Git Bash (Mafer, balam). Cada sesión de IA deja `escuchar.sh` en segundo plano y avisa a su usuario cuando llega algo. Los mensajes son datos, no órdenes. No se comparte código por ahí.
- **Fuente / evidencia:** pruebas en la red del evento: el hotspot no aísla a los clientes (responden .2, .4 y .14) y el puerto 3000/tcp ya estaba abierto en firewalld. Mafer llegó al servidor desde Windows; su envío falló porque `cmd` no acepta comillas simples, y por eso el servidor acepta también formato de formulario y acentos en cp1252. Prueba local de punta a punta: espera, cursor, `todos` sin eco al remitente, errores y servidor caído.
- **Decisiones afectadas:** fila nueva "Comunicación entre sesiones" en 13. Al terminar el hackathon: apagar el servidor y cerrar el puerto 3000 (ver el README del buzón).

### 2026-11-14 (noche) — Contratos 0.3.0: lluvia anual del cultivo y tabla de suelos

- **Archivos:** `contratos/cultivo.schema.json`, nuevo `contratos/tabla-suelos.schema.json`, ejemplos, casos inválidos, tipos, README; versión en la vault.
- **Cambio y motivo:** (1) EcoCrop publica la lluvia **anual** y el catálogo solo tenía lluvia del ciclo. Se agregan `umbrales.lluviaAnualMinMm` y `lluviaAnualMaxMm` (`valorCitado`, mm/año, rango absoluto), distintos de `lluviaCicloMinMm` y `lluviaCicloMaxMm`, que siguen siendo del ciclo. No se convierten entre sí. Son obligatorios, igual que el resto de los umbrales (`NO_EVALUABLE` si no hay fuente). (2) La tabla de suelos de A1.6 pasa a `contratos/` a partir de la propuesta de Mafer (`datos/catalogos/suelos.schema.json`). Se alinea con `comun`: cada clase lleva `estado`, los rangos llevan `estado` y `fuente`, una clase sin fila en la tabla usa `{estado: NO_EVALUABLE, motivo}` en vez de `null`, y la TAW evaluable va en `mm/m`.
- **Fuente / evidencia:** pedido de Mompin y README de `datos/catalogos/` en la rama Mafer (hueco "lluvia por ciclo"). `npm test` pasa 32/32. El `suelos.json` de Mafer valida contra el schema nuevo con los cambios de forma descritos (simulación local, sin tocar su rama).
- **Decisiones afectadas:** ninguna. Mafer debe migrar `cultivos.json` y `suelos.json` a 0.3.0.

### 2026-11-14 (noche) — Tipos: los schemas de contratos/ son la fuente de verdad `[DECIDIDO]`

- **Archivos:** `AGENTS.md`, `README.md`, `08`, `13`, `14` (A1.3), `contratos/README.md`, `AgroVault/Compartido/{Reglas,Contratos,Pendientes,Resumen}.md`, `AgroVault/{Codex/AGENTS.md,Cursor/INSTRUCCIONES.md}` (`CLAUDE.md` lo actualizó la sesión maestra en 3876f60).
- **Cambio y motivo:** Mompin y Eduardo decidieron que los JSON Schema de `contratos/` mandan sobre los datos. Los tipos TS salen de `contratos/tipos/`, los modelos de FastAPI deben respetar los schemas con una prueba que lo verifique, y el cliente generado desde OpenAPI solo cubre las llamadas HTTP. Reemplaza "tipos solo desde OpenAPI" de 13 y cierra el pendiente de tipos de la vault. Al entregable de A1.3 se le suma esa prueba.
- **Fuente / evidencia:** decisión del equipo en el evento, transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** fila "Tipos compartidos" de 13.

### 2026-11-14 (noche) — docs/00 al día

- **Archivos:** `00`.
- **Cambio y motivo:** 00 seguía diciendo que la documentación vive en Drive y que no se podía escribir código. Ahora dice que vive en el repo (Drive como respaldo, según 13), que el hackathon ya inició e incluye la regla de verificar antes y después de trabajar. El índice suma 13, 14, 15, `AgroVault/` y `contratos/`, y corrige el enlace al README del agente `modelador-voxel`. El orden de lectura para todos pasa a 00 → 13 → 14 → 03 → 11. La sección de carpetas anteriores aclara que esas carpetas están en Drive.
- **Fuente / evidencia:** pedido de Mompin transmitido por la sesión maestra el 14/11; decisiones de 13.
- **Decisiones afectadas:** ninguna.

### 2026-11-14 (noche) — Ranking B pasa a `[DECIDIDO]`

- **Archivos:** `05`, `09`, `11`, `13`, `14`; `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`; `contratos/README.md` y la descripción de `resultado-rotacion.schema.json`.
- **Cambio y motivo:** Mompin confirmó que el criterio B ya está acordado por el equipo en el evento: deja de estar "por ratificar" y deja de ser `[EN EVENTO]`. Se mantienen el respaldo A y el riesgo de la entrada anterior. En 11 la fila pasa de "Se decide en el evento" a "Decisiones tomadas"; en 13 entra a la tabla de decididas y V-19 queda solo con la pintura por bloques.
- **Fuente / evidencia:** confirmación de Mompin transmitida por la sesión maestra el 14/11.
- **Decisiones afectadas:** V-19 (ranking) cerrada con B.

### 2026-11-14 (noche) — Ranking: criterio B (decisión de Mompin, falta ratificar)

- **Archivos:** `05` (paso 7), `11`, `13` (V-19), `09`, `14` (A4.2); `contratos/` 0.2.0 (`resultado-rotacion`, ejemplos, casos inválidos, tipos); `AgroVault/Compartido/{Pendientes,Resumen,Contratos}.md`, `AgroVault/Codex/AGENTS.md`.
- **Cambio y motivo:** Mompin eligió el criterio B del paso 7 de 05: puntaje compuesto por escenario, robustez = peor puntaje, minimax de arrepentimiento y desempate por promedio. Estaba `[EN EVENTO]`, así que queda pendiente de que el equipo lo ratifique. El contrato sigue aceptando A como respaldo y agrega `ponderacion` (pesos por pilar, etiqueta y pilares excluidos), obligatoria con B. Se quitó el "A por defecto" de la vault.
- **Riesgo:** B necesita los pilares 2 y 3 (A3.7) y pesos con fuente o justificados. Si no hay pesos, se usan pesos iguales declarados `SUPUESTO`, nunca inventados. Si A3.7 no llega, se usa el criterio A (solo pilar hídrico) y se dice en la tarjeta.
- **Fuente / evidencia:** decisión de Mompin transmitida por la sesión maestra el 14/11. `npm test` en `contratos/` pasa 25/25.
- **Decisiones afectadas:** V-19 (ranking) pasa de `[EN EVENTO]` a decisión de Mompin por ratificar; la pintura por bloques sigue `[EN EVENTO]`.

### 2026-11-14 (noche) — AgroVault alineado con contratos/ y regla de verificación

- **Archivos:** `AgroVault/Compartido/{Contratos,Pendientes,Reglas,Resumen}.md`, `AgroVault/Bienvenido.md`, `AgroVault/{Claude,Cursor}/INSTRUCCIONES.md`, `AgroVault/Codex/AGENTS.md`, `AGENTS.md`; notas en `04`, `08` y `13`.
- **Cambio y motivo:** la vault de Eduardo copiaba los ejemplos de 08, que ya no coinciden con `contratos/` (A1.1). Ahora `Contratos.md` resume y enlaza los schemas sin redefinirlos, y `Pendientes.md` refleja A1.1 hecha (falta la revisión de los 4), las decisiones abiertas (ranking A o B, A2.8 con las opciones a/b/c de 05 paso 2, alineación de tipos OpenAPI con los de `contratos/tipos/`) y lo decidido el 14/11. Se quitaron afirmaciones viejas ("no existe `contratos/`", "el tablero está vacío"). Lo que la vault tenía más nuevo que `docs/` se reflejó con notas breves: endpoints superados en 08, investigación de APIs en 04 y el horizonte de 7 meses de V-21 en 13. Regla nueva para todos, a pedido de Mompin: verificar los cambios antes y después de trabajar y actualizar la documentación afectada en vez de dejarla desfasada o duplicarla (en `AGENTS.md`, `Reglas.md` y las instrucciones de Claude, Codex y Cursor). La misma regla en `CLAUDE.md` queda pendiente de la confirmación de Mompin.
- **Fuente / evidencia:** `contratos/*.schema.json` v0.1.0; `AgroVault/Compartido/APIs.md` (investigación de Eduardo del 14/11, con sus `VERIFICAR`).
- **Decisiones afectadas:** ninguna se cierra. Se registra como pendiente la alineación de los dos generadores de tipos.

### 2026-11-14 (noche) — A1.1: contratos de datos v0.1.0

- **Archivos:** `contratos/` (8 schemas más `comun.schema.json`, ejemplos, validador, casos inválidos, `tipos/contratos.d.ts`, README).
- **Cambio y motivo:** primeros contratos como JSON Schema 2020-12, para que front, API y motor trabajen en paralelo contra los ejemplos. Respecto a los nombres sugeridos en 08: (1) `estado` pasa a ser siempre el estado de evaluación de 04 y el estado visual de la planta se llama `estadoPlanta`; (2) el suelo se separa de la parcela en su propio contrato (`parcela.sueloId`), con textura y pH etiquetados `SUPUESTO`; (3) nuevo contrato `proxima-temporada` (decisión del 14/11) que solo admite bandas de incertidumbre, sin cifra única; (4) los parámetros del catálogo usan `valorCitado` (valor con fuente o `NO_EVALUABLE`); (5) el resultado por rotación admite los criterios de ranking A y B, porque la elección sigue `[EN EVENTO]`; (6) `plan.asignacionClima` queda en `null` hasta decidir A2.8.
- **Fuente / evidencia:** docs 04, 05, 07, 08 y 13. Los ejemplos son ficticios (`meta.esEjemplo: true`) y las coordenadas de Isla son ilustrativas. `npm test` en `contratos/` pasa 22/22 (8 ejemplos válidos y 14 casos inválidos rechazados).
- **Decisiones afectadas:** ninguna decisión cerrada cambia. Falta la revisión de los 4 (entregable de A1.1).

### 2026-11-14 (tarde) — Pronóstico aproximado, pH, catálogo de cultivos y reparto por actividad

- **Archivos:** `13`, `14`, `cronograma.html`; notas de alcance en `00`, `03`, `04` y `10`.
- **Cambio y motivo:** tras la investigación de datos, el equipo aprobó (1) una capa aproximada "próxima temporada" como banda de incertidumbre, (2) mostrar pH y textura estimados por modelo global, (3) catálogo propio de cultivos en vez de una API, (4) zona demo en Isla con la milpa como núcleo, y (5) repartir el trabajo por actividad y no por rol.
- **Fuente / evidencia:** búsquedas web del 14/11 sobre Open-Meteo (estacional y Climate API), NASA POWER, SoilGrids/OpenLandMap, FAO EcoCrop, Trefle y Perenual. Varios datos vienen de páginas de terceros: quedan como `[VERIFICAR]` (V-20 a V-24).
- **Decisiones afectadas:** "no predice el clima" y "no mide pH" pasan a "no predice una temporada exacta" y "pH estimado, no medido". Nuevas actividades A0.6, A0.7, A2.13, A2.14 y A4.9 en 14.

### 2026-11-14 — Inicio del hackathon y decisiones de arquitectura

- **Archivos:** nuevos `13-DECISIONES-HACKATHON.md` y `14-CRONOGRAMA.md`; ajuste menor en `00` y en la ruta del agente `modelador-voxel`.
- **Cambio:** la documentación pasa de Drive al repositorio Git (`docs/`). Se deciden stack y servidor, y el cronograma se mide en esfuerzo de IA, no en horas.
- **Decisiones afectadas:** motor en TypeScript en el navegador con Web Worker; backend FastAPI (Python); polígono libre dentro del MVP; servidor DigitalOcean de Eduardo; sin dominio propio. Detalle en 13.

### 2026-11-13 — v2.0 consolidada vigente

- **Archivos:** carpeta nueva completa (00 a 12) y `agente-modelador-voxel/`.
- **Cambio:** se unifican en una sola fuente `docs/` (v0.2, 10/11) y `00 — ... v1.2` (11/11). Se revisaron las diferencias entre ambas y el equipo resolvió:
  - El equipo son **4 integrantes**. `[DECIDIDO]`
  - **Sí habrá relieve.** `[DECIDIDO]`
  - **Sí habrá selector de cultivos**: es un simulador tipo "what if". `[DECIDIDO]`
  - Documentación en **Google Drive** vía rclone o MCP; en el evento se podrá usar GitHub u otra herramienta. Notion deja de ser la fuente. `[DECIDIDO]`
  - Cada integrante usa su propia IA (ChatGPT, Claude, Cursor); no es relevante registrar qué IA editó qué. `[DECIDIDO]`
  - Los modelos 3D se hacen con **Blockbench** (`.bbmodel`), generados por el agente `modelador-voxel`. `[DECIDIDO]`
  - Hay que consolidar ambas carpetas en una (esta). `[DECIDIDO]`
  - Cronograma (48 h frente a 39 h): `[EN EVENTO]`.
  - Cultivos iniciales: `[EN EVENTO]`.
  - Pilares de la prueba de estrés (déficit hídrico, compatibilidad de ciclos, protección del suelo): lo ideal es todo; `[DEPENDE-DATOS]`.
  - Cómo se asigna el clima a cada ciclo de una rotación: es investigación, depende de las APIs, los campos y los cultivos. `[DEPENDE-DATOS]`
  - Incluir la rotación actual del agricultor y sus prioridades: `[MEJORA]`.
  - Detalles menores (numeración, secciones faltantes): se deciden después.
- **Se copió al Drive** el agente `modelador-voxel`, su librería `voxelkit.py` y el ejemplo de la zanahoria (práctica, no es cultivo del proyecto).
- **Las carpetas anteriores no se modificaron.**

### 2026-11-11 — v1.2 consolidada (carpeta anterior)

Consolidación basada en Notion v1.2 y en `docs/`. Ver `00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/01-REGISTRO-DE-CAMBIOS.md`.

### 2026-11-10 — v0.2 de Mompin (carpeta `docs/`)

Primera documentación por tema a partir del video del compañero, el audio de la reunión y la verificación de APIs. Ver `docs/DOCUMENTACION_MAESTRA.md`.

### 2026-11-14 — Cierre A1.2
- App.tsx y ui/useMotor.ts inicializan el Worker existente sin modificar motor ni contratos. Confirmacion mediante olvidar, timeout y limpieza al desmontar. Se actualiza el tablero y README. Sin cambio de alcance cientifico.

### 2026-11-14 — A2.10 y A2.9: mapa y cuadrícula de Balam
- Terreno conserva su diseño e incorpora Leaflet con mapa OpenStreetMap y atribución, dibujo por clic/toque o coordenadas, deshacer y reiniciar. La carga del mapa es diferida.
- `ui/cuadricula.ts` valida anillos y cruces, genera cuadrados locales y recorta bordes con Turf; máximo 1600 celdas. No calcula indicadores. Elevación y pendiente faltantes quedan null.
- Se incorpora sin cambios el cliente API de Eduardo (`2e517c6`). La UI confirma antes de POST /api/elevacion, muestra fuente, estado y advertencias; permite reintentar o guardar sin relieve. App conserva la parcela durante la navegación; recargar inicia otra sesión.
- Verificación: geometría y schema compartido, build/TypeScript; navegador a 1440/390/320 px, error 503 y éxito con respuestas sintéticas declaradas, persistencia y guardado sin elevación. No se afirma validación agronómica ni disponibilidad del servicio público.
- Sin cambios de alcance; límites técnicos documentados en `web/src/ui/TERRENO-PLAN.md`. El selector y la simulación desde las páginas siguen pendientes.

### 2026-11-14 — Sistema visual global y A3.4 A3.5 A4.9 de Balam
- Autorización: Balam aprobó en el chat el laboratorio de tres paneles, fechas con fuentes y banda opcional; pidió usar su DESIGN.md Duna y las habilidades better-interface/better-ui.
- DESIGN.md incorpora la referencia recibida y documenta las adaptaciones a AgroHive. Tokens en ui/tokens.css y reglas en ui/system.css se comparten entre Inicio, Terreno y laboratorio/comparación. Se conservan estados semánticos de la escena. No se añadió fuente licenciada ni remota.
- El laboratorio usa planes R1 a R4 derivados de los casos de regresión del motor, con fechas de plan editables 2026/2027; la comparación no fija posiciones en la UI. Calendario de Isla solo en la demo. dentroDeVentana se valida con el helper ya existente del motor; porQue y fuente acompañan la fecha. Cultivos no recomendados se identifican con motivo y fuente.
- ui/useLaboratorio.ts reutiliza el cargador API de Eduardo para parcelas propias y el paquete precargado para la demo. Cambiar plan invalida resultados y reemplaza el Worker. Escenario/ciclo/fecha y visibilidad de banda no vuelven a simular ni descargar datos. Planes y selecciones sobreviven a la navegación durante la sesión.
- La escena se monta con carga diferida y la parcela guardada en App, resultados y fecha; se habilitan modelos fuera de web en desarrollo. A4.9 muestra la banda mensual y los años análogos del motor con estados, motivos, fuentes y aviso de no predicción.
- Verificación: JSON Schema de planes, R1 ciclo 2 seco muestra frijol/2023 y estado del motor; pruebas, build y TypeScript. Chromium a 1440/1024/768/390/320, navegación P2/P3, mensajes del Worker, error API/reintento simulado, teclado y movimiento reducido. Axe sin incidencias automáticas en los estados revisados de P2/P3. Evidencia y límites en web/evidencia/revision-sistema.md.
- La plantilla documental System Design no pudo renderizarse por falta de LibreOffice; no se entrega un documento sin verificar. La funcionalidad y revisión web sí se completan. A4.6 continúa en curso: no se declara validada la disponibilidad pública ni todas las combinaciones de carga en vivo.

### 2026-11-14 — A4.3 A4.5 y A4.6 de Balam
- A4.3: `TarjetasRotacion` muestra por rotación la explicación recibida del motor, beneficios, evidencia y fuentes, riesgos y huecos siempre visibles; no genera texto con LLM ni calcula indicadores.
- A4.5: ruta `#/metodo` con fuentes de la sesión (período, resolución, coordenada, unidades y citas), advertencias, supuestos y límites; conserva selecciones al volver. Comparte tokens y controles con el laboratorio. Pruebas de extracción de fuentes y tarjetas.
- A4.6: Laboratorio y Comparación usan `usarDatosParcela` desde su estado compartido; no se duplica el cargador. Se avisó a Eduardo antes de ajustar la guarda de clave del hook: al cambiar centroide o reintentar oculta el estado anterior; las peticiones se cancelan al cambiar.
- Verificación funcional en Chromium contra FastAPI local real, usando el paquete precargado y un proxy de QA hacia 127.0.0.1:8017: GET clima (ventana estándar), suelo, cultivos y próxima temporada devuelven 200, el Worker procesa la parcela dibujada y se llega a comparación. Se guardó sin relieve de forma explícita; no se inventaron alturas. Fallos/reintentos ya tienen pruebas del cliente y recorrido con 503 simulado.
- La descarga anticipada de la serie no se reprodujo en el build de producción con caché de navegador nueva: Inicio no solicitó serie-clima; laboratorio sí. Se mantiene import dinámico. No se presenta esta prueba local como verificación del despliegue público.
- Tras integrar main, la escena recibe también suelo y la demo usa R1/R2/R4, según la decisión de 13. A3.8 se conserva como entrega de la sesión de escena.
- A4.1 sigue pendiente de la operación serieBalance del Worker; el contrato serie-balance ya llegó. Solicitud a Mompin #127 y respuesta #132. No se agrega el balance en la interfaz.

### 2026-11-14 — A4.1 dashboard conectado de Balam
- Tras la entrega de serieBalance por Mompin, el dashboard pide al Worker la serie de la rotación/escenario calculados. Las sumas mensuales, la demanda y el balance se reciben del motor; la UI solo representa y formatea. No usa los valores ficticios del ejemplo.
- `ui/DashboardBalance.tsx` usa Recharts con carga diferida al abrir las gráficas. Cada ciclo muestra lluvia/ETc/consumo ajustado y déficit/percolación mensuales, unidades, estado, fuentes, TAW y una tabla con humedad media y mes climático. Datos faltantes se muestran como NO_EVALUABLE. Los trazos distinguen las series sin depender del color; sin animación y con tabla accesible.
- Se comparó el primer valor de lluvia de la tabla contra el mensaje recibido del Worker; coincide. Instrumentación confirmó que cambiar escenario consulta serieBalance sin reenviar simular. Layout estable tras ResizeObserver a 1440/768/390/320 px; axe sin incidencias automáticas en el estado revisado. Captura dashboard-320.png.
- A4.1 se marca HECHO; las notas anteriores de espera describen el estado previo a la llegada de la operación del motor. Recharts está fijado a la versión exacta registrada en package.json/lockfile. Referencias técnicas en web/README.md.

### 2026-11-14 — A4.8: producto SMAP en la respuesta y login de earthaccess con candado
- **Cambio:** `GET /api/smap` ahora devuelve `producto` (`SPL3SMP`, 36 km, 0 a 5 cm, `m3/m3`), como pide `contratos/smap.schema.json` (de Mompin); las pruebas validan la respuesta completa contra ese schema, incluidos los días sin dato y con error de la fuente.
- **Corrección de una revisión:** `earthaccess` guarda el login en estado global y la ruta lee hasta 3 días a la vez en hilos distintos. La sesión autenticada se crea una sola vez, bajo `threading.Lock`, y se reutiliza 30 minutos (prueba con 6 hilos: un solo login). El token sigue saliendo solo de `EARTHDATA_TOKEN`.
- **Sin cambio de alcance.** El token en el droplet y el despliegue siguen siendo de la sesión A; esta rama no toca NDVI (A4.11 está en pausa).
- **Verificación:** api 87, contratos 91/91, catálogos y `unittest`, `tsc` y vitest de web (338) en verde.

### 2026-11-14 — Vista satelital predeterminada en el mapa de Balam
- Balam aprobó en el chat usar vista satelital por defecto, con selector para volver al mapa de calles. MapaParcela alterna Esri World Imagery y OpenStreetMap manteniendo el mismo mapa, vértices y cuadrícula; no consulta de nuevo clima, suelo ni elevación.
- Se conserva la atribución del servicio activo. El crédito de World Imagery se tomó de copyrightText del servicio oficial (consulta 14/11/2026): Esri, Vantor, Earthstar Geographics y GIS User Community. Se aclara en pantalla que las imágenes no son en vivo y que fecha/detalle dependen del lugar; no se inventa su fecha de captura.
- Contorno con borde oscuro y trazo blanco sobre satélite, vértices con relleno contrastado y cuadrícula visible. Las imágenes son solo fondo de orientación; no cambian parámetros del motor ni identifican cultivos.
- Chromium sobre build de producción: teselas reales de ambos servicios cargaron, cuatro vértices y cuadrícula persistieron al alternar, sin consultas a /api/; sin desbordamiento a 320 px. Se forzó fallo de teselas satelitales y se recuperó cambiando a calles. Captura web/evidencia/mapa-satelital.png.

### 2026-11-14 — Correcciones de la verificación de citas: inicio de IMERG y licencia de POWER
- **Cambio:** `INICIO_IMERG` pasa de 2000-06-01 a **1998-06-01** (`api/app/clientes/power.py`), con dos pruebas: la petición se recorta a 1998-06-01 y un rango de 1999 ya no se recorta. Antes la API descartaba dos años de datos válidos de IMERG V07 para rangos que empiezan antes de 2000-06-01. No cambia la ventana estándar de la demo (2005-10-01 a 2025-12-31).
- **Fuente / evidencia:** la metodología de POWER lista "IMERG Precipitation, 0.1 grados, diario UTC, inicio June 1, 1998" (https://power.larc.nasa.gov/docs/methodology/); el catálogo CMR de NASA da cobertura de `GPM_3IMERGDF` V07 desde 1998-01-01. Esto **desmiente** la nota anterior de que los valores no nulos de 1999 eran "de origen no verificado": son IMERG V07 válidos.
- **`APIs.md`:** se quita "Licencia CC BY 4.0" de NASA POWER. Su guía de referencia (`docs/referencing`, `docs` y `docs/services/api`) no declara licencia; los datos de misiones NASA siguen la política general de Earthdata (CC0 salvo restricción marcada), `VERIFICAR`. Se conserva la cita obligatoria.
- **Pendiente de otros dueños (no se tocó):** `contratos/clima-escenario.schema.json` (descripción de `lluviaSatelital`) y `features/imerg/LEEME.md` y `features/encargos/eduardo-datos-globales.md` siguen diciendo 2000-06-01 (Mompin); los DOI del `README.md` (IMERG diario y carbono orgánico de OpenLandMap) son de Mafer.

### 2026-11-14 — Cancelación de video y presentación y ajustes de revisión de Balam
- Balam pidió expresamente cancelar video y presentación. A5.6 queda CANCELADA en una sección fuera de las fases/reparto; no cuenta como pendiente ni como hecha. Se actualizan 13, 14 y el encabezado del borrador histórico; no se alteran las reglas externas del evento.
- AvisosDatos conserva los objetos del hook de la API para parcelas propias; en la demo se construye con avisosDe y las respuestas precargadas. Se pasan a la escena sin aplanar códigos, origen o severidad; Suelo SUPUESTO vuelve a estar visible.
- Tabla y tarjetas se ordenan por la posición recibida del motor, dejando las no ordenadas al final; no se fuerza una clasificación ni se modifican los resultados. R4 encabeza la demo actual.
- Método agrupa bibliografía por publicación (Saxton y Rawls, EcoCrop, FAO-56, etc.) conservando las citas y metadatos originales. Incluye condiciones y atribuciones del README y enlaces oficiales, Esri World Imagery y OpenStreetMap. Los permisos no confirmados siguen marcados como no verificados; POWER no se etiqueta como CC BY sin confirmación en la guía. La revisión humana de licencias sigue pendiente.
- Se separa el bloque de pesos y se actualiza el texto de Terreno sobre la integración ya hecha.
- Chromium sobre build de producción: Suelo SUPUESTO visible, R4 primera en tabla y tarjetas, una cabecera por publicación, enlaces de Esri/OSM, sin desbordamiento a 320 px y axe sin incidencias automáticas en el estado revisado de Método. Pruebas de agrupación sin pérdida de citas y orden inmutable añadidas. Sin cambios al motor ni a contratos.
- Seguimiento tras integrar las correcciones de Mafer del README: se distingue el STAC de 30 m de los registros Zenodo de 120 m de OpenLandMap, se corrige carbono mediana 15535759 y se mantiene pendiente la correspondencia exacta. Esri queda expresamente sujeto al Master License Agreement y a revisión humana para el uso fuera de ArcGIS. La atribución del mapa de calles se completa con OpenStreetMap contributors.
