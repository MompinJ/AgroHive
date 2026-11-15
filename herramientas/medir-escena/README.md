# Medición de la escena 3D (A5.4)

Mide la escena en el equipo real (laptop sin GPU dedicada, celular) y deja la cifra para los jueces. La hizo Mompin; la corre Eduardo.

Qué mide, con la parcela demo (4 celdas, paquete sin internet) y con un polígono de 518 celdas (cuadrícula de `web/src/ui/cuadricula.ts` y elevación de la API), con maíz en madurez (el caso más pesado):

- navegador, GPU (`WEBGL_debug_renderer_info` si el navegador lo da), WebGL2 o WebGL1, o si cae al modo 2D;
- núcleos, memoria del equipo (`navigator.deviceMemory`) y del programa (`performance.memory`, solo Chrome);
- tiempo de preparación de datos (motor en el Worker y API) y hasta la primera escena;
- triángulos y draw calls;
- cuadros en reposo (deben ser 0: la escena dibuja bajo demanda; la lluvia del día se apaga durante esta parte y se reporta aparte);
- cuadros por segundo con viento durante 10 s (dibuja sin parar: es la cifra de fluidez del equipo);
- pérdida del contexto WebGL con `WEBGL_lose_context`: lo pierde, lo devuelve y comprueba que la escena se recupera. Si el navegador no lo devuelve en 5 s, la escena muestra el aviso de usar el modo 2D.

## En el navegador del equipo (también el celular)

Abrir `medir.html` de la app: `http://<servidor>/medir.html`. Empieza sola y al terminar muestra la tabla y un botón "Copiar JSON" para mandar el resultado.

- `?api=<url>`: medir contra otra API (por defecto la de la app).
- `?viento=10&reposo=3`: segundos de cada prueba.
- `?auto=0`: no empezar sola (sale un botón).

En desarrollo, desde la red local (el celular en el mismo wifi): `cd web && npx vite --host 0.0.0.0` y abrir `http://<ip-de-la-laptop>:5173/medir.html?api=http://<ip>:8010` con la API levantada para esa red (`AGROHIVE_CORS_ORIGINS`). El build ya incluye `medir.html` (ajuste de balam, 14/11); aparecerá en el sitio tras desplegar esa versión.

## Con Node (laptop)

```bash
node herramientas/medir-escena/medir.mjs --ventana                       # GPU real del equipo
node herramientas/medir-escena/medir.mjs --url "https://64-23-143-102.sslip.io/medir.html"
```

Abre Chrome con un perfil temporal (no usa la sesión del usuario), espera a que termine y guarda `resultados/medicion-<fecha>.json`, `.txt` y `.png`. Sin `--ventana` corre headless con render por software: las cifras salen pesimistas (sirven para comparar, no para los jueces). Requiere Node 22 o más reciente.

## Inclusión en el build de producción

`web/vite.config.ts` (de balam) incluye ambas entradas; `npm run build` genera `dist/index.html` y `dist/medir.html`:

```ts
build: { rollupOptions: { input: { main: 'index.html', medir: 'medir.html' } } },
```

## Ejemplo (14/11, headless con SwiftShader, sin GPU)

| Caso | Primera escena | Triángulos | Draw calls | Reposo | Con viento | Memoria |
| --- | --- | --- | --- | --- | --- | --- |
| Demo (4 celdas) | 390 ms | 3 872 | 5 | 0 cuadros | 34.8 cuadros/s | 53 MB |
| Polígono propio (518 celdas) | 689 ms | 399 652 | 5 | 0 cuadros | 4.1 cuadros/s | 62 MB |

Pérdida de contexto: perdido y recuperado. La cifra de 518 celdas baja cuando lleguen los bloques de Mafer con el tope de 24 cubos.
