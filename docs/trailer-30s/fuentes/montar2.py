#!/usr/bin/env python3
"""Corte de 30 s desde clips MP4 (1920x1080 60 fps). Textos en pantalla solo durante sus segundos (ligero).
Uso: python3 montar2.py <clips> <graficos> <subs.ass> <voz.wav> <musica.mp3> <salida.mp4> [carton]"""
import subprocess, sys, os
CLIPS, GRAF, ASS, VOZ, MUS, OUT = sys.argv[1:7]
CARTON = sys.argv[7] if len(sys.argv) > 7 else 'carton-final-A'
F = 1 / 60
def hay(n): return os.path.exists(f'{CLIPS}/{n}.mp4')
# (fuente, inicio en la linea, transicion de entrada, segundo inicial dentro del clip)
L = [('T1', 0.0, 0, 0.0), ('T2', 4.0, F, 0.3)]
L += [('T3a', 8.0, 0.2, 0.75), ('T3b', 9.6, 0.15, 0.9)] if hay('T3a') else [('hueco-T3', 8.0, 0.2, 0)]
L += [('T4a', 12.0, F, 0.35), ('T4b', 14.4, 0.12, 0.2), ('T4c', 15.4, 0.12, 0.2)] if hay('T4a') else [('hueco-T4', 12.0, F, 0)]
L += [('T5', 16.0, F, 0.5)] if hay('T5') else [('hueco-T5', 16.0, F, 0)]
mont = ['T6a', 'T6b', 'T6c', 'T6d', 'T6e', 'T6f']
for i, t in enumerate(mont): L.append((t, 20.0 + i * 4 / 6, F if i == 0 else 0.1, 0.4))
L += [('T6g', 24.0, F, 0.4) if hay('T6g') else ('hueco-T6g', 24.0, F, 0), (CARTON, 26.0, 0.35, 0)]
FIN = 30.0
args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-threads', '8']
filt = []
for i, (src, ini, d, ss) in enumerate(L):
    fin = L[i + 1][1] if i + 1 < len(L) else FIN
    largo = d + (fin - ini)
    if os.path.exists(f'{CLIPS}/{src}.mp4'):
        args += ['-ss', f'{ss:.3f}', '-t', f'{largo + 0.05:.3f}', '-i', f'{CLIPS}/{src}.mp4']
        filt.append(f'[{i}:v]trim=duration={largo:.4f},setpts=PTS-STARTPTS,fps=60,format=yuv420p,setsar=1,tpad=stop_mode=clone:stop_duration=1,trim=duration={largo:.4f}[c{i}]')
    else:
        args += ['-loop', '1', '-framerate', '60', '-t', f'{largo:.4f}', '-i', f'{GRAF}/{src}.png']
        filt.append(f'[{i}:v]scale=1920:1080,fps=60,format=yuv420p,setsar=1[c{i}]')
prev = 'c0'
for i in range(1, len(L)):
    ini, d = L[i][1], L[i][2]
    filt.append(f'[{prev}][c{i}]xfade=transition=fade:duration={d:.4f}:offset={ini - d:.4f}[x{i}]')
    prev = f'x{i}'
n = len(L)
sup = [('super-whatif', 0.35, 3.6), ('super-seco', 4.3, 7.75), ('super-nasa', 8.3, 11.8), ]
sup += [(f'lugar-{t}', 20.0 + i * 4 / 6 + 0.04, 20.0 + (i + 1) * 4 / 6 - 0.02) for i, t in enumerate(mont)]
sup += [('super-dibuja', 24.25, 25.8)]
for k, (src, a, b) in enumerate(sup):
    j = n + k
    dur = b - a
    args += ['-loop', '1', '-framerate', '60', '-t', f'{dur:.3f}', '-i', f'{GRAF}/{src}.png']
    fd = 0.12 if src.startswith('lugar') else 0.3
    filt.append(f'[{j}:v]format=rgba,fade=t=in:st=0:d={fd}:alpha=1,fade=t=out:st={dur - fd:.3f}:d={fd}:alpha=1,setpts=PTS+{a}/TB[s{k}]')
    filt.append(f'[{prev}][s{k}]overlay=0:0:eof_action=pass[o{k}]')
    prev = f'o{k}'
filt.append(f'[{prev}]fade=t=in:st=0:d=0.4,fade=t=out:st={FIN - 0.6}:d=0.6,subtitles={ASS}:fontsdir=/usr/share/fonts/inter,trim=duration={FIN},format=yuv420p[v]')
na = n + len(sup)
args += ['-i', VOZ, '-i', MUS]
filt.append(f'[{na}:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[voz][vozsc]')
filt.append(f'[{na + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.42,afade=t=out:st={FIN - 1.2}:d=1.2[mus]')
filt.append('[mus][vozsc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[musd]')
filt.append(f'[voz][musd]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,atrim=duration={FIN}[a]')
args += ['-filter_complex', ';'.join(filt), '-map', '[v]', '-map', '[a]', '-r', '60', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', '-t', str(FIN),
         '-metadata', 'title=AgroHive trailer',
         '-metadata', 'comment=Voice and music AI-generated with Krea (ElevenLabs TTS eleven_v4 voice Brian; ElevenLabs Music v2.5). Screen footage: AgroHive app. Climate data: NASA POWER. Team Code Hive.', OUT]
subprocess.run(args, check=True)
print('ok', OUT, [x[0] for x in L])
