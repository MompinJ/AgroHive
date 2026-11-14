# 07 · Modelos 3D y agente `modelador-voxel`

## Decisión `[DECIDIDO]`

Los modelos se hacen en formato **Blockbench (`.bbmodel`)**, pero **por código**: un agente de IA (`modelador-voxel`) escribe un generador en Python con la librería `voxelkit.py`, revisa el resultado con un render y entrega los modelos listos para Three.js. Así cada modelo es regenerable y editable, y sigue siendo trabajo propio del equipo.

## Dónde está

En esta carpeta: [`agente-modelador-voxel/`](agente-modelador-voxel/)

| Archivo | Qué es |
| --- | --- |
| `modelador-voxel.md` | Definición del agente: rol, reglas, formato `.bbmodel`, oficio y flujo de trabajo. |
| `herramientas/voxelkit.py` | Librería y CLI: `Model`, `.box`, `.stem`, `.ring`, `.save`; comandos `check`, `preview`, `visor`. |
| `ejemplo-zanahoria/` | Ejemplo completo de referencia: generador `zanahoria.py`, sus `.bbmodel`, un render de etapas y un visor HTML. |

Copia original: `~/ProgrammingProjects/Temporal/BlockBench/` en la máquina de Mompin (allí también hay modelos de otros proyectos que no se copiaron).

**La zanahoria es práctica, no es cultivo del proyecto.** Los cultivos reales se modelan durante el evento, cuando se elijan (ver 03).

## Cómo usar el agente

- **Claude Code:** copiar `modelador-voxel.md` a `.claude/agents/` del repo del proyecto y `voxelkit.py` a `herramientas/`. Ajustar en el `.md` la ruta de la carpeta de trabajo (hoy apunta a `~/ProgrammingProjects/Temporal/BlockBench/`). Luego pedir, por ejemplo: *"usa modelador-voxel para hacer el maíz en 5 etapas"*.
- **ChatGPT / Cursor:** pegar el contenido de `modelador-voxel.md` como instrucciones y correr `voxelkit.py` en local. Requiere Python 3 y Pillow.

Comandos:

```text
python3 herramientas/voxelkit.py check modelo.bbmodel
python3 herramientas/voxelkit.py preview modelo.bbmodel salida.png [escala] [azimut] [elev]
python3 herramientas/voxelkit.py visor salida.html a.bbmodel b.bbmodel ...
```

## Convenciones (las del agente mandan)

| Tema | Convención |
| --- | --- |
| Formato | `.bbmodel`, `model_format: "free"`, `format_version: "5.0"`, `box_uv: false` |
| Escala | **1 celda = 16 unidades** (1 unidad = 1 px de voxel) |
| Origen | Centro de la base; `y = 0` es la superficie del suelo; +Y arriba, +Z frente |
| Rotación | Euler orden ZYX, en grados |
| Color | Paleta compartida en una textura 16×16 (un color por píxel, máx. 256). Agregar colores **siempre al final** para no romper modelos anteriores |
| Nombres | `<cultivo>_<etapa>.bbmodel`, por ejemplo `maiz_madurez.bbmodel` |
| Carpeta | Una por familia (`cultivos/`, `props/`), con su generador `.py` junto a los `.bbmodel` |
| Presupuesto | Etapa temprana 5–10 cubos, intermedia 20–30, final 40–60 |

Esto sustituye las convenciones anteriores de la v0.2 (`maiz_s2.glb`, 1 unidad = 1 celda, pipeline obligatorio a GLB).

## Etapas por cultivo

Del ejemplo de la zanahoria, que conviene repetir para cada cultivo:

| Etapa | Uso en el simulador |
| --- | --- |
| `siembra` | Inicio del ciclo |
| `brote` | Primeras semanas |
| `crecimiento` | Desarrollo vegetativo |
| `madurez` | Listo para cosecha |
| `podrida` (o marchita / seca) | **Desenlace de estrés**: lo que se ve cuando el escenario hace colapsar el cultivo. Muy útil para el "what if" |
| `item`, `costal` | Variantes opcionales para iconos, inventario (extra) o tarjetas |
| `suelo` | Bloque de suelo base de la celda |

Todas las etapas comparten el mismo punto de anclaje para poder interpolar escala. El motor (05) decide la etapa y el estado; el modelo solo los representa.

## Carga en la web

- El proyecto **carga el `.bbmodel` directo en Three.js**, sin pasar a glTF. El visor de ejemplo lo hace en pocas líneas: lee cada elemento (`from`, `to`, `origin`, `rotation`) y su color de la paleta, y crea una caja.
- glTF/GLB es **opcional**: se exporta desde Blockbench (File > Export) si algún día hiciera falta.
- **Rendimiento en escena grande:** el visor de ejemplo crea una malla por cubo, lo que está bien para unos pocos modelos. Para una parcela con cientos de celdas, unir los cubos de cada modelo en una geometría y usar **`InstancedMesh` por combinación cultivo + etapa**, con variación por celda (rotación en pasos de 90°, ligera escala). Fijar un tope de celdas (propuesta: ~1 600).
- **Respaldo:** si un modelo se atrasa, plantas procedurales con cajas en código para no bloquear el MVP.

## Flujo de trabajo de arte

1. Definir la paleta compartida del proyecto (empezar desde la de `voxelkit.py`).
2. Modelar el primer cultivo completo (todas sus etapas) y **probarlo en la escena real** antes de seguir.
3. Modelar el resto de cultivos elegidos y los bloques de suelo (variantes por tipo y humedad).
4. Iconos y leyenda de estados.
5. Extras: props (pozo, casa, árboles, pájaro) y mascota.

El modelado puede avanzar **en paralelo** desde la hora 0, porque no depende del código del simulador.

## Límites honestos
- El render de `preview` es simple: sirve para forma y proporción, no para el acabado final. Hay que mirar los modelos en Blockbench o en la escena real.
- No afirmar que un modelo "se ve perfecto" sin haberlo abierto.
- Si se usan referencias de la web para formas o colores, citarlas.
