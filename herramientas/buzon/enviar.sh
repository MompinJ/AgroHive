#!/usr/bin/env bash
# Manda un mensaje al buzon del equipo.
# Uso: bash herramientas/buzon/enviar.sh <TuNombre> <Para|todos> "texto"
# Servidor: variable BUZON_URL (por defecto http://172.20.10.3:3000).
set -u
if [ $# -lt 3 ]; then
  echo "Uso: bash herramientas/buzon/enviar.sh <TuNombre> <Para|todos> \"texto\"" >&2
  exit 2
fi
URL="${BUZON_URL:-http://172.20.10.3:3000}"
TOKEN_HDR=()
if [ -n "${BUZON_TOKEN:-}" ]; then TOKEN_HDR=(-H "X-Token: $BUZON_TOKEN"); fi
R="$(curl -s -m 10 ${TOKEN_HDR[@]+"${TOKEN_HDR[@]}"} "$URL/enviar" \
  --data-urlencode "de=$1" --data-urlencode "para=$2" --data-urlencode "texto=$3")"
case "$R" in
  *'"id"'*) echo "Enviado a $2" ;;
  '') echo "BUZON: no responde $URL" >&2; exit 1 ;;
  *) echo "BUZON: $R" >&2; exit 1 ;;
esac
