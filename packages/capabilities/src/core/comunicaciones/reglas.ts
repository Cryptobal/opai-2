import { z } from "zod";

import { PERMISOS_CORE, ROLES } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { eventoComunicable } from "./plantillas";

const reglaSchema = z.object({
  evento: z.string(),
  canal: z.enum(["correo", "inapp"]),
  roles: z.array(z.enum(ROLES)).describe("Roles que reciben el aviso."),
  usuarios: z.array(z.uuid()).describe("Usuarios específicos (además de los roles)."),
  activa: z.boolean(),
});

export const notificacionReglasList = defineCapability({
  id: "core.notificacion_reglas.list",
  descripcion:
    "Reglas de avisos de la empresa: por evento y canal, qué roles o usuarios reciben y si está activa. Sin regla activa, el evento no se comunica.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: z.object({ evento: z.string().optional() }),
  output: z.array(reglaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.notificacionRegla.findMany({
      where: input.evento ? { evento: input.evento } : {},
      orderBy: [{ evento: "asc" }, { canal: "asc" }],
    });
    return filas.map((r) => ({
      evento: r.evento,
      canal: r.canal as "correo" | "inapp",
      roles: r.destinatariosRoles as (typeof ROLES)[number][],
      usuarios: r.destinatariosUsuarios,
      activa: r.activa,
    }));
  },
});

export const notificacionReglasSet = defineCapability({
  id: "core.notificacion_reglas.set",
  descripcion:
    "Crea o cambia la regla de un evento y canal: roles y usuarios que reciben el aviso, y si está activa. Los eventos transaccionales no usan reglas.",
  permiso: PERMISOS_CORE.comunicacionesManage,
  input: reglaSchema,
  output: reglaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const e = eventoComunicable(input.evento);
    if (e.transaccional)
      throw reglaDeNegocio(`${e.nombre} es transaccional: siempre va a su destinatario.`);
    if (!e.plantillas[input.canal])
      throw reglaDeNegocio(`${e.nombre} no se envía por ${input.canal}.`);
    if (input.activa && !input.roles.length && !input.usuarios.length) {
      throw reglaDeNegocio("Una regla activa necesita al menos un rol o un usuario.");
    }
    if (input.usuarios.length) {
      const miembros = await ctx.db.membership.count({
        where: { userId: { in: input.usuarios }, estado: "activa" },
      });
      if (miembros !== new Set(input.usuarios).size)
        throw reglaDeNegocio("Hay usuarios sin membresía activa en la empresa.");
    }
    if (dryRun) return input;
    const datos = {
      destinatariosRoles: input.roles,
      destinatariosUsuarios: input.usuarios,
      activa: input.activa,
    };
    await ctx.db.notificacionRegla.upsert({
      where: {
        tenantId_evento_canal: { tenantId: ctx.tenantId, evento: e.evento, canal: input.canal },
      },
      create: { ...datos, tenantId: ctx.tenantId, evento: e.evento, canal: input.canal },
      update: datos,
    });
    return input;
  },
});
