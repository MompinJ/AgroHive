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

## Historial

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
