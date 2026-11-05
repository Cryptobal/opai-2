import type { AlmacenSesionOctava, CedenteOctava, CredencialesOctava } from "@opai/integrations";

import { leerSecreto, guardarSecretoTx } from "../integraciones/secretos";
import type { Contexto } from "../types";

export type ConfigCesion = { emailCedente?: string; direccionCedente?: string; contactoNombre?: string; contactoEmail?: string };

/** usuario = RUT de acceso a la API de Octava; clave = su contraseña (ObtenerToken). Ambos cifrados por tenant. */
export async function accesoOctava(ctx: Contexto, integracionId: string): Promise<CredencialesOctava | null> {
  const [usuario, clave] = await Promise.all([
    leerSecreto(ctx, integracionId, "usuario"),
    leerSecreto(ctx, integracionId, "clave"),
  ]);
  return usuario && clave ? { usuario, clave } : null;
}

/**
 * El token se guarda en una transacción independiente: Octava no entrega otro mientras haya uno activo (TDUP),
 * así que el ROLLBACK de una cesión que falla no debe llevárselo.
 */
const guardarDurable = (ctx: Contexto, integracionId: string, nombre: string, valor: string) =>
  ctx.transaccionIndependiente((tx) => guardarSecretoTx(tx, ctx, integracionId, nombre, valor));

/** El token de Octava vive como secreto cifrado de la misma integración (sin columnas nuevas). */
export function almacenSesionOctava(ctx: Contexto, integracionId: string): AlmacenSesionOctava {
  return {
    async leerToken() {
      const crudo = await leerSecreto(ctx, integracionId, "token_sesion");
      const [exp, ...resto] = (crudo ?? "").split("|");
      const token = resto.join("|");
      return token && Number(exp) > 0 ? { token, expiraEn: Number(exp) } : null;
    },
    async guardarToken(t) {
      await guardarDurable(ctx, integracionId, "token_sesion", t ? `${t.expiraEn}|${t.token}` : "0|");
    },
  };
}

export async function cedenteOctava(
  ctx: Contexto,
  config: ConfigCesion,
  rutEmisor: string,
): Promise<CedenteOctava> {
  const tenant = await ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { nombre: true } });
  const email = config.emailCedente ?? ctx.usuario?.email ?? "";
  return {
    rut: rutEmisor,
    razonSocial: tenant?.nombre ?? "",
    direccion: config.direccionCedente ?? "",
    email,
    contactoNombre: config.contactoNombre ?? ctx.usuario?.nombre ?? "",
    contactoEmail: config.contactoEmail ?? email,
  };
}
