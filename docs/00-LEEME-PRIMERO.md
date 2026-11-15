# AgroHive 2.0 — LEER PRIMERO

> **Documentación vigente del equipo Code Hive — 13/11/2026.** Esta carpeta consolida en una sola fuente las dos carpetas anteriores y las decisiones que el equipo tomó el 13/11/2026. Las carpetas anteriores **se conservan intactas** como historial (ver al final). **El hackathon inició oficialmente el 14/11/2026**: ya se puede escribir código. Las decisiones tomadas ese día están en [13 · Decisiones del hackathon](13-DECISIONES-HACKATHON.md) y el plan de trabajo en [14 · Cronograma](14-CRONOGRAMA.md); donde contradigan a 03, 08 o 09, mandan 13 y 14.

## En dos minutos: ¿qué estamos construyendo?

**AgroHive** es un **simulador visual tipo "what if"** para que un agricultor compare **rotaciones de cultivos** frente a la historia climática real de **NASA**, para el reto *Field Shift: Adapting Farms with NASA Data* (NASA Space Apps Challenge 2026, sede Boca del Río, Veracruz).

- **Idea central:** no buscamos la rotación de mayor rendimiento, buscamos **la más robusta**: la que no colapsa en el peor escenario histórico, aunque no sea la más rentable en un año ideal.
- **Cómo se ve:** escena **3D low-poly estilo voxel** (tipo juego de granja) con **relieve**, con **modo 2D ligero** de respaldo.
- **Cómo se usa:** el usuario elige cultivos con un **selector** ("¿y si siembro esto?"), cambia de escenario (seco / habitual / lluvioso) y ve cómo reacciona su campo, con valores, evidencia y riesgos. La decisión final siempre es del agricultor.
- **Qué NO hace:** no predice el clima de una temporada exacta (solo muestra un rango aproximado, ver 13), no predice cosechas ni ingresos, no mide pH ni fertilidad (el pH es una estimación de un modelo global), no reemplaza a un agrónomo.

## Índice

| Doc | Contenido |
| --- | --- |
| [01 · Registro de cambios](01-REGISTRO-DE-CAMBIOS.md) | Qué cambió, cuándo y por qué. |
| [02 · Evento y reto](02-EVENTO-Y-RETO.md) | Fechas, sede, reglas, qué pide el reto oficial. |
| [03 · Producto y alcance](03-PRODUCTO-Y-ALCANCE.md) | Problema, concepto "what if", funciones, MVP y extras. |
| [04 · Datos y método científico](04-DATOS-Y-METODO.md) | Fuentes NASA y externas, escenarios, resolución, caché. |
| [05 · Motor de simulación](05-MOTOR-SIMULACION.md) | Balance de agua, pilares de la prueba de estrés, robustez. |
| [06 · Experiencia 2D/3D](06-EXPERIENCIA-2D-3D.md) | Tres paneles, flujo de pantallas, reglas de interacción. |
| [07 · Modelos 3D y agente](07-MODELOS-3D-Y-AGENTE.md) | Pipeline de modelos con el agente `modelador-voxel`. |
| [08 · Arquitectura](08-ARQUITECTURA.md) | Stack propuesto, contratos de datos, rendimiento. |
| [09 · Equipo y plan](09-EQUIPO-Y-PLAN.md) | 4 integrantes, roles, cronograma, puntos de corte. Roles y cronograma por horas quedan sustituidos por 13 y 14. |
| [10 · Pitch y límites](10-PITCH-Y-LIMITES.md) | Narrativa, límites científicos, preguntas de jueces. |
| [11 · Decisiones, pendientes y riesgos](11-DECISIONES-PENDIENTES-Y-RIESGOS.md) | Qué está decidido, qué se decide en el evento, riesgos. |
| [12 · Guía para agentes y colaboradores](12-GUIA-PARA-AGENTES.md) | Cómo leer y editar esta carpeta (Claude, ChatGPT, Cursor). |
| [13 · Decisiones del hackathon](13-DECISIONES-HACKATHON.md) | Decisiones del 14/11: stack, servidor, pronóstico, suelo, cultivos, ranking. Mandan sobre 03, 08 y 09. |
| [14 · Cronograma](14-CRONOGRAMA.md) | Actividades por esfuerzo de IA, compuertas, recorte y tablero de reparto. |
| [15 · Prompts de arranque](15-PROMPTS-DE-ARRANQUE.md) | Prompt inicial para la IA de cada integrante. |
| [Agente `modelador-voxel`](agente-modelador-voxel-README.md) | Cómo funciona el agente de modelos 3D (definición en `.claude/agents/`, librería en `herramientas/voxelkit.py`). |
| [Buzón del equipo](../herramientas/buzon/README.md) | Mensajes entre las sesiones de IA por la red local del evento (servidor en la laptop de Mompin). No reemplaza a git. |
| [`AgroVault/`](../AgroVault/Bienvenido.md) | Vault de Obsidian: resumen para Claude, Codex y Cursor, APIs investigadas y pendientes. Resume `docs/` y `contratos/`, no decide. |
| [`contratos/`](../contratos/README.md) | Contratos de datos (JSON Schema), ejemplos y tipos TS. Fuente de verdad de los formatos. |

## Orden de lectura sugerido

- **Todos:** 00 → 13 → 14 → 03 → 11.
- **Interfaz / 3D:** + 06 → 07 → 08.
- **Motor científico:** + 04 → 05 → 08.
- **Datos:** + 04 → 05 → 11.
- **Integración / pitch:** + 02 → 09 → 10.

## Etiquetas de estado

| Etiqueta | Significado |
| --- | --- |
| **`[DECIDIDO]`** | Confirmado por el equipo. |
| **`[EN EVENTO]`** | Se decide el día del evento, con el equipo junto. |
| **`[DEPENDE-DATOS]`** | Lo ideal es incluirlo; entra o se descarta según los datos que realmente consigamos. |
| **`[PROPUESTA]`** | Sugerencia documentada, falta confirmarla. |
| **`[MEJORA]`** | Idea valiosa que se puede tomar en cuenta si hay tiempo. |
| **`[EXTRA]`** | Fuera del MVP (fase 1 o fase 2). |
| **`[VERIFICAR]`** | Dato, regla o API que falta comprobar con fuente. |

## Qué NO afirmar nunca

- «NASA mide la humedad de cada cuadrito de la parcela» → **falso**: el clima de NASA POWER es regional (decenas de km); toda la parcela comparte la misma serie climática.
- «Los escenarios predicen los próximos años» → **falso**: son períodos históricos reales de referencia.
- «El modelo predice toneladas, ganancias o fertilidad» → **fuera de alcance**.
- «El 3D muestra la altura real de la planta» → **falso**: las etapas y estados son cualitativos, derivados del motor.
- «Ya funciona» o «está validado» → no hasta que haya pruebas, commits o video.

## Cómo editar sin perder trabajo

1. La documentación vive en el **repositorio** (`docs/`, ramas por integrante y pull request a `main`). Google Drive queda solo como respaldo del historial. `[DECIDIDO]` (13)
2. Leer el documento que se va a tocar y el **11** antes de cambiar el alcance.
3. Evitar que dos personas o agentes editen **el mismo archivo** al mismo tiempo.
4. Registrar cada cambio en **01** (fecha, archivo, qué y por qué).
5. El hackathon ya inició (14/11): se puede escribir código. Antes y después de trabajar: `git fetch`, revisar lo que subieron otros, correr las pruebas y actualizar la documentación afectada (`docs/`, `AgroVault/`, README, `AGENTS.md`) sin dejarla desfasada ni duplicarla.

## Carpetas anteriores (historial en Google Drive, no editar)

- **`docs/` de Drive** (no esta carpeta del repo) — documentación v0.2 de Mompin (10/11/2026) y la transcripción del audio de la reunión.
- **`00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/`** — consolidación del 11/11/2026 (basada en Notion v1.2).

Si algo de esas carpetas contradice esta, **manda esta** (v2.0). Si se quiere rescatar una idea anterior, se registra en 01.
