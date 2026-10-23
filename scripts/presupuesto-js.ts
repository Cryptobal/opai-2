// Presupuesto de JavaScript por ruta (ADR-037). Mide, sobre el build de producción de apps/web, el
// JS que descarga un navegador moderno por ruta: chunks compartidos (`rootMainFiles` de
// build-manifest.json) + chunks de cliente de la ruta (`page_client-reference-manifest.js`),
// comprimidos con gzip. Excluye el polyfill `noModule`. Falla si una ruta supera su presupuesto.
// Uso: pnpm build && pnpm presupuesto   (opcional: --json para salida estructurada)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const RAIZ = join(import.meta.dirname, "..", "apps", "web");
const NEXT = join(RAIZ, ".next");
const PRESUPUESTO = join(RAIZ, "presupuesto-js.json");

type Presupuesto = {
  framework: number;
  porDefecto: number;
  maxSobreFramework: number;
  rutas: Record<string, number>;
};

const KB = 1024;
const kb = (n: number) => `${(n / KB).toFixed(1).replace(".", ",")} KB`;
const cache = new Map<string, number>();

function gz(archivo: string): number {
  let n = cache.get(archivo);
  if (n === undefined) {
    const ruta = join(NEXT, archivo);
    n = existsSync(ruta) ? gzipSync(readFileSync(ruta)).length : 0;
    cache.set(archivo, n);
  }
  return n;
}

function limite(ruta: string, p: Presupuesto): number {
  if (p.rutas[ruta] !== undefined) return p.rutas[ruta];
  const comodin = Object.keys(p.rutas)
    .filter((k) => k.endsWith("*") && ruta.startsWith(k.slice(0, -1)))
    .sort((a, b) => b.length - a.length)[0];
  return comodin ? (p.rutas[comodin] as number) : p.porDefecto;
}

function manifiestos(): string[] {
  const base = join(NEXT, "server", "app");
  if (!existsSync(base)) return [];
  return readdirSync(base, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith("page_client-reference-manifest.js"))
    .map((f) => join(base, f));
}

export function medir(p: Presupuesto) {
  const manifest = JSON.parse(readFileSync(join(NEXT, "build-manifest.json"), "utf8")) as {
    rootMainFiles: string[];
    polyfillFiles: string[];
  };
  const raiz = new Set(manifest.rootMainFiles);
  const polyfills = new Set(manifest.polyfillFiles);
  const framework = manifest.rootMainFiles.reduce((t, f) => t + gz(f), 0);
  const filas = manifiestos()
    .map((archivo) => {
      const ruta = `/${relative(join(NEXT, "server", "app"), archivo)}`
        .replace(/\/page_client-reference-manifest\.js$/, "")
        .replace(/^\/\//, "/");
      const chunks = [...new Set(readFileSync(archivo, "utf8").match(/static\/chunks\/[^"']+\.js/g))];
      const propios = chunks.filter((c) => !raiz.has(c) && !polyfills.has(c));
      const extra = propios.reduce((t, c) => t + gz(c), 0);
      const total = framework + extra;
      const tope = limite(ruta, p) * KB;
      const sobre = Math.min(tope - framework, p.maxSobreFramework * KB);
      return { ruta, total, extra, tope, ok: total <= tope && extra <= sobre };
    })
    .sort((a, b) => a.ruta.localeCompare(b.ruta));
  return { framework, frameworkOk: framework <= p.framework * KB, filas };
}

function main(): void {
  if (!existsSync(join(NEXT, "build-manifest.json"))) {
    console.error("No hay build: corre `pnpm build` antes de `pnpm presupuesto`.");
    process.exit(1);
  }
  const p = JSON.parse(readFileSync(PRESUPUESTO, "utf8")) as Presupuesto;
  const r = medir(p);
  if (r.filas.length === 0) {
    console.error("No se encontraron manifests de rutas en .next/server/app (¿cambió Next?).");
    process.exit(1);
  }
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`framework (compartido): ${kb(r.framework)} / ${p.framework} KB ${r.frameworkOk ? "✓" : "✗"}`);
    for (const f of r.filas) {
      console.log(
        `${f.ok ? "✓" : "✗"} ${kb(f.total).padStart(9)}  (+${kb(f.extra).padStart(8)})  tope ${kb(f.tope).padStart(9)}  ${f.ruta}`,
      );
    }
  }
  const malas = r.filas.filter((f) => !f.ok);
  if (malas.length > 0 || !r.frameworkOk) {
    console.error(`\nPresupuesto superado en ${malas.length} ruta(s)${r.frameworkOk ? "" : " y en el framework"}.`);
    process.exit(1);
  }
  console.log("\nPresupuesto de JS: dentro de los límites.");
}

if (process.argv[1] && import.meta.filename === process.argv[1]) main();
