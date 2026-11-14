# AGENTS.md — AgroHive para Codex

Instrucciones para ChatGPT Codex (CLI o nube) en este repositorio. Léelas al empezar. Luego lee, en este orden, si la tarea no es un cambio de una línea:

1. `AgroVault/Compartido/Reglas.md`
2. `AgroVault/Compartido/Resumen.md`
3. `AgroVault/Compartido/Contratos.md` si vas a crear o consumir JSON
4. `AgroVault/Compartido/Pendientes.md` si te falta un número, una fecha o un criterio
5. El doc de `docs/` que indique `AgroVault/Compartido/Lectura.md`

Si esta ficha y `docs/13-DECISIONES-HACKATHON.md` o `docs/14-CRONOGRAMA.md` no coinciden, mandan esos docs.

Para que Codex te cargue solo, esta ficha tiene que estar en la raíz del repo con el nombre `AGENTS.md`, o la raíz debe decir "lee `AgroVault/Codex/AGENTS.md`". Hoy vive aquí, dentro del vault. No la des por cargada si nadie la enlazó.

## Proyecto

Simulador "what if" de rotaciones de cultivos contra años reales de NASA POWER. Se busca la rotación que no colapsa en el peor año, no la de mayor rendimiento. Hackathon NASA Space Apps 2026, reto Field Shift, sede Boca del Río. Equipo de 4. Ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo`.

El 14/11/2026 el hackathon ya empezó. Se puede escribir código. Al armar esta ficha no existían `web/`, `api/` ni `contratos/`. No inventes que ya compilan.

## Stack

- `web/`: React, Vite, TypeScript. Motor en Web Worker, carpeta prevista `web/src/motor/`. Mapa Leaflet, cuadrícula Turf.js (tope cerca de 1600 celdas), 3D con Three.js y React Three Fiber (`InstancedMesh`), gráficas Recharts. Modelos `.bbmodel` cargados directo.
- `api/`: Python, FastAPI. Proxy y caché de NASA POWER, Open-Meteo, elevación y suelo. `GET /health`. OpenAPI es la fuente de los tipos; el cliente TS se genera con `openapi-typescript`.
- `contratos/`: JSON Schema alineado con `AgroVault/Compartido/Contratos.md`.
- `datos/`: catálogos y demo precargada. `datos/cache/` no se commitea.
- `modelos/`: `.bbmodel` generados con `herramientas/voxelkit.py`.
- `docs/`: spec vigente.

El backend no ejecuta la simulación. `POST /api/simular` de `docs/08` está superado por la decisión del 14/11.

## Comandos

Todavía no hay `package.json` ni app FastAPI. Cuando existan, prefiere los scripts del repo. Hasta entonces no inventes un flujo de build distinto al de abajo.

Previsto:

```text
cd web && npm run dev
cd web && npm test
cd api && uvicorn app.main:app --reload
```

Esos comandos son el objetivo de A1.2 y A1.3, no algo que ya corra. Si fallan porque el esqueleto no existe, dilo y crea solo la pieza que te pidieron.

Modelos:

```text
python3 herramientas/voxelkit.py check modelo.bbmodel
python3 herramientas/voxelkit.py preview modelo.bbmodel salida.png 20
```

Requiere Python 3 y Pillow. La zanahoria de ejemplo no es un cultivo del proyecto.

## Estilo

- TypeScript estricto en el front. Python con tipos en las firmas públicas del API.
- Nombres de campos de JSON como en Contratos (`poligono`, `areaHa`, `lluviaMm`, `deficitMm`). No traduzcas el contrato a inglés en una mitad del repo.
- Sin emojis en código ni en comentarios.
- Sin secretos. `.env` queda fuera de git. Hay `.env.example` solo con nombres de variables.
- Comentarios solo donde la fórmula o el estado `NO_EVALUABLE` no se entienden solos.
- Documentación de producto en español, en `docs/`, no en un README paralelo.

## Límites duros

- Falta un parámetro ⇒ `NO_EVALUABLE`. Prohibido sustituir por 0 o por un Kc recordado.
- Cada número citado sale de una fuente que puedas señalar.
- El front no recalcula déficit, ETc ni ranking. 2D y 3D leen la misma salida. Cambiar de vista no llama a NASA.
- El 3D no decide etapa ni estrés.
- No fijes filas `[EN EVENTO]` ni `[DEPENDE-DATOS]`. Ranking A/B es V-19: mientras siga abierto, ordena por menor déficit en el peor caso y deja `arrepentimiento` en null. Fechas de siembra de Isla son V-20: no las inventes.
- No toques nginx, systemd ni puertos de `mediworks` en el droplet.
- No edites el mismo archivo que otra rama tenga en curso. Un archivo, un responsable.
- Modelos voxel: sigue `.claude/agents/modelador-voxel.md` y `docs/07`. Paleta: colores nuevos al final. Escala: 1 celda = 16 unidades.
- No declares la demo validada ni el motor correcto sin una prueba que hayas corrido.

## Cómo entregar un cambio

- Diff mínimo, atado a una actividad de `docs/14` si el usuario la nombró (A1.1, A2.6, etc.).
- Si moviste alcance, agrega una entrada en `docs/01-REGISTRO-DE-CAMBIOS.md` con fecha, archivos, motivo y fuente.
- Motor: cubre el caso `NO_EVALUABLE` y al menos una prueba de `docs/05` que corresponda a lo que tocaste.
- API: muestra la respuesta real del endpoint, incluido el camino de error.
- Al final, di qué corriste y qué no pudiste correr.

## Qué no hacer por iniciativa

- No abras los tres pilares, el pronóstico estacional, SMAP/GPM/MODIS ni el slider de meses en el mismo cambio que el balance de agua.
- No añadas base de datos.
- No muevas el motor al servidor "porque es más fácil de probar".
- No reescribas `docs/` para que coincida con un atajo del código.
