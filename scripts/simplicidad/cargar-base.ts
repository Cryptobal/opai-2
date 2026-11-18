import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { ETIQUETAS, type Cifras, type Metrica } from "./tipos";

const BASE = "simplicidad-base.json";

function leerBaseLocal(): Partial<Cifras> {
  try {
    return JSON.parse(readFileSync(BASE, "utf8")) as Partial<Cifras>;
  } catch {
    return {};
  }
}

/** Línea base: por defecto la de `main` en git (CAR-641); completa cifras nuevas desde el JSON local. */
export function cargarBase(ramaBase: string): Cifras {
  const local = leerBaseLocal();
  if (process.env.SIMPLICIDAD_BASE === "local") return local as Cifras;
  let remota: Partial<Cifras> = {};
  try {
    remota = JSON.parse(
      execFileSync("git", ["show", `${ramaBase}:${BASE}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as Partial<Cifras>;
  } catch {
    // Main sin línea base todavía.
  }
  const out = { ...remota } as Partial<Cifras>;
  for (const m of Object.keys(ETIQUETAS) as Metrica[]) {
    if (typeof out[m] !== "number" && typeof local[m] === "number") out[m] = local[m];
  }
  return out as Cifras;
}
