# web/src/api/

Cliente de la API de AgroHive para el front (A4.6, Eduardo con balam). **No recalcula nada**: pide los datos y los entrega tal cual.

| Archivo | Que hace |
| --- | --- |
| `cliente.ts` | Funciones `obtenerClima`, `obtenerClimaEstandar`, `obtenerSuelo`, `obtenerProximaTemporada`, `obtenerCultivos`, `obtenerTerreno` y `obtenerSalud`. Cada una devuelve `Resultado<T>`: `{ ok: true, datos }` o `{ ok: false, error: { estado: 'ERROR_DATOS', motivo, codigo? } }`. Nunca lanza |
| `usarApi.ts` | Hook de React: `usarApi(consulta, clave)` devuelve `{ state: 'loading' | 'ready' | 'error', datos?, error?, reintentar }`. Los estados `loading` y `error` son los de `<DataState>` |
| `cliente.test.ts` | 10 pruebas con `fetch` simulado: exito, 503, 422, red caida, cuerpo que no es JSON, tiempo agotado, cancelacion y POST de terreno |

## Reglas

- **Tipos:** los datos usan `contratos/tipos` (`SerieClima`, `Suelo`, `ProximaTemporadaAproximada`, `CatalogoCultivos`); el cliente generado de OpenAPI (`api/cliente/api.d.ts`) solo se usa para la entrada y la respuesta de `/api/elevacion`.
- **Ventana de clima:** pide siempre `VENTANA_ESTANDAR` (`2005-10-01` a `2025-12-31`) y el **centroide** de la parcela. Es lo unico que responde el paquete de demo sin internet.
- **Fallas visibles:** un 503 trae `{ estado: 'ERROR_DATOS', motivo }`; mostrar ese motivo en un `<DataState state="error">` y ofrecer `reintentar`. Si la API cayo al respaldo, la respuesta trae `estado: 'RESPALDO_HISTORICO'` y `advertencias`: la interfaz debe mostrarlas.
- **URL:** en produccion el front y la API comparten origen (`''`). En desarrollo (`npm run dev`) usa `https://64-23-143-102.sslip.io`, que acepta `localhost` y `127.0.0.1:5173`. `VITE_API_URL` lo cambia (por ejemplo `http://127.0.0.1:8010` con la API local y el paquete de demo).
- **Tiempo:** 90 s por llamada (la primera consulta de suelo en frio tarda unos 12 s). Cambiar de pantalla cancela la consulta.

## Ejemplo

```tsx
const clima = usarApi((senal) => obtenerClimaEstandar(lon, lat, { senal }), `${lon},${lat}`);
if (clima.state === 'loading') return <DataState state="loading" />;
if (clima.state === 'error') return <DataState state="error">{clima.error.motivo}</DataState>;
// clima.datos es una SerieClima validada por la API contra contratos/
```

Falta conectar las paginas (`web/src/paginas/`, de balam) y el motor (`crearClienteMotor`, de Mompin): este cliente solo les da los datos.
