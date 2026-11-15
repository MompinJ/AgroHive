# 08 · Arquitectura técnica

Todo es **propuesta** hasta confirmarlo en la hora 0 del evento. No hay código del proyecto todavía.

## Vista general

```text
Navegador (frontend)
  - Mapa (y dibujo de polígono, si entra)
  - Escena 3D con relieve (y modo 2D)
  - Selector "what if", paneles, gráficas, tarjetas
        |  HTTP (JSON), contrato versionado
        v
Backend
  - Cliente de datos (POWER, Open-Meteo, elevación) + caché
  - Motor de simulación (único)
  - Generador de explicaciones (plantillas; LLM opcional solo para redactar)
        |
        v
Caché en archivos  <-->  APIs externas
```

Variante simple: el motor corre **en el navegador** (es aritmética) y el backend solo hace de proxy y caché. Decidir en el evento según el stack. `[EN EVENTO]`

Reglas que no cambian:
- El frontend **no recalcula** indicadores por su cuenta.
- El 3D **no decide** etapa ni estrés: representa lo que entrega el motor.
- Cambiar de vista no vuelve a consultar NASA.

## Stack propuesto `[PROPUESTA]`

| Capa | Opción principal | Alternativa |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | — |
| Estilos | Tailwind CSS con componentes propios | CSS propio |
| Mapa 2D | Leaflet + React Leaflet (+ Leaflet.draw si hay polígono) | MapLibre GL + Mapbox Draw |
| Cuadrícula | Turf.js en metros locales | — |
| 3D | Three.js + React Three Fiber, `InstancedMesh` | `fill-extrusion` de MapLibre para bloques simples |
| Modelos | `.bbmodel` cargados directo (ver 07) | GLB exportado desde Blockbench |
| Gráficas | Recharts | Otra librería ligera |
| Backend | Python + FastAPI | Solo proxy si el motor va en el navegador |
| Persistencia MVP | Archivos JSON de caché; **sin base de datos obligatoria** | PostgreSQL solo si entran sesiones (extra) |
| Repositorio | GitHub, ramas por integrante, desde el inicio del evento `[DECIDIDO]` | — |
| Documentación | Google Drive + Markdown (rclone / MCP) `[DECIDIDO]` | GitHub en el evento |
| Despliegue | Frontend Vercel, backend Render | Demo local + video |

## Módulos

1. Mapa y parcela (demo fija; polígono si entra).
2. Generador de cuadrícula (metros locales, tope y tamaño adaptativo o elegido por el usuario; forma de dibujo de las celdas de borde). Vive en `web/src/geo/` (`cuadricula.ts`, `forma-celda.ts`, `tamano-celda.ts`); `web/src/ui/cuadricula.ts` lo reexporta.
3. Cliente de terreno: elevación y pendiente por celda.
4. Cliente de clima: POWER diario, respaldo Open-Meteo, caché.
5. Catálogo de cultivos y suelos (archivos estáticos con fuente).
6. Motor de simulación (05).
7. Generador de explicaciones.
8. Escena 3D y modo 2D.
9. Interfaz: paneles, selector, tooltips, leyendas.
10. Persistencia (extra).

## Contratos de datos

Definirlos en las primeras horas para trabajar en paralelo y que no choquen convenciones (preocupación de la reunión). Nombres sugeridos.

> **Tipos `[DECIDIDO]` 14/11:** Los JSON Schema de `contratos/` son la fuente de verdad de los datos: los tipos TS salen de ahí (`contratos/tipos/`) y los modelos de FastAPI deben respetarlos, con una prueba que lo verifique. El cliente generado desde OpenAPI solo cubre las llamadas HTTP.
>
> **Calendario local (14/11):** las ventanas de siembra salen del catálogo de cultivos y pasan a `contratos/calendario-local.schema.json` (por municipio INEGI, cultivo y temporada). El plan guarda la fecha elegida por el usuario, su `porQue` y el calendario usado; `asignacionClima` es `temporada_tipica`.
>
> **Actualización 14/11:** los contratos vigentes son los JSON Schema de `contratos/` (v0.1.0, A1.1); mandan sobre los ejemplos de abajo, que quedan como antecedente. Cambios principales: el estado visual de la planta se llama `estadoPlanta` (`estado` es siempre el de doc 04), el suelo es su propio contrato (`parcela.sueloId`), `fuente` es un objeto y hay un contrato nuevo `proxima-temporada`. Resumen en `AgroVault/Compartido/Contratos.md`.

### Parcela
```json
{
  "id": "parcela-demo-isla",
  "poligono": [[-95.5, 18.0]],
  "areaHa": 2.0,
  "centroide": [-95.5, 18.0],
  "tamanoCeldaM": 0,
  "suelo": {"tipo": "franco", "etiqueta": "SUPUESTO"},
  "celdas": [{"id": "c-0-0", "i": 0, "j": 0, "elevacionM": 0, "pendientePct": 0}]
}
```
Coordenadas ilustrativas, no la ubicación real de la parcela.

### Clima del escenario
```json
{
  "escenario": "seco",
  "anioReal": 0,
  "fuente": "NASA POWER",
  "coordenada": [0, 0],
  "consultado": "YYYY-MM-DD",
  "respaldo": false,
  "diario": [{"fecha": "YYYY-MM-DD", "lluviaMm": 0, "tMaxC": 0, "tMinC": 0, "radiacion": 0}]
}
```

### Plan de siembra (lo que arma el selector)
```json
{
  "rotacionId": "R1",
  "ciclos": [
    {"ciclo": 1, "cultivo": "maiz", "siembra": "YYYY-MM-DD"},
    {"ciclo": 2, "cultivo": "frijol", "siembra": "YYYY-MM-DD"},
    {"ciclo": 3, "cultivo": "maiz", "siembra": "YYYY-MM-DD"}
  ],
  "porCelda": null
}
```
`porCelda` solo se usa si se pinta por bloques.

### Resultado por celda y fecha
```json
{
  "celdaId": "c-0-0", "fecha": "YYYY-MM-DD", "ciclo": 2, "cultivo": "frijol",
  "etapa": "brote", "avanceEtapa": 0.0, "estado": "normal",
  "humedad": 0.0, "deficitMm": 0, "excesoMm": 0, "riesgoErosion": null
}
```

### Resultado por rotación
```json
{
  "rotacionId": "R1",
  "estado": "EVALUABLE",
  "porEscenario": {"seco": {}, "habitual": {}, "lluvioso": {}},
  "peorCaso": null,
  "arrepentimiento": null,
  "advertencias": [],
  "explicacion": {"porQue": "", "beneficios": [], "huecos": [], "riesgos": []}
}
```
Los `null` son huecos que se llenan con valores calculados; nunca con números inventados.

## Endpoints sugeridos (si hay backend)

> **Actualización 14/11:** con el motor en el Web Worker (doc 13), `POST /api/simular` y `POST /api/rotaciones` quedan superados: el backend no simula ni rankea. Se suman `GET /health` y `GET /api/suelo` (textura y pH `SUPUESTO`, A2.14). Tabla vigente en `AgroVault/Compartido/Contratos.md`.

| Método y ruta | Función |
| --- | --- |
| `GET /api/clima?lat=&lon=&desde=&hasta=` | Serie diaria con caché |
| `GET /api/elevacion?...` | Elevación del área |
| `GET /api/cultivos` | Catálogo de cultivos |
| `POST /api/simular` | Parcela + plan + escenario ⇒ resultados |
| `POST /api/rotaciones` | Comparación y ranking |

## Rendimiento
- Tope de celdas (~1 600) y tamaño de celda adaptativo. Desde el 14/11 noche `[DECIDIDO]` (Mompin) el usuario puede pedir el lado (automático, 10, 20, 30, 50 o 100 m): si con ese lado pasan de 1 600 celdas, el generador lo sube lo justo (redondeado a 0.1 m) y avisa con `TAMANO_CELDA_AJUSTADO`. «Automático» conserva la regla de siempre (lado ≥ 10 m y a lo más 40 × 40 en la caja envolvente); con un lado pedido el tope cuenta las celdas que tocan el contorno, no la caja, así que una parcela larga o diagonal gana resolución (franja diagonal de unos 30 km de largo: de 92 celdas de 556 m a 1 598 de 69.4 m, en menos de 1 s). La API (`POST /api/elevacion`) ya aceptaba cualquier lado > 0 y no cambia.
- `InstancedMesh` por cultivo + etapa; geometrías unidas por modelo.
- Recalcular solo lo que cambia (cambiar de escenario no recarga el terreno).
- Medir FPS en la computadora más modesta del equipo.
- **Requisitos mínimos:** medirlos y documentarlos para los jueces; modo 2D para equipos de 4 GB de RAM. No prometer cifras sin medir.

## Errores y resiliencia
- POWER falla ⇒ Open-Meteo ⇒ caché, con aviso visible. `[DECIDIDO]` H-B6 (Mompin, 14/11 noche): 20 s por intento y 2 intentos por fuente, con un plazo total de 70 s por petición, para que la cadena quepa en los 90 s que espera el front (`api/app/http.py`).
- Sin internet ⇒ parcela de demo precargada.
- Cuotas ⇒ cola y reintentos con espera.
- Datos faltantes ⇒ se muestran, no se ocultan.

## Seguridad y licencias
- No subir llaves ni tokens al repositorio; usar variables de entorno.
- Revisar términos de APIs y mapas base (OpenStreetMap, MapTiler, Mapbox, Esri difieren).
- Citar a NASA y demás fuentes en la app y en la entrega.
- Modelos 3D propios (agente del equipo), lo que simplifica la licencia; documentar su autoría.
