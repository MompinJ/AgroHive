---
tipo: contratos
audiencia: todas
actualizado: 2026-11-14
fuente: docs/08, corregido por docs/13
---

# Contratos

Nombres sacados de `docs/08`. Coordenadas y ceros de esos ejemplos son ilustrativos. Los `null` se llenan con cálculo, no con números inventados. Si el equipo cambia un campo, se cambia aquí y en `contratos/` el mismo día, y se anota en `docs/01`.

`docs/08` todavía propone `POST /api/simular` y `POST /api/rotaciones`. Eso quedó atrás: el motor corre en el Web Worker. El backend no rankea ni calcula el balance.

## Endpoints que sí corresponden al stack del 14/11

| Método y ruta | Función |
| --- | --- |
| `GET /health` | Vida del API |
| `GET /api/clima?lat=&lon=&desde=&hasta=` | Serie diaria, caché, POWER con respaldo Open-Meteo |
| `GET /api/elevacion` | Elevación del polígono o de la demo |
| `GET /api/cultivos` | Catálogo JSON |
| `GET /api/suelo` | Textura y pH de zona, etiqueta `SUPUESTO`, más el respaldo manual |

Caché en archivo. Clave: coordenada redondeada a la celda del dataset + variable + periodo. La carpeta `datos/cache/` está en `.gitignore`.

## Parcela

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

Esas coordenadas no son la ubicación real de Isla. Hay que sustituirlas cuando A0.6 confirme la zona.

## Clima del escenario

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

## Plan de siembra

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

`porCelda` solo si se aprueba pintar por bloques.

## Resultado por celda

```json
{
  "celdaId": "c-0-0",
  "fecha": "YYYY-MM-DD",
  "ciclo": 2,
  "cultivo": "frijol",
  "etapa": "brote",
  "avanceEtapa": 0.0,
  "estado": "normal",
  "humedad": 0.0,
  "deficitMm": 0,
  "excesoMm": 0,
  "riesgoErosion": null
}
```

`estado` visual: `normal`, `estresada`, `marchita`, `podrida`. `riesgoErosion` queda `null` hasta que exista el pilar.

## Resultado por rotación

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

`arrepentimiento` solo si se elige el ranking B. Mientras V-19 siga abierto, no inventes ponderaciones.

## Catálogo de cultivo

Cada valor lleva fuente. Hueco ⇒ el cultivo puede existir en la lista, pero el motor lo marca `NO_EVALUABLE` en lo que dependa de ese hueco. Campos mínimos: id, nombre, ciclo en días, etapas con duración y Kc, umbral de calor, fuente por campo.
