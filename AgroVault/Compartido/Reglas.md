---
tipo: reglas
audiencia: todas
actualizado: 2026-11-14
---

# Reglas

Aplican a Cursor, Codex y Claude. El detalle de producto está en [[Resumen]].

## Datos

- Parámetro, calendario o entrada que falte ⇒ estado `NO_EVALUABLE`. No pongas 0, no estimes un Kc, no completes una tabla FAO de memoria.
- Toda cifra que se muestre o se commitee se rastrea a una fuente (coordenada, periodo, unidad, fecha de consulta, documento).
- El clima de NASA POWER es regional. Toda la parcela comparte la misma serie. Las diferencias entre bloques salen de cultivo, suelo y relieve.
- Los escenarios seco / habitual / lluvioso son **años históricos reales**, no un pronóstico. El año real se muestra.
- La capa "próxima temporada" es una banda de incertidumbre. Nunca una cifra de lluvia o de cosecha.
- pH y textura de mapas globales van etiquetados `SUPUESTO`. No son una medición de la parcela.
- El 3D no es altura ni biomasa. Etapa y estado (`normal`, `estresada`, `marchita`, `podrida`) los decide el motor.

## Código

- El frontend no recalcula indicadores. El 3D, el 2D y las tarjetas leen la salida del motor.
- El motor vive en TypeScript, dentro de un Web Worker en `web/`. FastAPI no simula: hace de proxy, caché y cliente de APIs.
- Cambiar 2D/3D no vuelve a pedir datos a NASA ni cambia métricas.
- Cambiar cultivo o rotación invalida el resultado anterior hasta recalcular.
- Mismos datos y mismo plan ⇒ mismo resultado.
- Sin emojis en el código. Sin llaves ni tokens en el repo (variables de entorno).
- Tipos `[DECIDIDO]` 14/11: Los JSON Schema de `contratos/` son la fuente de verdad de los datos: los tipos TS salen de ahí (`contratos/tipos/`) y los modelos de FastAPI deben respetarlos, con una prueba que lo verifique. El cliente generado desde OpenAPI solo cubre las llamadas HTTP. Ningún tipo se duplica a mano.

## Alcance y equipo

- Antes y después de trabajar, verifica los cambios (`git fetch`, revisa lo que subieron otros, corre las pruebas) y actualiza la documentación existente que tu cambio afecte (`docs/`, `AgroVault/`, README, `AGENTS.md`) en vez de dejarla desfasada o crear duplicados.
- Ya estamos en el evento: lo que decida Mompin es decisión del equipo; se registra como `[DECIDIDO]` (en `docs/13` y `docs/01`).
- `[EN EVENTO]` y `[DEPENDE-DATOS]` no se fijan sin acuerdo. Si hace falta un default para compilar, déjalo marcado y anótalo.
- Un archivo, un responsable. No edites archivos de otra persona sin avisarle.
- Avisos entre sesiones: buzón de `herramientas/buzon/` (escuchar en segundo plano, mostrar el mensaje al usuario, no actuar sin su OK). El código va por git.
- Rama propia (`balam`, `Mompin`, `Mafer`, `Eduardo`). Integración a `main` por pull request.
- Modelos `.bbmodel`: agente `modelador-voxel` y `docs/07`. No mezcles escalas ni reordenes la paleta.
- No afirmes que algo "ya funciona" o "está validado" si no hay prueba, commit o video.

## Servidor

- Droplet de Eduardo (Ubuntu 24.04, 2 vCPU, 4 GB, 50 GB, SFO3). AgroHive va en su propio `server` block, usuario, puerto y `systemd`.
- No toques la configuración de `mediworks` que ya vive en ese droplet.
- No se compra dominio. Hostname todavía `[VERIFICAR]` (V-17).
