/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

// Rutas que toca un PR (CAR-334, fase 3): por cada archivo cambiado bajo `apps/web/app`, la pantalla
// más cercana (`page.tsx` en su carpeta o arriba). Si el PR toca `packages/ds` o el marco, se suman las
// pantallas clave. Imprime una ruta por línea (patrón de App Router sin grupos).

const RAIZ = join(import.meta.dirname, "../../../..");
const APP = join(RAIZ, "apps/web/app");
const CLAVE = [
  "/",
  "/cuentas",
  "/cuentas/[id]",
  "/negocios",
  "/personas",
  "/finanzas/ventas",
  "/pauta",
  "/configuracion",
];
const MAX = 12;

function patron(carpeta: string): string {
  const partes = relative(APP, carpeta)
    .split(sep)
    .filter((p) => p && !/^\(.+\)$/.test(p));
  return `/${partes.join("/")}`;
}

function pantallaDe(archivo: string): string | null {
  let dir = dirname(join(RAIZ, archivo));
  while (dir.startsWith(APP)) {
    if (existsSync(join(dir, "page.tsx"))) return patron(dir);
    dir = dirname(dir);
  }
  return null;
}

const base = process.argv[2] ?? "origin/main";
const cambiados = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], {
  cwd: RAIZ,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);

const rutas = new Set<string>();
for (const f of cambiados) {
  if (
    f.startsWith("packages/ds/") ||
    f.includes("app/_components/hilo") ||
    f.includes("portal-layout")
  ) {
    CLAVE.forEach((r) => rutas.add(r));
  }
  if (f.startsWith("apps/web/app/") && !f.includes("/api/")) {
    const r = pantallaDe(f);
    if (r && !/\[\.\.\.|\/ds\b|\/platform\b|\[token\]/.test(r)) rutas.add(r);
  }
}
process.stdout.write([...rutas].slice(0, MAX).join("\n"));
