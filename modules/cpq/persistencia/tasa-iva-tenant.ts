import type { Contexto } from "@opai/capabilities";
import { IVA_PCT, PCT_ESCALA } from "@opai/domain/dinero";

/** Tasa IVA de venta configurada en el módulo CPQ del tenant (`tasaIvaVentaPct` en PCT_ESCALA). */
export async function tasaIvaVentaTenant(ctx: Contexto): Promise<number> {
  const row = await ctx.db.tenantModule.findFirst({
    where: { tenantId: ctx.tenantId, moduloId: "cpq" },
    select: { config: true },
  });
  const cfg = row?.config;
  if (cfg && typeof cfg === "object" && !Array.isArray(cfg)) {
    const raw = (cfg as Record<string, unknown>).tasaIvaVentaPct;
    if (typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= PCT_ESCALA) {
      return raw;
    }
  }
  return IVA_PCT;
}
