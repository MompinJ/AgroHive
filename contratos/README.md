# contratos/

Contratos de datos de AgroHive (actividad A1.1) en JSON Schema 2020-12, con un ejemplo por contrato y tipos TypeScript generados.

**Fuente de verdad `[DECIDIDO]` 14/11:** estos schemas mandan sobre los datos. El motor y el front usan `tipos/contratos.d.ts`; los modelos de FastAPI (`api/`) deben respetar estos schemas, con una prueba que lo verifique (por ejemplo, validar las respuestas o los ejemplos contra el schema); el cliente generado desde OpenAPI solo cubre las llamadas HTTP. **Solo los edita Mompin**: si necesitas un campo nuevo, pídelo.

## Contratos

| Archivo | Qué describe | Quién lo produce |
| --- | --- | --- |
| `comun.schema.json` | Definiciones compartidas: estados de doc 04, `fuente`, `valorCitado`, `meta`, coordenadas, ids | — |
| `parcela.schema.json` | Polígono, cuadrícula y celdas con elevación y pendiente | Front (polígono) + API (elevación) |
| `suelo.schema.json` | Textura y pH estimados, siempre `SUPUESTO`; estimaciones de ISRIC y OpenLandMap para compararlas y cuál se usa; TAW con su método (tabla FAO-56 o pedotransferencia de Saxton y Rawls 2006); respaldo de selector manual | API (`/api/suelo`, A2.14) |
| `cultivo.schema.json` | Catálogo propio de cultivos, solo lo que no depende del lugar: ciclo, etapas FAO-56, Kc, umbrales EcoCrop (lluvia del ciclo y lluvia anual por separado) | `datos/catalogos/` (A1.5) |
| `calendario-local.schema.json` | Calendario de un municipio (clave INEGI): por cultivo y temporada (PV, OI), ventana de siembra con fuente (SIAP, INIFAP) y si la fuente registra el cultivo en el lugar | `datos/` (A0.6, V-20) |
| `tabla-suelos.schema.json` | Tabla por clase textural: rangos de FAO-56 Tabla 19 y TAW por metro (`mm/m`), con fuente o `NO_EVALUABLE` | `datos/catalogos/` (A1.6) |
| `serie-clima.schema.json` | Respuesta de `GET /api/clima`: serie diaria de un periodo, sin escenario (mismo día que `clima-escenario`) | API (`/api/clima`) |
| `clima-escenario.schema.json` | Serie diaria de un año real del histórico (seco, habitual, lluvioso), con humedad de suelo de POWER (GWETROOT, fracción de saturación) opcional | Motor (A2.5), desde `serie-clima` |
| `proxima-temporada.schema.json` | Capa "próxima temporada aproximada": solo banda de incertidumbre por mes, horizonte fijo de 6 meses | API + motor (A2.13) |
| `plan-siembra.schema.json` | Rotación del selector: cultivo, temporada y fecha elegida por el usuario por ciclo, con su `porQue`; calendario local usado; `asignacionClima` fija en `temporada_tipica` | Front (selector) |
| `resultado-celda.schema.json` | Salida del motor por celda y fecha (etapa, estado visual, humedad, déficit) | Motor |
| `resultado-rotacion.schema.json` | Pilares por escenario, peor caso, ranking (criterio B principal; A de respaldo), pesos declarados y explicación | Motor |

## Reglas que el schema obliga a cumplir

- Un parámetro numérico del catálogo o del suelo es `{estado: "EVALUABLE", valor, unidad, fuente}` o `{estado: "NO_EVALUABLE", motivo}`. Un número suelto o sin fuente se rechaza.
- Un cultivo que la fuente local no registra se puede mostrar, pero no recomendar: la rotación lo lista en `cultivosNoRecomendados` (con motivo y fuente) y no puede ser `EVALUABLE`; en la celda, `noRecomendadoEnLugar` con `motivo` y `fuenteMotivo`.
- Un registro `NO_EVALUABLE` o `ERROR_DATOS` lleva todos sus indicadores en `null`, nunca en cero. Si el estado no es `EVALUABLE`, debe incluir un `motivo`.
- Suelo, textura y pH llevan siempre la etiqueta `SUPUESTO`.
- La próxima temporada tiene `esPrediccion: false`, un `aviso` obligatorio y bandas `{inferior, superior}` sin cifra única.
- Ranking B (`[DECIDIDO]` el 14/11): con B, el resultado declara `ponderacion` (pesos por pilar, etiqueta y pilares excluidos) y `arrepentimiento`. Sin pesos con fuente se usan pesos iguales etiquetados `SUPUESTO`; con etiqueta `FUENTE` la cita es obligatoria. El criterio A (solo pilar hídrico) queda como respaldo si A3.7 no llega.
- Todo documento lleva `meta.versionContrato`. Si `meta.esEjemplo` es `true`, también lleva `meta.aviso`.
- Nomenclatura: `estado` es siempre el estado de evaluación de doc 04. El estado visual de la planta se llama `estadoPlanta`.

Lo que el schema no puede comprobar (que los ciclos sean cronológicos, que el polígono esté cerrado, que los cultivos del plan existan en el catálogo) lo valida el motor.

## Ejemplos

`ejemplos/<contrato>.ejemplo.json` (y variantes `<contrato>.<variante>.ejemplo.json`, como `resultado-rotacion.respaldo-a`): parcela demo de Isla, Veracruz, de 2 ha y 4 celdas, con **coordenadas ilustrativas** y **valores ficticios**. Todos llevan `meta.esEjemplo: true` y su aviso. En el catálogo, el maíz tiene sus parámetros en `NO_EVALUABLE` porque aún no tienen fuente (A1.5). El `cultivo_ficticio` existe solo para mostrar la forma `EVALUABLE`: no usarlo en la demo.

## Comandos

```bash
cd contratos
npm install
npm test        # valida cada ejemplo y comprueba que los casos de pruebas/invalidos/ se rechacen
npm run tipos   # regenera tipos/contratos.d.ts (no editar a mano)
```

Versión del contrato: `0.8.0`. Historial: 0.2.0 agrega `ponderacion` y deja B como criterio principal; 0.3.0 agrega la lluvia anual al catálogo de cultivos (`umbrales.lluviaAnualMinMm` y `lluviaAnualMaxMm`, distinta de la lluvia del ciclo) y el contrato `tabla-suelos`; 0.4.0 agrega `serie-clima`, la humedad de suelo de POWER (`humedadRaizFraccionSat` y `humedadSuelo`), en `suelo` el método del TAW, la retención de agua y las estimaciones por servicio, y fija `horizonteMeses` en 6; 0.5.0 (incompatible) saca las ventanas de siembra del catálogo y crea `calendario-local`, deja la fecha de siembra y su `porQue` en el plan, fija `asignacionClima` en `temporada_tipica` y permite marcar cultivos que se muestran pero no se recomiendan (`cultivosNoRecomendados`, `noRecomendadoEnLugar`); 0.6.0 (compatible) agrega `clima-escenario.seleccion.lluviaTemporadasMm` {pv, oi, total, fuente} y permite `resultado-celda.etapa` en `null` cuando no hay parámetros del cultivo (el registro no puede ser `EVALUABLE`); 0.7.0 (compatible) agrega el pilar de exceso de agua `excesoHidrico` (percolación profunda, FAO-56 ec. 88) en los pilares por escenario, en los pesos y en `pilaresExcluidos`; 0.8.0 (compatible) agrega `resultado-rotacion.proximaTemporada`: escenario "próxima temporada" con años análogos reales, siempre `EXPLORATORIO` (o `NO_EVALUABLE` o `ERROR_DATOS`), `esPrediccion: false`, solo rangos entre análogos y sin ranking. Si un cambio rompe la compatibilidad, se sube la versión y se anota en `docs/01-REGISTRO-DE-CAMBIOS.md`.
