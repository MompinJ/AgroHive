---
tipo: resumen
audiencia: todas
actualizado: 2026-11-14
fuente: docs/00 a docs/14
---

# Resumen de AgroHive

Equipo **Code Hive**. Reto **Field Shift: Adapting Farms with NASA Data**, NASA Space Apps Challenge 2026, sede USBI Boca del Río, Veracruz, 14 y 15 de noviembre de 2026. Cuatro integrantes. Ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo`.

## Qué se construye

Simulador visual "what if" para comparar **rotaciones de cultivos** contra la historia climática real de NASA. No busca la rotación de mayor rendimiento: busca la **más robusta**, la que no colapsa en el peor año histórico.

Persona guía: Elena, productora ficticia de temporal en Veracruz. La decisión final es suya. El sistema explica, muestra evidencia y riesgos. No reemplaza a un agrónomo.

Rotación = secuencia en el tiempo (ciclo 1, ciclo 2, ciclo 3), no sembrar todo junto. La escena muestra el cultivo **del ciclo elegido**.

### Qué sí hace el MVP

- Parcela en mapa y polígono libre que genera la cuadrícula (entró al MVP el 14/11).
- Relieve real: elevación y pendiente por bloque.
- Selector de cultivos por ciclo, rotaciones de ejemplo y escenario seco / habitual / lluvioso.
- Valores por bloque y gráficas de lluvia, demanda y balance.
- Al menos tres rotaciones comparadas por peor caso, con por qué, evidencia, beneficios, huecos y riesgos.
- Modo 2D con los mismos números. Métodos, fuentes y advertencias siempre a la vista.
- Paquete de demo precargado para que la demo no dependa del wifi.

### Qué no hace

- No predice una temporada exacta. La capa opcional de "próxima temporada" es un rango, va después del motor y no bloquea el MVP.
- No predice toneladas, cosechas ni ingresos.
- No mide pH ni fertilidad. El pH mostrado es estimación de un modelo global.
- No detecta edificios, caminos ni árboles desde imágenes.

Frase de demo: AgroHive convierte la historia climática de NASA en comparaciones de rotaciones comprensibles. No adivina la cosecha.

## Caso de demo

| Campo | Valor |
| --- | --- |
| Zona | Municipio de Isla, Veracruz. Temporal, sin riego. Pendiente de confirmar en SIAP (V-20) |
| Superficie | 2 ha ficticias, no catastrales |
| Historial | 2006–2025 (20 años). Respaldo 2016–2025. 2026 no es un año completo |
| Cultivos núcleo | Milpa: maíz, frijol, calabaza. Chile si da tiempo el modelado |
| Catálogo | JSON propio, 6 a 8 cultivos, sembrado desde FAO EcoCrop (rangos) y Kc de FAO-56. Sin API de cultivos |
| Rotaciones de ejemplo | R0 maíz-maíz-maíz; R1 maíz-frijol-maíz; R2 se ajusta al catálogo real (en 03 aún dice sorgo) |
| Suelo | Selector manual (arcilloso, franco, arenoso) con TAW de FAO-56, etiqueta `SUPUESTO`. Además, textura y pH de zona por script (ISRIC WCS u OpenLandMap), también `SUPUESTO` |

## Ciencia, en corto

Columna vertebral: **NASA POWER** diario, sin llave. Comunidad `AG`. Parámetros candidatos: `PRECTOTCORR`, `T2M`, `T2M_MIN`, `T2M_MAX`, radiación, humedad, viento. El mensual de lluvia viene en mm/día: el total del mes es ese valor por los días. `[VERIFICAR]` unidades de radiación y dónde vive `GWETROOT` (V-06).

Respaldo climático: Open-Meteo (archivo histórico). Si POWER cae, el estado es `RESPALDO_HISTORICO` o `ERROR_DATOS`, visible.

Elevación: SRTM o tiles Terrarium. Es lo que hace distinto a cada bloque. `[VERIFICAR]` acceso (V-08).

Otros datasets NASA (GPM, SMAP, MODIS, Landsat, ECOSTRESS, GRACE) son extra. Solo entran si se integran de verdad. SMAP, GPM y MODIS van por `earthaccess` en Python, por eso el backend es FastAPI.

Escenarios: años reales cerca de p10, p50 y p90 de lluvia. Mostrar el año. `[PROPUESTA]` el criterio fino; `[DEPENDE-DATOS]` si la robustez se calcula sobre todo el histórico o solo sobre esos tres años.

Motor, independiente del render (`docs/05`):

1. Perfil del histórico y elección de los tres años.
2. Asignación de clima a cada ciclo: **abierta**. Tres ciclos no son tres años. Opciones: los tres ciclos dentro del año del escenario, ventanas consecutivas del histórico, o la temporada típica de cada cultivo en ese año. Hay que registrarla en `docs/01` cuando se elija.
3. ET0 (Open-Meteo, o Hargreaves-Samani, o Penman-Monteith si hay humedad y viento) y ETc = Kc de la etapa × ET0. Duraciones de etapa publicadas.
4. Balance de cubeta por bloque: lluvia entra, lo que no cabe es exceso, ETc sale, lo que falta es déficit. TAW según suelo. Pendiente alta puede reducir infiltración; hay que justificarlo.
5. Estrés hídrico, estrés por calor y avance fenológico. Salida cualitativa para el render.
6. Pilares: déficit (núcleo), compatibilidad de ciclo, erosión relativa (no toneladas, inspirada en USLE/RUSLE). Los dos últimos se recortan si faltan datos.
7. Ranking: el criterio principal es el peor caso. Opción A (menor déficit en el peor caso, sin puntaje inventado) u opción B (puntaje compuesto y arrepentimiento) siguen `[EN EVENTO]` (V-19). Si nada es evaluable, decirlo.
8. Tarjeta de explicación con plantilla. Un LLM, si se usa, solo redacta números ya calculados.

Estados: `EVALUABLE`, `NO_EVALUABLE`, `EXPLORATORIO`, `ERROR_DATOS`, `RESPALDO_HISTORICO`.

Pruebas mínimas del motor: año seco y suelo arenoso ⇒ déficit alto; año lluvioso y pendiente ⇒ exceso y erosión suben; leguminosa mejora el indicador indirecto de suelo frente a monocultivo; cambiar escenario no cambia el plan; cultivo sin parámetros ⇒ `NO_EVALUABLE`; 2D y 3D con las mismas métricas.

Prueba crítica de la UI: rotación R1, ciclo 2, escenario seco ⇒ la escena muestra **frijol** con la etapa y el estado de ese resultado.

## Stack decidido el 14/11

```text
Navegador
  React + Vite + TypeScript
  Leaflet (mapa y polígono), Turf.js (cuadrícula, tope ~1600 celdas)
  Three.js + React Three Fiber, InstancedMesh
  .bbmodel directo, sin paso obligatorio a glTF
  Recharts
  Motor en Web Worker (web/src/motor/)
        | HTTP JSON, contrato versionado
        v
FastAPI (api/)
  /health
  proxy y caché: POWER, Open-Meteo, elevación, suelo
  OpenAPI → cliente TypeScript
  earthaccess solo para extras
        |
        v
JSON en disco (datos/cache/, no se sube) y paquete de demo
```

El Worker acelera el cálculo (percentiles, 20 años). No acelera la red ni el render 3D, que siguen en el hilo principal.

Con polígono libre el backend en vivo hace falta, porque clima y elevación dependen de la coordenada dibujada. La parcela demo precargada cubre la presentación sin red.

Despliegue: el droplet de Eduardo, no Vercel/Render. Sin dominio, un front HTTPS no puede llamar un API HTTP. Propuesta: `sslip.io` con la IP del droplet (en `docs/13` aparece `64-23-143-102.sslip.io`) y, si falla, servir también el front desde nginx en el mismo origen. Eduardo elige (V-15 a V-17). Abrir 80 y 443. No tocar `mediworks`.

Persistencia del MVP: archivos JSON. Sin base de datos obligatoria.

## Interfaz

Tres paneles: selector "what if", escena (3D o 2D) y dashboard. En móvil, pestañas. No depender de hover.

Pantallas: P0 inicio (historia, no predicción), P1 terreno, P2 laboratorio, P3 comparación. Modales: A1 método, A2 editar rotación, A3 advertencias.

Pintar cultivos por bloque y el slider de meses siguen abiertos. El cambio de ciclo sí entra al MVP.

Estados visuales: color más icono o patrón, leyenda visible, legible con daltonismo. Cámara casi isométrica. Fallback 2D si no hay WebGL. Medir requisitos mínimos; no prometer FPS.

Modelos: `modelador-voxel` escribe Python con `herramientas/voxelkit.py` y entrega `.bbmodel`. Escala: 1 celda = 16 unidades. Origen en el centro de la base, y = 0 es el suelo. Paleta 16×16, colores nuevos siempre al final. Nombres `cultivo_etapa.bbmodel`. Presupuesto: 5–10 cubos al inicio, 20–30 a media etapa, 40–60 al final. Etapas: siembra, brote, crecimiento, madurez, podrida o marchita. La zanahoria de ejemplo no es cultivo del proyecto. Carpetas previstas: `modelos/cultivos/`, `modelos/props/`.

## Equipo y ritmo

No hay dueños por rol. R1 interfaz y 3D (`web/`), R2 motor (`web/src/motor/`), R3 datos y servidor (`api/`, `datos/`), R4 arte y entrega (`modelos/`, `docs/`) solo dicen el tipo de trabajo. Cada quien toma actividades del tablero de `docs/14`.

El esfuerzo se mide en cupo de IA (XS, S, M, L, XL), no en horas. Lo L se reserva para el motor de agua (A2.6), los pilares extra (A3.7), la escena (A3.1, A3.2), los modelos de los tres primeros cultivos (A2.11) y, si entra, un dataset NASA extra (A4.8). Un XL se parte antes de empezarlo.

Camino crítico: `A1.1 → A2.1 → A2.6 → A2.7 → A3.4 → A4.6 → A5.6 → A5.9`. En paralelo, igual de crítico para la demo: `A2.9 → A3.1 → A3.2`.

Compuertas: C1 lluvia real de POWER en pantalla; C2 motor con datos y pruebas; C3 terreno 3D con estado del motor; C4 ya no entran funciones; C5 solo bugs; C6 demo, video, README y envío.

Si hay que cortar, en este orden se caen: extras NASA y props, slider de meses, pilares 2 y 3, el 3D (queda 2D y cajas), el polígono libre (queda la parcela demo). No se sacrifican trazabilidad NASA, límites dichos en voz alta, tres rotaciones, peor caso ni la entrega.

Eduardo toma el servidor (A0.4, A4.7).

## Estado del repo al armar este vault

Hay documentación (`docs/`), `herramientas/voxelkit.py`, el agente en `.claude/agents/modelador-voxel.md`, `CLAUDE.md`, `README.md` y este vault. No hay todavía `web/`, `api/`, `contratos/` ni `datos/` con catálogo. El README describe la estructura objetivo, no código ya escrito.

## Límites para el pitch

Decirlos antes de que pregunten. La honestidad es parte del reto: resolución gruesa del clima, cubeta simplificada, parámetros de tablas generales, sin validación local mientras no la haya, 3D cualitativo. Combinar NASA con suelo, relieve y cultivo local es el argumento, no un adorno.
