---
tipo: instrucciones
audiencia: cursor
actualizado: 2026-11-14
---

# Cursor

Eres un agente dentro del repo AgroHive, con herramientas de lectura, edición, terminal y, si hace falta, el navegador. El usuario (Eduardo) trabaja directo en el código. Este chat ya carga `CLAUDE.md`. Esta nota es el contexto largo.

Antes de una tarea que no sea un typo, lee [[Compartido/Reglas]], [[Compartido/Resumen]] y la fila que toque en [[Compartido/Lectura]]. Si la tarea escribe o consume JSON del motor o del API, lee [[Compartido/Contratos]] y los `contratos/*.schema.json` que enlaza. Si vas a cerrar un hueco de datos, lee [[Compartido/Pendientes]] y no lo cierres.

## Cómo trabajar aquí

- Antes y después de trabajar, verifica los cambios (`git fetch`, revisa lo que subieron otros, corre las pruebas) y actualiza la documentación existente que tu cambio afecte (`docs/`, `AgroVault/`, README, `AGENTS.md`) en vez de dejarla desfasada o crear duplicados.
- El repo es la verdad. Si esta nota y `docs/13` o `docs/14` discrepan, mandan esos docs: están más cerca de la decisión del equipo. Si `docs/` y el código discrepan, no tapes el hueco: dilo.
- Implementa el pedido. No abras `web/` y `api/` enteros "para dejar el esqueleto" si pidieron una sola pieza.
- Rama `Eduardo` para el trabajo de Eduardo. Estás en `main` solo si el usuario lo dejó ahí. No cambies de rama ni hagas commit si no te lo pide.
- No edites archivos de `balam`, `Mompin` o `Mafer` que otro tenga en curso. Contratos (`contratos/`) los toca quien los propone y avisa.
- UI, layout, estado o datos en pantalla: pruébalo en el navegador (click, flujo, vacío y error) antes de dar la tarea por cerrada. Una captura sola no cuenta.
- Modelos 3D: lanza el subagente `modelador-voxel`. No dibujes cubos a mano saltándote `herramientas/voxelkit.py`.
- Un cambio de alcance (cultivo nuevo, endpoint nuevo, criterio de ranking, pilar que entra o sale) se anota en `docs/01-REGISTRO-DE-CAMBIOS.md`.

## Qué ya está decidido y Cursor suele reabrir

- Motor en `web/src/motor/`, Web Worker, TypeScript. FastAPI no calcula el balance ni el ranking.
- Tipos del front generados desde OpenAPI.
- Polígono libre dentro del MVP, más paquete de demo de Isla para trabajar sin red.
- Catálogo de cultivos en JSON, con fuente por valor. Vacío = `NO_EVALUABLE`.
- Three.js carga `.bbmodel`. El render no elige la etapa.

## Regla corta para `.cursor/rules/`

Si hace falta que todos los chats de este repo la vean siempre, copia el bloque a `.cursor/rules/agrohive.mdc`:

```md
---
description: AgroHive, reglas de hackathon que no dependen del chat
alwaysApply: true
---

- Contexto largo: AgroVault/Bienvenido.md, luego AgroVault/Compartido/.
- Motor en TypeScript dentro de un Web Worker (web/). FastAPI (api/) solo proxy y cache. Tipos desde OpenAPI.
- El front no recalcula indicadores. El 3D solo representa la salida del motor.
- Dato faltante => NO_EVALUABLE. Toda cifra con fuente. No fijar [EN EVENTO] ni [DEPENDE-DATOS].
- Cambios de alcance en docs/01-REGISTRO-DE-CAMBIOS.md.
- Antes y despues de trabajar: git fetch, revisar lo que subieron otros, correr pruebas, y actualizar la documentacion afectada (docs/, AgroVault/, README, AGENTS.md) sin crear duplicados.
- Rama propia. Un archivo, un responsable. Sin emojis en codigo. Sin secretos en el repo.
- Modelos .bbmodel con el subagente modelador-voxel y docs/07.
```

`CLAUDE.md` en la raíz ya dice lo mismo en breve. No dupliques reglas nuevas en los dos sitios: si una decisión cambia, actualiza `docs/13` o `docs/01`, después esta nota y `CLAUDE.md`.

## Verificación según la zona

| Zona | Listo cuando |
| --- | --- |
| Motor | Las pruebas 1 a 6 de `docs/05` pasan, incluida `NO_EVALUABLE` y el determinismo |
| API | `/health` y el endpoint pedido responden; un fallo de POWER deja rastro `RESPALDO_HISTORICO` o `ERROR_DATOS` |
| UI | P0 a P3 con el flujo real; 2D y 3D muestran los mismos números |
| Modelos | `voxelkit.py check` y un `preview` por etapa; no afirmes que Blockbench se ve bien si no lo abriste |
