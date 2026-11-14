---
tipo: cronograma
audiencia: todas
actualizado: 2026-11-14
fuente: docs/14-CRONOGRAMA.md
---

# Cronograma por persona

Nota **generada** por `herramientas/cronograma.py` desde las marcas de `docs/14-CRONOGRAMA.md`. No la edites a mano: marca la actividad en `docs/14` y vuelve a correr el script. El detalle de cada actividad (dependencias, entregable, modelo de IA) está en `docs/14`; las reglas, en [[Reglas]]; lo que sigue abierto, en [[Pendientes]].

## Resumen

| Persona | Hechas | En curso | Bloqueadas | Pendientes | Avance |
| --- | --- | --- | --- | --- | --- |
| **Mompin** | 15 | 1 | 0 | 0 | 94 % de 16 |
| **Eduardo** | 13 | 2 | 2 | 2 | 68 % de 19 |
| **Mafer** | 8 | 1 | 0 | 3 | 67 % de 12 |
| **balam** | 6 | 1 | 0 | 8 | 40 % de 15 |

Proyecto completo: **41 de 61** actividades hechas (67 %), 4 en curso, 2 bloqueadas.

## Mompin

- [x] **A0.1** Repo Git con 5 ramas y estructura de carpetas `HECHO`
- [x] **A0.2** Documentación consolidada en docs/ `HECHO`
- [x] **A1.1** Contratos de datos (parcela, clima, plan, resultado) como JSON Schema y tipos TS ([[Contratos]]) `HECHO`
- [x] **A1.7** Contratos para el alcance mundial (13, "Alcance geográfico"): calendario-local con lugar genérico (país más id del lugar; la clave INEGI queda como un caso) y bloque opcional lluviaSatelital (IMERG vía POWER, en UTC) en serie-clima y clima-escenario; cambio compatible `HECHO`
- [x] **A2.5** Selección de escenarios seco / habitual / lluvioso (p10, p50, p90) `HECHO` — 14/11
- [x] **A2.6** ET0, ETc y balance de agua por bloque (cubeta) `HECHO` — 14/11 (prueba 2: la parte de erosión y pendiente pasa a A3.7)
- [x] **A2.7** Pilar de déficit hídrico y estados de evaluabilidad `HECHO` — 14/11
- [x] **A2.8** Decisión: cómo se asigna clima a cada ciclo (doc 05, paso 2) `HECHO` — (c) `temporada_tipica`, 14/11
- [x] **A2.13** Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre ([[Contratos]]) `HECHO` — 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9)
- [x] **A3.1** Escena 3D con relieve (altura por bloque, InstancedMesh) `HECHO`
- [x] **A3.2** Cargador de .bbmodel con instancing por cultivo y etapa `HECHO`
- [x] **A3.7** Pilares 2 y 3 (compatibilidad de ciclo, erosión relativa) `HECHO` — 14/11 (compatibilidad desde el calendario de Isla; protección del suelo por días de suelo desnudo; índice de erosión `NO_EVALUABLE` sin I30 ni C/LS con fuente)
- [x] **A3.8** Tooltips y valores por bloque `HECHO` — con balam: ficha por celda en `web/src/escena/` (clic, toque, cursor, teclado y lista de celdas)
- [x] **A4.2** Ranking de rotaciones por robustez: criterio B [DECIDIDO] (puntaje + arrepentimiento minimax), respaldo A si A3.7 no llega `HECHO` — 14/11 (corre B con déficit y exceso de agua; A3.7 suma los pilares 2 y 3)
- [/] **A4.6** Conectar front y API (cliente generado, estados de carga y error) `EN CURSO` — cliente de la API en `web/src/api/` listo y probado; falta conectar las paginas (balam) y el motor
- [x] **A5.5** Pruebas de regresión del motor y de contratos `HECHO` — 14/11 (`web/src/motor/pruebas/regresion.test.ts` contra `regresion/demo-isla.json`)

## Eduardo

- [x] **A0.4** Acceso SSH, firewall y hostname del servidor (V-15 a V-17) ([[Servidor]]) `HECHO`
- [x] **A0.7** Verificar Open-Meteo estacional, CORS de POWER y acceso a elevación (V-21, V-22) ([[APIs]]) `HECHO`
- [x] **A1.3** Esqueleto api/: FastAPI, /health, OpenAPI, generación del cliente TS de las llamadas HTTP ([[Contratos]]) `HECHO`
- [x] **A2.1** Cliente NASA POWER diario con caché y reintentos ([[APIs]]) `HECHO`
- [x] **A2.2** Respaldo Open-Meteo y estados RESPALDO_HISTORICO / ERROR_DATOS `HECHO`
- [x] **A2.3** Elevación por celda (tiles Terrarium o SRTM) y pendiente ([[APIs]]) `HECHO`
- [x] **A2.4** Paquete de demo precargado (Isla, 2 ha, clima 2006 a 2025, elevación) `HECHO` — paquete conforme a contratos (clima 2005-10-01 a 2025-12-31, terreno, suelo, proxima temporada) sobre una parcela ficticia en Isla; el motor ya corre con el
- [x] **A2.13** Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre ([[Contratos]]) `HECHO` — 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9)
- [x] **A2.14** Textura y pH estimados de la zona (ISRIC WCS u OpenLandMap) por script offline y servidos desde caché ([[APIs]]) `HECHO`
- [x] **A2.15** Cliente OpenLandMap y comparación con ISRIC en GET /api/suelo (V-23: ambos servicios) `HECHO`
- [/] **A4.6** Conectar front y API (cliente generado, estados de carga y error) `EN CURSO` — cliente de la API en `web/src/api/` listo y probado; falta conectar las paginas (balam) y el motor
- [/] **A4.7** Despliegue en el droplet (nginx, systemd, SSL) ([[Servidor]]) `EN CURSO` — front servido en el droplet; falta la demo real (A4.6)
- [x] **A4.8** Extras NASA: SMAP, GPM o MODIS vía earthaccess (solo si aportan) `HECHO` — `GET /api/smap` hecho en la rama `Eduardo-C` (falta integrar a `main`): SMAP L3 36 km por rangos HTTP, `producto` y pruebas contra `smap.schema.json`, login de earthaccess bajo candado; probado en vivo en Isla. El token en el droplet lo pone la sesión A al desplegar (OK de Mompin por el buzón, #115 y #125)
- [x] **A4.10**  `HECHO` — `lluviaSatelital` en `GET /api/clima` y en el paquete de demo (7 397 dias, ninguno en -999 hasta 2025-12-31); evidencia, sin tocar el balance
- [x] **A4.11** NDVI de MODIS (MOD13Q1, 250 m, 16 días) por punto con el servicio REST de ORNL DAAC (sin cuenta), como evidencia de los años de escenario; no entra al ranking `HECHO` — `GET /api/ndvi` hecho en la rama `Eduardo-C` (falta integrar a `main`; 14 pruebas con respuestas reales de ORNL; el servicio tarda 8 a 13 s por fecha, así que lo pensado es caché o paquete de demo). NDVI de los tres años de escenario en el paquete de demo: [por confirmar al terminar el generador]
- [ ] **A4.12** Extra de fase 2, después de C5: fuentes regionales de EE. UU. cuando la coordenada cae ahí: CDL (rotación real por año, F8) primero y SSURGO después
- [ ] **A4.13** Después de C4: calendario de siembra de respaldo fuera de México con GGCMI fase 3 (Jägermeyr et al. 2021, Nature Food 2: 873-885; datos doi:10.5281/zenodo.5062513, CC BY 4.0, 0.5°): siembra y madurez de temporal para maíz (mai_rf) y frijol (bea_rf, [VERIFICAR] que sea frijol), servido como calendario-local con su fuente. Calabaza y chile quedan NO_EVALUABLE; en México siguen mandando SIAP e INIFAP
- [-] **A5.4** Medición de requisitos mínimos y fallback WebGL `BLOQUEADO` — espera el modo 2D (A3.6)
- [-] **A5.8** Respaldo local sin internet y capturas `BLOQUEADO` — espera A2.4 con la zona real y el front conectado (A4.6)

## Mafer

- [x] **A0.6** Consultar SIAP: cultivos y calendario del municipio; confirmar zona demo y milpa (V-20) `HECHO`
- [x] **A1.4** Paleta compartida y primer modelo de prueba (cultivo 1, una etapa) `HECHO`
- [x] **A1.5** Catálogo propio de cultivos (milpa: maíz, frijol, calabaza; más 3 a 5 si hay tiempo) sembrado desde EcoCrop y FAO-56: ciclo, etapas, Kc y umbrales con fuente `HECHO`
- [x] **A1.6** Tabla de suelos (TAW por textura, FAO-56) `HECHO`
- [x] **A2.11** Cultivos 1 a 3 completos, todas las etapas y estados de estrés `HECHO`
- [x] **A2.12** Bloques de suelo por tipo y humedad `HECHO`
- [x] **A2.16** TAW por pedotransferencia de Saxton y Rawls (2006) para cualquier textura, desde arena, arcilla y materia orgánica `HECHO` — (Mafer) `[HECHO]`
- [x] **A3.3** Estados visuales: color + icono + patrón, leyenda `HECHO`
- [/] **A3.9** Cultivos 4 en adelante, props y mascota `EN CURSO`
- [ ] **A5.1** Animaciones mínimas (cambio de modelo por etapa) y deseables (escala, viento)
- [ ] **A5.6** Guion, video de demo y ensayo
- [ ] **A5.7** README con método, fuentes, límites, licencias y declaración de IA

## balam

- [ ] **A0.5** Verificar reglas de entrega, IA y video (V-03, V-04)
- [x] **A1.2** Esqueleto web/: React + Vite + TS, Worker del motor, rutas P0 a P3 vacías `HECHO` — rutas P0 a P3, Worker inicializado desde la UI con confirmacion de respuesta y build verificados
- [x] **A2.9** Cuadrícula desde polígono (Turf.js) con tope de celdas `HECHO`
- [x] **A2.10** Mapa y dibujo de polígono libre (Leaflet) `HECHO`
- [x] **A3.4** Selector "what if": cultivo por ciclo, rotaciones R0 a R2, escenario `HECHO`
- [x] **A3.5** Prueba crítica: R1 + ciclo 2 + seco muestra frijol con su estado `HECHO`
- [ ] **A3.6** Modo 2D ligero con los mismos valores del motor
- [ ] **A4.1** Dashboard: gráficas de lluvia, demanda y balance (Recharts)
- [/] **A4.3** Tarjetas de rotación: por qué, evidencia, beneficios, huecos, riesgos `EN CURSO` — parte lógica hecha (Mompin, `web/src/motor/tarjetas.ts`); falta mostrarla (balam)
- [ ] **A4.4** Redacción con LLM sobre números ya calculados (opcional)
- [ ] **A4.5** Pantalla de método, fuentes y advertencias (A1, A3)
- [x] **A4.9** Interfaz de "próxima temporada aproximada": banda de incertidumbre y aviso visible de que no es predicción `HECHO`
- [ ] **A5.2** Slider de meses
- [ ] **A5.3** Móvil y accesibilidad (táctil, teclado)
- [ ] **A5.9** Envío final según reglas oficiales

## Equipo (sin responsable único)

- [ ] **A0.3** Acordar roles, cultivos iniciales y criterio de ranking (V-18, V-19)

## Compuertas

- **C1 · Datos reales**: se cruza cuando una pantalla muestra lluvia diaria real de POWER para una coordenada. Si no: Simplificar el mapa; usar Open-Meteo directo
- **C2 · Motor con datos**: se cruza cuando el motor devuelve resultados por celda con datos reales y pasa pruebas básicas. Si no: Reducir a pilar hídrico solamente
- **C3 · Escena viva**: se cruza cuando bloques 3D con relieve y estado coloreado desde el motor. Si no: Plan 2D y plantas procedurales
- **C4 · Congelar funciones**: se cruza cuando ya no entran funciones nuevas. Si no: Recortar extras
- **C5 · Congelar producto**: se cruza cuando solo errores y pulido. Si no: —
- **C6 · Entrega lista**: se cruza cuando demo, video, README y envío listos. Si no: Respaldo local y video

Casillas: `[x]` hecha, `[/]` en curso, `[-]` bloqueada, `[ ]` pendiente.
