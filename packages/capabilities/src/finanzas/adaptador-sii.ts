import {
  adaptadorSimpleApi,
  adaptadorSiiSimulado,
  type AdaptadorSii,
  type CredencialesSimpleApi,
} from "@opai/integrations";

import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

async function credencialesSimpleApi(ctx: Contexto): Promise<CredencialesSimpleApi | null> {
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
  });
  if (!integ) return null;
  const [apiKey, certificadoPfx, certificadoClave] = await Promise.all([
    leerSecreto(ctx, integ.id, "api_key"),
    leerSecreto(ctx, integ.id, "certificado_pfx"),
    leerSecreto(ctx, integ.id, "certificado_clave"),
  ]);
  if (!apiKey || !certificadoPfx || !certificadoClave) return null;
  return { apiKey, certificadoPfx, certificadoClave };
}

/** Adaptador SII efectivo del tenant (simulado en test; SimpleAPI si está configurado). */
export async function adaptadorSiiDe(ctx: Contexto): Promise<AdaptadorSii> {
  if (process.env.NODE_ENV === "test" || process.env.SII_ADAPTADOR === "simulado") {
    return adaptadorSiiSimulado();
  }
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  const proveedor = cfg?.emisionProveedor ?? "simulado";
  if (proveedor === "simulado") return adaptadorSiiSimulado();
  const creds = await credencialesSimpleApi(ctx);
  return adaptadorSimpleApi(creds);
}
