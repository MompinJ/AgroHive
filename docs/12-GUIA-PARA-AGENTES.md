# 12 · Guía para agentes y colaboradores

Para cualquier persona o IA (Claude, ChatGPT, Cursor) que lea o edite esta carpeta.

## Protocolo de lectura
1. Leer **00**, **16** (plan y reglas del día final) y **11** primero.
2. Leer los documentos del tema que se va a tocar (ver orden en 00).
3. Si algo contradice las carpetas anteriores (`docs/` o `00 — ... v1.2`), **manda esta carpeta (v2.0)**.
4. Si falta un dato o regla, no inventarlo: marcarlo `[VERIFICAR]` y anotarlo en 11.
5. Respetar las etiquetas: lo marcado `[EN EVENTO]` o `[DEPENDE-DATOS]` **no se fija** por cuenta propia.

## Cómo editar
- La documentación vive en el repo (`docs/`, `AgroVault/`, README, `AGENTS.md`); se edita en la rama propia y solo Mompin integra a `main` (13). Google Drive queda como respaldo del historial.
- Seguir las **reglas de organización `[DECIDIDO]`** de [16, sección 4](16-PLAN-DIA-FINAL.md#4-reglas-de-organización-decidido-mompin-1411-noche): apartar archivos por el buzón antes de empezar, dueños por carpeta, ramas cortas, integración por ventanas y archivos calientes (`docs/01`, cronograma, `QUEJAS.md`) con un solo editor por ventana.
- Editar el archivo existente; **no crear duplicados** ni copias "v2-final".
- Registrar cada cambio en **01**: fecha, archivo, qué y por qué (o mandar la entrada por el buzón si otra persona tiene los archivos calientes en esa ventana).
- **No modificar** las carpetas anteriores de Drive (`docs/` y `00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/`): son historial.

## Cómo proponer un cambio de alcance
1. Citar el fragmento afectado.
2. Escribir: propuesta, por qué, efecto técnico y científico, riesgo, alternativa.
3. Si el equipo lo aprueba, editar de forma localizada y registrar en 01.
4. No escribir "ya se verificó" cuando solo se propuso una prueba.

## Qué no improvisar
- Rendimientos, precisión agrícola, cosechas o datos de suelo no medidos.
- Cultivos, rotaciones o alcance sin registro en 01.
- Hacer públicos los archivos o cambiar permisos sin autorización (compartir solo con los integrantes como Editor).
- Confundir esta documentación de planificación con un sistema funcionando.

## Modelos 3D
Para crear modelos, usar el agente `modelador-voxel` (`.claude/agents/`, ver [su README](agente-modelador-voxel-README.md)) y seguir las convenciones de 07. No mezclar escalas ni reordenar la paleta.
