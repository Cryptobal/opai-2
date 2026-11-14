import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import type { versionDeCotizacion } from "../persistencia/version";

export function rechazarCostosSinPermiso(
  ctx: Parameters<typeof versionDeCotizacion>[0],
  input: Record<string, unknown>,
  campos: readonly string[],
) {
  if (ctx.autorizar("cpq:costos.ver")) return;
  for (const c of campos) {
    if (input[c] !== undefined) throw reglaDeNegocio("Los montos de costo requieren el permiso cpq:costos.ver.");
  }
}

export async function seccionDe(ctx: Parameters<typeof versionDeCotizacion>[0], seccionId: string) {
  const s = await ctx.db.cpqSeccion.findFirst({ where: { id: seccionId } });
  if (!s) throw noEncontrado("La sección");
  return s;
}
