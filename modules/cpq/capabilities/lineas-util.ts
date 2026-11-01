import { noEncontrado } from "@opai/capabilities";

import type { versionDeCotizacion } from "../persistencia/version";
import { recalcularVersion } from "../persistencia/recalcular";

export async function seccionDe(ctx: Parameters<typeof versionDeCotizacion>[0], seccionId: string) {
  const s = await ctx.db.cpqSeccion.findFirst({ where: { id: seccionId } });
  if (!s) throw noEncontrado("La sección");
  return s;
}

export async function vistaPrevia(ctx: Parameters<typeof recalcularVersion>[0], cotizacionId: string) {
  const r = await recalcularVersion(ctx, cotizacionId, undefined, false);
  return { ventaMensualClp: r?.ventaMensual ?? null };
}
