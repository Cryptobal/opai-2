import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const BASE = "simplicidad-base.json";
export const RAMA_BASE = process.env.SIMPLICIDAD_RAMA_BASE ?? "origin/main";

const METRICAS = [
  "lineasDuplicadas",
  "archivosLargos",
  "funcionesLargas",
  "exportacionesSinUso",
  "archivosSinUso",
  "dependenciasSinUso",
] as const;

export type Metrica = (typeof METRICAS)[number];
export type Cifras = Record<Metrica, number>;

/** Línea base en git (CAR-641); completa claves que main aún no tiene con el JSON del checkout. */
export function cargarBase(): Cifras {
  if (process.env.SIMPLICIDAD_BASE === "local") {
    return JSON.parse(readFileSync(BASE, "utf8")) as Cifras;
  }
  let base: Partial<Cifras> = {};
  try {
    base = JSON.parse(
      execFileSync("git", ["show", `${RAMA_BASE}:${BASE}`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }),
    ) as Partial<Cifras>;
  } catch {
    // main sin archivo o ref inválida
  }
  if (METRICAS.some((m) => typeof base[m] !== "number")) {
    try {
      const local = JSON.parse(readFileSync(BASE, "utf8")) as Partial<Cifras>;
      for (const m of METRICAS) {
        if (typeof base[m] !== "number" && typeof local[m] === "number") base[m] = local[m];
      }
    } catch {
      // Sin JSON en el checkout
    }
  }
  if (METRICAS.every((m) => typeof base[m] === "number")) return base as Cifras;
  return JSON.parse(readFileSync(BASE, "utf8")) as Cifras;
}