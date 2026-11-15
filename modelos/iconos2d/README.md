# Iconos 2D de cultivos

20 sprites SVG (maiz, frijol, calabaza y chile x siembra, brote, crecimiento, madurez, podrida) para el modo 2D (A3.6).
Nombre del archivo: `<cultivo>_<etapa>.svg`, igual que los modelos 3D de `modelos/cultivos/`.

- Pixel art de 16 x 16, fondo transparente, `shape-rendering="crispEdges"`: nitidos a 32 px (x2) y 64 px (x4).
- Solo colores de `modelos/paleta.md` (los mismos del 3D). Cada SVG trae `<title>` en espanol.
- Se regeneran con `python modelos/iconos2d/iconos2d.py`; `visor_iconos.html` los muestra a 32 y 64 px.
- Prueba: `web/src/escena/pruebas/iconos2d.test.ts` (paleta, tamano, y que todo par de iconos se distinga bajo
  protanopia, deuteranopia y tritanopia con `daltonismo.ts`; umbral del 12 % de los pixeles `[PROPUESTA]`).
- Los iconos no sustituyen la etiqueta de texto ni el estado del motor: el estado (color, patron, icono de estado) lo
  sigue dando `estilos-estado.ts`. Estos sprites solo dicen QUE cultivo y en que etapa.
- Todavia no los carga ninguna pantalla: donde y como se muestran en `ui/Parcela2D.tsx` lo decide balam.
- Hecho con IA (Claude) a partir del codigo; revision visual humana pendiente.
