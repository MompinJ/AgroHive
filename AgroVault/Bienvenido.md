---
tipo: indice
actualizado: 2026-11-14
proyecto: AgroHive
---

# AgroVault

Contexto de trabajo de **AgroHive** para tres agentes de código. La fuente larga sigue siendo `docs/` en el repo. Este vault es el resumen que cada IA debe cargar antes de tocar alcance, datos o arquitectura.

Fecha de este resumen: **14 de noviembre de 2026**, primer día del hackathon. Ya se puede escribir código. Donde `docs/13` o `docs/14` contradigan a `docs/03`, `docs/08` o `docs/09`, mandan 13 y 14.

## Entra por tu herramienta

| IA | Nota de entrada | Cómo la carga |
| --- | --- | --- |
| Cursor | [[Cursor/INSTRUCCIONES]] | Regla del workspace o lectura al empezar la tarea |
| ChatGPT Codex | [[Codex/AGENTS]] | Archivo `AGENTS.md` (Copilot/Codex lo busca por ese nombre) |
| Claude | [[Claude/INSTRUCCIONES]] | `CLAUDE.md` y el agente `.claude/agents/modelador-voxel.md` |

Las tres leen el mismo núcleo:

- [[Compartido/Resumen]] — qué es el producto, stack, ciencia y demo
- [[Compartido/Reglas]] — lo que ninguna IA puede saltarse
- [[Compartido/Contratos]] — formas de datos que ya están escritas
- [[Compartido/Lectura]] — qué documento de `docs/` abrir según la tarea
- [[Compartido/APIs]] — APIs candidatas, endpoints, límites y documentación oficial
- [[Compartido/Pendientes]] — lo que sigue abierto; no lo cierres tú

## Qué no es este vault

No es el registro de cambios ni la spec completa. Un cambio de alcance se anota en `docs/01-REGISTRO-DE-CAMBIOS.md` y, si mueve una decisión, en `docs/13` o `docs/11`. Aquí se resume; no se decide.
