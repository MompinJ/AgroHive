#!/bin/bash
# Uso: codificar.sh <carpeta de cuadros> <zoom> <salida.mp4> : cuadros JPG 2400x1350 -> MP4 1920x1080 60 fps, recorte centrado.
set -e
D=$1; Z=$2; O=$3
W=$(python3 -c "print(int(2400/$Z)//2*2)"); H=$(python3 -c "print(int(1350/$Z)//2*2)")
ffmpeg -hide_banner -loglevel error -y -threads 4 -framerate 60 -i "$D/f%04d.jpg" -vf "crop=$W:$H,scale=1920:1080:flags=lanczos,format=yuv420p" -c:v libx264 -preset medium -crf 14 -r 60 "$O"
