/**
 * Copia capturas `preview-e2e` marcadas con `capturarNovedad` a `apps/web/public/changelog/`
 * y agrega `imagen:` al .md si falta (CAR-520). Uso:
 *   pnpm --filter @opai/domain novedad:imagen
 *   pnpm --filter @opai/domain novedad:imagen -- --capturas=apps/web/test-results/capturas
 */
import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raizRepo = join(aqui, "../../..");
const entradas = join(raizRepo, "packages/domain/src/novedades/entradas");
const publicChangelog = join(raizRepo, "apps/web/public/changelog");

const argCapturas = process.argv.find((a) => a.startsWith("--capturas="));
const carpetaCapturas = argCapturas
  ? argCapturas.slice("--capturas=".length)
  : join(raizRepo, "apps/web/test-results/capturas");

const reCaptura = /^novedad-(.+)--(.+)-(desktop|telefono|ipad)\.png$/;

if (!existsSync(carpetaCapturas)) {
  console.log(`Sin carpeta de capturas (${carpetaCapturas}); nada que copiar.`);
  process.exit(0);
}

const porId = new Map();
for (const nombre of readdirSync(carpetaCapturas)) {
  const m = reCaptura.exec(nombre);
  if (!m) continue;
  const [, id, , proyecto] = m;
  const actual = porId.get(id);
  // La imagen publicada es la de escritorio (1280 px); el teléfono queda solo en el artefacto.
  if (!actual || proyecto === "desktop") {
    porId.set(id, { nombre, origen: join(carpetaCapturas, nombre) });
  }
}

if (porId.size === 0) {
  console.log("No hay capturas novedad-* en la carpeta.");
  process.exit(0);
}

let tocoMd = false;
for (const [id, { origen }] of porId) {
  const destino = join(publicChangelog, `${id}.png`);
  copyFileSync(origen, destino);
  console.log(`Imagen: ${destino}`);

  const md = readdirSync(entradas).find((f) => {
    if (!f.endsWith(".md")) return false;
    const texto = readFileSync(join(entradas, f), "utf8");
    return new RegExp(`^id:\\s*${id}\\s*$`, "m").test(texto);
  });
  if (!md) {
    console.warn(`Aviso: no hay .md con id ${id}`);
    continue;
  }
  const ruta = join(entradas, md);
  let cuerpo = readFileSync(ruta, "utf8");
  if (/^imagen:\s/m.test(cuerpo)) continue;
  const rutaPublica = `/changelog/${id}.png`;
  cuerpo = cuerpo.replace(/^---\n/, `---\nimagen: ${rutaPublica}\n`);
  writeFileSync(ruta, cuerpo);
  tocoMd = true;
  console.log(`Frontmatter imagen en ${md}`);
}

if (tocoMd) {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("node", ["scripts/embed-novedades-entradas.mjs"], {
    cwd: join(raizRepo, "packages/domain"),
    stdio: "inherit",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}