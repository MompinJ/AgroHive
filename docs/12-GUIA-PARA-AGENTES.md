# 12 · Guía para agentes y colaboradores

Para cualquier persona o IA (Claude, ChatGPT, Cursor) que lea o edite esta carpeta.

## Protocolo de lectura
1. Leer **00** y **11** primero.
2. Leer los documentos del tema que se va a tocar (ver orden en 00).
3. Si algo contradice las carpetas anteriores (`docs/` o `00 — ... v1.2`), **manda esta carpeta (v2.0)**.
4. Si falta un dato o regla, no inventarlo: marcarlo `[VERIFICAR]` y anotarlo en 11.
5. Respetar las etiquetas: lo marcado `[EN EVENTO]` o `[DEPENDE-DATOS]` **no se fija** por cuenta propia.

## Cómo editar
- Acceso por **rclone** (carpeta montada en local) o por **MCP** de Google Drive.
- Editar el archivo existente; **no crear duplicados** ni copias "v2-final".
- Evitar editar el mismo archivo al mismo tiempo que otra persona o agente. Mejor: un archivo por responsable y fusionar tras revisar.
- Registrar cada cambio en **01**: fecha, archivo, qué y por qué.
- **No modificar** las carpetas anteriores `docs/` y `00 — AGROHIVE DOCUMENTACIÓN CONSOLIDADA v1.2/`: son historial.
- Comprobar en Drive que el cambio quedó guardado.

## Cómo proponer un cambio de alcance
1. Citar el fragmento afectado.
2. Escribir: propuesta, por qué, efecto técnico y científico, riesgo, alternativa.
3. Si el equipo lo aprueba, editar de forma localizada y registrar en 01.
4. No escribir "ya se verificó" cuando solo se propuso una prueba.

## Qué no improvisar
- Código del proyecto antes del inicio oficial del hackathon.
- Rendimientos, precisión agrícola, cosechas o datos de suelo no medidos.
- Cultivos, rotaciones o alcance sin registro en 01.
- Hacer públicos los archivos o cambiar permisos sin autorización (compartir solo con los integrantes como Editor).
- Confundir esta documentación de planificación con un sistema funcionando.

## Modelos 3D
Para crear modelos, usar el agente de [`agente-modelador-voxel/`](agente-modelador-voxel/) y seguir las convenciones de 07. No mezclar escalas ni reordenar la paleta.
