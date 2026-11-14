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
| Pronóstico | Capa opcional **"próxima temporada (aproximada)"**: anomalía del pronóstico estacional (ECMWF vía Open-Meteo) aplicada a la climatología histórica, con respaldo estadístico propio (percentiles y tendencia). Se muestra como **banda de incertidumbre**, nunca como cifra. No bloquea el MVP: va después del motor | "No predice el clima" en 03 y 10 |
| pH y textura | Se **estiman** por zona con mapas globales (ISRIC WCS u OpenLandMap), descargados por script y servidos desde caché; etiquetados `SUPUESTO`. Selector manual de respaldo | "No mide pH" en 00, 03, 10 |
| Cultivos | **Catálogo propio en JSON** (6 a 8 cultivos) sembrado desde FAO EcoCrop (rangos de temperatura, lluvia y ciclo) y Kc de FAO-56, con fuente por valor. Sin API externa de cultivos: ninguna cubre bien la agronomía | Búsqueda de una API de cultivos |
| Zona y cultivo | Zona demo en Isla, Veracruz (temporal, sin riego), **verificada en SIAP** el 14/11 (A0.6, ver V-20). Núcleo: **milpa (maíz, frijol, calabaza)**; cultivo extra vistoso (chile) si hay tiempo de modelado | Maíz, frijol y sorgo de 03 |
| Organización | El trabajo **no se reparte por rol sino por actividad**: cada integrante toma actividades del cronograma (ver 14). R1 a R4 quedan como áreas, no como dueños | Roles por nombre (V-18) |
| Comunicación entre sesiones | **Buzón por la red local** (`herramientas/buzon/`): servidor en la laptop de Mompin, puerto 3000; cada sesión de IA escucha en segundo plano y avisa a su usuario. Solo avisos; el código sigue por git. Se apaga y se cierra el puerto al terminar (Mompin, 14/11) | Avisos solo por GitHub |
| Ranking | **Criterio B** (doc 05, paso 7): puntaje compuesto por escenario, robustez = peor puntaje, arrepentimiento minimax, desempate por promedio. Pesos con fuente o iguales declarados `SUPUESTO`. Respaldo: criterio A (solo pilar hídrico) si los pilares 2 y 3 (A3.7) no llegan | Opciones A y B `[EN EVENTO]` en 05 y 11 |

## Consecuencias técnicas

- **El Web Worker ayuda con el cálculo** (motor, percentiles, series de 20 años). No acelera la red ni el render 3D, que sigue en el hilo principal.
- Muchas peticiones a varias APIs: la caché y la cola con reintentos viven en el backend, no en el navegador.
- Con polígono libre el backend en vivo es obligatorio (clima y elevación dependen de la coordenada dibujada). Se mantiene además un **paquete de datos precargado** de la parcela demo para que la demo no dependa de la red.
- Los datasets de Earthdata (SMAP, GPM, MODIS) con `earthaccess` son viables solo en Python: es la razón principal de elegir FastAPI.

## Servidor sin dominio `[PROPUESTA]`

Sin dominio, un front en HTTPS no puede llamar a un backend en HTTP (bloqueo por *mixed content*). Opciones, de mejor a peor:

1. **`sslip.io`**: el nombre `64-23-143-102.sslip.io` resuelve a la IP del droplet y permite emitir certificado Let's Encrypt con nginx + Certbot. Sin comprar nada.
2. **Servir también el front desde el droplet** (nginx): mismo origen, sin mixed content ni CORS.
3. **Túnel** (Cloudflare Tunnel o Tailscale Funnel) si hay problemas con puertos.

Eduardo decide; recomendación: opción 1 para la API y opción 2 como respaldo de la demo.

Reglas para el servidor compartido: AgroHive va en su propio `server` block de nginx, usuario, puerto y servicio `systemd`; **no tocar** la configuración del proyecto `mediworks` que ya vive ahí. Abrir 80 y 443 en el firewall del droplet.

## Pendientes derivados `[VERIFICAR]`

| ID | Qué | Quién |
| --- | --- | --- |
| V-15 | Confirmar acceso SSH, usuario y firewall del droplet | Eduardo |
| V-16 | Qué servicios y puertos ya usa `mediworks` | Eduardo |
| V-17 | Elegir hostname (`sslip.io` u otro) y emitir certificado | Eduardo |
| V-18 | ~~Roles por nombre~~ Reemplazado: reparto por actividad en 14 | Equipo |
| V-19 | ~~Ranking A o B~~ Decidido: criterio B (ver tabla de arriba). Pintura por bloques sigue `[EN EVENTO]`; cultivos: milpa decidida, falta confirmar parámetros | Equipo |
| V-20 | ~~Cultivos y calendario del municipio en SIAP~~ Verificado (A0.6, Mafer). SIAP 2021-2025, Isla = municipio 77, DDR San Andrés Tuxtla: maíz grano de temporal en PV (~4,100 ha/año) y OI (~4,480 ha/año), frijol de temporal sobre todo en OI (~195 ha/año), chile verde en OI y PV; **no hay calabaza registrada**. Ventanas de siembra con fuente INIFAP en `datos/catalogos/cultivos.json`: maíz PV 1 jun-15 jul, maíz OI nov-dic, frijol OI 20 sep-20 oct. **Abierto para el equipo:** cómo tratar la calabaza en la demo (queda `NO_EVALUABLE` en ventanas) | Mafer / equipo |
| V-21 | Parámetros y horizonte del pronóstico estacional de Open-Meteo (las fuentes no coinciden: 7 o 9 meses; la página oficial dice 7, ver `AgroVault/Compartido/APIs.md`; falta confirmarlo con una llamada) | Quien tome A0.7 |
| V-22 | Si NASA POWER permite llamadas desde el navegador (CORS); por defecto todo pasa por el backend | Quien tome A0.7 |
| V-23 | Qué servicio de suelo responde hoy (ISRIC WCS, OpenLandMap) y cómo se descarga la zona | Quien tome A2.14 |
| V-24 | Ajustar el discurso del pitch: "no predecimos una temporada exacta; mostramos el rango plausible" | Quien tome A5.6 |
