// Valida los contratos de AgroHive.
// 1. Compila cada *.schema.json (JSON Schema 2020-12) en modo estricto.
// 2. Cada contrato debe tener su ejemplo en ejemplos/<contrato>.ejemplo.json y ese ejemplo debe ser valido.
//    Las variantes ejemplos/<contrato>.<variante>.ejemplo.json tambien deben ser validas.
// 3. Todo ejemplo debe declarar meta.esEjemplo = true (nunca se presenta como dato real).
// 4. Cada caso en pruebas/invalidos/<contrato>.<caso>.json debe ser RECHAZADO por su schema o por un chequeo extra.
// 5. CHEQUEOS_EXTRA: reglas entre partes del documento que JSON Schema no expresa (por ejemplo, largos de columnas).
// Uso: npm test (desde contratos/). Sale con codigo 1 si algo falla.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const raiz = dirname(fileURLToPath(import.meta.url));
const dirEjemplos = join(raiz, "ejemplos");
const dirInvalidos = join(raiz, "pruebas", "invalidos");

const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

const ajv = new Ajv2020({
  strict: true,
  // Los if/then usan "required" sobre propiedades definidas en el schema padre.
  strictRequired: false,
  allErrors: true,
  allowUnionTypes: true,
});
addFormats(ajv);

const archivosSchema = readdirSync(raiz).filter((f) => f.endsWith(".schema.json")).sort();
for (const archivo of archivosSchema) {
  ajv.addSchema(leer(join(raiz, archivo)));
}

const BASE = "https://agrohive.example/contratos/";
const SOLO_DEFINICIONES = new Set(["comun"]);
const contratos = archivosSchema
  .map((f) => f.replace(".schema.json", ""))
  .filter((c) => !SOLO_DEFINICIONES.has(c));

let fallos = 0;
let pruebas = 0;

const formatearErrores = (errores) =>
  (errores ?? []).map((e) => `      ${e.instancePath || "/"} ${e.message}`).join("\n");

// Reglas que JSON Schema no puede expresar (comparan partes del documento entre si).
// Cada funcion devuelve una lista de errores; vacia si el documento cumple.
const CHEQUEOS_EXTRA = {
  "serie-balance": (d) => {
    const errores = [];
    (d?.ciclos ?? []).forEach((c, i) => {
      const largos = Object.entries(c?.dias ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : -1]);
      const distintos = new Set(largos.map(([, n]) => n));
      if (distintos.size > 1) {
        errores.push(`/ciclos/${i}/dias columnas de largo distinto (${largos.map(([k, n]) => `${k}=${n}`).join(", ")})`);
      }
      const n = largos.length ? largos[0][1] : 0;
      const sumaMeses = (c?.mensual ?? []).reduce((a, m) => a + (m?.dias ?? 0), 0);
      if ((c?.mensual ?? []).length && sumaMeses !== n) {
        errores.push(`/ciclos/${i}/mensual la suma de dias (${sumaMeses}) no coincide con el largo de las columnas (${n})`);
      }
    });
    return errores;
  },
};
const chequeoExtra = (contrato, datos) => (CHEQUEOS_EXTRA[contrato] ? CHEQUEOS_EXTRA[contrato](datos) : []);

const obtenerValidador = (contrato) => {
  const v = ajv.getSchema(`${BASE}${contrato}.schema.json`);
  if (!v) throw new Error(`No se pudo compilar el schema ${contrato}`);
  return v;
};

console.log("Ejemplos validos:");
for (const contrato of contratos) {
  pruebas++;
  const ruta = join(dirEjemplos, `${contrato}.ejemplo.json`);
  if (!existsSync(ruta)) {
    fallos++;
    console.log(`  FALLA  ${contrato}: falta ejemplos/${contrato}.ejemplo.json`);
    continue;
  }
  const datos = leer(ruta);
  const validar = obtenerValidador(contrato);
  const extra = validar(datos) ? chequeoExtra(contrato, datos) : [];
  if (validar.errors || extra.length) {
    fallos++;
    console.log(`  FALLA  ${contrato}.ejemplo.json\n${formatearErrores(validar.errors)}${extra.map((e) => `      ${e}`).join("\n")}`);
  } else if (datos?.meta?.esEjemplo !== true) {
    fallos++;
    console.log(`  FALLA  ${contrato}.ejemplo.json: meta.esEjemplo debe ser true`);
  } else {
    console.log(`  ok     ${contrato}.ejemplo.json`);
  }
}

// Variantes validas opcionales: ejemplos/<contrato>.<variante>.ejemplo.json
const variantes = readdirSync(dirEjemplos)
  .filter((f) => f.endsWith(".ejemplo.json") && f.split(".").length === 4)
  .sort();
for (const archivo of variantes) {
  pruebas++;
  const contrato = archivo.split(".")[0];
  if (!contratos.includes(contrato)) {
    fallos++;
    console.log(`  FALLA  ${archivo}: el prefijo no corresponde a ningun contrato`);
    continue;
  }
  const datos = leer(join(dirEjemplos, archivo));
  const validar = obtenerValidador(contrato);
  const extra = validar(datos) ? chequeoExtra(contrato, datos) : [];
  if (validar.errors || extra.length) {
    fallos++;
    console.log(`  FALLA  ${archivo}\n${formatearErrores(validar.errors)}${extra.map((e) => `      ${e}`).join("\n")}`);
  } else if (datos?.meta?.esEjemplo !== true) {
    fallos++;
    console.log(`  FALLA  ${archivo}: meta.esEjemplo debe ser true`);
  } else {
    console.log(`  ok     ${archivo}`);
  }
}

console.log("\nCasos invalidos (deben ser rechazados):");
const invalidos = existsSync(dirInvalidos)
  ? readdirSync(dirInvalidos).filter((f) => f.endsWith(".json")).sort()
  : [];
if (invalidos.length === 0) {
  pruebas++;
  fallos++;
  console.log("  FALLA  no hay casos en pruebas/invalidos/");
}
for (const archivo of invalidos) {
  pruebas++;
  const contrato = archivo.split(".")[0];
  if (!contratos.includes(contrato)) {
    fallos++;
    console.log(`  FALLA  ${archivo}: el prefijo no corresponde a ningun contrato`);
    continue;
  }
  const validar = obtenerValidador(contrato);
  const datosInvalidos = leer(join(dirInvalidos, archivo));
  const aceptadoPorSchema = validar(datosInvalidos);
  const extra = aceptadoPorSchema ? chequeoExtra(contrato, datosInvalidos) : [];
  if (aceptadoPorSchema && extra.length === 0) {
    fallos++;
    console.log(`  FALLA  ${archivo}: fue aceptado y deberia rechazarse`);
  } else if (!aceptadoPorSchema) {
    const primero = validar.errors?.[0];
    console.log(`  ok     ${archivo} (rechazado: ${primero?.instancePath || "/"} ${primero?.message})`);
  } else {
    console.log(`  ok     ${archivo} (rechazado por chequeo extra: ${extra[0]})`);
  }
}

console.log(`\n${pruebas - fallos}/${pruebas} pruebas en verde`);
process.exit(fallos === 0 ? 0 : 1);
