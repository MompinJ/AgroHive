# datos/catalogos/

Catalogos propios de AgroHive (A1.5 cultivos, A1.6 suelos). Se generan desde `generar.py`, que es la fuente de verdad; no editar los JSON a mano.

```bash
python datos/catalogos/generar.py      # escribe cultivos.json y suelos.json
node datos/catalogos/validar.mjs       # valida contra contratos/ (antes: npm install en contratos/)
```

| Archivo | Contrato | Contenido |
| --- | --- | --- |
| `cultivos.json` | `contratos/cultivo.schema.json` | Milpa (maiz, frijol, calabaza), chile (cultivo extra de la demo) y, del encargo #198, sorgo, sandia, camote y cacahuate (aun sin modelo 3D: no declaran `modelo3d`) |
| `suelos.json` | `contratos/tabla-suelos.schema.json` | TAW por clase USDA, FAO-56 Tabla 19 |
| `calendario-isla.json` | `contratos/calendario-local.schema.json` | Ventanas de siembra y presencia en SIAP de Isla, por cultivo y temporada |
| `saxton_rawls.py` | `agua` de `contratos/suelo.schema.json` | TAW y retencion (θsat, θFC, θWP) por pedotransferencia de Saxton y Rawls (2006) para cualquier textura; pruebas contra la Tabla 3 del articulo con `python -m unittest discover -s datos/catalogos` |

## Fuentes (consultadas el 14/11/2026)

- **FAO-56** (Allen et al., 1998): Tabla 11 (dias por etapa) y Tabla 12 (Kc) en [cap. 6](https://www.fao.org/4/x0490e/x0490e0b.htm); Tabla 19 (agua del suelo) en [cap. 7](https://www.fao.org/4/x0490e/x0490e0c.htm); Tabla 22 (Zr, p) y ec. 82 (TAW) en [cap. 8](https://www.fao.org/4/x0490e/x0490e0e.htm). Valores extraidos del HTML original.
- **FAO EcoCrop**: `ecocrop.fao.org` dio HTTP 503; se uso la copia de la base en el paquete R [Recocrop](https://github.com/cropmodels/Recocrop) (`inst/parameters/ecocrop.rds`, commit `3a01315`).

- **SIAP** (A0.6, V-20): [cierre agricola municipal](https://nube.agricultura.gob.mx/datosAbiertos/Agricola.php) 2021-2025. Isla = municipio 77 de Veracruz, DDR 175 San Andres Tuxtla. Extracto con las 85 filas del municipio en `fuentes/siap_isla_2021_2025.csv`.
- **INIFAP**, ventanas de siembra (el contrato guarda meses; el dia exacto queda en la nota de la fuente):
  - Maiz PV temporal, 1 jun-15 jul: [guia de maiz de temporal del sur de Veracruz](https://www.gob.mx/cms/uploads/attachment/file/723016/Maiz_temporal_tehuantepec.pdf) (C. E. Cotaxtla, 2022), que cubre el DDR San Andres Tuxtla.
  - Maiz OI, noviembre-diciembre, y frijol OI con humedad residual, 20 sep-20 oct: [Agenda Tecnica Agricola de Veracruz](https://www.gob.mx/cms/uploads/attachment/file/1066118/Agenda_T_cnica_Agr_cola_-_Veracruz-compressed.pdf) (2a ed., 2015), recomendaciones estatales.

## Elecciones que una persona debe revisar

| Tema | Eleccion | Por que |
| --- | --- | --- |
| Fila de Tabla 11 del maiz | Nigeria (humid), siembra junio: 20/35/40/30 = 125 d | Unica fila de tropico humedo con siembra en junio |
| Fila de Tabla 11 del frijol | Pakistan, Calif., junio: 15/25/35/20 = 95 d | No hay fila tropical; la mas calida con siembra en junio |
| Calabaza | *Cucurbita moschata*; FAO "Pumpkin, Winter squash", fila mediterranea (100 d) | Calabaza de milpa de tierra caliente, cosechada madura |
| Kc ini | Valor general del grupo (cereales 0.3, cucurbitaceas 0.5, leguminosas 0.4) | Tabla 12 no da Kc ini por cultivo; con lluvia frecuente puede subir a 1.0-1.2 (nota 1) |
| Kc end del maiz | 0.35 (de 0.60-0.35) | Cosecha tras secado en campo (nota 11) |
| Profundidad de raiz (Zr) | **Siempre el maximo del rango** de Tabla 22 (maiz 1.7 de 1.0-1.7; frijol 0.9 de 0.6-0.9; calabaza 1.5 de 1.0-1.5) | Tabla 22 nota 1: los valores mayores son para temporal o para modelar estres hidrico |
| TAW | Punto medio del rango (thetaFC - thetaWP) x 1000 | La tabla da rangos; se guarda el rango completo |
| **Chile = pimiento dulce** | Todos los parametros del chile salen del **pimiento dulce** (FAO-56 `Sweet peppers (bell)`, EcoCrop `Sweet pepper`, *Capsicum annuum*): 125 d (30/35/40/20, Tabla 11 abril/junio; la etapa inicial se imprime `25/30` y el total solo cuadra con 30), Kc 0.6/1.05/0.90, raiz 1.0 m, p 0.30, temperaturas 8/17/30/35 C | FAO-56 y EcoCrop no traen chile verde. Es una **equivalencia de la misma especie, no un dato medido en chile serrano o jalapeno: una persona debe revisarla**. `Hot pepper` de EcoCrop es otra especie (*C. frutescens*) y no se uso |
| Regimen de las ventanas OI | `temporal` (la agenda dice "riego y humedad residual") | SIAP clasifica el maiz y frijol OI de Isla como temporal, sin riego |
| Sorgo, fila de Tabla 11 | `Sorghum`, siembra mayo/junio (USA, Pakistan, Med.): etapas 20/35/40/30, ciclo 125 d | La fila imprime total 130 pero las etapas suman 125; se guardan las etapas impresas y el ciclo es la suma. Cotejar con el PDF de FAO-56 |
| Sorgo, Kc medio | 1.05, punto medio de 1.00-1.10 (Tabla 12) | La tabla da un rango; el punto medio es eleccion del equipo |
| Sorgo, EcoCrop | Fila `Sorghum (low altitude)` | EcoCrop trae tres filas por altitud; la altitud de la parcela no se verifico |
| Sandia, fila de Tabla 11 | `Watermelon`, Italia, abril: 20/30/30/30 = 110 d | No hay fila tropical; la otra es de desierto (80 d) |
| Camote | Fila tropical (temporada de lluvias): 15/30/50/30 = 125 d; Kc ini 0.5 del grupo Roots and Tubers | Unica fila tropical; no esta en SIAP de Isla (si en San Andres y Santiago Tuxtla) |
| Cacahuate | Fila `Groundnut`, Africa Occidental, "Dry season": 25/35/45/25 = 130 d; Kc ini 0.4 del grupo Legumes | Sin fila tropical etiquetada; la fecha es de temporada seca. La pagina parte las fechas: cotejar con el PDF. No esta en SIAP de Isla (si en Catemaco) |
| Grupos del selector | arenoso = arena franca, franco = franco, arcilloso = arcilla | Eleccion del equipo, no de FAO |

## Huecos (NO_EVALUABLE)

- **Lluvia por ciclo**: sin fuente. La lluvia de EcoCrop es **anual** y va en `lluviaAnualMinMm/MaxMm` (rango absoluto RMIN-RMAX; el optimo queda en la nota de la fuente). No se convierte a lluvia del ciclo.
- **Umbral de estres por calor**: sin fuente verificada (EcoCrop solo da medias mensuales).
- **Ventanas de siembra**: no van en `cultivos.json` (contratos 0.5.0): dependen del lugar y viven en `calendario-isla.json` (contrato `calendario-local`). Maiz PV y OI y frijol OI tienen ventana con fuente; frijol PV y chile no la tienen y la calabaza no esta registrada en Isla segun SIAP.
- **Etapas sensibles**: pendiente de fuente (FAO-33, Ky); el campo se omite.
- **Suelos sin fila en Tabla 19**: franco arcillo arenoso, franco arcilloso, arcillo arenoso.
