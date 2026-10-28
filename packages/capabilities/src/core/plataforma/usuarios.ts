import { z } from "zod";

import { esRolPlataforma, PERMISOS_PLATAFORMA, ROLES_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import { requierePlataforma, usuarioResponsable } from "../comun";
import { emailSchema } from "../esquemas";

const usuarioPlataformaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  email: z.string(),
  platformRole: z.enum(ROLES_PLATAFORMA).nullable(),
});

export const platformUsersList = defineCapability({
  id: "platform.users.list",
  descripcion:
    "Plataforma: usuarios con rol de plataforma (owner o support), con nombre, correo y rol. Sirve para revisar quién administra OPAI.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(usuarioPlataformaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await requierePlataforma(ctx).globales.usuariosDePlataforma();
    return filas.map((u) => ({
      id: u.id,
      nombre: u.name,
      email: u.email,
      platformRole: esRolPlataforma(u.platformRole) ? u.platformRole : null,
    }));
  },
});

/**
 * Asigna o quita el `platformRole` de un usuario existente (ADR-055). Es irreversible para un agente:
 * sin autonomía "directo" queda en la cola de aprobaciones, y la aprobación se ejecuta con los
 * permisos de quien aprueba. Exige empresa actual: la escritura en `core.users` y su auditoría van
 * en la misma transacción (ADR-052), en la cadena de la empresa desde la que se opera.
 */
export const platformUsersSetRole = defineCapability({
  id: "platform.users.set_role",
  descripcion:
    "Plataforma: asigna el rol de plataforma (owner o support) a un usuario existente, o lo quita con null. No cambia el propio rol.",
  permiso: PERMISOS_PLATAFORMA.rolesManage,
  input: z.object({ email: emailSchema, platformRole: z.enum(ROLES_PLATAFORMA).nullable() }),
  output: usuarioPlataformaSchema.extend({ anterior: z.enum(ROLES_PLATAFORMA).nullable() }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    requierePlataforma(ctx);
    // `ctx.db` es la transacción de la escritura (con su auditoría): `core.users` no tiene RLS.
    const u = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (!u) throw noEncontrado("El usuario");
    if (u.id === usuarioResponsable(ctx)) {
      throw prohibido("Nadie cambia su propio rol de plataforma; pídeselo a otro owner.");
    }
    const anterior = esRolPlataforma(u.platformRole) ? u.platformRole : null;
    const salida = {
      id: u.id,
      nombre: u.name,
      email: u.email,
      platformRole: input.platformRole,
      anterior,
    };
    if (dryRun || anterior === input.platformRole) return salida;
    // Quitar un owner se serializa: tomar el lock de fila de todos los owners antes del cambio hace
    // que dos bajas cruzadas esperen una a la otra; la segunda recuenta ya con la primera confirmada
    // (READ COMMITTED vuelve a evaluar el WHERE) y falla en vez de dejar cero owners.
    if (anterior === "owner")
      await ctx.db.user.updateMany({
        where: { platformRole: "owner" },
        data: { platformRole: "owner" },
      });
    await ctx.db.user.update({ where: { id: u.id }, data: { platformRole: input.platformRole } });
    const owners = await ctx.db.user.count({ where: { platformRole: "owner" } });
    if (owners === 0) throw reglaDeNegocio("OPAI debe conservar al menos un owner de plataforma.");
    return salida;
  },
});
