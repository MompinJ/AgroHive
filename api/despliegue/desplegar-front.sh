#!/bin/sh
# Construye web/ y lo sube al droplet (A4.7). Uso: SERVIDOR=root@64.23.143.102 sh api/despliegue/desplegar-front.sh
# Usa la autenticacion SSH que ya tengas (llave o agente); no guarda ni pide contrasenas.
set -eu
SERVIDOR="${SERVIDOR:?define SERVIDOR=usuario@host}"
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ/web"
npm ci --silent
npm run build
COPYFILE_DISABLE=1 tar -C dist -cf - . | ssh "$SERVIDOR" 'tar -C /var/www/agrohive-web -xf - && chmod -R a+rX /var/www/agrohive-web'
echo "front subido a $SERVIDOR:/var/www/agrohive-web"
