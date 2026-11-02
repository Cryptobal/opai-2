import { noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import type { versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";

export const CAMPOS_COSTO_CREAR = ["sueldoBaseClp", "precioUnitarioClp"] as const;
export const CAMPOS_COSTO_ACTUALIZAR = ["sueldoBaseClp", "precioUnitarioClp", "margenPropioPct"] as const;

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

export async function vistaPrevia(ctx: Parameters<typeof recalcularVersion>[0], cotizacionId: string) {
  const r = await recalcularVersion(ctx, cotizacionId, undefined, false);
  return { ventaMensualClp: r?.ventaMensual ?? null };
}
