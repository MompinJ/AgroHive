#!/bin/bash
# Actualiza el droplet a origin/main: API y front. Se corre EN el droplet, como root:
#   bash /opt/agrohive/repo/api/despliegue/actualizar-servidor.sh
# Una sola sesion despliega y lo anuncia antes por el buzon (regla del equipo, 14/11). No toca la config de nginx de mediworks.
set -euo pipefail
RAIZ=/opt/agrohive
REPO=$RAIZ/repo
WEB=/var/www/agrohive-web
RESPALDO=/root/respaldo-nginx
as_agrohive() { sudo -u agrohive -H "$@"; }

as_agrohive git -C "$REPO" fetch -q origin
as_agrohive git -C "$REPO" checkout -q -B main origin/main
echo "commit: $(as_agrohive git -C "$REPO" log --oneline -1 | cut -c1-80)"

as_agrohive "$RAIZ/venv/bin/pip" -q install -r "$REPO/api/requirements.txt"
systemctl restart agrohive-api
sleep 4
systemctl is-active --quiet agrohive-api || { echo "agrohive-api no arranco: journalctl -u agrohive-api -n 30"; exit 1; }
curl -fsS -m 10 http://127.0.0.1:8010/health; echo

# Front: se construye en el droplet (el script va en $RAIZ: /tmp puede tener archivos de otro usuario y fallar con Permission denied)
as_agrohive bash -c "cd $REPO/web && npm ci --no-audit --no-fund >/dev/null 2>&1 && npm run build >$RAIZ/build-web.log 2>&1" || { tail -20 "$RAIZ/build-web.log"; exit 1; }
huella() { (cd "$1" && find . -type f | sort | xargs sha256sum | sha256sum | cut -c1-16); }
if [ "$(huella "$REPO/web/dist")" = "$(huella "$WEB")" ]; then
  echo "front: sin cambios en el bundle, no se publica"
else
  mkdir -p "$RESPALDO" && cp -a "$WEB" "$RESPALDO/agrohive-web.antes.$(date +%H%M%S)"
  rm -rf "$WEB/assets" && cp -a "$REPO/web/dist/." "$WEB/"
  chown -R root:root "$WEB" && chmod -R a+rX "$WEB"
  echo "front: publicado"
fi
nginx -t 2>&1 | grep -v conflicting || true
echo "listo. Verifica desde fuera: /health (commit y versionContrato), / (200) y https://mediworks.mx/ (debe seguir en 200)."
