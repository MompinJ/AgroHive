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
| Documentación en Google Drive (rclone / MCP); GitHub en el evento | Equipo, 13/11 |
| Cada quien usa su IA; no se registra qué IA editó | Equipo, 13/11 |
| Se medirán requisitos mínimos de hardware | Reunión |
| Video demo como pieza de venta | Reunión |
| `NO_EVALUABLE` en vez de inventar datos | v1.2 |

## Se decide en el evento `[EN EVENTO]`

| Tema | Opciones documentadas | Doc |
| --- | --- | --- |
| Cronograma | A: 48 h (v0.2) · B: ~39 h (v1.2) | 09 |
| Cultivos iniciales | Maíz, frijol, sorgo, calabaza, chile, caña, cobertura | 03 |
| Parcela | Solo demo fija de Isla · también dibujar polígono propio | 03 |
| Asignación de cultivos | Por parcela completa · pintar por bloques | 03, 06 |
| Slider de meses | MVP · extra | 03, 06 |
| Criterio de ranking | **B elegido por Mompin el 14/11** (puntaje compuesto + arrepentimiento minimax, desempate por promedio); falta que el equipo lo ratifique. A (menor déficit en peor caso) queda de respaldo | 05 |
| Stack final y motor en navegador o servidor | Ver propuesta | 08 |
| Disposición exacta de paneles | Ver propuesta | 06 |

## Depende de los datos `[DEPENDE-DATOS]`

| Tema | Nota | Doc |
| --- | --- | --- |
| Pilares de la prueba de estrés | Lo ideal: déficit + compatibilidad + suelo. Se descarta por prioridad si faltan datos | 05 |
| Cómo se asigna el clima a cada ciclo | Investigación: APIs, calendarios, cultivos | 05 |
| Robustez sobre todo el histórico o solo 3 años | Según datos y tiempo | 04 |
| Fuentes NASA adicionales (GPM, SMAP, MODIS) | Solo si aportan y se integran de verdad | 04 |

## Mejoras a considerar `[MEJORA]`
- Incluir la **rotación actual del agricultor** como referencia.
- **Prioridades del agricultor** (agua, ingreso, suelo) que ponderen el ranking.
- Sliders "qué pasa si" (lluvia −20 %, temperatura +2 °C).

## Se decide después (menor)
- Numeración y nombres de documentos.
- Secciones que falten o sobren.

## Verificaciones pendientes `[VERIFICAR]`

| ID | Qué verificar | Acción / respaldo |
| --- | --- | --- |
| V-01 | Horario de inicio y cierre en sede Boca del Río | Preguntar al organizador; regirse por el límite más temprano |
| V-02 | Pestaña Resources y fuentes NASA aceptadas | Revisar la página del reto |
| V-03 | Formato de entrega, video y juicio | Adaptar al formulario oficial |
| V-04 | Reglas de IA, código previo, marca e imágenes NASA | Atribuir y declarar según reglas |
| V-05 | Qué cuenta como "empezar" antes del evento | Preguntar al organizador |
| V-06 | Parámetros de POWER (`GWETROOT`, radiación, unidades) | Probar la API diaria |
| V-07 | Parámetros de Open-Meteo | Revisar su documentación |
| V-08 | Acceso a elevación (SRTM, tiles de terreno) | Probar; respaldo con otro proveedor |
| V-09 | Kc, ciclos, umbrales y calendarios por cultivo | Citar FAO/INIFAP; si no hay, `NO_EVALUABLE` |
| V-10 | TAW por tipo de suelo | FAO-56 |
| V-11 | Rendimiento del 3D en hardware real | Medir; modo 2D |
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

## Diferencias resueltas entre las versiones anteriores

| Tema | v0.2 (`docs/`) | v1.2 | v2.0 (esta) |
| --- | --- | --- | --- |
| Equipo | Número desconocido | Cuatro | **Cuatro** |
| Relieve | En MVP | Fase 2 | **Sí, en MVP** |
| Selector / pintura de cultivos | Pintar por bloques | Una rotación fija | **Selector "what if"**; por bloques en evento |
| Cultivos | 5–6 propuestos | Maíz, frijol, sorgo | **Se eligen en el evento** |
| Pilares | Tres | Solo hídrico | **Los tres, según datos** |
| Ranking | Puntaje + arrepentimiento | Peor caso hídrico | **B (Mompin, 14/11; falta ratificar); A de respaldo** |
| Documentación | Notion | Drive + Notion | **Drive; GitHub en el evento** |
| Modelos 3D | Blockbench → GLB | Sin herramienta fija | **Agente + `.bbmodel` directo** |
| Cronograma | 48 h | ~39 h | **Se elige en el evento** |
