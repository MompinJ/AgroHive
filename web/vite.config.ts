import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * Los modelos e iconos viven fuera de web/ (../modelos) y Vite no los vigila: con `npm run dev`
 * corriendo, un cultivo nuevo no aparecia (paleta con cuadros de color y plantas provisionales en
 * la escena) hasta reiniciar. Este plugin vigila la carpeta y, al agregar, cambiar o borrar un
 * .bbmodel o .svg, invalida los modulos (los import.meta.glob se vuelven a listar) y recarga.
 */
function vigilarModelos(): Plugin {
  const carpeta = fileURLToPath(new URL('../modelos', import.meta.url));
  return {
    name: 'agrohive-vigilar-modelos',
    apply: 'serve',
    configureServer(servidor) {
      servidor.watcher.add(carpeta);
      const alCambiar = (ruta: string) => {
        if (!ruta.startsWith(carpeta) || !/\.(bbmodel|svg)$/.test(ruta)) return;
        servidor.moduleGraph.invalidateAll();
        servidor.ws.send({ type: 'full-reload' });
      };
      servidor.watcher.on('add', alCambiar);
      servidor.watcher.on('unlink', alCambiar);
      servidor.watcher.on('change', alCambiar);
    },
  };
}

export default defineConfig({
  plugins: [react(), vigilarModelos()],
  base: './',
  build: { rollupOptions: { input: { main: 'index.html', medir: 'medir.html' } } },
  server: { fs: { allow: ['..'] } },
  // Varias pruebas recorren los 40 cultivos, sus modelos o los 6 ejemplos: con la suite en
  // paralelo pasaban de los 5 s por defecto aunque solas tarden 1 a 3 s.
  test: { testTimeout: 30_000 },
});
