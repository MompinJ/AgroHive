# Iconos 2D de cultivos

200 sprites SVG de 40 cultivos (maiz, frijol, calabaza, chile, sorgo, sandia, camote, cacahuate, soya, caupi, haba, chicharo, lenteja, ejote, cebada, trigo, avena, maiz dulce, yuca, cana de azucar, ajonjoli, girasol, algodon, cartamo, higuerilla, jitomate, papa, calabacita, cebolla, pepino, melon, lechuga, zanahoria, berenjena, brocoli, col, coliflor, espinaca, rabano y betabel x siembra, brote, crecimiento, madurez, podrida) para el modo 2D (A3.6).
Nombre del archivo: `<cultivo>_<etapa>.svg`, igual que los modelos 3D de `modelos/cultivos/`. El id del cultivo puede llevar guion bajo (`maiz_dulce_madurez.svg`).

- Pixel art de 16 x 16, fondo transparente, `shape-rendering="crispEdges"`: nitidos a 32 px (x2) y 64 px (x4).
- Solo colores de `modelos/paleta.md` (los mismos del 3D). Cada SVG trae `<title>` en espanol.
- Se regeneran con `python modelos/iconos2d/iconos2d.py`; `visor_iconos.html` los muestra a 32 y 64 px.
- Prueba: `web/src/escena/pruebas/iconos2d.test.ts` (paleta, tamano, y que todo par de iconos se distinga bajo
  protanopia, deuteranopia y tritanopia con `daltonismo.ts`; umbral del 12 % de los pixeles `[PROPUESTA]`).
- Los iconos no sustituyen la etiqueta de texto ni el estado del motor: el estado (color, patron, icono de estado) lo
  sigue dando `estilos-estado.ts`. Estos sprites solo dicen QUE cultivo y en que etapa.
- Integrados por balam en `web/src/ui/Parcela2D.tsx` mediante `iconosCultivo2D.ts`: URLs emitidas por Vite desde esta carpeta, sin copiar SVG. Cultivo/etapa a 32 px y placa de estado completa debajo, en celdas cuadradas de 80 px. Se mantiene ficha textual y navegación por teclado; sin dato, cultivo desconocido o suelo desnudo no se inventa planta. `podrida` se elige solo si lo declara el motor.
- Hecho con IA (Claude) a partir del codigo; revision visual humana pendiente.
