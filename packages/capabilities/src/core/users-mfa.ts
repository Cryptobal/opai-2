import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../define";
import { prohibido, reglaDeNegocio } from "../errores";
import { enviarCorreo } from "./comunicaciones/envio";
import { usuarioResponsable } from "./comun";
import { uuidSchema } from "./esquemas";
import { buscar } from "./users-miembro";

/**
 * Restablece (apaga) el segundo factor de un usuario de la empresa (CAR-54, I-15): un owner que
 * perdió el teléfono y sus códigos de respaldo queda fuera sin este camino. Irreversible, solo
 * owner (nunca admin, como aceptar el DPA) y nunca sobre uno mismo (self-service en Mi cuenta, con
 * la contraseña). Queda en `audit_events` de la empresa (automático, ADR-052) y, explícito, en el
 * registro de seguridad global (CAR-42): es un cambio sobre la cuenta de una persona, no solo sobre
 * los datos de la empresa. Avisa al usuario por correo.
 */
export const usersMfaRestablecer = defineCapability({
  id: "core.users.mfa_restablecer",
  descripcion:
    "Restablece (apaga) el segundo factor de un usuario de la empresa que perdió su teléfono y sus códigos de respaldo. Solo un owner; el usuario deberá activarlo de nuevo.",
  permiso: PERMISOS_CORE.usersMfaReset,
  soloPersonas: true,
  input: z.object({ membershipId: uuidSchema }),
  output: z.object({ restablecido: z.boolean(), nombre: z.string(), email: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (ctx.rol !== "owner") {
      throw prohibido("Restablecer el segundo factor de otro usuario es un acto del propietario.");
    }
    const objetivo = await buscar(ctx, input.membershipId);
    const responsable = usuarioResponsable(ctx);
    if (objetivo.userId === responsable) {
      throw prohibido("No puedes restablecer tu propio segundo factor aquí: usa Mi cuenta.");
    }
    if (dryRun) {
      return { restablecido: objetivo.mfaActiva, nombre: objetivo.nombre, email: objetivo.email };
    }
    if (!objetivo.mfaActiva) {
      throw reglaDeNegocio("Ese usuario no tiene el segundo factor activo.");
    }
    await ctx.identidad.restablecerMfa(objetivo.userId, ctx.db);
    await ctx.identidad.auditarSeguridad(
      {
        capability: "core.users.mfa_restablecer",
        actorId: responsable,
        entityId: objetivo.userId,
        ipCifrada: null,
        userAgent: null,
      },
      ctx.db,
    );
    await enviarCorreo(
      {
        db: ctx.db,
        tenantId: ctx.tenantId,
        correo: ctx.servicios.correo,
        urlBase: ctx.servicios.urlBase,
      },
      "core.usuario.mfa_restablecida",
      objetivo.email,
      {
        usuario: { nombre: objetivo.nombre },
        responsable: `${ctx.usuario?.nombre ?? "Un owner"} (owner)`,
        url: `${ctx.servicios.urlBase}/mi-cuenta`,
      },
    );
    return { restablecido: true, nombre: objetivo.nombre, email: objetivo.email };
  },
});
