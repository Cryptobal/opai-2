import { z } from "zod";

import {
  esRolPlataforma,
  PERMISOS_PLATAFORMA,
  ROLES_PLATAFORMA,
  tienePermisoPlataforma,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido, reglaDeNegocio } from "../../errores";
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

const NO_ASIGNABLE = "No se puede asignar un rol de plataforma a ese correo.";

/**
 * Asigna o quita el `platformRole` de un usuario existente (ADR-055). Es irreversible para un agente:
 * sin autonomía "directo" queda en la cola de aprobaciones de plataforma (CAR-36), y la aprobación se
 * ejecuta con los permisos de quien aprueba. La escritura en `core.users` y su auditoría de
 * plataforma van en la misma transacción (ADR-052), fuera de la cadena de cualquier empresa.
 */
export const platformUsersSetRole = defineCapability({
  id: "platform.users.set_role",
  descripcion:
    "Plataforma: asigna el rol de plataforma (owner o support) a un usuario existente, o lo quita con null. No cambia el propio rol.",
  permiso: PERMISOS_PLATAFORMA.rolesManage,
  // Sin empresa: `core.users` no tiene RLS y la auditoría es la global (CAR-36), no la de una empresa.
  sinTenant: true,
  input: z.object({ email: emailSchema, platformRole: z.enum(ROLES_PLATAFORMA).nullable() }),
  output: usuarioPlataformaSchema.extend({
    id: z.string().nullable().describe("null en la vista previa de un agente."),
    nombre: z.string().nullable(),
    anterior: z.enum(ROLES_PLATAFORMA).nullable(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const responsable = usuarioResponsable(ctx);
    // La vista previa de un agente no consulta el correo: no es un oráculo de qué cuentas existen.
    if (dryRun && ctx.actor.tipo === "agent")
      return {
        id: null,
        nombre: null,
        email: input.email,
        platformRole: input.platformRole,
        anterior: null,
      };
    // `ctx.db` es la transacción de la escritura (con su auditoría): `core.users` no tiene RLS.
    const u = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (u?.id === responsable) {
      throw prohibido("Nadie cambia su propio rol de plataforma; pídeselo a otro owner.");
    }
    // Mismo mensaje exista o no la cuenta: la respuesta no permite enumerar correos.
    if (!u) throw reglaDeNegocio(NO_ASIGNABLE);
    const salida = { id: u.id, nombre: u.name, email: u.email, platformRole: input.platformRole };
    if (dryRun)
      return { ...salida, anterior: esRolPlataforma(u.platformRole) ? u.platformRole : null };
    // Todo cambio de rol se serializa con `SELECT … FOR UPDATE` sobre los owners (sin tocar
    // `updated_at`): dos bajas cruzadas esperan una a la otra y la segunda recuenta ya con la primera
    // confirmada. Tras el lock se vuelve a comprobar que quien lo pide SIGUE siendo owner (si otro
    // owner le quitó el rol mientras esperaba, no completa el cambio) y se relee al objetivo.
    const vigente = await p.globales.bloquearOwnersDePlataforma(ctx.db, responsable);
    if (
      !esRolPlataforma(vigente) ||
      !tienePermisoPlataforma(vigente, PERMISOS_PLATAFORMA.rolesManage)
    )
      throw prohibido("Tu rol de plataforma cambió: ya no puedes asignar roles de plataforma.");
    const actual = await ctx.db.user.findUnique({ where: { id: u.id } });
    if (!actual) throw reglaDeNegocio(NO_ASIGNABLE);
    const anterior = esRolPlataforma(actual.platformRole) ? actual.platformRole : null;
    if (anterior === input.platformRole) return { ...salida, anterior };
    // Antes de escribir (no después): si la ejecución comparte una transacción mayor (al aprobar),
    // un error tras el UPDATE no lo desharía. Con el lock tomado, el conteo ya es el vigente.
    if (
      anterior === "owner" &&
      (await ctx.db.user.count({ where: { platformRole: "owner" } })) <= 1
    )
      throw reglaDeNegocio("OPAI debe conservar al menos un owner de plataforma.");
    await ctx.db.user.update({ where: { id: u.id }, data: { platformRole: input.platformRole } });
    return { ...salida, anterior };
  },
});
