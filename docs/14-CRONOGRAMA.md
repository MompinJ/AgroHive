# 14 · Cronograma de actividades (por esfuerzo de IA)

Sin horas. Cada actividad se mide por **cuánta IA cuesta** hacerla bien, para repartir los cupos de cada integrante y decidir qué recortar. Los puntos de corte son **compuertas** (se cruzan cuando el entregable existe), no horarios.

## Escala de esfuerzo

| Nivel | Qué significa | Cupo de IA |
| --- | --- | --- |
| **XS** | Un prompt, resultado casi directo | Ligero |
| **S** | Una sesión corta, 1 a 3 iteraciones | Ligero |
| **M** | Sesión larga con iteración, pruebas y revisión humana | Medio |
| **L** | Varias sesiones; contexto grande del repo; integración con otras piezas | **Fuerte** |
| **XL** | Demasiado grande: **dividir** antes de empezar | Fuerte |

**Regla de cupos** (doc 09): reservar el cupo fuerte para lo crítico (motor y escena 3D); usar el cupo ligero para boilerplate, tipos, textos y configuración.

## Roles

Asignación por nombre pendiente (V-18). Ramas: `balam`, `Mompin`, `Mafer`, `Eduardo`. Eduardo es dueño del servidor, así que lo natural es que lleve **R3 (datos y servidor)**; el resto se confirma en equipo.

| Rol | Alcance | Carpeta principal |
| --- | --- | --- |
| **R1** Interfaz y 3D | React, mapa, polígono, paneles, selector, escena 3D, 2D | `web/` |
| **R2** Motor científico | Escenarios, balance de agua, pilares, ranking, explicaciones, pruebas | `web/src/motor/` |
| **R3** Datos y servidor | FastAPI, POWER, Open-Meteo, elevación, caché, catálogo de cultivos, despliegue | `api/`, `datos/` |
| **R4** Arte, integración y entrega | Modelos con `modelador-voxel`, paleta, iconos, video, pitch, README | `modelos/`, `docs/` |

Un archivo, un responsable. Los contratos (`contratos/`) los toca solo quien los propone, avisando al resto.

## Fases y compuertas

```text
F0 Arranque -> F1 Contratos y esqueleto -> F2 Datos y motor -> F3 Escena y selector
            -> F4 Integración y dashboard -> F5 Pulido y entrega
```

| Compuerta | Se cruza cuando... | Si no se cumple |
| --- | --- | --- |
| **C1 · Datos reales** | Una pantalla muestra lluvia diaria real de POWER para una coordenada | Simplificar el mapa; usar Open-Meteo directo |
| **C2 · Motor con datos** | El motor devuelve resultados por celda con datos reales y pasa pruebas básicas | Reducir a pilar hídrico solamente |
| **C3 · Escena viva** | Bloques 3D con relieve y estado coloreado desde el motor | Plan 2D y plantas procedurales |
| **C4 · Congelar funciones** | Ya no entran funciones nuevas | Recortar extras |
| **C5 · Congelar producto** | Solo errores y pulido | — |
| **C6 · Entrega lista** | Demo, video, README y envío listos | Respaldo local y video |

## F0 · Arranque

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A0.1 | Repo Git con 5 ramas y estructura de carpetas | Mompin | XS | — | Repo remoto con `main` y 4 ramas |
| A0.2 | Documentación consolidada en `docs/` | Mompin | S | — | `docs/` al día, registro en 01 |
| A0.3 | Acordar roles, cultivos iniciales y criterio de ranking (V-18, V-19) | Todos | XS | — | Acta breve en 11 |
| A0.4 | Acceso SSH, firewall y hostname del servidor (V-15 a V-17) | R3 / Eduardo | S | — | `https://<host>/health` responde |
| A0.5 | Verificar reglas de entrega, IA y video (V-03, V-04) | R4 | XS | — | Notas en 11 |

## F1 · Contratos y esqueleto

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A1.1 | Contratos de datos (parcela, clima, plan, resultado) como JSON Schema y tipos TS | R2 + R3 | M | A0.3 | `contratos/` revisado por los 4 |
| A1.2 | Esqueleto `web/`: React + Vite + TS, Worker del motor, rutas P0 a P3 vacías | R1 | S | A1.1 | `npm run dev` abre las pantallas |
| A1.3 | Esqueleto `api/`: FastAPI, `/health`, OpenAPI, generación del cliente TS | R3 | S | A1.1 | Cliente TS generado compila |
| A1.4 | Paleta compartida y primer modelo de prueba (cultivo 1, una etapa) | R4 | M | A0.3 | `.bbmodel` abre en Blockbench |
| A1.5 | Tabla de cultivos: ciclo, etapas, Kc y umbrales con fuente | R3 | M | A0.3 | JSON con citas; vacíos como `NO_EVALUABLE` |
| A1.6 | Tabla de suelos (TAW por textura, FAO-56) | R3 | S | — | JSON con fuente |

## F2 · Datos y motor (en paralelo)

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A2.1 | Cliente NASA POWER diario con caché y reintentos | R3 | M | A1.3 | `GET /api/clima` devuelve serie real (C1) |
| A2.2 | Respaldo Open-Meteo y estados `RESPALDO_HISTORICO` / `ERROR_DATOS` | R3 | S | A2.1 | Se activa al apagar POWER |
| A2.3 | Elevación por celda (tiles Terrarium o SRTM) y pendiente | R3 | M | A1.3 | `GET /api/elevacion` por polígono |
| A2.4 | Paquete de demo precargado (Isla, 2 ha, clima 2006 a 2025, elevación) | R3 | S | A2.1, A2.3 | Demo funciona sin internet |
| A2.5 | Selección de escenarios seco / habitual / lluvioso (p10, p50, p90) | R2 | M | A1.1 | Años reales visibles y reproducibles |
| A2.6 | ET0, ETc y balance de agua por bloque (cubeta) | R2 | **L** | A1.1, A1.5, A1.6 | Pruebas 1 a 5 de doc 05 en verde |
| A2.7 | Pilar de déficit hídrico y estados de evaluabilidad | R2 | M | A2.6 | Métricas por rotación y escenario |
| A2.8 | Decisión: cómo se asigna clima a cada ciclo (doc 05, paso 2) | R2 + R3 | M | A2.1, A1.5 | Opción elegida registrada en 01 |
| A2.9 | Cuadrícula desde polígono (Turf.js) con tope de celdas | R1 | M | A1.2 | Polígono dibujado genera celdas |
| A2.10 | Mapa y dibujo de polígono libre (Leaflet) | R1 | M | A1.2 | El usuario dibuja y ve su parcela (P1) |
| A2.11 | Cultivos 1 a 3 completos, todas las etapas y estados de estrés | R4 | **L** | A1.4 | Modelos probados en la escena real (V-14) |
| A2.12 | Bloques de suelo por tipo y humedad | R4 | S | A1.4 | Variantes en `modelos/` |

Compuerta **C2** al terminar A2.1, A2.6 y A2.7.

## F3 · Escena y selector

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A3.1 | Escena 3D con relieve (altura por bloque, `InstancedMesh`) | R1 | **L** | A2.3, A2.9 | Terreno 3D navegable (C3) |
| A3.2 | Cargador de `.bbmodel` con instancing por cultivo y etapa | R1 | **L** | A2.11 | Modelos del motor visibles en celdas |
| A3.3 | Estados visuales: color + icono + patrón, leyenda | R1 | M | A3.2 | Legible con daltonismo |
| A3.4 | Selector "what if": cultivo por ciclo, rotaciones R0 a R2, escenario | R1 | M | A2.7 | Cambiar cultivo invalida y recalcula |
| A3.5 | Prueba crítica: R1 + ciclo 2 + seco muestra frijol con su estado | R1 + R2 | S | A3.4 | Prueba manual documentada |
| A3.6 | Modo 2D ligero con los mismos valores del motor | R1 | M | A2.7 | Alternar 2D/3D no cambia métricas |
| A3.7 | Pilares 2 y 3 (compatibilidad de ciclo, erosión relativa) | R2 | **L** | A2.7 | Entran solo si los datos alcanzan |
| A3.8 | Tooltips y valores por bloque | R1 | S | A3.4 | Toque o hover muestra humedad, déficit, pendiente |
| A3.9 | Cultivos 4 en adelante, props y mascota | R4 | M | A2.11 | Extras según tiempo |

Compuerta **C3** al terminar A3.1 y A3.2.

## F4 · Integración y dashboard

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A4.1 | Dashboard: gráficas de lluvia, demanda y balance (Recharts) | R1 | M | A2.7 | Gráficas reales del escenario |
| A4.2 | Ranking de rotaciones por robustez (peor caso) | R2 | M | A2.7 | Tabla ordenada con 3 o más rotaciones |
| A4.3 | Tarjetas de rotación: por qué, evidencia, beneficios, huecos, riesgos | R2 + R1 | M | A4.2 | Plantilla sin LLM funcionando |
| A4.4 | Redacción con LLM sobre números ya calculados (opcional) | R2 | S | A4.3 | Con respaldo en plantilla |
| A4.5 | Pantalla de método, fuentes y advertencias (A1, A3) | R1 | S | A4.3 | Fuentes NASA citadas en la interfaz |
| A4.6 | Conectar front y API (cliente generado, estados de carga y error) | R1 + R3 | M | A2.1, A3.4 | Flujo P0 a P3 con datos reales |
| A4.7 | Despliegue en el droplet (nginx, systemd, SSL) | R3 / Eduardo | M | A0.4 | URL pública con la demo |
| A4.8 | Extras NASA: SMAP, GPM o MODIS vía `earthaccess` (solo si aportan) | R3 | **L** | A2.1 | Un dataset adicional integrado de verdad |

Compuerta **C4** al terminar A4.6.

## F5 · Pulido y entrega

| ID | Actividad | Rol | Esfuerzo IA | Depende de | Entregable verificable |
| --- | --- | --- | --- | --- | --- |
| A5.1 | Animaciones mínimas (cambio de modelo por etapa) y deseables (escala, viento) | R1 + R4 | M | A3.2 | Transiciones suaves, opción de reducir movimiento |
| A5.2 | Slider de meses | R1 | M | A3.4 | Reproducir y arrastrar sin acumular animaciones |
| A5.3 | Móvil y accesibilidad (táctil, teclado) | R1 | M | A4.6 | Operable sin hover |
| A5.4 | Medición de requisitos mínimos y fallback WebGL | R1 | S | A3.6 | Cifra documentada para jueces |
| A5.5 | Pruebas de regresión del motor y de contratos | R2 | M | A4.2 | Suite en verde |
| A5.6 | Guion, video de demo y ensayo | R4 | M | A4.6 | Video grabado con respaldo |
| A5.7 | README con método, fuentes, límites, licencias y declaración de IA | R4 | S | A4.5 | README completo |
| A5.8 | Respaldo local sin internet y capturas | R3 + R4 | S | A2.4 | Demo corre con la red apagada |
| A5.9 | Envío final según reglas oficiales | R4 | XS | A5.6, A5.7 | Entrega confirmada (C6) |

## Camino crítico

`A1.1 -> A2.1 -> A2.6 -> A2.7 -> A3.4 -> A4.6 -> A5.6 -> A5.9`

La escena 3D (`A2.9 -> A3.1 -> A3.2`) va en paralelo y también es crítica para la demo. Si cualquiera se atrasa, activar el plan de recorte.

## Plan de recorte (de lo que más duele a lo que menos)

1. **No sacrificar:** trazabilidad NASA, límites honestos, 3 o más rotaciones, peor caso, entrega.
2. Quitar extras de A4.8 y A3.9, luego A5.2 (slider de meses).
3. Pilares 2 y 3 (A3.7): quedarse solo con el hídrico.
4. 3D en problemas: plan 2D y plantas procedurales con cajas.
5. Polígono libre en problemas: parcela demo fija más el polígono como "vista previa".

## Esfuerzo total por rol (referencia para repartir cupos)

| Rol | Actividades L (cupo fuerte) | M | S/XS |
| --- | --- | --- | --- |
| R1 | A3.1, A3.2 | 9 | 4 |
| R2 | A2.6, A3.7 | 7 | 2 |
| R3 | A4.8 | 6 | 6 |
| R4 | A2.11 | 5 | 5 |

R1 y R2 concentran el cupo fuerte. R3 y R4 deben reservar tiempo para apoyarlos cuando terminen lo suyo.

## Cómo mantener este documento

- Marcar cada actividad con `[HECHO]`, `[EN CURSO]` o `[BLOQUEADO]` al lado del ID.
- Anotar en 01 cualquier cambio de alcance o de dependencia.
- Si una actividad resulta XL, dividirla en subactividades con su propio ID antes de empezar.
