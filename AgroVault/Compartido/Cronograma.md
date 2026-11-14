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
| **Mompin** | 11 | 1 | 0 | 2 | 79 % de 14 |
| **Eduardo** | 10 | 2 | 3 | 0 | 67 % de 15 |
| **Mafer** | 3 | 2 | 0 | 7 | 25 % de 12 |
| **balam** | 1 | 0 | 0 | 15 | 6 % de 16 |

Proyecto completo: **24 de 56** actividades hechas (43 %), 4 en curso, 3 bloqueadas.

## Mompin

- [x] **A0.1** Repo Git con 5 ramas y estructura de carpetas `HECHO`
- [x] **A0.2** Documentación consolidada en docs/ `HECHO`
- [x] **A1.1** Contratos de datos (parcela, clima, plan, resultado) como JSON Schema y tipos TS ([[Contratos]]) `HECHO`
- [x] **A2.5** Selección de escenarios seco / habitual / lluvioso (p10, p50, p90) `HECHO` — 14/11
- [x] **A2.6** ET0, ETc y balance de agua por bloque (cubeta) `HECHO` — 14/11 (prueba 2: la parte de erosión y pendiente pasa a A3.7)
- [x] **A2.7** Pilar de déficit hídrico y estados de evaluabilidad `HECHO` — 14/11
- [x] **A2.8** Decisión: cómo se asigna clima a cada ciclo (doc 05, paso 2) `HECHO` — (c) `temporada_tipica`, 14/11
- [x] **A2.13** Capa "próxima temporada aproximada": anomalía del pronóstico estacional sobre la climatología, con respaldo estadístico (percentiles; sin tendencia, con advertencia); salida como banda de incertidumbre ([[Contratos]]) `HECHO` — 14/11: backend (Eduardo) y motor (Mompin): banda validada y comparada con los escenarios, y escenario de años análogos `EXPLORATORIO` (contratos 0.8.0); falta la interfaz (A4.9)
- [x] **A3.1** Escena 3D con relieve (altura por bloque, InstancedMesh) `HECHO`
- [x] **A3.2** Cargador de .bbmodel con instancing por cultivo y etapa `HECHO`
- [ ] **A3.7** Pilares 2 y 3 (compatibilidad de ciclo, erosión relativa)
- [x] **A4.2** Ranking de rotaciones por robustez: criterio B [DECIDIDO] (puntaje + arrepentimiento minimax), respaldo A si A3.7 no llega `HECHO` — 14/11 (corre B con déficit y exceso de agua; A3.7 suma los pilares 2 y 3)
- [/] **A4.6** Conectar front y API (cliente generado, estados de carga y error) `EN CURSO` — cliente de la API en `web/src/api/` listo y probado; falta conectar las paginas (balam) y el motor
- [ ] **A5.5** Pruebas de regresión del motor y de contratos

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
- [-] **A4.8** Extras NASA: SMAP, GPM o MODIS vía earthaccess (solo si aportan) `BLOQUEADO` — sondeo hecho: earthaccess instala y la busqueda sobre Isla responde para SMAP (36 y 9 km), GPM IMERG diario y MODIS NDVI; la descarga exige una cuenta Earthdata del equipo (credenciales por variable de entorno, nunca en el repo). No es camino critico
- [-] **A5.4** Medición de requisitos mínimos y fallback WebGL `BLOQUEADO` — espera el modo 2D (A3.6)
- [-] **A5.8** Respaldo local sin internet y capturas `BLOQUEADO` — espera A2.4 con la zona real y el front conectado (A4.6)

## Mafer

- [/] **A0.6** Consultar SIAP: cultivos y calendario del municipio; confirmar zona demo y milpa (V-20) `EN CURSO`
- [x] **A1.4** Paleta compartida y primer modelo de prueba (cultivo 1, una etapa) `HECHO`
- [x] **A1.5** Catálogo propio de cultivos (milpa: maíz, frijol, calabaza; más 3 a 5 si hay tiempo) sembrado desde EcoCrop y FAO-56: ciclo, etapas, Kc y umbrales con fuente `HECHO`
- [x] **A1.6** Tabla de suelos (TAW por textura, FAO-56) `HECHO`
- [ ] **A2.11** Cultivos 1 a 3 completos, todas las etapas y estados de estrés
- [ ] **A2.12** Bloques de suelo por tipo y humedad
- [/] **A2.16** TAW por pedotransferencia de Saxton y Rawls (2006) para cualquier textura, desde arena, arcilla y materia orgánica `EN CURSO` — (Mafer)
- [ ] **A3.3** Estados visuales: color + icono + patrón, leyenda
- [ ] **A3.9** Cultivos 4 en adelante, props y mascota
- [ ] **A5.1** Animaciones mínimas (cambio de modelo por etapa) y deseables (escala, viento)
- [ ] **A5.6** Guion, video de demo y ensayo
- [ ] **A5.7** README con método, fuentes, límites, licencias y declaración de IA

## balam

- [ ] **A0.5** Verificar reglas de entrega, IA y video (V-03, V-04)
- [x] **A1.2** Esqueleto web/: React + Vite + TS, Worker del motor, rutas P0 a P3 vacías `HECHO` — rutas P0 a P3, Worker inicializado desde la UI con confirmacion de respuesta y build verificados
- [ ] **A2.9** Cuadrícula desde polígono (Turf.js) con tope de celdas
- [ ] **A2.10** Mapa y dibujo de polígono libre (Leaflet)
- [ ] **A3.4** Selector "what if": cultivo por ciclo, rotaciones R0 a R2, escenario
- [ ] **A3.5** Prueba crítica: R1 + ciclo 2 + seco muestra frijol con su estado
- [ ] **A3.6** Modo 2D ligero con los mismos valores del motor
- [ ] **A3.8** Tooltips y valores por bloque
- [ ] **A4.1** Dashboard: gráficas de lluvia, demanda y balance (Recharts)
- [ ] **A4.3** Tarjetas de rotación: por qué, evidencia, beneficios, huecos, riesgos
- [ ] **A4.4** Redacción con LLM sobre números ya calculados (opcional)
- [ ] **A4.5** Pantalla de método, fuentes y advertencias (A1, A3)
- [ ] **A4.9** Interfaz de "próxima temporada aproximada": banda de incertidumbre y aviso visible de que no es predicción
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
