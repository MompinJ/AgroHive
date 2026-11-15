# 02 · Evento y reto

## El evento

| Dato | Valor | Estado |
| --- | --- | --- |
| Evento | NASA Space Apps Challenge 2026 | Confirmado |
| Fechas globales | 14 y 15 de noviembre de 2026 | Confirmado |
| Duración global | 48 horas | Confirmado |
| Sede | USBI Veracruz, Calzada Juan Pablo II s/n, esq. Bv. Adolfo Ruíz Cortines, Costa Verde, Boca del Río | Confirmado |
| Modalidad | Presencial | Confirmado |
| Organizador local | Gonzalo Ortiz Chavez (contacto en la página del evento) | Confirmado |
| Horario de actividades y juicio en sede | Pendiente de confirmar con el organizador; puede diferir de la ventana global de envío documentada abajo | `[VERIFICAR]` V-01 |
| Entrega global y evaluación | Guías 2026 verificadas abajo (A0.5) | No equivale a envío realizado |
| Equipo | 4 integrantes | `[DECIDIDO]` |

### Tiempo real de trabajo
De las horas disponibles, descontando descanso, comida y traslados, quedan alrededor de **25 a 30 horas útiles** si el evento dura 48 h. El cronograma se ajusta el día del evento (ver 09).

### Reglas a respetar
- **No empezar el proyecto antes de que inicie el hackathon.** Todo el código del proyecto se hace durante el evento.
- Antes sí se puede: leer el reto, revisar datasets, crear cuentas (Earthdata), formar equipo, elegir librerías, preparar documentación, practicar herramientas con ejercicios ajenos al proyecto (por ejemplo, la zanahoria del agente de modelos).
- Preguntar al organizador si los prototipos técnicos previos cuentan como "empezar". `[VERIFICAR]`
- Declarar IA y recursos según las reglas verificadas abajo; el cumplimiento y las licencias siguen pendientes de revisión humana.

## Verificación A0.5 — 14/11/2026

Fuentes primarias abiertas en Chrome: [guía de entrega, publicada el 13/11/2026](https://www.spaceappschallenge.org/resources/project-submission-guide/), [guía de evaluación, 13/11/2026](https://www.spaceappschallenge.org/resources/judging-awards-guide/) y [FAQ de participantes](https://www.spaceappschallenge.org/resources/participant-faqs/). La búsqueda devolvía 502; la lectura directa en navegador sí funcionó.

### Entrega global confirmada

- Ventana: 14/11, 09:00 a 15/11, 23:59, hora de la sede. Confirmar juicio local por separado (V-01).
- Formulario: nombre, resumen, demo, proyecto final, descripción, uso de IA/SI, datos NASA y referencias.
- Demo obligatoria: video de hasta 30 segundos o siete diapositivas, contando portada e introducción. Enlaces públicos separados para demo y proyecto, sin registro ni permisos.
- Formulario y materiales enlazados en inglés; video hablado en otro idioma necesita subtítulos en inglés.
- Guardar no entrega: aceptar declaraciones, pulsar **Submit for Judging**, comprobar confirmación y reenviar tras editar. Integrantes aceptados en la misma sede. Materiales sin personas menores de 18 años.

### IA y originalidad confirmadas

IA/SI como apoyo, no para originar la idea. Indicar dónde/cómo se usó: marca visible en imagen/video; reconocimiento textual y metadatos en audio/código/datos. Contenido generado sin identidad NASA. La [respuesta GO Team del 6/11](https://github.com/nasa/spaceapps/discussions/1849) confirma declaración y marcas.

**En la demo de AgroHive** (15/11): la voz en inglés del trailer y su música son generadas con IA (ElevenLabs TTS y ElevenLabs Music vía Krea, guion y prompt del equipo). Se declara en texto (README, "Declaración de uso de IA"), en los metadatos del audio y con una línea visible en el cartón final del video. Detalle y lista de verificación en [`trailer-30s.md`](trailer-30s.md).

El proyecto no debe iniciarse antes del evento ([GO Team, 10/11](https://github.com/nasa/spaceapps/discussions/1916)). La guía de evaluación exige trabajo original y referencias de recursos externos, también código abierto, con sus permisos. Criterios: impacto, creatividad, validez, relevancia y presentación, escala 1 a 5.

NASA distingue contenido propio y de terceros; atribuir no implica aval de NASA ([guía de imágenes y medios](https://www.nasa.gov/nasa-brand-center/images-and-media/)).

### Aplicación a AgroHive y pendientes de A5.9

Preparación revisable y textos del formulario en inglés: [paquete A5.9](entrega-a5-9.md). Incluye el estado real de enlaces, portal, miembros y despliegue; no es una confirmación de envío.

La verificación de reglas (A0.5) está hecha; **el cumplimiento completo y la entrega no están certificados**. El equipo debe preparar los enlaces y materiales en inglés, resolver su demo obligatoria, completar declaración de IA y marcas/metadatos, confirmar originalidad y permisos, revisar membresía y obtener confirmación de envío.

La interfaz y el README actuales están en español: registrar el desfase para la entrega y consultar con la sede el alcance sobre la aplicación enlazada, sin dar por concedida una excepción. Marcas de imágenes generadas, licencia propia y revisión de fuentes siguen pendientes según README/A5.7. La decisión de Balam de no realizar video/presentación en su carril no cambia la regla externa ni reasigna esa tarea. Esta revisión no publica ni envía nada al portal.

## El reto oficial

**Field Shift: Adapting Farms with NASA Data.** Dificultad: Avanzado e Intermedio. Temas: Earth Science, Software, Arts & Multimedia.

Pide una herramienta de apoyo a decisiones que use observaciones de la Tierra de NASA, junto con información local de suelo, características de cultivos y prioridades del agricultor, para explorar **estrategias de rotación** que fortalezcan la **salud del suelo** y la **adaptación al clima**.

### Requisitos que conviene cumplir sí o sí
1. Comparar **al menos 3 estrategias de rotación**, idealmente incluida la rotación actual del agricultor (ver `[MEJORA]` en 03).
2. Para cada una explicar: por qué se sugiere, qué evidencia la respalda, qué beneficios ofrece, dónde faltan datos y qué riesgos requieren revisión local.
3. Ser una herramienta de **apoyo**: no reemplaza el criterio del agricultor ni la validación de expertos locales.

### Opcional y valorado
- Armonizar datasets de distinta resolución en una cuadrícula común.
- Explicar la incertidumbre del modelo.
- Mapas interactivos, líneas de tiempo, capas comparativas, sliders de escenario.
- Diseño pensado para agricultores sin conocimientos técnicos.
- Que el usuario ingrese sus prioridades (agua, ingreso, mercado, equipo disponible).
- Explicar términos científicos (evapotranspiración, NDVI, anomalías de humedad).
- Aclarar la diferencia entre mediciones satelitales y de campo.

### Datasets que menciona el reto
SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE y GRACE-FO, SRTM y otros productos de elevación. También GEDI (biomasa) y datos de suelo. La pestaña "Resources" del reto puede tener más enlaces. `[VERIFICAR]`

### Criterios de éxito que inferimos
- Que el usuario pueda **ver y entender** por qué se recomienda algo.
- Que se comparen escenarios, no que se prometa una cifra exacta.
- Que se reconozcan límites y se pida validación local.
- Que se note **uso real de datos NASA**, no decoración.

## Enlaces

- [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/)
- [Reto Field Shift](https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/)
- [Preguntas públicas sobre recursos e IA](https://github.com/nasa/spaceapps/discussions/1849)
