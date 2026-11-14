# 09 · Equipo y plan

## Equipo `[DECIDIDO]`

**4 integrantes.** La asignación de roles por nombre se confirma en la hora 0 del evento.

| Rol | Responsabilidades | Entrega verificable |
| --- | --- | --- |
| **R1 — Interfaz y 3D** | React, mapa, tres paneles, selector "what if", escena 3D con relieve, modo 2D, móvil | Flujo P0→P3 que usa resultados del motor |
| **R2 — Motor científico** | Escenarios, balance de agua, pilares, robustez, ranking, explicaciones, pruebas | Cálculos reproducibles con pruebas |
| **R3 — Datos y evidencia** | POWER, Open-Meteo, elevación, caché, tabla de cultivos con Kc y ciclos citados | Series y parámetros documentados con fuente |
| **R4 — Arte, integración y entrega** | Modelos con el agente `modelador-voxel`, paleta, iconos; integración, video, pitch, documentación, envío | Modelos en escena, video y entrega subida |

El modelado avanza **en paralelo** desde el inicio porque no depende del código. Si alguien termina antes, apoya a R1 o R2.

## Herramientas de IA

Cada integrante usa la suya (ChatGPT, Claude, Cursor); no hace falta registrar qué IA editó qué. `[DECIDIDO]`

Recomendaciones de la reunión:
- Los cupos se renuevan por ventanas de tiempo: **repartir el uso** y reservar el cupo fuerte para lo crítico (motor y escena 3D).
- Impresión del equipo: Claude rinde mejor en la parte visual y Cursor en volumen de código.
- Declarar el uso de IA en la entrega si las reglas lo piden. `[VERIFICAR]`

## Flujo de trabajo
- Documentación en **Google Drive** (rclone / MCP) hasta el evento; en el evento, **GitHub** para el código y, si conviene, también para la documentación. `[DECIDIDO]`
- Repositorio único, ramas por persona o función, integración frecuente.
- **Contratos de datos** (08) acordados en las primeras horas para que no choquen rutas ni nombres.
- Cronograma compartido donde cada quien anota qué hace y cuándo lo termina.
- Revisiones cortas cada pocas horas para detectar bloqueos.
- No editar el mismo archivo al mismo tiempo.

## Reglas previas al evento
- Se puede: coordinar, estudiar herramientas, consultar fuentes, crear cuentas, practicar con ejercicios ajenos al proyecto.
- **No** empezar el desarrollo del proyecto antes del inicio permitido. La documentación previa no se presenta como hecha durante el hackathon.

## Cronograma `[EN EVENTO]`

El horario de la sede no está confirmado. Hay dos planes documentados; se elige el día del evento según el horario real.

### Opción A — 48 h (v0.2)

| Horas | Programación | Arte y modelos | Pitch y documentación |
| --- | --- | --- | --- |
| 0–3 | Repo, contratos de datos, tabla de cultivos | Paleta y primer modelo de prueba | Estructura de la entrega |
| 3–10 | Mapa, parcela, cuadrícula, clima real de POWER | Cultivo 1 completo | Guion del video |
| 10–20 | Motor; bloques 3D con relieve y color de estado | Cultivos 2 y 3, bloques de suelo | Textos de ciencia y límites |
| 20–28 | Selector "what if", crecimiento, escenarios | Cultivos restantes, iconos | Diapositivas |
| 28–38 | Dashboard, tarjetas de rotación, pulido, modo 2D | Ajustes visuales | Primer corte del video |
| 38–46 | Errores, pruebas, caché de demo | Retoques | Video final, textos, ensayo |
| 46–48 | Colchón, subir entrega | | |

Puntos de corte: **h10** datos reales de POWER en pantalla (si no, simplificar el mapa); **h20** bloques 3D con datos del motor (si no, plan 2D y plantas procedurales); **h30** congelar funciones nuevas; **h38** congelar producto; **h44** entrega lista.

### Opción B — ~39 h (v1.2, si la sede es 14/11 09:00 a 15/11 23:59)

| Horas | Objetivo |
| --- | --- |
| 0–3 | Roles por nombre, repo, contratos, conexión a NASA |
| 3–10 | Caso demo, paneles, primera escena 3D; NASA y parámetros mínimos |
| 10–20 | Balance hídrico, rotaciones, pruebas; modelos de los cultivos |
| 20–28 | Prueba de estrés, estados 2D/3D, explicaciones, móvil |
| 28–33 | Integración completa, contingencia de API, pruebas WebGL y fallback 2D |
| 33–36 | Video, pitch, README, licencias, demo local/pública |
| 36–39 | Reserva de entrega |

En ambos casos: cumplir el límite **más temprano** confirmado y no esperar al último minuto.

## Prioridad si el tiempo aprieta (de más a menos importante)
1. Rotaciones comparadas con evidencia y riesgos (requisito del reto).
2. Datos reales de NASA visibles y trazables.
3. Escenarios seco, habitual y lluvioso.
4. Selector "what if" funcionando con el motor.
5. Escena 3D con relieve y modelos propios (con 2D de respaldo).
6. Pilares adicionales (compatibilidad, suelo) según datos.
7. Animaciones pulidas, slider de meses.
8. Extras.

**No sacrificar:** trazabilidad NASA, límites científicos honestos, al menos 3 rotaciones, comparación de peor caso, preparación de la entrega.

## Reunión de arranque (hora 0)
- [ ] Roles con nombre y canal de comunicación.
- [ ] Horario real y cronograma (A o B).
- [ ] Cultivos iniciales.
- [ ] Contratos de datos y estructura del repo.
- [ ] Motor en navegador o en servidor.
- [x] Criterio de ranking (05): B `[DECIDIDO]` el 14/11 (A de respaldo).
- [ ] Responsable de entrega y de video.

## Logística
- Laptops, cargadores y **extensiones eléctricas**.
- Cuenta de Earthdata creada antes.
- No depender del wifi de la sede (datos de demo precargados).
- Revisar horario y reglas del lugar.

## Entregables
1. Demo utilizable con datos NASA reales y límites visibles.
2. Código en repo con licencias, atribución NASA y registro de uso de IA si aplica.
3. Video de la demo.
4. README con método, fuentes y límites.
5. Respaldo local, capturas y material para jueces.
