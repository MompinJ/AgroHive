# 11 · Decisiones, pendientes y riesgos

## Decisiones tomadas `[DECIDIDO]`

| Decisión | Origen |
| --- | --- |
| Buscar la rotación más robusta, no la de mayor rendimiento | Video del compañero |
| Prueba de estrés con escenarios históricos reales (seco, habitual, lluvioso) | Video |
| No predice el clima ni decide por el agricultor | Video |
| Interfaz de tres paneles: mapa/escena, selector de cultivos y dashboard | Reunión |
| Es un simulador "what if": sí hay selector de cultivos | Equipo, 13/11 |
| Sí hay relieve | Equipo, 13/11 |
| El equipo son 4 integrantes | Equipo, 13/11 |
| MVP primero; extras en fase 1 y fase 2 | Reunión |
| 3D en el MVP, con motor independiente y modo 2D de respaldo | Reunión, v0.2 y v1.2 |
| UI y modelos hechos por el equipo, sin plantillas | Reunión |
| Modelos en Blockbench (`.bbmodel`), generados por el agente `modelador-voxel` | Equipo, 13/11 |
| Documentación en el repo (`docs/`); Drive queda como respaldo del historial (13) | Equipo, 13/11; corregido en el evento (13) |
| Cada quien usa su IA; no se registra qué IA editó | Equipo, 13/11 |
| Se medirán requisitos mínimos de hardware | Reunión |
| Video demo como pieza de venta | Reunión |
| `NO_EVALUABLE` en vez de inventar datos | v1.2 |
| Ranking por criterio B: puntaje compuesto por escenario, arrepentimiento minimax, desempate por promedio; respaldo A (menor déficit en peor caso) si A3.7 no llega | Equipo, 14/11 (evento) |

## Se decide en el evento `[EN EVENTO]`

| Tema | Opciones documentadas | Doc |
| --- | --- | --- |
| ~~Cronograma~~ | Decidido 14/11: por esfuerzo de IA, sin horas (13, 14) | 09 |
| ~~Cultivos iniciales~~ | Decidido 14/11: milpa (maíz, frijol, calabaza) y chile como extra (13) | 03 |
| ~~Parcela~~ | Decidido 14/11: el polígono libre entra al MVP, además de la demo de Isla (13) | 03 |
| Asignación de cultivos | Por parcela completa · pintar por bloques | 03, 06 |
| ~~Slider de meses~~ | Hecho (A5.2) | 03, 06 |
| ~~Stack final y motor en navegador o servidor~~ | Decidido 14/11: motor TypeScript en Web Worker, backend FastAPI (13) | 08 |
| Disposición exacta de paneles | Ver propuesta | 06 |

## Depende de los datos `[DEPENDE-DATOS]`

| Tema | Nota | Doc |
| --- | --- | --- |
| ~~Pilares de la prueba de estrés~~ | Resuelto: déficit, exceso, compatibilidad y protección del suelo entran al ranking B (A3.7, A4.2; 13) | 05 |
| ~~Cómo se asigna el clima a cada ciclo~~ | Decidido: opción (c) `temporada_tipica` (A2.8; 13) | 05 |
| Robustez sobre todo el histórico o solo 3 años | Según datos y tiempo | 04 |
| Fuentes NASA adicionales (GPM, SMAP, MODIS) | IMERG (A4.10), NDVI de MODIS (A4.11) y SMAP en la API (A4.8) hechos como evidencia | 04 |

## Mejoras a considerar `[MEJORA]`
- Incluir la **rotación actual del agricultor** como referencia.
- **Prioridades del agricultor** (agua, ingreso, suelo) que ponderen el ranking.
- Sliders "qué pasa si" (lluvia −20 %, temperatura +2 °C).

## Recursos del reto evaluados (14/11, sesión features)

Recursos que dio el reto, evaluados para Isla y para el alcance mundial (13, "Alcance geográfico"). "Probado" = llamada real del 14/11.

| Recurso | Veredicto | Por qué |
| --- | --- | --- |
| GPM IMERG | **Sí**, A4.10 | Viene dentro de NASA POWER (`IMERG_PRECTOT`, `time-standard=UTC`, sin cuenta; probado). 0.1°, desde 1998-01-01 (POWER y CMR; la metodología dice 1998-06-01 y UCAR 2000-06-01). Ve tormentas que MERRA-2 aplana; es evidencia y no cambia los escenarios (ver riesgos) |
| MODIS NDVI | **Sí**, A4.11 | MOD13Q1 V061 por Planetary Computer (`modis-13Q1-061`), con caché y paquete de demo. ORNL no respondió (502/503) y no se llama en vivo. Evidencia; píxel de 250 m, no entra al ranking. `[VERIFICAR]` términos en planetarycomputer.microsoft.com/terms (V-25) |
| SRTM, ERA5 | Ya integrados | Terrarium (elevación compuesta de SRTM y otras fuentes) y respaldo Open-Meteo (ERA5) |
| SMAP | **Sí**, A4.8 (en la API; la interfaz no lo llama) | 9 a 36 km, cuenta Earthdata, capa superficial; cubre los tres años de escenario (desde 2015), útil para contrastar la humedad |
| FAO GAEZ v4 | **Solo evidencia** `[DECIDIDO]` (13), no fuente base, por la licencia no comercial | ArcGIS REST público sin llave (`gaez-services.fao.org/server/rest/services/res05` aptitud, `res02` inicio y duración del ciclo; probado 14/11, unos 5 s por punto) y GeoTIFF directo; 5' (~9 km); clima CRUTS32 1981-2010. Trae maíz y frijol (Phaseolus), **no calabaza ni chile**. En (18.03, -95.53), temporal, insumo bajo: aptitud del maíz 5556/10000 e inicio de ciclo día 106 (~16 de abril, dentro de PV). Licencia **CC BY-NC-SA 4.0** (catálogo de FAO): no comercial. Cita: Fischer et al. 2021, doi:10.4060/cb4744en. Buscar la capa por `name`, porque los `objectid` cambian |
| Calendario de siembra mundial | **GGCMI fase 3** `[DECIDIDO]` (13): respaldo fuera de México, A4.13 `[HECHO]` (Eduardo, `GET /api/calendario`) | GGCMI fase 3 (Jägermeyr et al. 2021, Nature Food; doi:10.5281/zenodo.5062513, CC BY 4.0): siembra y madurez de temporal a 0.5°, maíz `mai_rf` (servido) y frijol `bea_rf` (`[VERIFICAR]`: la ficha de Zenodo y el NetCDF, leídos el 14/11, no dicen que "bea" sea frijol; la API lo deja `NO_EVALUABLE`). GEOGLAM Crop Monitor (doi:10.5281/zenodo.15850408, CC BY 4.0): por estado, con temporadas de maíz equivalentes a PV y OI; que México venga en la descarga está `[VERIFICAR]`. SAGE (Sacks et al. 2010) es de los años 90 y débil en leguminosas. La API de FAO Crop Calendar (sin documentar) no respondió el 14/11. Ninguna trae calabaza ni chile: para esos cultivos, `NO_EVALUABLE` fuera de México |
| Landsat / HLS / Sentinel-2 | No antes de C4 | Resolución útil (10 a 30 m), pero nubes en temporal y procesamiento pesado |
| GLDAS, ECOSTRESS, GEDI | No | Repite `GWETROOT`; revisita irregular y nubes; estructura de bosque |
| WSS, SSURGO/STATSGO2, CDL, PRISM, NAIP, NLCD, OpenET, LANDFIRE, NWIS, AMS, NASS, Ag Data Commons | Extra fase 2 (A4.12) | Solo EE. UU.; CDL y SSURGO son los únicos que aportan algo propio (rotación real y suelo de campo). CDL y SSURGO ya están en la API (`/api/ee-uu/cdl` y `/api/ee-uu/ssurgo`, 15/11); el resto no se integra |
| NLDAS | No | Su dominio llega al sur solo hasta 25°N; Isla está en ~18°N |
| CoCoRaHS | No | Sin evidencia de que opere en México `[VERIFICAR]` |

## Se decide después (menor)
- Numeración y nombres de documentos.
- Secciones que falten o sobren.

## Verificaciones pendientes `[VERIFICAR]`

| ID | Qué verificar | Acción / respaldo |
| --- | --- | --- |
| V-01 | Horario de inicio y cierre en sede Boca del Río | Preguntar al organizador; regirse por el límite más temprano |
| V-02 | Pestaña Resources y fuentes NASA aceptadas | Revisar la página del reto |
| V-03 | Reglas globales verificadas el 14/11 (A0.5); entrega y juicio local aún por ejecutar/confirmar | Guías 2026 y pendientes en [02](02-EVENTO-Y-RETO.md#verificación-a05--14112026); cumplir en A5.9, horario local en V-01 |
| V-04 | Reglas de IA, originalidad y marca verificadas (A0.5); no se certifica cumplimiento ni licencias | Fuentes y pendientes de marcas/metadatos, inglés y permisos en [02](02-EVENTO-Y-RETO.md#verificación-a05--14112026); README/A5.7 requiere revisión humana |
| V-05 | Qué cuenta como "empezar" antes del evento | Preguntar al organizador |
| V-06 | ~~Parámetros de POWER~~ Decidido 14/11 (13): `GWETROOT` entra como condición inicial y comparación, convertida de fracción de saturación a fracción de TAW; radiación ya en MJ/m²/día | — |
| V-07 | Parámetros de Open-Meteo | Revisar su documentación |
| V-08 | ~~Acceso a elevación~~ Decidido 14/11 (13): Terrarium por defecto, Open-Meteo de respaldo | — |
| V-09 | Kc, ciclos, umbrales y calendarios por cultivo | Citar FAO/INIFAP; si no hay, `NO_EVALUABLE` |
| V-10 | TAW por tipo de suelo | FAO-56 |
| V-11 | Rendimiento del 3D en hardware real | Medido el 15/11 en GPU real y por software (A5.4, `docs/06`); falta un celular o laptop modesta; modo 2D |
| V-12 | Hosting (CORS, suspensión por inactividad) | Demo local y video de respaldo |
| V-13 | Validación por profesional local | Si no hay, decir "sin validación local" |
| V-14 | Cargar `.bbmodel` del agente en la escena real con instancing | Probar con el primer cultivo |

## Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Sobrealcance (relieve + selector + 3D + pilares) | Alto | Prioridades y puntos de corte (09) |
| El 3D consume demasiado tiempo | Alto | Motor independiente, modo 2D, plantas procedurales |
| APIs lentas o caídas en la sede | Alto | Caché, parcelas precargadas, Open-Meteo |
| La demo falla en vivo | Alto | Video grabado, parcela probada, copia sin internet |
| Humedad de POWER mal interpretada (fracción de saturación tomada como fracción de TAW) | Medio | Convertir con θsat, θFC y θWP de Saxton y Rawls; sin ellos, condición inicial `NO_EVALUABLE` |
| TAW por pedotransferencia sin materia orgánica citada | Medio | Citar el factor de carbono orgánico a materia orgánica `[VERIFICAR]`; si falta, TAW `NO_EVALUABLE` y selector manual |
| No se consiguen datos para algún pilar | Medio | Recortar por prioridad, decirlo como límite |
| Ranking B sin pilares 2 y 3 (A3.7) o sin pesos con fuente | Medio | Pesos iguales declarados `SUPUESTO`; si A3.7 no llega, respaldo con el criterio A (solo pilar hídrico) y decirlo en la tarjeta |
| Resolución gruesa parece debilidad | Medio | Presentarla como límite honesto; variación por relieve, suelo y cultivo |
| Datos de suelo no disponibles | Medio | Selector manual con valores FAO |
| Parámetros agronómicos mal citados | Medio | Citar fuentes, marcar supuestos, aviso de validación |
| Conflictos de código por convenciones | Medio | Contratos de datos en la hora 0 |
| Quedarse sin cupo de IA | Medio | Repartir uso, reservar para lo crítico |
| Rendimiento pobre en equipos modestos | Medio | Tope de celdas, instancing, modo 2D |
| Ediciones simultáneas en Drive | Bajo | Un archivo por responsable; registrar en 01 |
| Percepción de "plantilla de IA" | Bajo | Arte y UI propios |
| Los años seco / habitual / lluvioso dependen de la fuente de lluvia: con IMERG serían 2019, 2024 y 2017 en vez de 2023, 2016 y 2024 (`features/imerg/`, 14/11) | Medio | Se mantiene `PRECTOTCORR` (decisión vigente, 05 paso 1) y se declara el hallazgo en método y pitch; IMERG se muestra como contraste (A4.10); validar contra una estación del SMN si se consigue `[VERIFICAR]` |
| Fuera de México no hay calendario de siembra con fuente (alcance mundial, 13) | Medio | Calendario y pilar de compatibilidad `NO_EVALUABLE` con motivo; respaldo con GGCMI fase 3 (A4.13 `[HECHO]`: maíz de temporal fuera de México) y GAEZ v4 solo como evidencia (13), ver "Recursos del reto evaluados"; calabaza y chile quedan `NO_EVALUABLE` fuera de México |
| Demo validada solo en Isla aunque la arquitectura sea mundial | Bajo | Decir "probado en Isla"; no afirmar validación en otros lugares |

## Diferencias resueltas entre las versiones anteriores

| Tema | v0.2 (`docs/`) | v1.2 | v2.0 (esta) |
| --- | --- | --- | --- |
| Equipo | Número desconocido | Cuatro | **Cuatro** |
| Relieve | En MVP | Fase 2 | **Sí, en MVP** |
| Selector / pintura de cultivos | Pintar por bloques | Una rotación fija | **Selector "what if"**; por bloques en evento |
| Cultivos | 5–6 propuestos | Maíz, frijol, sorgo | **Milpa (maíz, frijol, calabaza); chile extra (13)** |
| Pilares | Tres | Solo hídrico | **Los tres, según datos** |
| Ranking | Puntaje + arrepentimiento | Peor caso hídrico | **B `[DECIDIDO]` 14/11; A de respaldo** |
| Documentación | Notion | Drive + Notion | **Repo (`docs/`); Drive como respaldo (13)** |
| Modelos 3D | Blockbench → GLB | Sin herramienta fija | **Agente + `.bbmodel` directo** |
| Cronograma | 48 h | ~39 h | **Por esfuerzo de IA (14)** |
