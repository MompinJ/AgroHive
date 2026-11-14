# contratos/

Contratos de datos de AgroHive (actividad A1.1) en JSON Schema 2020-12, con un ejemplo por contrato y tipos TypeScript generados. **Solo los edita Mompin**: si necesitas un campo nuevo, pídelo.

## Contratos

| Archivo | Qué describe | Quién lo produce |
| --- | --- | --- |
| `comun.schema.json` | Definiciones compartidas: estados de doc 04, `fuente`, `valorCitado`, `meta`, coordenadas, ids | — |
| `parcela.schema.json` | Polígono, cuadrícula y celdas con elevación y pendiente | Front (polígono) + API (elevación) |
| `suelo.schema.json` | Textura y pH estimados, siempre `SUPUESTO`; respaldo de selector manual | API (`/api/suelo`, A2.14) |
| `cultivo.schema.json` | Catálogo propio de cultivos: ciclo, etapas FAO-56, Kc, umbrales EcoCrop, ventanas de siembra | `datos/catalogos/` (A1.5) |
| `clima-escenario.schema.json` | Serie diaria de un año real del histórico (seco, habitual, lluvioso) | API (`/api/clima`) + motor (A2.5) |
| `proxima-temporada.schema.json` | Capa "próxima temporada aproximada": solo banda de incertidumbre por mes | API + motor (A2.13) |
| `plan-siembra.schema.json` | Rotación del selector: cultivo por ciclo y, si se pinta por bloques, por celda | Front (selector) |
| `resultado-celda.schema.json` | Salida del motor por celda y fecha (etapa, estado visual, humedad, déficit) | Motor |
| `resultado-rotacion.schema.json` | Pilares por escenario, peor caso, ranking (criterio A o B) y explicación | Motor |

## Reglas que el schema obliga a cumplir

- Un parámetro numérico del catálogo o del suelo es `{estado: "EVALUABLE", valor, unidad, fuente}` o `{estado: "NO_EVALUABLE", motivo}`. Un número suelto o sin fuente se rechaza.
- Un registro `NO_EVALUABLE` o `ERROR_DATOS` lleva todos sus indicadores en `null`, nunca en cero. Si el estado no es `EVALUABLE`, debe incluir un `motivo`.
- Suelo, textura y pH llevan siempre la etiqueta `SUPUESTO`.
- La próxima temporada tiene `esPrediccion: false`, un `aviso` obligatorio y bandas `{inferior, superior}` sin cifra única.
- Todo documento lleva `meta.versionContrato`. Si `meta.esEjemplo` es `true`, también lleva `meta.aviso`.
- Nomenclatura: `estado` es siempre el estado de evaluación de doc 04. El estado visual de la planta se llama `estadoPlanta`.

Lo que el schema no puede comprobar (que los ciclos sean cronológicos, que el polígono esté cerrado, que los cultivos del plan existan en el catálogo) lo valida el motor.

## Ejemplos

`ejemplos/<contrato>.ejemplo.json`: parcela demo de Isla, Veracruz, de 2 ha y 4 celdas, con **coordenadas ilustrativas** y **valores ficticios**. Todos llevan `meta.esEjemplo: true` y su aviso. En el catálogo, el maíz tiene sus parámetros en `NO_EVALUABLE` porque aún no tienen fuente (A1.5). El `cultivo_ficticio` existe solo para mostrar la forma `EVALUABLE`: no usarlo en la demo.

## Comandos

```bash
cd contratos
npm install
npm test        # valida cada ejemplo y comprueba que los casos de pruebas/invalidos/ se rechacen
npm run tipos   # regenera tipos/contratos.d.ts (no editar a mano)
```

Versión del contrato: `0.1.0`. Si un cambio rompe la compatibilidad, se sube la versión y se anota en `docs/01-REGISTRO-DE-CAMBIOS.md`.
