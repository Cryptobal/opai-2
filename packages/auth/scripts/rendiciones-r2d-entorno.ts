import { exigirBaseE2E } from "../../db/scripts/exigir-base-e2e";

/** pg acepta overrides de destino en la query; esta fixture no necesita ninguno. */
export function exigirBaseR2dE2E(): void {
  exigirBaseE2E();
  for (const variable of ["DATABASE_URL", "DATABASE_URL_MIGRATE"]) {
    const url = new URL(process.env[variable] ?? "");
    if (url.search)
      throw new Error("La fixture R2D requiere URLs locales sin parámetros de conexión.");
  }
}
