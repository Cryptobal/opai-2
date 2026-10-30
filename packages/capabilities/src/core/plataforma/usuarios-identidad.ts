import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { requierePlataforma, usuarioResponsable } from "../comun";
import { emailSchema } from "../esquemas";
import { restablecerYAvisar, restablecimientoSchema } from "../users-mfa";

// Operaciones de Plataforma sobre la identidad global (CAR-54, CAR-45). Solo personas y solo el owner
// de plataforma (`platform:roles.manage`): sin empresa, auditadas en la cadena `plataforma` de la
// auditoría global (CAR-36) en la misma transacción que la escritura.

const NO_ENCONTRADO = "No hay un usuario con ese correo.";

async function usuarioPorCorreo(ctx: Contexto, email: string) {
  requierePlataforma(ctx);
  const u = await ctx.db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, name: true, email: true, platformRole: true, twoFactorEnabled: true },
  });
  if (!u) throw reglaDeNegocio(NO_ENCONTRADO);
  if (u.id === usuarioResponsable(ctx))
    throw prohibido("No puedes hacerlo sobre tu propia cuenta.");
  return u;
}

export const platformUsuariosRestablecerMfa = defineCapability({
  id: "platform.usuarios.restablecer_mfa",
  // Solo personas (CAR-54): quitar el segundo factor de una cuenta lo decide un humano con sesión.
  soloPersonas: true,
  descripcion:
    "Plataforma · IRREVERSIBLE: restablece el segundo factor de cualquier usuario que perdió su teléfono y sus códigos (también owners de varias empresas): borra su enrolamiento, cierra sus sesiones y le avisa por correo.",
  permiso: PERMISOS_PLATAFORMA.rolesManage,
  sinTenant: true,
  input: z.object({ email: emailSchema }),
  output: restablecimientoSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const u = await usuarioPorCorreo(ctx, input.email);
    if (!u.twoFactorEnabled) throw reglaDeNegocio("Ese usuario no tiene el segundo factor activo.");
    if (dryRun) return { userId: u.id, nombre: u.name, email: u.email, sesionesCerradas: 0 };
    return restablecerYAvisar(ctx, u, "Plataforma OPAI", {
      // Repite la condición bajo el lock de `core.users` (CAR-54, carrera §I-15): pudo desactivar
      // su MFA entre la vista previa y este punto.
      reverificar: (fresco) => {
        if (!fresco.twoFactorEnabled) {
          throw reglaDeNegocio("Ese usuario no tiene el segundo factor activo.");
        }
      },
    });
  },
});

export const platformUsuariosBorrar = defineCapability({
  id: "platform.usuarios.borrar",
  // Solo personas (CAR-45): borrar una identidad es irreversible y lo decide un humano.
  soloPersonas: true,
  descripcion:
    "Plataforma · IRREVERSIBLE: borra la cuenta de un usuario que ya no pertenece a ninguna empresa (sin membresías ni API keys) y sin rol de plataforma, con sus sesiones y su segundo factor.",
  permiso: PERMISOS_PLATAFORMA.rolesManage,
  sinTenant: true,
  input: z.object({ email: emailSchema }),
  output: z.object({ userId: z.string(), nombre: z.string(), email: z.string() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const u = await usuarioPorCorreo(ctx, input.email);
    if (u.platformRole)
      throw reglaDeNegocio("Tiene rol de plataforma: quítaselo antes de borrarlo.");
    const salida = { userId: u.id, nombre: u.name, email: u.email };
    if (dryRun) return salida;
    const r = await ctx.transaccion((tx) => ctx.identidad.borrarUsuario(tx, u.id));
    if (r === "con_referencias") {
      throw reglaDeNegocio(
        "Todavía pertenece a una empresa o tiene API keys: quítalo de cada empresa y revoca sus keys antes de borrarlo.",
      );
    }
    if (r === "plataforma")
      throw reglaDeNegocio("Tiene rol de plataforma: quítaselo antes de borrarlo.");
    if (r === "inexistente") throw reglaDeNegocio(NO_ENCONTRADO);
    return salida;
  },
});
