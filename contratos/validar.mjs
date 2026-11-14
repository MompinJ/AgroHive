// Valida los contratos de AgroHive.
// 1. Compila cada *.schema.json (JSON Schema 2020-12) en modo estricto.
// 2. Cada contrato debe tener su ejemplo en ejemplos/<contrato>.ejemplo.json y ese ejemplo debe ser valido.
//    Las variantes ejemplos/<contrato>.<variante>.ejemplo.json tambien deben ser validas.
// 3. Todo ejemplo debe declarar meta.esEjemplo = true (nunca se presenta como dato real).
// 4. Cada caso en pruebas/invalidos/<contrato>.<caso>.json debe ser RECHAZADO por su schema.
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
  if (!validar(datos)) {
    fallos++;
    console.log(`  FALLA  ${contrato}.ejemplo.json\n${formatearErrores(validar.errors)}`);
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
  if (!validar(datos)) {
    fallos++;
    console.log(`  FALLA  ${archivo}\n${formatearErrores(validar.errors)}`);
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
  if (validar(leer(join(dirInvalidos, archivo)))) {
    fallos++;
    console.log(`  FALLA  ${archivo}: fue aceptado y deberia rechazarse`);
  } else {
    const primero = validar.errors?.[0];
    console.log(`  ok     ${archivo} (rechazado: ${primero?.instancePath || "/"} ${primero?.message})`);
  }
}

console.log(`\n${pruebas - fallos}/${pruebas} pruebas en verde`);
process.exit(fallos === 0 ? 0 : 1);
