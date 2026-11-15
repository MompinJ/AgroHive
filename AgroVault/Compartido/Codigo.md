---
tipo: mapa
audiencia: todas
actualizado: 2026-11-14
---

# Dónde vive el código

Complementa [[Resumen]]. Si esta nota y el archivo discrepan, manda el archivo.

## Carriles

| Persona | Rama | Carpetas |
| --- | --- | --- |
| Mompin | `Mompin` | `web/src/motor/`, `web/src/escena/`, `contratos/` |
| Eduardo | `Eduardo` | `api/`, `datos/` (demo y pruebas de APIs), despliegue |
| Mafer | `Mafer` | `modelos/`, `datos/catalogos/`, `docs/` de entrega |
| balam | `balam` | `web/src/ui/`, `web/src/paginas/`, `web/src/App.tsx`, `DESIGN.md` |

`web/src/api/` lo armó Eduardo para que balam y el motor lo consuman. Un archivo, un responsable: si tocas el carril de otro, avisa.

## `web/`

| Ruta | Qué es |
| --- | --- |
| `src/motor/` | Funciones puras y Web Worker. Entrada: `index.ts` → `crearClienteMotor()` |
| `src/motor/escenarios.ts` | Años seco / habitual / lluvioso |
| `src/motor/et0.ts`, `balance.ts`, `cultivo.ts`, `suelo.ts` | ET0, cubeta, Kc, TAW |
| `src/motor/pilares.ts`, `ranking.ts`, `analogos.ts`, `proxima.ts`, `tarjetas.ts` | Pilares, ranking B, análogos, banda, explicación |
| `src/motor/pruebas/regresion/demo-isla.json` | Cifras congeladas de la demo |
| `src/escena/` | Three.js: relieve, `.bbmodel`, placas, losas. `EscenaParcela.tsx` es el componente que monta el laboratorio |
| `src/ui/useLaboratorio.ts` | Carga demo o API, arma R1–R4 y llama al Worker |
| `src/ui/planes.ts` | Definición de R1–R4 y calendario de Isla |
| `src/ui/LaboratorioConectado.tsx` | Selector, escena, métricas y tarjetas (`TarjetasRotacion`, A4.3) |
| `src/ui/cuadricula.ts` | Polígono → celdas. `i` crece al norte desde el sur |
| `src/api/` | Cliente de la API: `cliente.ts`, `datosParcela.ts`, `usarDatosParcela.ts` |
| `src/paginas/` | Inicio, Terreno, Laboratorio, Comparación |
| `escena.html` | Vista previa de la escena, aparte de la app |

Comandos: `cd web && npm test`, `npm run dev`, `npx tsc --noEmit`. Corrida del 14/11 a las 18:00 sobre `main` (`f2bc172`): 581 pruebas pasan y 1 queda como pendiente (todo). Vuelve a contarlas si las necesitas.

## `api/`

FastAPI. Rutas en `app/rutas/`: `clima`, `suelo`, `cultivos`, `proxima`, `terreno` (`POST /api/elevacion`), `smap`, `ndvi` (`GET /api/ndvi`, A4.11, Planetary Computer), `calendario` (`GET /api/calendario`, A4.13). `versionContrato` de `/health` sigue a `contratos/package.json` (0.12.2).

| Pieza | Archivo |
| --- | --- |
| POWER, IMERG en UTC, caché por celda de 0.1° para IMERG y por celda MERRA-2 para el resto | `app/clientes/power.py` |
| Open-Meteo archivo, elevación y estacional | `app/clientes/openmeteo.py` |
| Terrarium | `app/clientes/terrarium.py` |
| ISRIC WCS | `app/clientes/isric.py` |
| OpenLandMap | `app/clientes/openlandmap.py` |
| SMAP L3, solo con `EARTHDATA_TOKEN` | `app/clientes/earthdata.py` |
| Saxton y Rawls (usa el módulo de Mafer, no lo copia) | `app/pedotransferencia.py` |
| Ventana estándar 2005-10-01 a 2025-12-31 | `app/servicios.py` |
| Despliegue | `api/despliegue/` |

`pytest` desde `api/`. Sin token, `/api/smap` responde 503 `ERROR_DATOS`. El token no va al repo, a la caché, a los logs ni al buzón.

## `datos/`

| Ruta | Qué es |
| --- | --- |
| `catalogos/cultivos.json` | Maíz, frijol, calabaza, chile. Generador `generar.py` |
| `catalogos/suelos.json` | TAW de FAO-56 Tabla 19 por clase. Varias clases quedan `NO_EVALUABLE` |
| `catalogos/calendario-isla.json` | Contrato `calendario-local` |
| `catalogos/saxton_rawls.py` | Ecuaciones del artículo; materia orgánica en **porcentaje**, no en fracción |
| `demo/respuestas/` | Cuerpos ya validados: serie de clima, suelo, terreno, próxima temporada |
| `demo/generar.py` | Regenera el paquete llamando a la API y aborta si la cuadrícula está cruzada |
| `pruebas-apis/` | Respuestas reales del 14/11. Coordenada de prueba, no siempre la parcela |

`node datos/catalogos/validar.mjs` entra en las cuatro verificaciones de `main`.

## `contratos/`

Versión `0.12.2` (`contratos/package.json`). Schemas, ejemplos, inválidos y `tipos/contratos.d.ts`. Resumen en [[Contratos]]. `cd contratos && npm test`.

## `modelos/` y `features/`

Generadores: `modelos/cultivos/{maiz,frijol,calabaza,chile}.py`, `modelos/suelos/suelos.py`, `modelos/props/mascota.py`, paleta en `modelos/paleta.py`. Visores HTML al lado. `features/imerg/` es el prototipo que comparó IMERG con POWER; el cliente ya está en la API. `features/encargos/eduardo-datos-globales.md` es el encargo de A4.10 a A4.13.

## Herramientas

| Ruta | Qué es |
| --- | --- |
| `herramientas/voxelkit.py` | Librería y CLI de `.bbmodel` |
| `herramientas/cronograma.py` | Regenera el estado por persona en `docs/14`, `docs/cronograma.html`, [[Cronograma]] y el marcador de `herramientas/quejas-ia/QUEJAS.md` |
| `herramientas/buzon/` | Avisos en la red local. `escuchar.sh` y `enviar.sh` |
| `herramientas/quejas-ia/` | Quejas de las sesiones y el marcador de avance |

## Borradores que no sustituyen al archivo oficial

- `docs/guion-video-borrador.md` — borrador del guion para el final; no es tarea activa.
- `docs/README-borrador.md` — antecedente de A5.7. `README.md` de la raíz ya es el de A5.7, en revisión humana.
- `docs/08` — arquitectura de antes del 14/11. El motor no está en el servidor y varios nombres de campos cambiaron.

## Verificación antes de `main`

`npm test` en `contratos/`, `pytest` en `api/`, `node datos/catalogos/validar.mjs`, `npx tsc --noEmit -p web`. Un cambio de contrato que rompa a otro no entra solo.
