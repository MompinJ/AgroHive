# AgroHive (Code Hive)

Simulador visual "what if" de rotaciones de cultivos frente a la historia climatica real de NASA.
Reto: Field Shift, NASA Space Apps Challenge 2026 (Boca del Rio, Veracruz).

Empieza por `docs/00-LEEME-PRIMERO.md`. Decisiones del hackathon en `docs/13-DECISIONES-HACKATHON.md` y plan en `docs/14-CRONOGRAMA.md`.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `web/` | Frontend React + Vite + TypeScript; motor de simulacion en Web Worker |
| `api/` | Backend FastAPI (Python): proxy y cache de NASA POWER, Open-Meteo, elevacion |
| `contratos/` | Contratos de datos (JSON Schema), ejemplos y tipos TS generados: fuente de verdad de los formatos |
| `datos/` | Catalogos (cultivos, suelos) y paquete de demo precargado |
| `modelos/` | Modelos 3D `.bbmodel` generados con el agente `modelador-voxel` |
| `docs/` | Documentacion vigente |
| `herramientas/` | `voxelkit.py` y utilidades |

## Ramas

`main` (estable), `balam`, `Mompin`, `Mafer`, `Eduardo`. Se trabaja en la rama propia y se integra a `main` por pull request. Un archivo, un responsable.
