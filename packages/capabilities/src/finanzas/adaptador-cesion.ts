import {
  adaptadorCesionSimulado,
  adaptadorOctava,
  type AdaptadorCesion,
  type CredencialesOctava,
} from "@opai/integrations";

import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

async function credencialesOctava(ctx: Contexto): Promise<CredencialesOctava | null> {
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_cesion" } },
  });
  if (!integ) return null;
  const [usuario, clave] = await Promise.all([
    leerSecreto(ctx, integ.id, "usuario"),
    leerSecreto(ctx, integ.id, "clave"),
  ]);
  if (!usuario || !clave) return null;
  return { usuario, clave };
}

export async function adaptadorCesionDe(ctx: Contexto): Promise<AdaptadorCesion> {
  if (process.env.NODE_ENV === "test" || process.env.CESION_ADAPTADOR === "simulado") {
    return adaptadorCesionSimulado();
  }
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  if (cfg?.cesionProveedor !== "octava") return adaptadorCesionSimulado();
  return adaptadorOctava(await credencialesOctava(ctx));
}
