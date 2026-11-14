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
