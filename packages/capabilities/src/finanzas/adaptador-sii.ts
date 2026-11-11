import {
  abrirCertificadoPfx,
  adaptadorSimpleApi,
  adaptadorSiiSimulado,
  type AdaptadorSii,
  type CredencialesSimpleApi,
} from "@opai/integrations";

import { leerSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

export async function credencialesSimpleApi(ctx: Contexto): Promise<CredencialesSimpleApi | null> {
  const integ = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
  });
  const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
  // La resolución 0 es válida en certificación (el SII la asigna así a los emisores en proceso de certificarse).
  if (!integ || !cfg?.rutEmisor || cfg.resolucionSiiNumero == null || !cfg.resolucionSiiFecha) return null;
  const [apiKey, certificadoPfx, certificadoClave] = await Promise.all([
    leerSecreto(ctx, integ.id, "api_key"),
    leerSecreto(ctx, integ.id, "certificado_pfx"),
    leerSecreto(ctx, integ.id, "certificado_clave"),
  ]);
  if (!apiKey || !certificadoPfx || !certificadoClave) return null;
  // RUT del titular del certificado (`Certificado.Rut`): sale del propio .pfx como `extractRut` de 1.0, ya sin puntos
  // y con el DV en mayúscula; nunca el de la empresa. La clave va recortada si así abre el .pfx (CAR-240).
  let certificado: ReturnType<typeof abrirCertificadoPfx>;
  try {
    certificado = abrirCertificadoPfx(certificadoPfx, certificadoClave);
  } catch {
    return null;
  }
  if (!certificado.meta.rutTitular) return null;
  return {
    apiKey,
    certificadoPfxBase64: certificadoPfx,
    certificadoClave: certificado.clave,
    certificadoRut: certificado.meta.rutTitular,
    rutEmpresa: cfg.rutEmisor.replace(/\./g, "").toUpperCase(),
    resolucionNumero: cfg.resolucionSiiNumero,
    resolucionFecha: cfg.resolucionSiiFecha.toISOString().slice(0, 10),
    ...(await datosEmisorSimpleApi(ctx)),
  };
}

/**
 * Datos del emisor para el encabezado del DTE: los del perfil de la empresa (Configuración › Empresa). El ACTECO es el
 * principal de la empresa (CAR-243), no el de la configuración DTE. Solo van los que existen; nunca se inventan.
 */
export async function datosEmisorSimpleApi(ctx: Contexto): Promise<
  Partial<Pick<CredencialesSimpleApi, "razonSocialEmisor" | "giroEmisor" | "actecoEmisor" | "direccionEmisor" | "comunaEmisor" | "ciudadEmisor">>
> {
  const [tenant, perfil] = await Promise.all([
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } }),
    ctx.db.perfilEmpresa.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { razonSocial: true, giro: true, calle: true, comuna: true, ciudad: true, actecoPrincipal: true },
    }),
  ]);
  const razonSocial = perfil?.razonSocial?.trim() || tenant?.nombre;
  return {
    ...(razonSocial ? { razonSocialEmisor: razonSocial } : {}),
    ...(perfil?.giro?.trim() ? { giroEmisor: perfil.giro.trim() } : {}),
    ...(perfil?.actecoPrincipal ? { actecoEmisor: perfil.actecoPrincipal } : {}),
    ...(perfil?.calle?.trim() ? { direccionEmisor: perfil.calle.trim() } : {}),
    ...(perfil?.comuna?.trim() ? { comunaEmisor: perfil.comuna.trim() } : {}),
    ...(perfil?.ciudad?.trim() ? { ciudadEmisor: perfil.ciudad.trim() } : {}),
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
