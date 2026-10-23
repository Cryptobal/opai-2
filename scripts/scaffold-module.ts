// Genera un módulo vendible: `pnpm scaffold:module <id> --nombre "<Nombre>"`.
// Crea modules/<id>/ desde scripts/templates/module, el archivo de esquema del módulo en
// packages/db/prisma/schema/<id>.prisma, declara el schema en core.prisma y registra el módulo.
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const plantillas = join(raiz, "scripts", "templates", "module");

function fallar(mensaje: string): never {
  console.error(`✖ ${mensaje}`);
  process.exit(1);
}

function leerArgumentos(): { id: string; nombre: string } {
  const args = process.argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  const indice = args.indexOf("--nombre");
  const nombre = indice >= 0 ? args[indice + 1] : undefined;
  if (!id || !/^[a-z][a-z0-9_]*$/.test(id))
    fallar('Uso: pnpm scaffold:module <id> --nombre "<Nombre>" (id en minúsculas).');
  if (!nombre) fallar('Falta --nombre "<Nombre>".');
  return { id, nombre };
}

function aCamel(id: string): string {
  return id
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function render(contenido: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(k, v), contenido);
}

function copiarPlantillas(origen: string, destino: string, vars: Record<string, string>): string[] {
  const creados: string[] = [];
  for (const entrada of readdirSync(origen)) {
    const ruta = join(origen, entrada);
    if (statSync(ruta).isDirectory()) {
      creados.push(...copiarPlantillas(ruta, join(destino, render(entrada, vars)), vars));
      continue;
    }
    if (!entrada.endsWith(".tpl") || entrada === "schema.prisma.tpl") continue;
    const archivo = join(destino, render(entrada.replace(/\.tpl$/, ""), vars));
    mkdirSync(dirname(archivo), { recursive: true });
    writeFileSync(archivo, render(readFileSync(ruta, "utf8"), vars));
    creados.push(relative(raiz, archivo));
  }
  return creados;
}

function registrarEnRegistro(id: string, camel: string): void {
  const indice = join(raiz, "modules", "registry", "src", "index.ts");
  const paquete = join(raiz, "modules", "registry", "package.json");
  const marca = "  // scaffold:module — las entradas se agregan sobre esta línea";
  let codigo = readFileSync(indice, "utf8");
  if (!codigo.includes(marca))
    fallar("No encuentro la marca del scaffold en modules/registry/src/index.ts.");
  const importe = `import { manifest as ${camel} } from "@opai/mod-${id}";\n`;
  codigo = codigo.replace(
    'import type { ModuleManifest } from "@opai/capabilities";\n',
    `import type { ModuleManifest } from "@opai/capabilities";\n\n${importe}`,
  );
  codigo = codigo.replace(marca, `  ${camel},\n${marca}`);
  writeFileSync(indice, codigo);
  const pkg = JSON.parse(readFileSync(paquete, "utf8")) as { dependencies: Record<string, string> };
  pkg.dependencies[`@opai/mod-${id}`] = "workspace:*";
  pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort());
  writeFileSync(paquete, `${JSON.stringify(pkg, null, 2)}\n`);
}

function crearEsquema(id: string, vars: Record<string, string>): void {
  const archivo = join(raiz, "packages", "db", "prisma", "schema", `${id}.prisma`);
  writeFileSync(archivo, render(readFileSync(join(plantillas, "schema.prisma.tpl"), "utf8"), vars));
  const core = join(raiz, "packages", "db", "prisma", "schema", "core.prisma");
  const codigo = readFileSync(core, "utf8");
  const actual = /schemas\s*=\s*\[([^\]]*)\]/.exec(codigo);
  if (!actual) fallar("No encuentro `schemas = [...]` en core.prisma.");
  const lista = actual[1]!
    .split(",")
    .map((s) => s.trim().replace(/"/g, ""))
    .filter(Boolean);
  if (!lista.includes(id)) lista.push(id);
  writeFileSync(
    core,
    codigo.replace(actual[0], `schemas  = [${lista.map((s) => `"${s}"`).join(", ")}]`),
  );
}

function main(): void {
  const { id, nombre } = leerArgumentos();
  const destino = join(raiz, "modules", id);
  if (existsSync(destino)) fallar(`El módulo "${id}" ya existe.`);
  const vars = { __ID__: id, __NOMBRE__: nombre, __CAMEL__: aCamel(id) };
  const creados = copiarPlantillas(plantillas, destino, vars);
  crearEsquema(id, vars);
  registrarEnRegistro(id, aCamel(id));
  execSync("pnpm install --offline --silent", { cwd: raiz, stdio: "inherit" });
  console.log(
    `✔ Módulo "${id}" creado:\n  - ${creados.join("\n  - ")}\n  - packages/db/prisma/schema/${id}.prisma\n  - registrado en modules/registry`,
  );
  console.log(
    `Siguiente: define el esquema, corre pnpm db:migrate y el gate (pnpm typecheck && pnpm lint && pnpm test).`,
  );
}

main();
