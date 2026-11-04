import {
  validarCertificadoPfx,
  type AlmacenSesionOctava,
  type CedenteOctava,
  type CredencialesOctava,
} from "@opai/integrations";

import { leerSecreto, guardarSecreto } from "../integraciones/secretos";
import type { Contexto } from "../types";

export type ConfigCesion = { emailCedente?: string; direccionCedente?: string; contactoNombre?: string; contactoEmail?: string };

/** usuario = RUT del integrador (empresa que contrató Octava); clave = su contraseña. Ambos cifrados por tenant. */
export async function integradorOctava(ctx: Contexto, integracionId: string): Promise<CredencialesOctava | null> {
  const [usuario, clave] = await Promise.all([
    leerSecreto(ctx, integracionId, "usuario"),
    leerSecreto(ctx, integracionId, "clave"),
  ]);
  return usuario && clave ? { usuario, clave } : null;
}

/** PassAccesoApi y token de Octava viven como secretos cifrados de la misma integración (sin columnas nuevas). */
export function almacenSesionOctava(ctx: Contexto, integracionId: string): AlmacenSesionOctava {
  return {
    leerPassAcceso: () => leerSecreto(ctx, integracionId, "pass_acceso_api"),
    async guardarPassAcceso(pass) {
      await guardarSecreto(ctx, integracionId, "pass_acceso_api", pass);
    },
    async leerToken() {
      const crudo = await leerSecreto(ctx, integracionId, "token_sesion");
      const [exp, ...resto] = (crudo ?? "").split("|");
      const token = resto.join("|");
      return token && Number(exp) > 0 ? { token, expiraEn: Number(exp) } : null;
    },
    async guardarToken(t) {
      await guardarSecreto(ctx, integracionId, "token_sesion", t ? `${t.expiraEn}|${t.token}` : "0|");
    },
  };
}

/** Certificado del cedente: el mismo .pfx de la emisión DTE. Null si el tenant aún no lo cargó. */
async function certificadoDeEmision(ctx: Contexto) {
  const emision = await ctx.db.integracion.findUnique({
    where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "dte_emision" } },
  });
  if (!emision) return null;
  const [pfx, clave] = await Promise.all([
    leerSecreto(ctx, emision.id, "certificado_pfx"),
    leerSecreto(ctx, emision.id, "certificado_clave"),
  ]);
  if (!pfx || !clave) return null;
  const { meta } = validarCertificadoPfx(pfx, clave);
  return { pfxBase64: pfx, clave, rutTitular: meta.rutTitular ?? "", nombreTitular: meta.titular };
}

export async function cedenteOctava(
  ctx: Contexto,
  config: ConfigCesion,
  rutEmisor: string,
  conCertificado: boolean,
): Promise<CedenteOctava> {
  const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
  const cert = conCertificado ? await certificadoDeEmision(ctx) : null;
  const email = config.emailCedente ?? ctx.usuario?.email ?? "";
  return {
    rut: rutEmisor,
    razonSocial: tenant?.nombre ?? "",
    direccion: config.direccionCedente ?? "",
    email,
    contactoNombre: config.contactoNombre ?? ctx.usuario?.nombre ?? "",
    contactoEmail: config.contactoEmail ?? email,
    rutTitular: cert?.rutTitular ?? "",
    nombreTitular: cert?.nombreTitular ?? "",
    certificado: cert ? { pfxBase64: cert.pfxBase64, clave: cert.clave } : null,
  };
}
