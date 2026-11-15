# Calendario por coordenada (A4.13)

Lo sirve `GET /api/calendario`. No se inventan ventanas.

| Archivo | Que es | Licencia |
| --- | --- | --- |
| `paises-110m.json` | Paises de Natural Earth 1:110m, v5.1.2 (solo iso, nombre y geometria). Consultado el 2026-11-14 | Dominio publico. https://www.naturalearthdata.com/ |
| `isla-recuadro.json` | Recuadro OSM del municipio de Isla, Veracruz, el 2026-11-14 | ODbL (OpenStreetMap) |
| `ggcmi/mai_rf_ggcmi_crop_calendar_phase3_v1.01.nc4` | Dia de siembra y de madurez de maiz de temporal, 0.5 grados | CC BY 4.0. doi:10.5281/zenodo.5062513. Jägermeyr et al. 2021, Nature Food 2: 873-885 |

**Costa (H-B10, 14/11 noche):** el 1:110m generaliza el litoral. Medido sobre este archivo: Boca del Rio queda a 1.4 km del poligono de Mexico, el puerto de Veracruz a 4.2 km, Ensenada a 20 km y Lima a 15 km. Si el punto no cae en ningun pais, la API toma el mas cercano a 25 km o menos (`TOLERANCIA_COSTA_KM`, un supuesto sobre la precision del mapa), solo si es el unico a esa distancia; en un estrecho o una frontera responde 422. La respuesta lo dice con `PAIS_POR_CERCANIA`.

En Mexico no se usa GGCMI. Si el punto cae en el recuadro de Isla se devuelve `datos/catalogos/calendario-isla.json` (SIAP e INIFAP). En el resto de Mexico la respuesta es `NO_EVALUABLE`: no hay otro calendario cargado.

Fuera de Mexico, el maiz de temporal sale de `mai_rf`. GGCMI publica un dia, no un rango, y un solo ciclo por celda: la ventana es ese dia y la otra temporada queda `NO_EVALUABLE`. El frijol no se lee de `bea_rf`: ni el NetCDF ni la ficha de Zenodo dicen que `bea` sea frijol. Calabaza y chile no estan en el producto.
