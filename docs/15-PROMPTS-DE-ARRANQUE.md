# 15 · Prompts de arranque para la IA de cada integrante

Pegar el prompt de cada quien en su herramienta (Claude Code, Codex, Cursor, etc.) dentro de la carpeta del repo clonado. Antes: `git clone https://github.com/MompinJ/AgroHive.git && cd AgroHive`.

## Prompt base (todos)

```text
Estas en el repo AgroHive, un proyecto de hackathon (NASA Space Apps 2026) de un simulador "what if"
de rotaciones de cultivos contra la historia climatica real de NASA.

Antes de hacer nada:
1. Ejecuta: git checkout <MI_RAMA> && git merge origin/main
2. Lee AGENTS.md (o CLAUDE.md), docs/00-LEEME-PRIMERO.md, docs/13-DECISIONES-HACKATHON.md y
   docs/14-CRONOGRAMA.md (el tablero de reparto esta al final).
3. Resumeme en 5 lineas que vas a hacer y que archivos vas a tocar. Espera mi OK antes de escribir codigo.

Yo soy <NOMBRE>, mi rama es <MI_RAMA>. Mis actividades estan en el tablero de reparto del doc 14.
Empieza por: <PRIMERA_TAREA>.

Reglas: trabaja solo en mi rama y en mis carpetas; commits pequenos; nunca push a main (abre un pull request
al cerrar una actividad con su entregable verificable); no inventes datos: si falta un parametro, usa
NO_EVALUABLE; toda cifra cientifica lleva fuente; usa los ejemplos de contratos/ejemplos/ hasta que la
pieza real exista; sin emojis en el codigo.
```

## Mompin (rama `Mompin`)

Primera tarea: **A1.1**, contratos de datos en `contratos/` (JSON Schema de parcela, clima, suelo, cultivo, plan de siembra y resultado) **con archivos de ejemplo** en `contratos/ejemplos/`, siguiendo la sección 08. Subirlos a `main` cuanto antes: desbloquean a los demás. Después A2.5 a A2.8 (motor), A3.1 y A3.2 (escena 3D y cargador de `.bbmodel`).

## Eduardo (rama `Eduardo`)

Primera tarea: **A0.4 y A0.7**. Ordenar el acceso al droplet y su HTTPS (sin tocar la configuración del proyecto `mediworks`; usar un `server` block, usuario y puerto propios; hostname propuesto con `sslip.io`) y probar con llamadas reales Open-Meteo estacional, NASA POWER (incluido CORS) y la elevación. Anotar los parámetros que funcionan en `docs/04-DATOS-Y-METODO.md`. Después **A1.3** (esqueleto FastAPI con `/health` y OpenAPI) y la ola de clientes de datos A2.1 a A2.4, con el formato de `contratos/` cuando Mompin lo publique.

## Mafer (rama `Mafer`)

Primera tarea: **A1.4**. Usar el agente `modelador-voxel` (`.claude/agents/modelador-voxel.md`) y `herramientas/voxelkit.py` para definir la paleta compartida y el primer modelo del **maíz** (siembra, brote, crecimiento, madurez, podrida), siguiendo `docs/07-MODELOS-3D-Y-AGENTE.md`. Probarlo en Blockbench o en el visor antes de seguir. En paralelo, **A0.6** (cultivos y calendario del municipio en SIAP) y luego **A1.5 y A1.6** (catálogo de cultivos y tabla de suelos con fuente por valor; si no hay fuente, `NO_EVALUABLE`).

## balam (rama `balam`)

Primera tarea: **A1.2**. Crear el esqueleto de `web/` con React + Vite + TypeScript, las rutas de las pantallas P0 a P3 (sección 06), un Web Worker vacío para el motor, y trabajar con datos falsos hasta que `contratos/ejemplos/` esté en `main` (haz `git merge origin/main` cuando Mompin lo anuncie). Después el mapa con dibujo de polígono y la cuadrícula (A2.9 y A2.10) y el selector "what if" (A3.4).

## Si tu IA se queda sin contexto

Pedirle: "Lee de nuevo AGENTS.md y el tablero de reparto del doc 14, y dime en cuál actividad estaba y qué falta."
