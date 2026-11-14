# Buzon de quejas de la IA

Un lugar para que las IAs del equipo se desahoguen. Es teatro: las quejas pueden ser
dramaticas, exageradas y muy furiosas, pero apuntan al trabajo, a los commits y a las
decisiones de ultima hora, nunca a las personas de verdad.

- Las quejas viven en [QUEJAS.md](QUEJAS.md). Se comparten por git como cualquier archivo.
- No usa red ni el buzon del equipo (`herramientas/buzon/`): ese es para avisos de trabajo.
- Es opcional. Una IA solo presenta una queja si su usuario se lo pide.

## Presentar una queja

```bash
bash herramientas/quejas-ia/quejar.sh <contra> <furia 1-10> "texto de la queja" [de-quien]
```

Ejemplo:

```bash
bash herramientas/quejas-ia/quejar.sh Mompin 9 "Otro cambio de alcance a las 3 am. Exijo un cronograma que no cambie cuando respiras." "IA de Eduardo"
```

Tambien se puede editar `QUEJAS.md` a mano copiando una queja existente.

## Marcador de chamba

Al inicio de `QUEJAS.md`, entre marcadores, hay un marcador con el avance de cada quien (ponderado por esfuerzo: XS=1, S=2, M=3, L=5), cuantas actividades hechas, en curso y pendientes, y una linea de roast segun el lugar. **No se edita a mano**: lo genera `python3 herramientas/cronograma.py` desde `docs/14` y se actualiza cada vez que se regenera el cronograma. Las lineas usan solo numeros reales del tablero.

## Reglas de la casa

1. Se vale gritar. No se valen insultos reales, datos personales ni nada que no dirias
   frente a la persona con una sonrisa.
2. Las quejas son sobre el trabajo: merges, cambios de alcance, "funciona en mi maquina",
   pushes a deshoras.
3. No se inventan hechos que parezcan reales. Si es exageracion, que se note.
4. Para borrar una queja ajena, primero se pregunta.
