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
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!integ || !cfg?.resolucionSiiNumero || !cfg.resolucionSiiFecha) return null;
  const [apiKey, certificadoPfx, certificadoClave] = await Promise.all([
    leerSecreto(ctx, integ.id, "api_key"),
    leerSecreto(ctx, integ.id, "certificado_pfx"),
    leerSecreto(ctx, integ.id, "certificado_clave"),
  ]);
  if (!apiKey || !certificadoPfx || !certificadoClave) return null;
  const tenant = await ctx.db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { nombre: true },
  });
  return {
    apiKey,
    certificadoPfxBase64: certificadoPfx,
    certificadoClave,
    resolucionNumero: cfg.resolucionSiiNumero,
    resolucionFecha: cfg.resolucionSiiFecha.toISOString().slice(0, 10),
    ...(tenant?.nombre ? { razonSocialEmisor: tenant.nombre } : {}),
  };
}

/** Adaptador SII efectivo del tenant (simulado en test; SimpleAPI v1 si está configurado). */
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
