---
tipo: mapa
audiencia: todas
actualizado: 2026-11-14
---

# Qué leer en docs/

Orden fijo antes de una tarea que toque alcance: `docs/00-LEEME-PRIMERO.md`, `docs/11-DECISIONES-PENDIENTES-Y-RIESGOS.md`, `docs/13-DECISIONES-HACKATHON.md`, `docs/14-CRONOGRAMA.md`. Luego el documento del tema. 13 y 14 pisan a 03, 08 y 09.

| Si vas a… | Lee |
| --- | --- |
| Entender el producto o recortar alcance | `docs/03`, `docs/10`, y el plan de recorte de `docs/14` |
| Tocar clima, suelo, caché o fuentes | `docs/04` y [[APIs]] (endpoints, límites, qué falta verificar) |
| Escribir el motor o sus pruebas | `docs/05` |
| Pantallas, selector, 2D/3D | `docs/06` |
| Modelar un cultivo | `docs/07` y `.claude/agents/modelador-voxel.md` |
| API, contratos, rendimiento | `docs/08` más [[Contratos]] (el motor ya no vive en el servidor) |
| Repartir trabajo | `docs/14` (el tablero al final). `docs/09` conserva prioridades y el pitch logístico; su cronograma por horas quedó sustituido |
| Pitch, jueces, límites | `docs/10` |
| Saber qué sigue abierto | `docs/11` y [[Pendientes]] |
| Anotar un cambio | `docs/01-REGISTRO-DE-CAMBIOS.md` |

Etiquetas, con el mismo significado que en `docs/00`:

| Etiqueta | Qué hacer |
| --- | --- |
| `DECIDIDO` | Puedes construirlo |
| `EN EVENTO` | No lo fijes solo |
| `DEPENDE-DATOS` | Entra si el dato existe y está citado |
| `PROPUESTA` | Hay un default escrito; confirmalo antes de tratarlo como ley |
| `MEJORA` | Fuera del camino crítico |
| `EXTRA` | Fase 1 o 2 |
| `VERIFICAR` | Falta la fuente. Márcalo, no lo des por hecho |
| `HECHO` / `EN CURSO` / `BLOQUEADO` | Estados de una actividad del cronograma |

Carpetas históricas: no las edites. La documentación vigente es `docs/` v2.0 dentro de este repo. Drive queda como respaldo.

Al cerrar un cambio de alcance, la entrada de `docs/01` lleva fecha, archivos, qué cambió, por qué, fuente y decisiones afectadas.
