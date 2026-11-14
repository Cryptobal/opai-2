// Prendas del uniforme de la empresa (CAR-408; referente BambooHR / Rippling): las suyas o las de su vertical. La
// ficha pide la talla de cada una y la escritura rechaza prendas que no están en el kit.
import { prendasEfectivas, type Prenda } from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { ajuste } from "../config";

/** Kit efectivo de la empresa: el suyo si lo definió y es válido; si no, el de su vertical. */
export async function prendasDeLaEmpresa(ctx: Contexto): Promise<Prenda[]> {
  const [tenant, propio] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { vertical: true } }),
    ajuste<unknown>(ctx, "core", "personas_prendas_uniforme"),
  ]);
  return prendasEfectivas(propio, tenant?.vertical ?? "");
}

/** Error si alguna talla nombra una prenda fuera del kit (una talla vacía de una prenda antigua sí se puede borrar). */
export async function exigirPrendasDelKit(
  ctx: Contexto,
  tallas: Record<string, string | null> | undefined,
) {
  if (!tallas) return;
  const kit = new Set((await prendasDeLaEmpresa(ctx)).map((p) => p.clave));
  const fuera = Object.entries(tallas).filter(
    ([k, v]) => !kit.has(k) && v !== null && v.trim() !== "",
  );
  if (fuera.length) {
    throw reglaDeNegocio(
      `Estas prendas no están en el uniforme de la empresa: ${fuera.map(([k]) => k).join(", ")}.`,
    );
  }
}
