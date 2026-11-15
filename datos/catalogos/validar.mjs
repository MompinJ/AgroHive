// Valida los catalogos de datos/catalogos/ contra los contratos.
// - cultivos.json contra contratos/cultivo.schema.json
// - suelos.json contra contratos/tabla-suelos.schema.json
// - calendario-isla.json contra contratos/calendario-local.schema.json
// Ademas comprueba reglas que el schema no ve: etapas suman el ciclo, clases sin repetir,
// cada grupo del selector apunta a una clase EVALUABLE, cada cultivo tiene nombreComunEn con su fuente en notas.
// Uso (desde la raiz): node datos/catalogos/validar.mjs   (requiere `npm install` en contratos/)

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const aqui = dirname(fileURLToPath(import.meta.url));
const dirContratos = join(aqui, "..", "..", "contratos");
const requerir = createRequire(join(dirContratos, "package.json"));
const Ajv2020 = requerir("ajv/dist/2020.js").default;
const addFormats = requerir("ajv-formats").default;

const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));
const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true, allowUnionTypes: true });
addFormats(ajv);
for (const f of readdirSync(dirContratos).filter((f) => f.endsWith(".schema.json"))) {
  ajv.addSchema(leer(join(dirContratos, f)));
}

let fallos = 0;
const fallar = (msg) => {
  fallos++;
  console.log(`  FALLA  ${msg}`);
};

const validarContra = (archivo, id) => {
  const datos = leer(join(aqui, archivo));
  const v = ajv.getSchema(id);
  if (!v(datos)) {
    fallar(`${archivo}\n${v.errors.map((e) => `      ${e.instancePath || "/"} ${e.message}`).join("\n")}`);
  } else {
    console.log(`  ok     ${archivo}`);
  }
  if (datos?.meta?.esEjemplo !== false) fallar(`${archivo}: meta.esEjemplo debe ser false (catalogo real)`);
  return datos;
};

const cultivos = validarContra("cultivos.json", "https://agrohive.example/contratos/cultivo.schema.json");
for (const c of cultivos.cultivos) {
  // 0.16.0: el catalogo real trae el nombre en ingles de cada cultivo, con su fila citada en notas (generar.py, NOMBRES_EN).
  if (!c.nombreComunEn) fallar(`${c.id}: falta nombreComunEn`);
  else if (!(c.notas ?? "").includes(`Nombre en ingles '${c.nombreComunEn}'`)) fallar(`${c.id}: nombreComunEn sin su fuente en notas`);
  const ciclo = c.cicloDias;
  const etapas = Object.values(c.duracionEtapasDias);
  if (ciclo.estado === "EVALUABLE" && etapas.every((e) => e.estado === "EVALUABLE")) {
    const suma = etapas.reduce((s, e) => s + e.valor, 0);
    if (suma !== ciclo.valor) fallar(`${c.id}: etapas suman ${suma} y el ciclo dice ${ciclo.valor}`);
  }
  const esenciales = [ciclo, ...etapas, ...Object.values(c.kc)];
  if (c.estado === "EVALUABLE" && esenciales.some((p) => p.estado !== "EVALUABLE")) {
    fallar(`${c.id}: marcado EVALUABLE con parametros esenciales sin fuente`);
  }
}
const ids = cultivos.cultivos.map((c) => c.id);
if (new Set(ids).size !== ids.length) fallar("cultivos.json: ids repetidos");

const suelos = validarContra("suelos.json", "https://agrohive.example/contratos/tabla-suelos.schema.json");
const clases = suelos.texturas.map((t) => t.clase);
if (new Set(clases).size !== clases.length) fallar("suelos.json: clases repetidas");
for (const [grupo, clase] of Object.entries(suelos.representanteGrupo)) {
  const t = suelos.texturas.find((x) => x.clase === clase);
  if (!t || t.tawMmPorM.estado !== "EVALUABLE") fallar(`suelos.json: el grupo ${grupo} apunta a ${clase}, que no es EVALUABLE`);
  else if (t.grupo !== grupo) fallar(`suelos.json: ${clase} es del grupo ${t.grupo}, no ${grupo}`);
}

const calendario = validarContra("calendario-isla.json", "https://agrohive.example/contratos/calendario-local.schema.json");
const claves = calendario.entradas.map((e) => `${e.cultivo}/${e.temporada}`);
if (new Set(claves).size !== claves.length) fallar("calendario-isla.json: entradas repetidas");
for (const e of calendario.entradas) {
  if (e.ventana.estado === "EVALUABLE" && e.presencia.estado !== "registrado") {
    fallar(`calendario-isla.json: ${e.cultivo}/${e.temporada} tiene ventana pero el cultivo no esta registrado en el lugar`);
  }
  if (!cultivos.cultivos.some((c) => c.id === e.cultivo)) {
    fallar(`calendario-isla.json: ${e.cultivo} no esta en el catalogo`);
  }
}

console.log(fallos === 0 ? "\nCatalogos en verde" : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
