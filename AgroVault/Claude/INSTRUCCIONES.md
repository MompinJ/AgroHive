---
tipo: instrucciones
audiencia: claude
actualizado: 2026-11-14
---

# Claude

Instrucciones para Claude Code y para un proyecto de Claude que tenga este repo. La ficha corta que Claude Code carga sola es `CLAUDE.md` en la raíz. Esta nota es el contexto largo. Si ambas se pisan, manda `docs/13` y `docs/14`, luego `CLAUDE.md` en lo operativo, y esta nota en el resto.

Para engancharla sin copiarla dos veces, una línea en `CLAUDE.md` basta:

```md
- Contexto largo: AgroVault/Claude/INSTRUCCIONES.md y AgroVault/Compartido/.
```

## Protocolo de lectura

1. [[Compartido/Reglas]]
2. [[Compartido/Resumen]]
3. `docs/00-LEEME-PRIMERO.md`, `docs/11-DECISIONES-PENDIENTES-Y-RIESGOS.md`, `docs/13-DECISIONES-HACKATHON.md`, `docs/14-CRONOGRAMA.md`
4. El documento del tema, según [[Compartido/Lectura]]
5. [[Compartido/Pendientes]] antes de rellenar un hueco

No inventes un dato que no esté. Márcalo `[VERIFICAR]` y, si el equipo está de acuerdo en dejar constancia, anótalo en `docs/11`. No conviertas una `[PROPUESTA]` en hecho.

## Qué se te da bien en este equipo, y el límite

La nota de equipo (`docs/09`) dice que Claude rinde en la parte visual. Úsalo para la escena, los estados, la paleta y los modelos. El cupo fuerte no se gasta en boilerplate de Vite ni en renombrar archivos.

El motor científico pide el mismo cuidado que el 3D: fórmulas citadas, pruebas de `docs/05`, y `NO_EVALUABLE` cuando falte una entrada. Una escena bonita con un Kc inventado no sirve.

## Agente de modelos

Ya está en `.claude/agents/modelador-voxel.md`. Pídelo por nombre: "usa modelador-voxel para el maíz en sus etapas".

Ese agente habla en español mexicano informal. El código va sin emojis. Trabaja en la raíz del repo, escribe el generador en Python con `herramientas/voxelkit.py`, corre `check` y `preview`, y mira el PNG. No abre el navegador ni otras sesiones de Claude salvo que el usuario lo pida. No gasta créditos de servicios externos.

Convenciones que no se negocian en el prompt:

- `.bbmodel`, `model_format: "free"`, `format_version: "5.0"`, `box_uv: false`
- 1 celda = 16 unidades, origen al centro de la base, y = 0 en el suelo, +Y arriba, +Z al frente
- Paleta compartida 16×16. Un color nuevo se agrega al final
- Archivos `modelos/cultivos/<cultivo>_<etapa>.bbmodel` junto a su generador
- Etapas de simulador: siembra, brote, crecimiento, madurez, y un desenlace (podrida o marchita)
- La etapa la elige el motor. El modelo solo la representa
- La zanahoria de práctica no es cultivo de AgroHive

Si el preview falla o no abriste Blockbench, dilo. No escribas que el modelo se ve perfecto.

## Manera de editar

- Antes y después de trabajar, verifica los cambios (`git fetch`, revisa lo que subieron otros, corre las pruebas) y actualiza la documentación existente que tu cambio afecte (`docs/`, `AgroVault/`, README, `AGENTS.md`) en vez de dejarla desfasada o crear duplicados.
- Un archivo a la vez si otra persona puede estar en el repo. Rama propia. Pull request hacia `main`.
- No reescribas de un jalón `docs/00` a `docs/14`. Localiza el párrafo y registra el cambio en `docs/01`.
- No modifiques carpetas de historial fuera de `docs/` vigente.
- Código del motor sin imports de React. La vista no importa fórmulas.
- Explicaciones al usuario en español, concretas, con la ruta del archivo y el resultado de la prueba que sí corriste.

## Recorte

Si la tarea se hincha, para en la compuerta de `docs/14` y di qué quedó fuera. Orden de corte: extras de NASA y props, slider de meses, pilares 2 y 3, 3D (quedan 2D y cajas), polígono libre (queda la parcela demo). Se quedan la trazabilidad de POWER, los límites dichos en la interfaz, tres rotaciones, el peor caso y la entrega.
