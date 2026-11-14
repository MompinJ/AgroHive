# Agente `modelador-voxel`

Agente de IA que crea los modelos 3D de AgroHive en formato Blockbench (`.bbmodel`) por código. Documentación completa del pipeline y convenciones: [`../07-MODELOS-3D-Y-AGENTE.md`](../07-MODELOS-3D-Y-AGENTE.md).

## Contenido

| Ruta | Qué es |
| --- | --- |
| `modelador-voxel.md` | Definición del agente (formato de agente de Claude Code; sirve como instrucciones para cualquier IA). |
| `herramientas/voxelkit.py` | Librería y CLI para crear, validar, previsualizar y armar un visor de modelos. |
| `ejemplo-zanahoria/zanahoria.py` | Generador de referencia: 5 etapas (siembra, brote, crecimiento, madurez, podrida) + item + costal. |
| `ejemplo-zanahoria/*.bbmodel` | Modelos generados; se abren en [web.blockbench.net](https://web.blockbench.net). |
| `ejemplo-zanahoria/preview_etapas.png` | Render de las etapas. |
| `ejemplo-zanahoria/visor.html` | Visor Three.js autocontenido (abrir con doble clic). |

La zanahoria es **práctica**; no es cultivo del proyecto.

## Instalación rápida

- **Claude Code:** copiar `modelador-voxel.md` a `<repo>/.claude/agents/` y `voxelkit.py` a `<repo>/herramientas/`. Cambiar en el `.md` la carpeta de trabajo (`~/ProgrammingProjects/Temporal/BlockBench/`) por la del repo.
- **ChatGPT / Cursor:** pegar `modelador-voxel.md` como instrucciones y correr `voxelkit.py` en local.
- Requisitos: Python 3 y Pillow (`pip install pillow`).

```text
python3 herramientas/voxelkit.py check modelo.bbmodel
python3 herramientas/voxelkit.py preview modelo.bbmodel salida.png 20
python3 herramientas/voxelkit.py visor visor.html a.bbmodel b.bbmodel
```
