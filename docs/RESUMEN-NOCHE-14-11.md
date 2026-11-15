# Resumen de la noche del 14/11 (para Mompin al despertar)

**`main` quedó en `e355bb3`, en verde:** contratos 102/102, api 162, catálogos, `tsc` limpio, vitest 3254. Servidor publicado en `bdc792f` (contratos 0.14.0): falta desplegar `e355bb3`. Plan completo: [docs/16](16-PLAN-DIA-FINAL.md).

**Qué se hizo**
- Auditoría del back y del motor: todos los hallazgos arreglados con prueba menos H-M7 (`docs/hallazgos-back.md`); H-B6, H-M1 y H-M9 aplicados como decidiste.
- Catálogo de 8 a 40 cultivos, y los 40 con modelo detallado, bloque, icono 2D y `modelo3d`; `prueba-movimiento` 33 de 33.
- Bordes diagonales: medio cuadrado en las orillas, contrato 0.14.0 y selector "Tamaño de celda" (auto a 100 m).
- Front de Eduardo: vistas de la base, paleta con buscador para 40 cultivos, parcela editable, rotaciones y ciclos sin límite, comparación por tarjetas, mascota con NDVI y SMAP.

**Primeras acciones de hoy**
1. Tú: relanzar el buzón (`python3 herramientas/buzon/buzon.py`); los scripts ya apuntan a `192.168.0.102:3000`.
2. Eduardo: desplegar `e355bb3`.
3. Tú a Eduardo: bordes tocó `escena-three.ts`, `DibujarParcela.tsx`, `Parcela2D.tsx` y `ui/cuadricula.ts` (detalle en docs/01); él revisa bordes con su front.
4. Reunión corta, con los puntos de abajo. Integrar `origin/Eduardo` (`cfded82`, una línea del vault).

**Actualización 15/11:** el equipo decidió en persona el tope de 200 celdas, D8 (sin 2D), D9 (R3), D10 (fuentes en "Método y fuentes") y las plagas con GBIF; quedan abiertas D3, D5, D6, D7 y H-M7 ([docs/16](16-PLAN-DIA-FINAL.md), sección 2).

**Qué tenías que decidir**
- D8 respaldo sin WebGL: Eduardo retiró el modo 2D de la app; varios docs dicen que existe. Aceptarlo o devolverlo.
- D9: en la interfaz R4 pasó a llamarse R3; docs/13, docs/05 y el README dicen R4.
- D10: el laboratorio ya no muestra fuentes (siguen en "Método y fuentes"). ¿Cumple "toda cifra se rastrea a una fuente"?
- D3 llave SSH de respaldo, D5 cámara ligada al zoom, D6 A4.4 y A0.3, D7 borrar ramas muertas, H-M7 (año agrícola de los análogos). D2 (placa, 0.42 en triángulos) la decide Eduardo.
- Para la reunión, sin drama: Eduardo empujó 7 commits directo a `main`; la regla 4 dice que integras tú por ventanas.

**Qué falta:** reparto de hoy en docs/16, sección 3: Eduardo con el front y los despliegues; Mafer y balam con tareas cortas (cotejo de FAO-56, revisión de modelos y pruebas de interfaz). Medición en hardware real (draw calls de 6 a 18 con bordes). La entrega es una fase aparte, con aprobación de todo el equipo.
