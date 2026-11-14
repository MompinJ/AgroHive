// Genera tipos/contratos.d.ts desde los *.schema.json con json-schema-to-typescript.
// Uso: npm run tipos (desde contratos/). El archivo generado no se edita a mano.
// Los $ref relativos (comun.schema.json#/...) se resuelven como archivos locales de esta carpeta.
// Antes de compilar se adapta cada schema SOLO para esta herramienta (los schemas no cambian):
//  - prefixItems (2020-12) pasa a items en forma de tupla, que es lo que entiende json-schema-to-typescript.
//  - se quitan description y title al lado de un $ref, para no generar tipos duplicados (ValorCitado1, ...).
//  - se quitan los if/then/else (reglas condicionales): solo validan y ajv ya las comprueba en npm test.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const raiz = dirname(fileURLToPath(import.meta.url));

const contratos = readdirSync(raiz)
  .filter((f) => f.endsWith(".schema.json") && f !== "comun.schema.json")
  .sort();

// Schema raiz sintetico: referencia a todos los contratos para declarar cada tipo una sola vez.
const raizSchema = {
  title: "ContratosAgroHive",
  type: "object",
  properties: Object.fromEntries(
    contratos.map((f) => [f.replace(".schema.json", ""), { $ref: f }]),
  ),
  additionalProperties: false,
};

const adaptar = (nodo) => {
  if (Array.isArray(nodo)) return nodo.map(adaptar);
  if (nodo === null || typeof nodo !== "object") return nodo;
  const salida = {};
  for (const [clave, valor] of Object.entries(nodo)) salida[clave] = adaptar(valor);
  if (Array.isArray(salida.prefixItems)) {
    salida.items = salida.prefixItems;
    delete salida.prefixItems;
  }
  delete salida.if;
  delete salida.then;
  delete salida.else;
  if (Array.isArray(salida.allOf)) {
    salida.allOf = salida.allOf.filter((parte) => Object.keys(parte).some((k) => k !== "description"));
    if (salida.allOf.length === 0) delete salida.allOf;
  }
  if ("$ref" in salida) {
    delete salida.description;
    delete salida.title;
  }
  return salida;
};

const resolverAdaptado = {
  order: 1,
  canRead: /\.schema\.json$/,
  read: (archivo) => adaptar(JSON.parse(readFileSync(fileURLToPath(new URL(archivo.url, "file://")), "utf8"))),
};

const cabecera = [
  "/* Generado por contratos/generar-tipos.mjs desde los JSON Schema de contratos/.",
  "   No editar a mano: cambiar el schema y correr `npm run tipos`. */",
].join("\n");

const ts = await compile(raizSchema, "ContratosAgroHive", {
  bannerComment: cabecera,
  cwd: raiz,
  declareExternallyReferenced: true,
  additionalProperties: false,
  unreachableDefinitions: false,
  $refOptions: { resolve: { adaptado: resolverAdaptado, http: false } },
});

mkdirSync(join(raiz, "tipos"), { recursive: true });
writeFileSync(join(raiz, "tipos", "contratos.d.ts"), ts);
console.log(`tipos/contratos.d.ts generado (${contratos.length} contratos)`);
