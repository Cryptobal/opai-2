import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { hashToken } from "./comun-flujo";

/** Persona activa vinculada al usuario de la sesión (portal, firma en sesión). */
export async function personaDelUsuario(ctx: Contexto): Promise<string | null> {
  if (ctx.actor.tipo !== "user") return null;
  const p = await ctx.db.persona.findFirst({
    where: {
      tenantId: ctx.tenantId,
      usuarioId: ctx.actor.id,
      archivadaEn: null,
      anonimizadaEn: null,
    },
    select: { id: true },
  });
  return p?.id ?? null;
}

type FirmanteFila = {
  id: string;
  solicitudId: string;
  orden: number;
  rol: string;
  tipo: string;
  nombre: string;
  usuarioId: string | null;
  estado: string;
  tokenExpira: Date | null;
};

/**
 * Resuelve quién firma: por el enlace personal (token hasheado, R12) o por la sesión de un usuario
 * del tenant (firmante de tipo `usuario`, p. ej. el representante en el ERP). Nunca por un id del
 * cuerpo: el token es la credencial y la sesión se valida contra `usuario_id`.
 */
export async function resolverFirmante(
  ctx: Contexto,
  input: { token?: string | undefined; solicitudId?: string | undefined },
): Promise<FirmanteFila> {
  if (input.token) {
    const f = await ctx.db.firmante.findFirst({
      where: { tenantId: ctx.tenantId, tokenHash: hashToken(input.token) },
    });
    if (!f) throw prohibido("El enlace de firma no es válido.");
    if (f.tokenExpira && f.tokenExpira.getTime() < Date.now())
      throw prohibido("El enlace de firma venció.");
    return f;
  }
  if (input.solicitudId) {
    if (ctx.actor.tipo !== "user") throw reglaDeNegocio("Firma en sesión requiere un usuario.");
    const personaId = await personaDelUsuario(ctx);
    const f = await ctx.db.firmante.findFirst({
      where: {
        tenantId: ctx.tenantId,
        solicitudId: input.solicitudId,
        OR: [
          { tipo: "usuario", usuarioId: ctx.actor.id },
          ...(personaId ? [{ personaId }] : []),
        ],
      },
    });
    if (!f) throw prohibido("No figuras como firmante de esta solicitud.");
    return f;
  }
  throw prohibido("Falta el enlace personal o la sesión del firmante.");
}

/** Firmante autenticado y solicitud viva del mismo tenant (ver_firmante, documento_url). */
export async function resolverFirmanteYSolicitud(
  ctx: Contexto,
  input: { token?: string; solicitudId?: string },
) {
  const firmante = await resolverFirmante(ctx, input);
  const solicitud = await ctx.db.solicitudFirma.findFirst({
    where: { tenantId: ctx.tenantId, id: firmante.solicitudId },
  });
  if (!solicitud) throw noEncontrado("La solicitud de firma");
  return { firmante, solicitud };
}

/**
 * En modo secuencial, a cada firmante le toca cuando ya firmaron todos los de orden anterior (R7).
 * En paralelo, siempre puede. Los firmantes de copia no cuentan.
 */
export function esSuTurno(
  orden: string,
  firmantes: readonly { orden: number; rol: string; estado: string }[],
  firmante: { orden: number },
): boolean {
  if (orden === "paralelo") return true;
  const previos = firmantes.filter((f) => f.rol === "firma" && f.orden < firmante.orden);
  return previos.every((f) => f.estado === "firmado");
}
