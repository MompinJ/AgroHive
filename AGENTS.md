# AgroHive - guia para agentes (Codex, Cursor, Copilot, Gemini, ChatGPT, Claude)

Proyecto de hackathon (NASA Space Apps 2026, reto Field Shift): simulador "what if" de rotaciones de cultivos contra la historia climatica real de NASA. Repo: https://github.com/MompinJ/AgroHive

## Antes de hacer nada
1. Cambiar a tu rama y traer lo ultimo: `git checkout <tu-rama> && git merge origin/main`.
2. Leer: `docs/00-LEEME-PRIMERO.md`, `docs/13-DECISIONES-HACKATHON.md`, `docs/14-CRONOGRAMA.md` (tablero de reparto al final) y el doc del tema que vayas a tocar.
3. Antes de escribir codigo, resumir en 5 lineas que vas a hacer y que archivos tocaras.

Contexto resumido por herramienta: `AgroVault/` (Codex: `AgroVault/Codex/AGENTS.md`; nucleo comun en `AgroVault/Compartido/`). Si contradice a `docs/13`, `docs/14` o a `contratos/*.schema.json`, mandan estos.

## Stack decidido
- `web/`: React + Vite + TypeScript. El **motor de simulacion** corre en el navegador dentro de un **Web Worker** (`web/src/motor/`). El 3D usa Three.js con `InstancedMesh`.
- `api/`: Python + FastAPI. Proxy y cache de NASA POWER, Open-Meteo, elevacion y suelo. Publica OpenAPI; el cliente TypeScript se genera de ahi.
- `contratos/`: JSON Schema y ejemplos. **Solo lo edita Mompin**; si necesitas un campo nuevo, pidelo.
- `modelos/`: modelos 3D `.bbmodel`, generados con el agente `modelador-voxel` (`.claude/agents/`) y `herramientas/voxelkit.py`.

## Reglas
- Antes y despues de trabajar, verifica los cambios (`git fetch`, revisa lo que subieron otros, corre las pruebas) y actualiza la documentacion existente que tu cambio afecte (`docs/`, `AgroVault/`, README, `AGENTS.md`) en vez de dejarla desfasada o crear duplicados.
- Trabaja solo en tu rama y en las carpetas de tu carril. No edites archivos de otro responsable sin avisar.
- Commits pequenos y frecuentes. Nunca hagas push a `main`: abre un pull request cuando cierres una actividad con su entregable verificable. Mompin integra.
- Cada vez que algo entre a `main`, haz `git merge origin/main` en tu rama antes de seguir.
- Nunca inventes datos: un parametro faltante es `NO_EVALUABLE`, no un numero. Toda cifra cientifica o agronomica lleva fuente; las fuentes las verifica una persona.
- El frontend no recalcula indicadores; el 3D solo representa lo que entrega el motor. Cambiar 2D/3D no vuelve a pedir datos.
- Lo marcado `[EN EVENTO]`, `[DEPENDE-DATOS]` o `[VERIFICAR]` no se fija por cuenta propia.
- Ya estamos en el evento: lo que decida Mompin es decision del equipo; registrarla como `[DECIDIDO]` (en 13 y 01).
- Registra cambios de alcance en `docs/01-REGISTRO-DE-CAMBIOS.md`.
- No subas llaves, tokens ni `.env`. Sin emojis en el codigo.
- Trabaja contra los ejemplos de `contratos/ejemplos/` hasta que la pieza real exista.

## Carriles
| Persona | Rama | Carpetas |
| --- | --- | --- |
| Mompin | `Mompin` | `web/src/motor/`, `contratos/`, `web/src/escena/` |
| Eduardo | `Eduardo` | `api/`, `datos/` |
| Mafer | `Mafer` | `modelos/`, `datos/catalogos/`, `docs/` (entrega) |
| balam | `balam` | `web/src/ui/`, `web/src/paginas/` |

Cada actividad tiene un ID (A1.1, A2.6...) en `docs/14-CRONOGRAMA.md`, con su esfuerzo, dependencias y entregable verificable.
