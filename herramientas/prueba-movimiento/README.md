# prueba-movimiento

Prueba de accesibilidad (A5.1): comprueba en un Chrome real que "reducir movimiento" apaga transiciones, viento e inercia de la escena 3D, sin animar nada. Requiere **Node 22 o más** (usa el `WebSocket` global) y Chrome o Edge.

```bash
cd web && npm run dev                                  # en una terminal: sirve la vista previa
node herramientas/prueba-movimiento/movimiento.mjs     # en otra: 33 comprobaciones, código 0 si todas pasan
```

- Lanza su propio Chrome sin pantalla (`CHROME_PATH` si no lo encuentra; `CHROME_NO_SANDBOX=1` en Linux o CI) y lo cierra al terminar. Argumentos opcionales: `[urlEscena] [puertoChrome]`.
- Código de salida: `0` todo en verde, `1` alguna falla, `2` no pudo correr (Node viejo, sin Chrome o sin servidor).
- Cubre arranque y cambio en vivo, inercia real al arrastrar y soltar, y cambios rápidos; las comprobaciones sin reducir son de control, para que la prueba no sea vacía.
- **Lluvia del día:** la lluvia anima a propósito mientras se ve (doc 06), como el viento. L1 comprueba que anima (control; si el día de la vista previa no lloviera, pone una intensidad de prueba), L3 que con reducir no dibuja gotas, y antes de medir el reposo sin reducir (L2, A2, G1b) la prueba la apaga con `setLluvia(0)`, igual que `web/medir.html`. El día por defecto de la vista previa (seco, 2016-07-16, clima real 2023-07-16) trae 19.9 mm: por eso A2 y G1b fallaban antes (14/11).
- Lee el estado interno de la escena por `window.escenaPrueba` (`estadisticas()`, `raiz`, `salida`, `camara`, `modeloActual`): si se renombran esos campos en `web/src/escena/render/escena-three.ts`, hay que actualizar el script.
- Límites: render por software, un cultivo a la vez en la demo, mide estado y posición de la cámara, no píxeles.
