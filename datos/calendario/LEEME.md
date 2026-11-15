# Calendario por coordenada (A4.13), base MUNDIAL

Lo sirve `GET /api/calendario`. No se inventan ventanas. `[DECIDIDO]` Mompin, 15/11: AgroHive es mundial; la base es la misma en cualquier coordenada, tambien en Mexico, y las fuentes de un pais se suman encima (docs/13, "Alcance geografico").

| Archivo | Que es | Licencia |
| --- | --- | --- |
| `paises-110m.json` | Paises de Natural Earth 1:110m, v5.1.2 (solo iso, nombre y geometria). Consultado el 2026-11-14 | Dominio publico. https://www.naturalearthdata.com/ |
| `siap-mexico.npz` | Rejilla de 0.01 grados (3200 x 1840) con el indice del municipio de SIAP en cada celda de Mexico; 0 = sin municipio o sin pareja (unos 165 KB, 12 MB en memoria). Lo genera `extraer_siap_mexico.py` | Limites de geoBoundaries gbOpen MEX ADM2 (municipios, ano 2012, CC BY 4.0) y ADM1 (estados, CC BY 3.0 IGO) |
| `siap-mexico.json` | Por municipio (clave INEGI y nombre): superficie sembrada de temporal por cultivo de AgroHive, temporada y ano, 2021-2025; el nombre SIAP de cada cultivo y los municipios de geoBoundaries que no se emparejaron (`sinPareja`) | SIAP, datos abiertos: uso libre con reconocimiento de la fuente y mismas condiciones al redistribuir (`[VERIFICAR]`, como el extracto de Isla) |
| `extraer_siap_mexico.py` | Descarga los 5 cierres anuales de SIAP (unos 30 MB) y los limites de geoBoundaries (unos 21 MB) a `datos/cache/siap/` y escribe el extracto | - |
| `ggcmi-rf.npz` | Extracto de GGCMI fase 3, temporal: dia de siembra, dia de madurez e indice de fuente por celda de 0.5 grados para 13 productos (unos 480 KB). Lo genera `extraer_ggcmi.py` | CC BY 4.0. doi:10.5281/zenodo.5062513. Jägermeyr et al. 2021, Nature Food 2: 873-885 |
| `ggcmi-rf.json` | De que NetCDF salio cada producto del extracto, con su md5 de Zenodo | (metadatos) |
| `extraer_ggcmi.py` | Descarga los NetCDF de Zenodo, comprueba el md5 y escribe el extracto | - |

## Como se regenera

```bash
# desde la raiz del repo, con el entorno de la API (h5py y numpy)
python datos/calendario/extraer_ggcmi.py            # descarga 13 NetCDF (~1 MB) a datos/cache/ggcmi/ y escribe ggcmi-rf.npz
python datos/calendario/extraer_ggcmi.py --sin-red  # rehace el extracto con los NetCDF ya descargados
python datos/calendario/extraer_siap_mexico.py            # SIAP 2021-2025 + geoBoundaries -> siap-mexico.npz y .json (unos 16 s)
python datos/calendario/extraer_siap_mexico.py --sin-red  # con lo ya descargado en datos/cache/siap/
```

Los NetCDF originales **no** van al repo (quedan en `datos/cache/`, ignorada por git). El extracto si, porque el servidor se actualiza con `git pull` y las pruebas no deben depender de la red. En memoria, GGCMI son unos 17 MB (13 productos x 3 capas de 360 x 720 enteros) y SIAP unos 15 MB, cargados una vez por proceso: medido el 15/11, la API pasa de 92 a 126 MB de RSS y la llamada tarda 1 ms despues de la primera. Cabe de sobra en el droplet de 2 GB.

## Que cultivo sale de que producto

GGCMI publica 18 cultivos (20 archivos por regimen) y un solo ciclo por celda. Solo se usan los archivos de temporal (`_rf`): el balance del motor es de temporal.

| Cultivo de AgroHive | Producto de GGCMI | Nota |
| --- | --- | --- |
| maiz | `mai_rf` (maize) | |
| sorgo | `sor_rf` (sorghum) | |
| soya | `soy_rf` (soybean) | |
| cacahuate | `nut_rf` (groundnut) | |
| trigo | `swh_rf` (spring wheat) | El catalogo usa trigo de primavera (FAO-56). `wwh_rf` (trigo de invierno) no se usa: supone latencia en invierno, que el motor no modela |
| cebada | `bar_rf` (barley) | |
| papa | `pot_rf` (potato) | |
| yuca | `cas_rf` (cassava) | |
| cana | `sgc_rf` (sugarcane) | |
| girasol | `sun_rf` (sunflower) | |
| algodon | `cot_rf` (cotton) | |
| chicharo | `pea_rf` (field pea) | **Equivalencia `SUPUESTO`**: GGCMI es chicharo de grano seco; el catalogo usa chicharo verde de la misma especie (*Pisum sativum*). Mismo dia de siembra |
| maiz_dulce | `mai_rf` (maize) | **Equivalencia `SUPUESTO`**: GGCMI no separa el maiz dulce; se toma el maiz de grano (misma especie, *Zea mays*) |

**Sin fuente mundial (`NO_EVALUABLE` con motivo):** frijol y ejote (`bea_rf` existe, pero ni el NetCDF ni la ficha de Zenodo dicen que `bea` sea frijol), betabel (`sgb_rf` es remolacha azucarera, otro producto y otro ciclo: no se usa como equivalencia), avena (no esta en GGCMI) y el resto (calabaza, chile, sandia, camote, caupi, haba, lenteja, ajonjoli, cartamo, higuerilla, jitomate, calabacita y las hortalizas): ningun producto mundial con licencia abierta cargado los trae. Productos de GGCMI que no estan en el catalogo: `mil` (mijo), `rap` (colza), `ri1`/`ri2` (arroz), `rye` (centeno).

## Como se lee

GGCMI publica un dia, no un rango, y un solo ciclo por celda: la ventana es ese dia (`desde` = `hasta`), la otra temporada queda `NO_EVALUABLE` y la entrada va `EXPLORATORIO`. La madurez y la duracion van en la nota de la fuente (el contrato no tiene ese campo). La etiqueta PV u OI usa el corte de SIAP (PV abril a septiembre) porque el contrato la exige; en el hemisferio sur la siembra principal (octubre a diciembre) cae en OI. La presencia queda `sin_dato`: GGCMI extrapola fuera de las zonas cultivadas y no dice si ahi se siembra.

**Mexico, SIAP encima (todos los municipios):** si el punto cae en un municipio con pareja en SIAP, la presencia de cada cultivo sale del cierre agricola municipal 2021-2025, modalidad temporal: `registrado` (con la superficie por ano en la nota) o `no_registrado` (SIAP separa el cultivo pero no lo registra ahi en ese ciclo: se muestra, pero no se recomienda). La caña usa el ciclo `Perennes` en PV y OI. Caupi y maiz dulce no tienen nombre equivalente en SIAP (el frijol x'pelon y el elote no se toman como tales) y quedan `sin_dato`. SIAP no publica ventanas: la ventana sigue siendo la de GGCMI. La ubicacion trae las claves INEGI y el `id` es `calendario-mx-<ent><mun>-ggcmi-<i>-<j>`. Fuera de Mexico, o en un municipio sin pareja, el `id` es `calendario-ggcmi-<iso>-<i>-<j>` y la presencia queda `sin_dato` (advertencia `SIAP_SIN_MUNICIPIO`).

**Emparejamiento de municipios:** geoBoundaries no trae claves INEGI, asi que el estado sale de ADM1 (mayoria de celdas) y el municipio, del nombre normalizado (sin acentos ni signos) dentro del estado; si no es igual, se acepta un nombre que contiene al otro por palabras completas solo si queda un candidato ("Cintalapa" -> "Cintalapa de Figueroa"; "San Pedro Garza Garcia" no cae en "Garcia"). Quedan 2428 de 2457 con pareja; los 29 sin pareja son alcaldias y municipios urbanos sin filas de SIAP (CDMX, Monterrey, Guadalajara, Boca del Rio, Tampico, Cozumel...) y cuatro distritos ambiguos de Oaxaca. La rejilla es de 0.01 grados (~1 km): cerca de un limite el punto puede caer en el vecino, y la nota de la fuente lo dice.

**Isla, capa local encima de SIAP:** en el municipio 30/077, por cada cultivo y temporada manda la ventana de INIFAP de `datos/catalogos/calendario-isla.json` cuando la tiene; si no, queda la de GGCMI con la presencia del extracto de Isla. Desde el 15/11 Isla se reconoce por su clave INEGI en la rejilla, ya no por un recuadro OSM.

**Costa (H-B10, 14/11 noche):** el 1:110m generaliza el litoral. Medido sobre este archivo: Boca del Rio queda a 1.4 km del poligono de Mexico, el puerto de Veracruz a 4.2 km, Ensenada a 20 km y Lima a 15 km. Si el punto no cae en ningun pais, la API toma el mas cercano a 25 km o menos (`TOLERANCIA_COSTA_KM`, un supuesto sobre la precision del mapa), solo si es el unico a esa distancia; en un estrecho o una frontera responde 422. La respuesta lo dice con `PAIS_POR_CERCANIA`.
