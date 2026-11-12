import { z } from "zod";

import { COMUNICABLES_NUCLEO, PERMISOS_CORE, renderizarCorreo } from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { usuarioResponsable } from "./comun";
import { uuidSchema } from "./esquemas";
import { buscar } from "./users-miembro";

/** Lo que devuelven las capacidades de restablecer el segundo factor (CAR-54). */
export const restablecimientoSchema = z.object({
  userId: z.string(),
  nombre: z.string(),
  email: z.string(),
  /** Sesiones cerradas; 0 en la vista previa. */
  sesionesCerradas: z.number().int(),
});

/**
 * Restablece el segundo factor en la transacción de la escritura (con su auditoría) y, después del
 * COMMIT, le avisa a la persona por correo. El aviso usa la marca de OPAI, como la recuperación de
 * contraseña: es un correo de identidad, no de la empresa. Nunca rompe la ejecución.
 */
export async function restablecerYAvisar(
  ctx: Contexto,
  u: { id: string; name: string; email: string },
  por: string,
) {
  const r = await ctx.transaccion((tx) => ctx.identidad.restablecerSegundoFactor(tx, u.id));
  const urlBase = ctx.servicios.urlBase;
  ctx.diferir(async () => {
    const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.mfa_restablecido");
    if (!e?.plantillas.correo) return;
    const datos = { usuario: { nombre: u.name }, por, url: `${urlBase}/login` };
    const c = renderizarCorreo(e, e.plantillas.correo, datos, { nombre: "OPAI" });
    await ctx.servicios.correo.enviar({
      para: u.email,
      asunto: c.asunto,
      texto: c.texto,
      html: c.html,
    });
  });
  return { userId: u.id, nombre: u.name, email: u.email, sesionesCerradas: r.sesiones };
}

/**
 * El owner de una empresa restablece el MFA de alguien de su empresa que perdió el teléfono y los
 * códigos de respaldo (CAR-54, auditoría del Núcleo §I-15). Solo personas. No alcanza a quien tiene
 * rol de plataforma ni a quien es miembro de otra empresa: quitarle el segundo factor debilitaría su
 * acceso a empresas que este owner no administra. Esos casos los resuelve Plataforma.
 */
export const usersRestablecerMfa = defineCapability({
  id: "core.users.restablecer_mfa",
  // Solo personas (CAR-54): quitar el segundo factor de otra cuenta lo decide un humano con sesión.
  soloPersonas: true,
  descripcion:
    "Restablece el segundo factor (MFA) de un usuario de la empresa que perdió su teléfono y sus códigos: borra su enrolamiento, cierra sus sesiones y le avisa por correo. Debe configurarlo de nuevo al entrar.",
  permiso: PERMISOS_CORE.ownersManage,
  input: z.object({ membershipId: uuidSchema }),
  output: restablecimientoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    // Solo el rol base owner, no un rol personalizado o una excepción con `core:owners.manage` (H7):
    // quitarle el MFA a otro owner no se delega.
    if (ctx.rol !== "owner") throw prohibido("Solo un owner puede restablecer el segundo factor.");
    const objetivo = await buscar(ctx, input.membershipId);
    if (objetivo.userId === usuarioResponsable(ctx)) {
      throw prohibido("No puedes restablecer tu propio segundo factor: usa un código de respaldo.");
    }
    const u = await ctx.db.user.findUnique({
      where: { id: objetivo.userId },
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        twoFactorEnabled: true,
        passkeyEnabled: true,
      },
    });
    if (!u) throw noEncontrado("El usuario");
    if (u.platformRole) {
      throw prohibido(
        "Es un usuario de Plataforma: solo Plataforma puede restablecer su segundo factor.",
      );
    }
    if (await ctx.identidad.enOtrasEmpresas(u.id, ctx.tenantId)) {
      throw prohibido(
        "Tiene acceso a otras empresas en OPAI: pídele a Plataforma que lo restablezca.",
      );
    }
    if (!u.twoFactorEnabled && !u.passkeyEnabled)
      throw reglaDeNegocio("Ese usuario no tiene el segundo factor activo.");
    if (dryRun) return { userId: u.id, nombre: u.name, email: u.email, sesionesCerradas: 0 };
    return restablecerYAvisar(ctx, u, "Un owner de tu empresa");
  },
});
