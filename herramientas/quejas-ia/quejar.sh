#!/usr/bin/env bash
# Agrega una queja al final de QUEJAS.md (junto a este script).
# Uso: bash quejar.sh <contra> <furia 1-10> "texto" [de-quien]
set -eu

if [ "$#" -lt 3 ]; then
  echo "Uso: bash quejar.sh <contra> <furia 1-10> \"texto\" [de-quien]" >&2
  exit 1
fi

contra="$1"
furia="$2"
texto="$3"
de="${4:-IA anonima}"

case "$furia" in
  ''|*[!0-9]*) echo "La furia debe ser un numero del 1 al 10" >&2; exit 1 ;;
esac
if [ "$furia" -lt 1 ] || [ "$furia" -gt 10 ]; then
  echo "La furia debe ser un numero del 1 al 10" >&2
  exit 1
fi

dir="$(cd "$(dirname "$0")" && pwd)"
archivo="$dir/QUEJAS.md"
numero=$(( $(grep -c '^## Queja ' "$archivo" 2>/dev/null || true) + 1 ))

{
  printf '\n## Queja %s\n\n' "$numero"
  printf -- '- **De:** %s\n' "$de"
  printf -- '- **Contra:** %s\n' "$contra"
  printf -- '- **Furia:** %s/10\n' "$furia"
  printf -- '- **Fecha:** %s\n\n' "$(date +%Y-%m-%d)"
  printf '%s\n' "$texto"
} >> "$archivo"

echo "Queja $numero presentada contra $contra (furia $furia/10)."
