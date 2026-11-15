# datos/catalogos/

Catalogos propios de AgroHive (A1.5 cultivos, A1.6 suelos). Se generan desde `generar.py`, que es la fuente de verdad; no editar los JSON a mano.

```bash
python datos/catalogos/generar.py      # escribe cultivos.json y suelos.json
node datos/catalogos/validar.mjs       # valida contra contratos/ (antes: npm install en contratos/)
```

| Archivo | Contrato | Contenido |
| --- | --- | --- |
| `cultivos.json` | `contratos/cultivo.schema.json` | Milpa (maiz, frijol, calabaza), chile (cultivo extra de la demo), del encargo #198 sorgo, sandia, camote y cacahuate (con `modelo3d`) y la ampliacion del 15/11 (lista abajo), sin `modelo3d` |
| `suelos.json` | `contratos/tabla-suelos.schema.json` | TAW por clase USDA, FAO-56 Tabla 19 |
| `calendario-isla.json` | `contratos/calendario-local.schema.json` | Ventanas de siembra y presencia en SIAP de Isla, por cultivo y temporada |
| `saxton_rawls.py` | `agua` de `contratos/suelo.schema.json` | TAW y retencion (θsat, θFC, θWP) por pedotransferencia de Saxton y Rawls (2006) para cualquier textura; pruebas contra la Tabla 3 del articulo con `python -m unittest discover -s datos/catalogos` |

## Ampliacion del catalogo (15/11/2026) `[DECIDIDO]` (Mompin)

Meta: 30 a 50 cultivos con prioridad para Mexico, el tropico humedo y las rotaciones. Van al final de `CULTIVOS` (lista `AMPLIACION` de `generar.py`), sin `modelo3d` (la escena dibuja la planta provisional y lo declara) y con entrada en `calendario-isla.json` para PV y OI: ventana `NO_EVALUABLE` (aun no se consulta INIFAP) y presencia segun el extracto de SIAP de Isla.

| Tanda | Cultivos |
| --- | --- |
| 1, leguminosas y cereales | soya, frijol caupi, haba, chicharo, lenteja, ejote, cebada, trigo, avena, maiz dulce |
| 2, cultivos de campo del tropico y de Mexico | yuca, cana de azucar, ajonjoli, girasol, algodon, cartamo, higuerilla, jitomate, papa, calabacita |
| 3, hortalizas | cebolla, pepino, melon, lechuga, zanahoria, berenjena, brocoli, col, coliflor, espinaca, rabano, betabel |

Total: 40 cultivos (8 anteriores y 32 de la ampliacion).

**Criterio de fila de Tabla 11 para la ampliacion:** (a) la fila tropical si existe; (b) si no, la de siembra mas cercana a junio (temporal PV de Isla, como maiz, frijol, chile y sorgo); (c) en empate, la region mas calida; (d) se salta una fila con etapas impresas ambiguas (por ejemplo `50/30`) o que no suman su total, si otra fila cumple. Kc ini, Zr y p siguen las reglas de la tabla de abajo; un rango de Kc sin nota que elija se resuelve con el punto medio (como el Kc medio del sorgo).

**Quedaron fuera** (regla: un parametro obligatorio sin fuente, o un dato que el motor usaria con otro significado):

| Cultivo | Por que |
| --- | --- |
| Arroz | FAO-56 describe arroz inundado: su p es fraccion de la saturacion (Tabla 22 nota 4), no de TAW, y su Kc ini supone lamina de agua. El balance de cubeta no modela inundacion, asi que el numero seria enganoso |
| Garbanzo, ajo | Tienen Kc (Tabla 12) y Zr (Tabla 22), pero Tabla 11 no trae sus dias por etapa |
| Alfalfa | Tabla 11 da la temporada total como `var.`: es perenne de cortes, no un ciclo de siembra a cosecha |
| Sorgo forrajero | FAO-56 solo trae `Sudan grass`, otra especie, y `Sorghum - sweet` sin fila propia en Tabla 11 |
| Platano | Tabla 11 solo trae filas mediterraneas (primer ano 390 d, segundo 365 d) para una planta perenne, y EcoCrop tiene cuatro filas de *Musa* sin forma de saber cual es el platano de Isla |
| Pina | Tabla 11 da 790 dias: no cabe en la serie de 18 meses del escenario (doc 05), siempre saldria `NO_EVALUABLE` |
| Papaya, name, tomatillo, chayote, jicama, amaranto, chia | Sin fila en las Tablas 11, 12 y 22 de FAO-56 |

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
| **Chile = pimiento dulce** | Todos los parametros del chile salen del **pimiento dulce** (FAO-56 `Sweet peppers (bell)`, EcoCrop `Sweet pepper`, *Capsicum annuum*): 125 d (30/35/40/20, Tabla 11 abril/junio; la etapa inicial se imprime `25/30` y el total solo cuadra con 30), Kc 0.6/1.05/0.90, raiz 1.0 m, p 0.30, temperaturas 8/17/30/35 C | FAO-56 y EcoCrop no traen chile verde. Es una **equivalencia de la misma especie, no un dato medido en chile serrano o jalapeno**. **Revisada por Mafer (MF6, 15/11): se mantiene** (misma especie, *Capsicum annuum*; marcarlo `NO_EVALUABLE` romperia el chile de la demo y las rotaciones) y debe seguir rotulada asi. `Hot pepper` de EcoCrop es otra especie (*C. frutescens*) y no se uso |
| Regimen de las ventanas OI | `temporal` (la agenda dice "riego y humedad residual") | SIAP clasifica el maiz y frijol OI de Isla como temporal, sin riego |
| Sorgo, fila de Tabla 11 | `Sorghum`, siembra mayo/junio (USA, Pakistan, Med.): etapas 20/35/40/30, ciclo 125 d | La fila imprime total 130 pero las etapas suman 125; se guardan las etapas impresas y el ciclo es la suma. Cotejar con el PDF de FAO-56 |
| Sorgo, Kc medio | 1.05, punto medio de 1.00-1.10 (Tabla 12) | La tabla da un rango; el punto medio es eleccion del equipo |
| Sorgo, EcoCrop | Fila `Sorghum (low altitude)` | EcoCrop trae tres filas por altitud; la altitud de la parcela no se verifico |
| Sandia, fila de Tabla 11 | `Watermelon`, Italia, abril: 20/30/30/30 = 110 d | No hay fila tropical; la otra es de desierto (80 d) |
| Camote | Fila tropical (temporada de lluvias): 15/30/50/30 = 125 d; Kc ini 0.5 del grupo Roots and Tubers | Unica fila tropical; no esta en SIAP de Isla (si en San Andres y Santiago Tuxtla) |
| Cacahuate | Fila `Groundnut`, Africa Occidental, "Dry season": 25/35/45/25 = 130 d; Kc ini 0.4 del grupo Legumes | Sin fila tropical etiquetada; la fecha es de temporada seca. La pagina parte las fechas: cotejar con el PDF. No esta en SIAP de Isla (si en Catemaco) |
| Grupos del selector | arenoso = arena franca, franco = franco, arcilloso = arcilla | Eleccion del equipo, no de FAO |
| Soya, fila de Tabla 11 | `Soybeans`, Tropics, diciembre: 15/15/40/15 = 85 d | Unica fila tropical; su siembra cae en OI. SIAP no la registra en Isla (en Veracruz solo en Panuco) |
| Frijol caupi | Fila `Green gram, cowpeas` (Mediterraneo, marzo): etapas 20/30/30/20 = 100 d; Kc end 0.35 | La fila imprime total 110 pero las etapas suman 100 (como el sorgo, se guardan las etapas y el ciclo es la suma; cotejar con el PDF). Kc end: nota 6, grano seco |
| Haba | `Faba bean`, Europa, mayo: 90 d; Kc de la subfila `Dry/Seed` (0.5/1.15/0.30) | SIAP registra "haba grano"; la subfila fresca tiene Kc end 1.10 |
| Chicharo | `Peas`, Europa, mayo: 90 d; Kc y p de la subfila `Fresh` (0.5/1.15/1.10, p 0.35) | Chicharo verde de consumo en fresco. **Revisado por Mafer (MF6, 15/11): se mantiene** (se cosecha verde y el modelo 3D muestra vainas verdes). `Dry/Seed` da Kc end 0.30 y p 0.40 |
| Lenteja | `Lentil`, Europa, abril: 150 d | Siembra mas cercana a junio; la otra fila es arida de octubre/noviembre (170 d) |
| Ejote | `Beans (green)`, California/Egipto/Libano, agosto/septiembre: 75 d; EcoCrop `Bean, Common` | EcoCrop no separa el ejote del frijol (misma especie) |
| Cebada, trigo y avena | Fila comun `Barley/Oats/Wheat`, Africa Oriental, julio: 15/30/65/40 = 150 d | De las dos filas tropicales (India central, noviembre; Africa Oriental, julio) la de julio es la mas cercana al PV. La tabla no dice la altitud: revisar |
| Trigo, Kc end | 0.25 de 0.25-0.4 (nota 10: el mayor es para cosecha manual) | Se supone cosecha mecanica. **Revisado por Mafer (MF6, 15/11): se mantiene 0.25** (el trigo comercial se cosecha con maquina; con 0.40 solo cambia la etapa final, unos pocos mm por dia). Se usa trigo de primavera: el de invierno supone suelo helado o latencia |
| Maiz dulce (elote) | `Maize (sweet)`, Filipinas, marzo: 80 d; Kc end 1.05 (nota 12, cosecha en fresco) | Unica fila tropical. No es el elote de maiz criollo cosechado tierno, que FAO-56 no publica |
| Yuca | `Cassava: year 1`, regiones tropicales, temporada de lluvias: 20/40/90/60 = 210 d; Kc y p de la subfila `year 1` | Unica fila tropical; el ano 2 (360 d) continua el mismo cultivo y no cabe en la serie. La pagina parte "Rainy season" entre dos filas: cotejar |
| Cana de azucar | `Sugarcane, virgin`, Tropics: 50/70/220/140 = 480 d; EcoCrop `Sugarcane` de *S. officinarum* | Cana de planta (siembra nueva); la soca (320 d) es rebrote sin siembra. Con 480 d solo cabe en la serie del escenario si se siembra de octubre a diciembre; en PV el motor la deja `NO_EVALUABLE` con motivo. SIAP la registra en Isla como `Perennes`: la presencia usa ese ciclo para PV y OI |
| Ajonjoli | `Sesame`, China, junio: etapas 20/30/40/20 = 110 d | La fila imprime total 100 pero las etapas suman 110 (como el sorgo: se guardan las etapas, el ciclo es la suma; cotejar con el PDF) |
| Girasol y cartamo, Kc medio | 1.0 de 1.0-1.15 (nota 9: los menores son para temporal con menor densidad) | Temporal. Cartamo: fila de California, abril (125 d) |
| Algodon | `Cotton`, Egipto/Pakistan/California, marzo a mayo: 195 d; Kc medio 1.175 y Kc end 0.60 (puntos medios de 1.15-1.20 y 0.70-0.50) | Sin nota que elija dentro del rango; EcoCrop `Cotton, American upland` (*G. hirsutum*) |
| Higuerilla | `Castor beans`, Indonesia, noviembre: 135 d | Unica fila tropical; cae en OI |
| Jitomate | `Tomato`, Mediterraneo, abril/mayo: 145 d; Kc end 0.80 (punto medio de 0.70-0.90) | Empate de siembra con California (155 d); se eligio el Mediterraneo, como con la calabaza. El id es `tomate` y el nombre "Jitomate" para no confundirlo con el tomate verde |
| Papa | `Potato`, clima continental, mayo: 130 d | Siembra mas cercana a junio; la fila (semi)arida imprime etapas ambiguas (30/45) |
| Calabacita | `Squash, Zucchini`, Mediterraneo/Europa, mayo/junio: 90 d; EcoCrop `Vegetable marrow` (*C. pepo*) | Calabacita tierna; la calabaza de milpa madura sigue siendo `calabaza` |
| Hortalizas pequenas (cebolla, lechuga, zanahoria, brocoli, col, coliflor, espinaca, rabano) | Kc ini 0.7 del grupo a. Small Vegetables; betabel 0.5 (Roots and Tubers), berenjena 0.6 (Solanum), melon 0.5 (Cucumber Family); el pepino trae Kc ini propio (0.6) | Mismo criterio de Kc ini de grupo que los ocho primeros |
| Cebolla | `Onion (dry)`, Mediterraneo, abril: 150 d | Bulbo seco; la de rabo tiene otra fila |
| Pepino | `Cucumber`, region arida, junio/agosto: 105 d; subfila `Fresh Market` | Para consumo en fresco; la de cosecha mecanica tiene Kc end 0.90 |
| Melon | `Sweet melons`, Mediterraneo, mayo: 120 d | Fila general de *Cucumis melo*; el cantaloupe tiene fila aparte, solo de California |
| Zanahoria y espinaca | Zanahoria: Mediterraneo, febrero/marzo (150 d). Espinaca: region arida, noviembre (100 d) | Se saltaron filas con etapas ambiguas (`50/30`; `15/25` y `60/70`), regla (d) |
| Berenjena | `Egg plant`, region arida, octubre: 30/40/40/20 = 130 d | La fila de mayo/junio imprime total 40 y sus etapas suman 140; se salto, regla (d). La pagina imprime el total elegido como `130\1` |
| Brocoli, col y coliflor | Unica fila de cada una: desierto de California, septiembre (135, 165 y 140 d) | Nota 1 de Tabla 11: la duracion de las cruciferas varia mucho con la variedad |

## Huecos (NO_EVALUABLE)

- **Lluvia por ciclo**: sin fuente. La lluvia de EcoCrop es **anual** y va en `lluviaAnualMinMm/MaxMm` (rango absoluto RMIN-RMAX; el optimo queda en la nota de la fuente). No se convierte a lluvia del ciclo.
- **Umbral de estres por calor**: sin fuente verificada (EcoCrop solo da medias mensuales).
- **Ventanas de siembra**: no van en `cultivos.json` (contratos 0.5.0): dependen del lugar. La **base es mundial** (15/11, `[DECIDIDO]` Mompin): `GET /api/calendario` da en cualquier coordenada el dia de siembra de temporal de GGCMI fase 3 para 15 cultivos (maiz, sorgo, soya, cacahuate, trigo, cebada, papa, yuca, cana, girasol, algodon; chicharo, maiz dulce, frijol y ejote como equivalencias `SUPUESTO`) y el mes de inicio de Pulses de MIRCA2000 para caupi, haba y lenteja (`SUPUESTO`); en los 57 paises de FAO Crop Calendar (CC BY-NC-SA 4.0, carpeta aparte) sus ventanas van encima y cubren hortalizas y otros; el resto queda `NO_EVALUABLE` con motivo. Mapeo en `datos/calendario/LEEME.md`. En Mexico la API suma encima la presencia de SIAP de cada municipio (`datos/calendario/siap-mexico.*`); `calendario-isla.json` (contrato `calendario-local`) es la capa de Isla (municipio 30/077) con las ventanas de INIFAP. Maiz PV y OI y frijol OI tienen ventana con fuente; frijol PV y chile no la tienen y la calabaza no esta registrada en Isla segun SIAP. Ningun cultivo de la ampliacion del 15/11 tiene ventana con fuente todavia (no se consulto INIFAP para ellos).
- **Etapas sensibles**: pendiente de fuente (FAO-33, Ky); el campo se omite.
- **Suelos sin fila en Tabla 19**: franco arcillo arenoso, franco arcilloso, arcillo arenoso.
