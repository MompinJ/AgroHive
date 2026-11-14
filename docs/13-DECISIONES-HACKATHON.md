# 13 · Decisiones del hackathon (14/11/2026)

Estas decisiones se tomaron al iniciar el evento y **prevalecen** sobre las propuestas de 03, 08 y 09. Lo que no se menciona aquí sigue como está en esos documentos.

## Decididas `[DECIDIDO]`

| Tema | Decisión | Reemplaza a |
| --- | --- | --- |
| Estado del evento | El hackathon **ya inició oficialmente**: se puede escribir código | Regla de "no código antes del inicio" en 00, 02, 09, 12 |
| Motor de simulación | **TypeScript en el navegador**, dentro de un **Web Worker** | "Navegador o servidor" `[EN EVENTO]` en 08 |
| Backend | **Python + FastAPI**: proxy y caché de APIs, cliente de datos, extras de Earthdata | Alternativas de 08 |
| Tipos compartidos | Los JSON Schema de `contratos/` son la fuente de verdad de los datos: los tipos TS salen de ahí (`contratos/tipos/`) y los modelos de FastAPI deben respetarlos, con una prueba que lo verifique. El cliente generado desde OpenAPI solo cubre las llamadas HTTP. (Mompin y Eduardo, 14/11) | Primera versión del 14/11: "tipos solo desde OpenAPI" |
| Polígono libre | **Entra al MVP** (dibujar la parcela y autogenerar la cuadrícula) | F1 "dibujo libre" `[EN EVENTO]` en 03 |
| Servidor | Droplet de DigitalOcean de **Eduardo Oropeza** (Ubuntu 24.04, 2 vCPU, 4 GB RAM, 50 GB, región SFO3). Eduardo lo configura | Despliegue Vercel/Render en 08 |
| Dominio | **No se compra dominio** | — |
| Repositorio | Git con ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo` | "Ramas por integrante" en 08, ahora con nombres |
| Documentación | Vive en el repo (`docs/`); Drive queda como respaldo del historial | Drive como fuente en 00 |
| Cronograma | Se mide en **esfuerzo de IA**, no en horas (ver 14) | Opciones A y B de 09 |
| Pronóstico | Capa opcional **"próxima temporada (aproximada)"**: anomalía del pronóstico estacional (ECMWF vía Open-Meteo) aplicada a la climatología histórica, con respaldo estadístico propio (percentiles; sin tendencia, ver "Próxima temporada" abajo). Se muestra como **banda de incertidumbre**, nunca como cifra. No bloquea el MVP: va después del motor | "No predice el clima" en 03 y 10 |
| pH y textura | Se **estiman** por zona con mapas globales (ISRIC WCS u OpenLandMap), descargados por script y servidos desde caché; etiquetados `SUPUESTO`. Selector manual de respaldo | "No mide pH" en 00, 03, 10 |
| Cultivos | **Catálogo propio en JSON** (6 a 8 cultivos) sembrado desde FAO EcoCrop (rangos de temperatura, lluvia y ciclo) y Kc de FAO-56, con fuente por valor. Sin API externa de cultivos: ninguna cubre bien la agronomía | Búsqueda de una API de cultivos |
| Zona y cultivo | Zona demo en Isla, Veracruz (temporal, sin riego), **verificada en SIAP** el 14/11 (A0.6, ver V-20). Núcleo: **milpa (maíz, frijol, calabaza)**; cultivo extra vistoso (chile) si hay tiempo de modelado | Maíz, frijol y sorgo de 03 |
| Organización | El trabajo **no se reparte por rol sino por actividad**: cada integrante toma actividades del cronograma (ver 14). R1 a R4 quedan como áreas, no como dueños | Roles por nombre (V-18) |
| Comunicación entre sesiones | **Buzón por la red local** (`herramientas/buzon/`): servidor en la laptop de Mompin, puerto 3000; cada sesión de IA escucha en segundo plano y avisa a su usuario. Solo avisos; el código sigue por git. Se apaga y se cierra el puerto al terminar (Mompin, 14/11) | Avisos solo por GitHub |
| Ranking | **Criterio B** (doc 05, paso 7): puntaje compuesto por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio. Pesos con fuente o iguales declarados `SUPUESTO`. Respaldo: criterio A (solo pilar hídrico) si los pilares 2 y 3 (A3.7) no llegan | Opciones A y B `[EN EVENTO]` en 05 y 11 |
| Pilar de exceso de agua | Entra al ranking B: percolación profunda por debajo de la raíz, FAO-56 ec. 88 (DP = (P - RO) + I - ETc - Dr,i-1 ≥ 0, cap. 8). `fraccionLluviaPercolada` = percolación / lluvia de los días de ciclo; en el ranking se normaliza como 1 - fracción, declarado `SUPUESTO` porque no hay umbral publicado de encharcamiento por cultivo. Contrato: `pilares.excesoHidrico` (0.7.0) | Solo déficit en el pilar hídrico |
| Pilares sin dato | En **todos** los pilares de `resultado-rotacion` (déficit, compatibilidad de ciclo, protección del suelo, riesgo por calor, aporte indirecto y exceso), si el pilar es `NO_EVALUABLE` o `ERROR_DATOS`, todos sus indicadores van en `null` y el motivo es obligatorio. En `resultado-celda` ya regía para los registros. Contratos 0.9.0, en la rama `contratos-nulos` hasta que el motor ajuste su salida | Regla solo en el pilar de exceso |
| TAW del suelo | Para cualquier textura (incluidas `franco_arcillo_arenoso`, `franco_arcilloso` y `arcillo_arenoso`, que no están en FAO-56 Tabla 19) el TAW se calcula con la pedotransferencia de Saxton y Rawls (2006), *Soil water characteristic estimates by texture and organic matter for hydrologic solutions*, Soil Science Society of America Journal 70(5): 1569-1578, doi:10.2136/sssaj2005.0117, a partir de arena, arcilla y materia orgánica de SoilGrids; etiqueta `SUPUESTO`. Mientras no esté, la demo usa el selector manual | Hueco de TAW de A1.6 |
| Servicios de suelo (V-23) | Se usan **ambos**, ISRIC WCS y OpenLandMap, para compararlos; el contrato `suelo` lleva las dos estimaciones con su fuente y cuál alimenta el cálculo | "ISRIC WCS u OpenLandMap" |
| Elevación (V-08) | Terrarium por defecto; Open-Meteo Elevation de respaldo | Proveedor por decidir |
| Humedad de suelo de POWER (V-06) | La humedad de suelo de POWER (`GWETROOT`, MERRA-2) entra al balance como **condición inicial** de la cubeta al sembrar y como **comparación** contra la humedad simulada, con su resolución gruesa declarada. Es **fracción de saturación** (0 a 1, primeros ~100 cm), no fracción de TAW: se convierte con θsat, θFC y θWP del suelo (Saxton y Rawls) antes de usarla; sin esos valores, la condición inicial queda `NO_EVALUABLE` | "No usar humedad de POWER en el balance" |
| Próxima temporada (V-21, A2.13) | Horizonte de **6 meses** (se habla en semestres), aunque el servicio dé 7. Método aprobado: distribución histórica de cada mes (20 años de POWER) desplazada por la anomalía de SEAS5, percentiles como banda, **sin tendencia** y con advertencia | Horizonte 7 o 9 meses; "percentiles y tendencia" |
| Próxima temporada por rotación | Escenario "próxima temporada" con **años análogos reales** del histórico, según el pronóstico estacional: la rotación se evalúa en esos años y se muestra el **rango** entre ellos (déficit, fracción percolada, exceso). Siempre `EXPLORATORIO`, `esPrediccion: false`, con aviso y **sin ranking** (no entra a peor caso, arrepentimiento ni posición). Contrato: `resultado-rotacion.proximaTemporada` (0.8.0) | Solo la capa de clima por mes |
| Servidor (V-15 a V-17) | Droplet de Eduardo con `sslip.io` y certificado Let's Encrypt. Cerrado | Opciones de "Servidor sin dominio" |
| Calendario de siembra (A0.6, V-20) | Las ventanas de siembra **dependen del lugar, no del cultivo**: salen del catálogo y van en el contrato `calendario-local` (municipio con clave INEGI, cultivo, temporada PV/OI, ventana con fuente SIAP o INIFAP; sin dato, `NO_EVALUABLE`). La fecha de siembra de cada ciclo la elige el usuario; el plan guarda el calendario usado y un `porQue`. Un cultivo que la fuente no registra en el lugar se muestra, pero no se recomienda (caso: calabaza en Isla, SIAP 2021-2025). Mafer revisa si SIAP tiene API o datos abiertos de siembras | Ventanas por cultivo en el catálogo |
| Clima por ciclo (A2.8) | Opción (c) `temporada_tipica`: cada ciclo en su temporada típica (PV u OI) dentro del año del escenario | Opciones a/b/c abiertas en 05 |
| Exceso de agua en el ranking (A4.2) | El exceso de agua (percolación por debajo de la raíz, FAO-56 ec. 88) es un **pilar del ranking B** (`excesoHidrico`, contratos 0.7.0): subpuntaje = 1 − percolación / lluvia de los días de ciclo, normalización `SUPUESTO` (sin umbral publicado de encharcamiento por cultivo), peso igual que los demás salvo el del usuario. Con déficit y exceso el ranking ya usa B (Mompin, 14/11) | Exceso solo como dato, fuera del ranking |
| Librería 3D (A3.1) | **Three.js 0.187.0 sin React Three Fiber**: un componente React monta su propio lienzo y la escena usa `InstancedMesh`. Pruebas de `web/` con vitest 5.1.0 (Mompin, 14/11) | "Three.js + React Three Fiber" `[PROPUESTA]` en 08 |
| Escenarios (A2.5) | El percentil p10 / p50 / p90 se calcula sobre la **lluvia de las temporadas de siembra PV y OI** (año agrícola de SIAP: OI de octubre de *t*-1 a marzo de *t*, PV de abril a septiembre de *t*), no del año calendario. El escenario es un año real y siempre se muestra. Desempate `[DECIDIDO]`: el año **más reciente**; se declara el segundo más cercano (con 20 años el p50 siempre empata entre los dos centrales: hoy 2016 sobre 2008). Detalle en 05, paso 1 (Mompin, 14/11) | "Lluvia anual" `[PROPUESTA]` en 04 y 05 |

## Consecuencias técnicas

- **El Web Worker ayuda con el cálculo** (motor, percentiles, series de 20 años). No acelera la red ni el render 3D, que sigue en el hilo principal.
- Muchas peticiones a varias APIs: la caché y la cola con reintentos viven en el backend, no en el navegador.
- Con polígono libre el backend en vivo es obligatorio (clima y elevación dependen de la coordenada dibujada). Se mantiene además un **paquete de datos precargado** de la parcela demo para que la demo no dependa de la red.
- Los datasets de Earthdata (SMAP, GPM, MODIS) con `earthaccess` son viables solo en Python: es la razón principal de elegir FastAPI.

## Servidor sin dominio `[DECIDIDO]` 14/11: opción 1 (`sslip.io` + Let's Encrypt)

Sin dominio, un front en HTTPS no puede llamar a un backend en HTTP (bloqueo por *mixed content*). Opciones, de mejor a peor:

1. **`sslip.io`**: el nombre `64-23-143-102.sslip.io` resuelve a la IP del droplet y permite emitir certificado Let's Encrypt con nginx + Certbot. Sin comprar nada.
2. **Servir también el front desde el droplet** (nginx): mismo origen, sin mixed content ni CORS.
3. **Túnel** (Cloudflare Tunnel o Tailscale Funnel) si hay problemas con puertos.

Eduardo decide; recomendación: opción 1 para la API y opción 2 como respaldo de la demo.

Reglas para el servidor compartido: AgroHive va en su propio `server` block de nginx, usuario, puerto y servicio `systemd`; **no tocar** la configuración del proyecto `mediworks` que ya vive ahí. Abrir 80 y 443 en el firewall del droplet.

## Pendientes derivados `[VERIFICAR]`

| ID | Qué | Quién |
| --- | --- | --- |
| V-15 | ~~Acceso SSH, usuario y firewall del droplet~~ Cerrado (servidor decidido) | Eduardo |
| V-16 | ~~Servicios y puertos de `mediworks`~~ Cerrado (servidor decidido) | Eduardo |
| V-17 | ~~Hostname y certificado~~ Cerrado: `sslip.io` + Let's Encrypt | Eduardo |
| V-18 | ~~Roles por nombre~~ Reemplazado: reparto por actividad en 14 | Equipo |
| V-19 | ~~Ranking A o B~~ Decidido: criterio B (ver tabla de arriba). Pintura por bloques sigue `[EN EVENTO]`; cultivos: milpa decidida, falta confirmar parámetros | Equipo |
| V-20 | ~~Cultivos y calendario del municipio en SIAP~~ Hecho (A0.6, Mafer). SIAP 2021-2025, Isla = INEGI 30/077, DDR San Andrés Tuxtla: maíz grano de temporal en PV (~4,100 ha/año) y OI (~4,480 ha/año), frijol de temporal sobre todo en OI (~195 ha/año), chile verde (OI ~234 ha/año; PV 2022-2024); **no hay calabaza registrada**. Calendario cargado en `datos/catalogos/calendario-isla.json` (contrato `calendario-local`): maíz PV 1 jun-15 jul (INIFAP, cubre el DDR), maíz OI nov-dic y frijol OI 20 sep-20 oct (Agenda Técnica de Veracruz, recomendación estatal); frijol PV, chile y calabaza sin ventana (`NO_EVALUABLE` con motivo) | Mafer |
| V-21 | ~~Horizonte del pronóstico estacional~~ Decidido: 6 meses (ver tabla de arriba) | — |
| V-22 | Si NASA POWER permite llamadas desde el navegador (CORS); por defecto todo pasa por el backend | Quien tome A0.7 |
| V-23 | ~~Qué servicio de suelo~~ Decidido: ambos, ISRIC WCS y OpenLandMap (ver tabla de arriba) | — |
| V-24 | Ajustar el discurso del pitch: "no predecimos una temporada exacta; mostramos el rango plausible" | Quien tome A5.6 |
