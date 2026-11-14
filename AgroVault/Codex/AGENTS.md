# AGENTS.md — AgroHive para Codex

Instrucciones para ChatGPT Codex (CLI o nube) en este repositorio. Léelas al empezar. Luego lee, en este orden, si la tarea no es un cambio de una línea:

1. `AgroVault/Compartido/Reglas.md`
2. `AgroVault/Compartido/Resumen.md`
3. `AgroVault/Compartido/Codigo.md`
4. `AgroVault/Compartido/Contratos.md` si vas a crear o consumir JSON
5. `AgroVault/Compartido/Pendientes.md` si te falta un número, una fecha o un criterio
6. El doc de `docs/` que indique `AgroVault/Compartido/Lectura.md`

Si esta ficha y `docs/13-DECISIONES-HACKATHON.md` o `docs/14-CRONOGRAMA.md` no coinciden, mandan esos docs.

Para que Codex la cargue sola, la raíz del repo ya apunta aquí desde `AGENTS.md`. Si esta ficha y `docs/13`, `docs/14` o `contratos/*.schema.json` no coinciden, mandan esos.

## Proyecto

Simulador "what if" de rotaciones de cultivos contra años reales de NASA POWER. Se busca la rotación que no colapsa en el peor año, no la de mayor rendimiento. Hackathon NASA Space Apps 2026, reto Field Shift, sede Boca del Río. Equipo de 4. Ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo`.

El 14/11/2026 el hackathon ya va en código. Contratos `0.10.0`, motor, API, escena, catálogos y demo existen. Léelos antes de crear un segundo cliente o un segundo balance. Mapa de archivos: `AgroVault/Compartido/Codigo.md`. Cifras de la demo: `AgroVault/Compartido/Resumen.md`.

## Stack

- `web/`: React, Vite, TypeScript. Motor en Web Worker, `web/src/motor/` (`crearClienteMotor`). Mapa Leaflet, cuadrícula Turf.js (tope 1600; `i` desde el sur, `j` desde el oeste), 3D con Three.js 0.187 y `InstancedMesh`, sin React Three Fiber. Modelos `.bbmodel` cargados directo. El laboratorio ya está en `web/src/ui/useLaboratorio.ts`.
- `api/`: Python, FastAPI. Proxy y caché de NASA POWER, Open-Meteo, elevación y suelo. `GET /health`. Los modelos respetan los schemas de `contratos/`, con prueba; OpenAPI solo genera el cliente TS de las llamadas HTTP (`openapi-typescript`).
- `contratos/`: JSON Schema, fuente de verdad de los contratos (`AgroVault/Compartido/Contratos.md` solo los resume). Ejemplos en `contratos/ejemplos/`, tipos TS en `contratos/tipos/` (son los tipos de datos del motor y del front). Solo los edita Mompin.
- `datos/`: catálogos y demo precargada. `datos/cache/` no se commitea.
- `modelos/`: `.bbmodel` generados con `herramientas/voxelkit.py`.
- `docs/`: spec vigente.

El backend no ejecuta la simulación. `POST /api/simular` de `docs/08` está superado por la decisión del 14/11.

## Comandos

```text
cd contratos && npm test
cd contratos && npm run tipos
cd api && python -m pytest
cd web && npm test
cd web && npx tsc --noEmit
node datos/catalogos/validar.mjs
cd web && npm run dev
cd api && uvicorn app.main:app --reload
```

Esos comandos ya corresponden a código que existe. Antes de `main` corren contratos, pytest, catálogos y `tsc`.

Modelos:

```text
python3 herramientas/voxelkit.py check modelo.bbmodel
python3 herramientas/voxelkit.py preview modelo.bbmodel salida.png 20
```

Requiere Python 3 y Pillow. La zanahoria de ejemplo no es un cultivo del proyecto.

## Estilo

- TypeScript estricto en el front. Python con tipos en las firmas públicas del API.
- Nombres de campos de JSON como en `contratos/*.schema.json` (`poligono`, `areaHa`, `lluviaMm`, `deficitMm`, `estadoPlanta`). No traduzcas el contrato a inglés en una mitad del repo.
- Sin emojis en código ni en comentarios.
- Sin secretos. `.env` queda fuera de git. Hay `.env.example` solo con nombres de variables.
- Comentarios solo donde la fórmula o el estado `NO_EVALUABLE` no se entienden solos.
- Documentación de producto en español, en `docs/`, no en un README paralelo.

## Límites duros

- Falta un parámetro ⇒ `NO_EVALUABLE`. Prohibido sustituir por 0 o por un Kc recordado.
- Cada número citado sale de una fuente que puedas señalar.
- El front no recalcula déficit, ETc ni ranking. 2D y 3D leen la misma salida. Cambiar de vista no llama a NASA.
- El 3D no decide etapa ni estrés.
- No fijes filas `[EN EVENTO]` ni `[DEPENDE-DATOS]`. Ranking: criterio B, ya en `web/src/motor/ranking.ts`. Pesos iguales `SUPUESTO` si el usuario no da los suyos. Fechas de siembra de Isla: `datos/catalogos/calendario-isla.json`. No inventes otra ventana.
- No toques nginx, systemd ni puertos de `mediworks` en el droplet.
- No edites el mismo archivo que otra rama tenga en curso. Un archivo, un responsable.
- Modelos voxel: sigue `.claude/agents/modelador-voxel.md` y `docs/07`. Paleta: colores nuevos al final. Escala: 1 celda = 16 unidades.
- No declares la demo validada ni el motor correcto sin una prueba que hayas corrido.

## Cómo entregar un cambio

- Antes y después de trabajar, verifica los cambios (`git fetch`, revisa lo que subieron otros, corre las pruebas) y actualiza la documentación existente que tu cambio afecte (`docs/`, `AgroVault/`, README, `AGENTS.md`) en vez de dejarla desfasada o crear duplicados.
- Diff mínimo, atado a una actividad de `docs/14` si el usuario la nombró (A1.1, A2.6, etc.).
- Si moviste alcance, agrega una entrada en `docs/01-REGISTRO-DE-CAMBIOS.md` con fecha, archivos, motivo y fuente.
- Motor: cubre el caso `NO_EVALUABLE` y al menos una prueba de `docs/05` que corresponda a lo que tocaste.
- API: muestra la respuesta real del endpoint, incluido el camino de error.
- Al final, di qué corriste y qué no pudiste correr.

## Qué no hacer por iniciativa

- No reescribas el balance, los escenarios, el ranking ni los análogos: ya están y tienen regresión.
- No cambies los años 2023 / 2016 / 2024 ni el TAW 122.3 sin actualizar `demo-isla.json` y `docs/01`.
- No metas IMERG ni SMAP al balance ni al ranking.
- No añadas base de datos ni muevas el motor al servidor.
- No reescribas `docs/` para que coincida con un atajo del código.
- No despliegues el droplet ni pegues `EARTHDATA_TOKEN` en el repo, el buzón o un log.
