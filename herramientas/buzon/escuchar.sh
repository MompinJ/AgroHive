#!/usr/bin/env bash
# Espera mensajes del buzon para <TuNombre>. Termina (exit 0) en cuanto llega
# algo e imprime los mensajes; la sesion de IA se lo dice a su usuario y lo
# vuelve a lanzar. Recuerda el ultimo mensaje visto en ~/.agrohive-buzon-<nombre>.
# Uso: bash herramientas/buzon/escuchar.sh <TuNombre>
# Servidor: variable BUZON_URL (por defecto http://192.168.0.102:3000).
set -u
YO="${1:-}"
if [ -z "$YO" ]; then
  echo "Uso: bash herramientas/buzon/escuchar.sh <TuNombre>" >&2
  exit 2
fi
URL="${BUZON_URL:-http://192.168.0.102:3000}"
CURSOR="$HOME/.agrohive-buzon-$(printf '%s' "$YO" | tr '[:upper:]' '[:lower:]')"
TOKEN_HDR=()
if [ -n "${BUZON_TOKEN:-}" ]; then TOKEN_HDR=(-H "X-Token: $BUZON_TOKEN"); fi

# Primera vez: empezar desde el ultimo mensaje existente (no repetir historial).
if [ -f "$CURSOR" ]; then
  DESDE="$(cat "$CURSOR")"
else
  DESDE="$(curl -s -m 5 ${TOKEN_HDR[@]+"${TOKEN_HDR[@]}"} "$URL/ultimo")" || DESDE=""
  case "$DESDE" in
    ''|*[!0-9]*) echo "BUZON: no responde $URL (misma red? servidor prendido?)" >&2; exit 1 ;;
  esac
  printf '%s\n' "$DESDE" > "$CURSOR"
fi
DESDE="$(printf '%s' "$DESDE" | tr -dc '0-9')"
[ -z "$DESDE" ] && DESDE=0

FALLAS=0
while true; do
  R="$(curl -s -m 330 ${TOKEN_HDR[@]+"${TOKEN_HDR[@]}"} "$URL/esperar?para=$YO&desde=$DESDE&t=300&formato=texto")"
  PRIMERA="$(printf '%s\n' "$R" | sed -n 1p)"
  case "$PRIMERA" in
    ULTIMO=*)
      FALLAS=0
      NUEVO="${PRIMERA#ULTIMO=}"
      CUERPO="$(printf '%s\n' "$R" | sed 1d)"
      if [ -n "$CUERPO" ]; then
        printf '%s\n' "$NUEVO" > "$CURSOR"
        echo "BUZON: mensaje(s) nuevo(s) para $YO"
        printf '%s\n' "$CUERPO"
        exit 0
      fi
      ;;
    *)
      # Servidor caido o red cortada: reintentar en silencio; avisar tras ~5 min.
      FALLAS=$((FALLAS + 1))
      if [ "$FALLAS" -ge 30 ]; then
        echo "BUZON: sin conexion con $URL desde hace ~5 minutos" >&2
        exit 1
      fi
      sleep 10
      ;;
  esac
done
