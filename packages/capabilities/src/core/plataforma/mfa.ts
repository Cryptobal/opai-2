import { z } from "zod";

import { COMUNICABLES_NUCLEO, PERMISOS_PLATAFORMA, renderizarCorreo } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { requierePlataforma, usuarioResponsable } from "../comun";
import { emailSchema } from "../esquemas";

/**
 * Restablece (apaga) el segundo factor de un usuario de cualquier empresa (CAR-54, I-15): la otra
 * vía de recuperación de MFA, para cuando no queda un owner de esa empresa disponible. Irreversible,
 * solo personas (soloPersonas bloquea a cualquier agente antes del handler, también en vista
 * previa: ADR-034); sin oráculo de qué cuentas existen; nunca sobre uno mismo. Además de la
 * auditoría global automática de `platform.*` (CAR-36), deja un hecho explícito en el registro de
 * seguridad (CAR-42): esta acción es sobre la cuenta de una persona, no sobre una empresa. Avisa a
 * la persona por correo directo (sin tenant, como la recuperación de contraseña).
 */
export const platformUsersMfaRestablecer = defineCapability({
  id: "platform.users.mfa_restablecer",
  descripcion:
    "Plataforma: restablece (apaga) el segundo factor de un usuario de cualquier empresa que perdió su teléfono y sus códigos de respaldo, cuando no queda un owner de esa empresa disponible.",
  permiso: PERMISOS_PLATAFORMA.usersManage,
  sinTenant: true,
  soloPersonas: true,
  input: z.object({ email: emailSchema }),
  output: z.object({ id: z.string(), restablecido: z.boolean() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    requierePlataforma(ctx);
    const responsable = usuarioResponsable(ctx);
    const u = await ctx.db.user.findUnique({
      where: { email: input.email },
      select: { id: true, name: true, email: true, twoFactorEnabled: true },
    });
    if (u?.id === responsable) {
      throw prohibido("No puedes restablecer tu propio segundo factor aquí: usa Mi cuenta.");
    }
    if (!u) throw noEncontrado("El usuario");
    if (dryRun) return { id: u.id, restablecido: u.twoFactorEnabled };
    if (!u.twoFactorEnabled) throw reglaDeNegocio("Ese usuario no tiene el segundo factor activo.");
    await ctx.identidad.restablecerMfa(u.id, ctx.db);
    await ctx.identidad.auditarSeguridad(
      {
        capability: "platform.users.mfa_restablecer",
        actorId: responsable,
        entityId: u.id,
        ipCifrada: null,
        userAgent: null,
      },
      ctx.db,
    );
    const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.mfa_restablecida");
    if (e?.plantillas.correo) {
      const r = renderizarCorreo(
        e,
        e.plantillas.correo,
        {
          usuario: { nombre: u.name },
          responsable: "Plataforma OPAI",
          url: `${ctx.servicios.urlBase}/mi-cuenta`,
        },
        { nombre: "OPAI" },
      );
      await ctx.servicios.correo
        .enviar({ para: u.email, asunto: r.asunto, texto: r.texto, html: r.html })
        .catch((error: unknown) => {
          const motivo = error instanceof Error ? error.message : "error desconocido";
          console.error(`[correo] no se avisó el restablecimiento de MFA: ${motivo}`);
        });
    }
    return { id: u.id, restablecido: true };
  },
});
