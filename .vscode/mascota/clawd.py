#!/usr/bin/env python3
"""Clawd: un bicho naranja de pixeles que pasea por todo el escritorio.

Solo usa la biblioteca estandar (tkinter). No instala nada, no abre
conexiones de red y no toca ningun archivo del proyecto.

Salir: clic sobre el bicho, tecla Escape, o espera ~45 segundos.

Uso:
    python3 clawd.py             # solo sale a pasear si hay un commit nuevo
    python3 clawd.py --siempre   # sale a pasear aunque ya lo hayas visto
    python3 clawd.py --segundos 20
"""

import argparse
import os
import random
import subprocess
import sys
import time

ESCALA = 7
COLOR_CUERPO = "#d97757"
COLOR_OJO = "#2b1810"
COLOR_FONDO_WIN = "#010101"  # se vuelve transparente en Windows

# Sprite 14 columnas. O = cuerpo, D = ojo, . = vacio.
CUERPO = [
    "..OOOOOOOOOO..",
    "..OOOOOOOOOO..",
    "..OODOOOODOO..",
    "..OODOOOODOO..",
    "OOOOOOOOOOOOOO",
    "OOOOOOOOOOOOOO",
    "..OOOOOOOOOO..",
    "..OOOOOOOOOO..",
]
PIERNAS = [
    [  # paso A
        "...OO....OO...",
        "...OO....OO...",
    ],
    [  # paso B
        "..OO......OO..",
        "..OO......OO..",
    ],
]
ANCHO = 14 * ESCALA
TOPE_SALTO = 5 * ESCALA  # espacio arriba para el salto
ALTO = (len(CUERPO) + 2) * ESCALA + TOPE_SALTO


def raiz_repo():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def anotar(texto):
    """Deja una linea en .git/clawd-log para saber si la tarea se disparo."""
    try:
        ruta = os.path.join(raiz_repo(), ".git", "clawd-log")
        with open(ruta, "a", encoding="utf-8") as f:
            f.write(time.strftime("%H:%M:%S") + " " + texto + "\n")
    except Exception:
        pass


def hay_commit_nuevo():
    """True si HEAD cambio desde la ultima vez que paseo. Guarda el hash en .git."""
    repo = raiz_repo()
    try:
        head = subprocess.run(
            ["git", "-C", repo, "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=5, check=True,
        ).stdout.strip()
        marca = os.path.join(repo, ".git", "clawd-visto")
        if os.path.isfile(marca):
            with open(marca, "r", encoding="utf-8") as f:
                if f.read().strip() == head:
                    return False
        with open(marca, "w", encoding="utf-8") as f:
            f.write(head)
    except Exception:
        pass  # sin git o sin permisos: que pasee igual
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--siempre", action="store_true")
    ap.add_argument("--segundos", type=int, default=45)
    args = ap.parse_args()

    if not args.siempre and not hay_commit_nuevo():
        anotar("lanzado: omitido, ya paseo con este commit")
        return 0
    anotar("lanzado: sale a pasear")

    try:
        import tkinter as tk
    except Exception:
        return 0  # sin tkinter no pasa nada, simplemente no sale

    root = tk.Tk()
    root.overrideredirect(True)
    root.attributes("-topmost", True)
    fondo = COLOR_FONDO_WIN
    try:
        if sys.platform == "darwin":
            root.attributes("-transparent", True)
            fondo = "systemTransparent"
            root.config(bg=fondo)
        elif sys.platform.startswith("win"):
            root.attributes("-transparentcolor", COLOR_FONDO_WIN)
            root.config(bg=COLOR_FONDO_WIN)
        else:
            fondo = "#202020"  # sin transparencia garantizada en Linux
            root.config(bg=fondo)
    except tk.TclError:
        fondo = "#202020"

    canvas = tk.Canvas(root, width=ANCHO, height=ALTO, bg=fondo,
                       highlightthickness=0, bd=0)
    canvas.pack()

    pantalla_w = root.winfo_screenwidth()
    pantalla_h = root.winfo_screenheight()
    margen_x, margen_y = 20, 60
    estado = {
        "x": float(random.randint(margen_x, pantalla_w - ANCHO - margen_x)),
        "y": float(pantalla_h - ALTO - margen_y),
        "dest": None,
        "pausa": 0,
        "paso": 0,
        "salto": 0,
        "t0": time.time(),
        "ticks": 0,
    }

    def dibujar(paso, dy):
        canvas.delete("all")
        filas = CUERPO + PIERNAS[paso % 2]
        for j, fila in enumerate(filas):
            for i, c in enumerate(fila):
                if c == ".":
                    continue
                color = COLOR_OJO if c == "D" else COLOR_CUERPO
                x0, y0 = i * ESCALA, j * ESCALA + TOPE_SALTO + dy
                canvas.create_rectangle(x0, y0, x0 + ESCALA, y0 + ESCALA,
                                        fill=color, outline=color)

    def nuevo_destino():
        estado["dest"] = (
            random.randint(margen_x, pantalla_w - ANCHO - margen_x),
            random.randint(margen_y, pantalla_h - ALTO - margen_y),
        )

    def salir(_evento=None):
        root.destroy()

    def tick():
        if time.time() - estado["t0"] > args.segundos:
            salir()
            return
        dy = 0
        if estado["pausa"] > 0:
            estado["pausa"] -= 1
        else:
            if estado["dest"] is None:
                nuevo_destino()
            dx = estado["dest"][0] - estado["x"]
            dyy = estado["dest"][1] - estado["y"]
            dist = (dx * dx + dyy * dyy) ** 0.5
            if dist < 6:
                estado["dest"] = None
                estado["pausa"] = random.randint(8, 30)
                estado["salto"] = 10 if random.random() < 0.4 else 0
            else:
                velocidad = 5.0
                estado["x"] += velocidad * dx / dist
                estado["y"] += velocidad * dyy / dist
                estado["paso"] += 1
        if estado["salto"] > 0:
            dy = -(5 - abs(estado["salto"] - 5)) * 6  # sube y baja, tope 30 px
            estado["salto"] -= 1
        dibujar(estado["paso"] // 3, dy)
        root.geometry(f"+{int(estado['x'])}+{int(estado['y'])}")
        estado["ticks"] += 1
        if estado["ticks"] % 25 == 0:
            root.lift()  # por si otra ventana la tapa
        root.after(40, tick)

    canvas.bind("<Button-1>", salir)
    root.bind("<Escape>", salir)
    # Tamano fijo una sola vez y ventana mostrada antes de empezar a moverla.
    root.update_idletasks()
    root.geometry(f"{ANCHO}x{ALTO}+{int(estado['x'])}+{int(estado['y'])}")
    root.lift()
    tick()
    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
