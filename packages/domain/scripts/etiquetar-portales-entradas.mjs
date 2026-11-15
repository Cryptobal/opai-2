import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(fileURLToPath(import.meta.url), "..", "..", "src", "novedades", "entradas");

const PORTALES_TODOS_MOVIL = [
  "erp",
  "terreno",
  "supervisor",
  "cliente",
  "trabajador",
];

const prefijoPortal = (ruta) => {
  if (!ruta) return null;
  const p = ruta.split(/[?#]/)[0] ?? ruta;
  if (p.startsWith("/terreno")) return "terreno";
  if (p.startsWith("/supervisor")) return "supervisor";
  if (p.startsWith("/cliente")) return "cliente";
  if (p.startsWith("/trabajador")) return "trabajador";
  if (p.startsWith("/platform")) return "platform";
  return null;
};

function inferirPortales(texto, fm) {
  if (/^portales:/m.test(fm)) return null;
  const modulo = fm.match(/^modulo:\s*(.+)$/m)?.[1]?.trim();
  if (modulo === "platform") return ["platform", "erp"];
  const ruta = fm.match(/^ruta:\s*(.+)$/m)?.[1]?.trim();
  const portalRuta = prefijoPortal(ruta);
  const cuerpo = texto.split(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/)[1] ?? "";
  const bloque = `${fm}\n${cuerpo}`.toLowerCase();
  const movil =
    /tel[eé]fono|barra de abajo|barra inferior|diseño nuevo|menú del pie|pestañas/.test(bloque) &&
    !/solo en el erp|solo administradores/.test(bloque);
  if (movil) return PORTALES_TODOS_MOVIL;
  if (portalRuta) return portalRuta === "platform" ? ["platform", "erp"] : [portalRuta, "erp"];
  return ["erp"];
}

function bloquePortales(portales) {
  if (portales.length === 1) return `portales: ${portales[0]}\n`;
  return `portales:\n${portales.map((p) => `  - ${p}`).join("\n")}\n`;
}

async function main() {
  const archivos = (await readdir(dir)).filter((f) => f.endsWith(".md"));
  let tocados = 0;
  for (const nombre of archivos) {
    const ruta = join(dir, nombre);
    const texto = await readFile(ruta, "utf8");
    const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) continue;
    const fm = m[1];
    const portales = inferirPortales(texto, fm);
    if (!portales) continue;
    const lineas = fm.split("\n").filter((l) => l.trim());
    const nuevas = `---\n${lineas.join("\n")}\n${bloquePortales(portales).trimEnd()}\n---\n${m[2]}`;
    await writeFile(ruta, nuevas, "utf8");
    tocados += 1;
  }
  console.log(`Etiquetadas ${tocados} entradas con portales.`);
}

await main();