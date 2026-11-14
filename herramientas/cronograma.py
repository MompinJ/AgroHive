"""Genera, desde docs/14-CRONOGRAMA.md, cuatro vistas del cronograma por persona:

  1. la seccion "Estado por persona" de docs/14 (entre marcadores),
  2. docs/cronograma.html (pagina para abrir en el navegador),
  3. AgroVault/Compartido/Cronograma.md (nota de Obsidian),
  4. el "Marcador de chamba" al inicio de herramientas/quejas-ia/QUEJAS.md (entre marcadores).

La unica fuente de estados son las marcas `[HECHO]`, `[EN CURSO]` y `[BLOQUEADO]` de las tablas de fase de docs/14 y el
reparto del "Tablero de reparto". Edita docs/14, no las vistas, y vuelve a correr:

    python3 herramientas/cronograma.py            # escribe las tres vistas
    python3 herramientas/cronograma.py --revisar  # no escribe; sale con 1 si alguna vista esta desfasada
"""
import html
import json
import re
import sys
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DOC14 = RAIZ / "docs" / "14-CRONOGRAMA.md"
HTML = RAIZ / "docs" / "cronograma.html"
NOTA = RAIZ / "AgroVault" / "Compartido" / "Cronograma.md"
QUEJAS = RAIZ / "herramientas" / "quejas-ia" / "QUEJAS.md"
INI_CH, FIN_CH = "<!-- marcador-chamba:inicio -->", "<!-- marcador-chamba:fin -->"
PESOS = {"XS": 1, "S": 2, "M": 3, "L": 5, "XL": 8}  # un XL se divide antes de empezar (docs/14); por si acaso pesa mas que una L
INI, FIN = "<!-- estado-por-persona:inicio -->", "<!-- estado-por-persona:fin -->"
PERSONAS = ["Mompin", "Eduardo", "Mafer", "balam"]
ESTADOS = ["HECHO", "EN CURSO", "BLOQUEADO", "PENDIENTE"]
# Notas de Obsidian donde vive el detalle de una actividad (wikilinks en la nota generada)
NOTAS = {"A0.4": "Servidor", "A4.7": "Servidor", "A0.7": "APIs", "A2.14": "APIs", "A2.1": "APIs", "A2.3": "APIs",
         "A1.1": "Contratos", "A1.3": "Contratos", "A2.13": "Contratos"}


def limpiar(t: str) -> str:
    return t.replace("**", "").replace("`", "").strip()


def leer_doc14(texto: str):
    """(actividades por id, compuertas, reparto por persona)."""
    actividades, fase = {}, None
    compuertas = []
    en_tablero = False
    reparto: dict[str, list[str]] = {}
    marcas_tablero: dict[str, str] = {}
    for linea in texto.splitlines():
        if linea.startswith("## "):
            m = re.match(r"## (F\d) · (.+)", linea)
            fase = (m.group(1), m.group(2).strip()) if m else None
            en_tablero = linea.startswith("## Tablero de reparto")
            continue
        if not linea.startswith("|"):
            continue
        c = [x.strip() for x in linea.strip().strip("|").split("|")]
        if fase and re.match(r"A\d\.\d+\b", c[0]) and len(c) >= 7:
            m = re.match(r"(A\d\.\d+)\s*(?:`?\[(HECHO|EN CURSO|BLOQUEADO)\]`?)?\s*(.*)", c[0])
            ident, estado, nota = m.group(1), m.group(2) or "PENDIENTE", m.group(3).strip()
            actividades[ident] = {"id": ident, "fase": fase[0], "faseNombre": fase[1], "act": limpiar(c[1]), "rol": limpiar(c[2]),
                                  "esf": limpiar(c[3]), "mod": limpiar(c[4]), "dep": limpiar(c[5]), "ent": limpiar(c[6]),
                                  "estado": estado, "nota": nota}
        elif c[0].startswith("**C") and len(c) >= 3:
            ident, _, nombre = limpiar(c[0]).partition("·")
            compuertas.append({"id": ident.strip(), "nombre": nombre.strip(), "cuando": c[1], "sino": c[2]})
        elif en_tablero and re.match(r"\*\*(\w+)\*\*", c[0]) and len(c) >= 5:
            nombre = limpiar(c[0])
            reparto[nombre] = list(dict.fromkeys(re.findall(r"A\d\.\d+", c[3])))
            for ident, est in re.findall(r"(A\d\.\d+)\s*`?\[(HECHO|EN CURSO|BLOQUEADO)\]`?", c[3]):
                marcas_tablero[ident] = est
    for ident, est in marcas_tablero.items():
        if ident in actividades and actividades[ident]["estado"] == "PENDIENTE":
            actividades[ident]["estado"] = est  # la fila manda; el tablero solo completa
    return actividades, compuertas, reparto


def por_persona(actividades, reparto):
    """Asigna cada actividad a quien la toma en el tablero; sin dueño: A0.1 y A0.2 a Mompin (columna Rol), A0.3 a Todos."""
    mapa = {p: [] for p in PERSONAS}
    for p in PERSONAS:
        mapa[p] = [i for i in reparto.get(p, []) if i in actividades]
    asignadas = {i for v in mapa.values() for i in v}
    sin_dueno = [i for i in actividades if i not in asignadas]
    for i in list(sin_dueno):
        rol = actividades[i]["rol"]
        if rol in PERSONAS:
            mapa[rol].append(i)
            sin_dueno.remove(i)
    orden = list(actividades)
    for p in PERSONAS:
        mapa[p].sort(key=orden.index)
    return mapa, sin_dueno


def resumen(ids, actividades):
    c = {e: 0 for e in ESTADOS}
    for i in ids:
        c[actividades[i]["estado"]] += 1
    total = len(ids)
    return c, total, (round(100 * c["HECHO"] / total) if total else 0)


def tabla_md(ids, actividades, enlaces=False):
    f = ["| ID | Actividad | Estado | Nota |", "| --- | --- | --- | --- |"]
    for i in ids:
        a = actividades[i]
        nombre = a["act"]
        if enlaces and i in NOTAS:
            nombre += f" ([[{NOTAS[i]}]])"
        f.append(f"| {i} | {nombre} | {a['estado']} | {a['nota'] or ''} |")
    return "\n".join(f)


def seccion_doc14(actividades, mapa, sin_dueno):
    s = [INI, "", "## Estado por persona", "",
         "Generado por `herramientas/cronograma.py` desde las marcas de las tablas de fase de este documento. **No se edita a mano**: marca la actividad en su fila (`[HECHO]`, `[EN CURSO]`, `[BLOQUEADO]`) y corre el script. "
         "Sin marca = pendiente. Misma información en `docs/cronograma.html` y en la nota de Obsidian `Cronograma`.", ""]
    s += ["| Persona | Hechas | En curso | Bloqueadas | Pendientes | Avance |", "| --- | --- | --- | --- | --- | --- |"]
    for p in PERSONAS:
        c, t, pct = resumen(mapa[p], actividades)
        s.append(f"| **{p}** | {c['HECHO']} | {c['EN CURSO']} | {c['BLOQUEADO']} | {c['PENDIENTE']} | {pct} % de {t} |")
    s.append("")
    for p in PERSONAS:
        s += [f"### {p}", "", tabla_md(mapa[p], actividades), ""]
    if sin_dueno:
        s += ["### Equipo (sin responsable único)", "", tabla_md(sin_dueno, actividades), ""]
    s.append(FIN)
    return "\n".join(s)


def aplicar_seccion(texto, seccion):
    if INI in texto and FIN in texto:
        a, b = texto.index(INI), texto.index(FIN) + len(FIN)
        return texto[:a] + seccion + texto[b:]
    ancla = "## Cómo mantener este documento"
    return texto.replace(ancla, seccion + "\n\n" + ancla, 1)


def nota_obsidian(actividades, compuertas, mapa, sin_dueno, hoy):
    s = ["---", "tipo: cronograma", "audiencia: todas", f"actualizado: {hoy}", "fuente: docs/14-CRONOGRAMA.md", "---", "",
         "# Cronograma por persona", "",
         "Nota **generada** por `herramientas/cronograma.py` desde las marcas de `docs/14-CRONOGRAMA.md`. No la edites a mano: marca la actividad en `docs/14` y vuelve a correr el script. "
         "El detalle de cada actividad (dependencias, entregable, modelo de IA) está en `docs/14`; las reglas, en [[Reglas]]; lo que sigue abierto, en [[Pendientes]].", "",
         "## Resumen", "", "| Persona | Hechas | En curso | Bloqueadas | Pendientes | Avance |", "| --- | --- | --- | --- | --- | --- |"]
    for p in PERSONAS:
        c, t, pct = resumen(mapa[p], actividades)
        s.append(f"| **{p}** | {c['HECHO']} | {c['EN CURSO']} | {c['BLOQUEADO']} | {c['PENDIENTE']} | {pct} % de {t} |")
    todas = list(actividades)
    c, t, pct = resumen(todas, actividades)
    s += ["", f"Proyecto completo: **{c['HECHO']} de {t}** actividades hechas ({pct} %), {c['EN CURSO']} en curso, {c['BLOQUEADO']} bloqueadas.", ""]
    for p in PERSONAS:
        s += [f"## {p}", ""]
        for i in mapa[p]:
            a = actividades[i]
            marca = {"HECHO": "x", "EN CURSO": "/", "BLOQUEADO": "-"}.get(a["estado"], " ")
            nombre = a["act"] + (f" ([[{NOTAS[i]}]])" if i in NOTAS else "")
            extra = "" if a["estado"] == "PENDIENTE" else f" `{a['estado']}`"
            nota = f" — {a['nota']}" if a["nota"] else ""
            s.append(f"- [{marca}] **{i}** {nombre}{extra}{nota}")
        s.append("")
    if sin_dueno:
        s += ["## Equipo (sin responsable único)", ""] + [f"- [ ] **{i}** {actividades[i]['act']}" for i in sin_dueno] + [""]
    s += ["## Compuertas", ""] + [f"- **{g['id']} · {g['nombre']}**: se cruza cuando {g['cuando'][0].lower() + g['cuando'][1:]}. Si no: {g['sino']}" for g in compuertas]
    s += ["", "Casillas: `[x]` hecha, `[/]` en curso, `[-]` bloqueada, `[ ]` pendiente.", ""]
    return "\n".join(s)


PLANTILLA = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AgroHive - Cronograma</title>
<style>
:root{--bg:#f6f5ef;--card:#fff;--tx:#1d2a1f;--mut:#5d6b60;--bd:#dcdccf;--ac:#2f7d4f;--ac2:#e8f2ea;--warn:#b5651d;--bad:#a63a3a}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#141a15;--card:#1c241e;--tx:#e8efe9;--mut:#9aab9e;--bd:#2d3a30;--ac:#5fbf86;--ac2:#22332a;--warn:#e0a060;--bad:#e07a7a}}
:root[data-theme="dark"]{--bg:#141a15;--card:#1c241e;--tx:#e8efe9;--mut:#9aab9e;--bd:#2d3a30;--ac:#5fbf86;--ac2:#22332a;--warn:#e0a060;--bad:#e07a7a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--tx);font:15px/1.45 system-ui,sans-serif}
main{max-width:1000px;margin:0 auto;padding:20px 16px 60px}
h1{margin:0 0 4px;font-size:1.5rem}.sub{color:var(--mut);margin:0 0 16px}
.bar{height:10px;background:var(--bd);border-radius:6px;overflow:hidden;margin:6px 0 4px}.bar>i{display:block;height:100%;background:var(--ac)}
.resumen{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin:14px 0}
.per{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 12px}.per b{font-size:1.05rem}
.per .n{color:var(--mut);font-size:.85rem}
.filtros{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}
.filtros button{border:1px solid var(--bd);background:var(--card);color:var(--tx);padding:6px 12px;border-radius:16px;cursor:pointer;font:inherit}
.filtros button.on{background:var(--ac);border-color:var(--ac);color:#fff}.filtros .sep{width:1px;background:var(--bd);margin:0 4px}
h2{font-size:1.1rem;margin:26px 0 8px;border-bottom:2px solid var(--ac);padding-bottom:4px}
.act{background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:10px 12px;margin:8px 0}
.t{font-weight:600}.t small{color:var(--mut);font-weight:400;margin-right:6px}
.act.HECHO .t{text-decoration:line-through;color:var(--mut)}
.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.tag{background:var(--ac2);border-radius:10px;padding:1px 9px;font-size:.8rem}
.st{border-radius:10px;padding:1px 9px;font-size:.8rem;font-weight:600;border:1px solid var(--bd)}
.st.HECHO{background:var(--ac);color:#fff;border-color:var(--ac)}.st.ENCURSO{background:var(--warn);color:#fff;border-color:var(--warn)}
.st.BLOQUEADO{background:var(--bad);color:#fff;border-color:var(--bad)}.st.PENDIENTE{background:var(--card);color:var(--mut)}
.tag.L,.tag.XL{background:var(--warn);color:#fff}
.det{color:var(--mut);font-size:.88rem;margin-top:4px}.nota{font-size:.88rem;margin-top:4px}
.gate{border-left:4px solid var(--warn);background:var(--card);padding:8px 12px;margin:8px 0;border-radius:0 8px 8px 0;font-size:.9rem}.gate b{color:var(--warn)}
.vacio{color:var(--mut);font-style:italic}
</style>
</head>
<body>
<main>
<h1>AgroHive - Cronograma por persona</h1>
<p class="sub">Generado el __HOY__ desde <code>docs/14-CRONOGRAMA.md</code> con <code>herramientas/cronograma.py</code>. Los estados salen de las marcas de ese documento: no se editan aqui.</p>
<div class="resumen" id="resumen"></div>
<div class="filtros" id="filtros"></div>
<div id="lista"></div>
<h2>Compuertas (puntos de corte)</h2>
<div id="gates"></div>
</main>
<script>
const D = __DATOS__;
const ESTADOS = ["HECHO","EN CURSO","BLOQUEADO","PENDIENTE"];
let fPer = "Todos", fEst = "Todos";
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const clase = e => e.replace(" ","");
function grupo(el, arr, get, set){
  arr.forEach(v=>{const b=document.createElement("button");b.textContent=v;if(get()===v)b.className="on";
    b.onclick=()=>{set(v);render()};el.appendChild(b)});
}
function resumen(p){
  const ids = D.reparto[p], c = {}; ESTADOS.forEach(e=>c[e]=0); ids.forEach(i=>c[D.acts[i].estado]++);
  return {c, t: ids.length, pct: ids.length ? Math.round(100*c["HECHO"]/ids.length) : 0};
}
function render(){
  document.getElementById("resumen").innerHTML = D.personas.map(p=>{const r=resumen(p);
    return `<div class="per"><b>${esc(p)}</b><div class="bar"><i style="width:${r.pct}%"></i></div>
    <div class="n">${r.pct} % de ${r.t} &middot; ${r.c["HECHO"]} hechas, ${r.c["EN CURSO"]} en curso, ${r.c["BLOQUEADO"]} bloqueadas, ${r.c["PENDIENTE"]} pendientes</div></div>`}).join("");
  const f = document.getElementById("filtros"); f.innerHTML="";
  grupo(f, ["Todos",...D.personas], ()=>fPer, v=>fPer=v);
  f.insertAdjacentHTML("beforeend",'<span class="sep"></span>');
  grupo(f, ["Todos",...ESTADOS], ()=>fEst, v=>fEst=v);
  let html = "";
  D.personas.filter(p=>fPer==="Todos"||p===fPer).forEach(p=>{
    const r = resumen(p), vis = D.reparto[p].filter(i=>fEst==="Todos"||D.acts[i].estado===fEst);
    html += `<h2>${esc(p)} (${r.c["HECHO"]}/${r.t} hechas)</h2>`;
    if(!vis.length) html += '<p class="vacio">Sin actividades con este filtro.</p>';
    vis.forEach(i=>{const a=D.acts[i];
      html += `<div class="act ${clase(a.estado)}"><div class="t"><small>${esc(a.id)}</small>${esc(a.act)}</div>
      <div class="meta"><span class="st ${clase(a.estado)}">${esc(a.estado)}</span><span class="tag">${esc(a.fase)} ${esc(a.faseNombre)}</span>
      <span class="tag ${esc(a.esf.replace("*",""))}">Esfuerzo IA: ${esc(a.esf)}</span><span class="tag">Modelo: ${esc(a.mod)}</span></div>
      ${a.nota?`<div class="nota">${esc(a.nota)}</div>`:""}
      <div class="det"><b>Entregable:</b> ${esc(a.ent)}${a.dep&&a.dep!=="\\u2014"?` &middot; <b>Depende de:</b> ${esc(a.dep)}`:""}</div></div>`;});
  });
  document.getElementById("lista").innerHTML = html;
}
document.getElementById("gates").innerHTML = D.gates.map(g=>`<div class="gate"><b>${esc(g.id)} - ${esc(g.nombre)}</b><br>Se cruza cuando: ${esc(g.cuando)}<br>Si no: ${esc(g.sino)}</div>`).join("");
render();
</script>
</body>
</html>
"""


def pagina_html(actividades, compuertas, mapa, hoy):
    datos = {"personas": PERSONAS, "acts": actividades, "reparto": mapa, "gates": compuertas}
    cuerpo = json.dumps(datos, ensure_ascii=False).replace("</", "<\\/")
    return PLANTILLA.replace("__DATOS__", cuerpo).replace("__HOY__", html.escape(hoy))


def avance_ponderado(ids, actividades):
    """(porcentaje hecho ponderado por esfuerzo, peso hecho, peso total)."""
    peso = lambda i: PESOS.get(actividades[i]["esf"], 3)  # noqa: E731
    total = sum(peso(i) for i in ids)
    hecho = sum(peso(i) for i in ids if actividades[i]["estado"] == "HECHO")
    return (round(100 * hecho / total) if total else 0), hecho, total


ROAST = [  # segun el lugar; solo usan numeros reales del tablero (regla 3 de la casa: no inventar hechos), sobre el trabajo y no sobre la persona
    "{p} lidera con {pct} %: {hechas} hechas, y el cronograma le da la razon.",
    "{p} va segundo con {pct} %: cerca del podio, lejos de la gloria.",
    "{p} va tercero con {pct} %: {hechas} hechas y {pend} esperando turno.",
    "{p} cierra con {pct} %: {pend} actividades pendientes lo miran con carino.",
]


def marcador_chamba(actividades, mapa):
    filas = []
    for p in PERSONAS:
        pct, hecho, total = avance_ponderado(mapa[p], actividades)
        c, n, _ = resumen(mapa[p], actividades)
        filas.append({"p": p, "pct": pct, "hecho": hecho, "total": total, "hechas": c["HECHO"], "curso": c["EN CURSO"],
                      "pend": c["PENDIENTE"] + c["BLOQUEADO"], "n": n})
    filas.sort(key=lambda f: (-f["pct"], -f["hecho"], f["p"]))
    s = [INI_CH, "", "## Marcador de chamba", "",
         "Generado por `herramientas/cronograma.py` desde `docs/14`; se actualiza cada vez que se regenera, no se edita a mano. "
         "El porcentaje pesa cada actividad por su esfuerzo de IA (XS=1, S=2, M=3, L=5) para que una XS no cuente igual que una L. "
         "Las actividades compartidas cuentan para cada quien. Pendientes incluye las bloqueadas.", "",
         "| Lugar | Persona | Hecho (ponderado) | Hechas | En curso | Pendientes |", "| --- | --- | --- | --- | --- | --- |"]
    for k, f in enumerate(filas, 1):
        s.append(f"| {k} | **{f['p']}** | {f['pct']} % ({f['hecho']} de {f['total']} puntos) | {f['hechas']} | {f['curso']} | {f['pend']} |")
    s.append("")
    s += [f"{k}. " + ROAST[min(k - 1, len(ROAST) - 1)].format(**f) for k, f in enumerate(filas, 1)]
    s += ["", FIN_CH]
    return "\n".join(s)


def aplicar_marcador(texto, bloque):
    if INI_CH in texto and FIN_CH in texto:
        a, b = texto.index(INI_CH), texto.index(FIN_CH) + len(FIN_CH)
        return texto[:a] + bloque + texto[b:]
    ancla = "\n## Queja 1"
    return texto.replace(ancla, "\n" + bloque + "\n" + ancla, 1) if ancla in texto else texto.rstrip("\n") + "\n\n" + bloque + "\n"


def main():
    texto = DOC14.read_text(encoding="utf-8")
    actividades, compuertas, reparto = leer_doc14(texto)
    mapa, sin_dueno = por_persona(actividades, reparto)
    hoy = date.today().isoformat()
    nuevo14 = aplicar_seccion(texto, seccion_doc14(actividades, mapa, sin_dueno))
    salidas = {DOC14: nuevo14, HTML: pagina_html(actividades, compuertas, mapa, hoy),
               NOTA: nota_obsidian(actividades, compuertas, mapa, sin_dueno, hoy)}
    if QUEJAS.exists():
        salidas[QUEJAS] = aplicar_marcador(QUEJAS.read_text(encoding="utf-8"), marcador_chamba(actividades, mapa))
    if "--revisar" in sys.argv:
        # La fecha de generacion no cuenta como desfase: se compara con la del archivo actual.
        desfasadas = []
        for ruta, contenido in salidas.items():
            actual = ruta.read_text(encoding="utf-8") if ruta.exists() else ""
            normal = lambda t: re.sub(r"(actualizado: |Generado el )\d{4}-\d{2}-\d{2}", r"\1X", t)
            if normal(actual) != normal(contenido):
                desfasadas.append(str(ruta.relative_to(RAIZ)))
        print("desfasadas: " + ", ".join(desfasadas) if desfasadas else "las vistas estan al dia")
        sys.exit(1 if desfasadas else 0)
    for ruta, contenido in salidas.items():
        ruta.parent.mkdir(parents=True, exist_ok=True)
        ruta.write_text(contenido, encoding="utf-8")
        print(f"escrito {ruta.relative_to(RAIZ)}")
    todas = list(actividades)
    c, t, pct = resumen(todas, actividades)
    print(f"{t} actividades: {c['HECHO']} hechas, {c['EN CURSO']} en curso, {c['BLOQUEADO']} bloqueadas, {c['PENDIENTE']} pendientes ({pct} %)")
    for p in PERSONAS:
        cc, tt, pp = resumen(mapa[p], actividades)
        print(f"  {p}: {cc['HECHO']}/{tt} hechas ({pp} %), {cc['EN CURSO']} en curso, {cc['BLOQUEADO']} bloqueadas")
    if sin_dueno:
        print("  sin responsable:", ", ".join(sin_dueno))


if __name__ == "__main__":
    main()
