import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "../src/novedades/entradas");
const archivos = readdirSync(raiz)
  .filter((f) => f.endsWith(".md"))
  .sort();
const cuerpos = archivos.map((f) => readFileSync(join(raiz, f), "utf8"));
const lineas = [
  "/** Generado por `pnpm --filter @opai/domain gen:novedades-embed`. No editar. */",
  "export const NOVEDADES_MARKDOWN: readonly string[] = [",
  ...cuerpos.map((c) => `  ${JSON.stringify(c)},`),
  "] as const;",
  "",
];
writeFileSync(join(raiz, "embed.ts"), lineas.join("\n"));
console.log(`embed.ts: ${archivos.length} entradas`);
