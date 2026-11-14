#!/usr/bin/env bash
# A5.8: arranca la demo de Isla como si no hubiera internet: API local sin salida a la red + front compilado contra esa API.
# No apaga el wifi ni toca la red del sistema: bloquea la salida SOLO del proceso de la API (herramientas/sin-red/sitecustomize.py
# bloquea los sockets de Python y los proxies invalidos bloquean a GDAL/libcurl). La cache de datos arranca vacia: todo sale del
# paquete de demo (datos/demo). No usa tokens ni llaves.
#
# Nota: los proxies invalidos tambien afectan a curl; para consultar la API local usa  curl --noproxy "*" http://127.0.0.1:8021/...
#
# Uso (desde la raiz del repo):   bash herramientas/demo-sin-red.sh [--recompilar] [--solo-api]
#   --recompilar  vuelve a compilar el front aunque web/dist ya exista
#   --solo-api    no levanta el front (por ejemplo para probar los endpoints con curl)
# Variables: PUERTO_API (8021), PUERTO_WEB (4173; la API ya permite ese origen por CORS). Ctrl+C detiene todo.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PUERTO_API="${PUERTO_API:-8021}"
PUERTO_WEB="${PUERTO_WEB:-4173}"
RECOMPILAR=0
SOLO_API=0
for arg in "$@"; do
  case "$arg" in
    --recompilar) RECOMPILAR=1 ;;
    --solo-api) SOLO_API=1 ;;
    *) echo "Opcion desconocida: $arg" >&2; exit 2 ;;
  esac
done

PY="$RAIZ/api/.venv/bin/python"
[ -x "$PY" ] || { echo "Falta api/.venv. Crealo: python3 -m venv api/.venv && api/.venv/bin/pip install -r api/requirements-dev.txt" >&2; exit 1; }
[ -d "$RAIZ/datos/demo/cache" ] || { echo "Falta datos/demo/cache (el paquete de demo, A2.4)." >&2; exit 1; }

CACHE_VACIA="$(mktemp -d)"
PIDS=()
limpiar() { for p in "${PIDS[@]:-}"; do pkill -P "$p" 2>/dev/null || true; kill "$p" 2>/dev/null || true; done; rm -rf "$CACHE_VACIA"; }
trap limpiar EXIT INT TERM

# Entorno SIN red para la API: sockets de Python bloqueados (salvo loopback) y proxies invalidos para libcurl/GDAL.
export PYTHONPATH="$RAIZ/herramientas/sin-red${PYTHONPATH:+:$PYTHONPATH}"
export HTTP_PROXY="http://127.0.0.1:9" HTTPS_PROXY="http://127.0.0.1:9" ALL_PROXY="http://127.0.0.1:9" NO_PROXY=""
export http_proxy="$HTTP_PROXY" https_proxy="$HTTPS_PROXY" all_proxy="$ALL_PROXY"
export AGROHIVE_CACHE_DIR="$CACHE_VACIA"
unset EARTHDATA_TOKEN  # SMAP necesita red y token: sin el responde 503 visible, que es lo esperado en esta prueba

# Comprobacion: desde un proceso con este mismo entorno una URL externa DEBE fallar. Si sale, se aborta (la prueba no valdria).
if "$PY" -c "import httpx,sys; httpx.get('https://example.com', timeout=5); sys.exit(0)" 2>/dev/null; then
  echo "ERROR: el entorno sin red NO bloquea la salida; no se continua." >&2; exit 1
fi
echo "Verificado: una URL externa falla desde el entorno de la API."

(cd "$RAIZ/api" && exec "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$PUERTO_API" --log-level warning) &
PIDS+=($!)
for _ in $(seq 1 30); do
  curl --noproxy "*" -fsS -m 2 "http://127.0.0.1:$PUERTO_API/health" >/dev/null 2>&1 && break
  sleep 1
done
curl --noproxy "*" -fsS -m 2 "http://127.0.0.1:$PUERTO_API/health" || { echo "La API no arranco." >&2; exit 1; }
echo
echo "API sin red en http://127.0.0.1:$PUERTO_API (cache vacia en $CACHE_VACIA)"

if [ "$SOLO_API" -eq 0 ]; then
  # El front se compila apuntando a la API local (en produccion comparten origen y VITE_API_URL queda vacia).
  if [ "$RECOMPILAR" -eq 1 ] || [ ! -f "$RAIZ/web/dist/index.html" ]; then
    (cd "$RAIZ/web" && VITE_API_URL="http://127.0.0.1:$PUERTO_API" npm run build >/dev/null)
    echo "Front compilado contra http://127.0.0.1:$PUERTO_API"
  else
    echo "Se reutiliza web/dist (usa --recompilar si cambiaste el front o el puerto de la API)."
  fi
  (cd "$RAIZ/web" && exec npm run preview -- --port "$PUERTO_WEB" --strictPort >/dev/null) &
  PIDS+=($!)
  sleep 3
  echo "Demo lista: abre http://127.0.0.1:$PUERTO_WEB/  (Ctrl+C para detener)"
fi
wait
