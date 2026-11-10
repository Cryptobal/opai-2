import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import {
  contarMiembros,
  exigeGestionDeGrupos,
  grupoSchema,
  grupoVigente,
  vistaGrupo,
} from "./comun";

const salidaMiembros = z.object({
  grupo: grupoSchema,
  /** Usuarios que entraron al grupo con esta operación. */
  agregados: z.array(z.string()),
  /** Usuarios que ya eran miembros (no se duplican). */
  yaEstaban: z.array(z.string()),
});

export const gruposMiembrosAdd = defineCapability({
  id: "core.grupos.agregar_miembros",
  descripcion:
    "Agrega uno o más usuarios de la empresa a un grupo o equipo vigente. Quien ya es miembro no se duplica. Solo owner o administrador.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    grupoId: uuidSchema.describe("Id del grupo."),
    userIds: z
      .array(uuidSchema)
      .min(1)
      .max(100)
      .describe("Usuarios (id de usuario) de la empresa."),
  }),
  output: salidaMiembros,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    const grupo = await grupoVigente(ctx, input.grupoId);
    const pedidos = [...new Set(input.userIds)];
    // Solo usuarios con membresía en ESTA empresa (la RLS acota; la FK compuesta lo vuelve a exigir).
    const miembrosEmpresa = await ctx.db.membership.findMany({
      where: { userId: { in: pedidos } },
      select: { userId: true },
    });
    const validos = new Set(miembrosEmpresa.map((m) => m.userId));
    const ajenos = pedidos.filter((u) => !validos.has(u));
    if (ajenos.length) {
      throw reglaDeNegocio(
        ajenos.length === 1
          ? "Ese usuario no es miembro de la empresa."
          : `${ajenos.length} usuarios no son miembros de la empresa.`,
        { userIds: ajenos },
      );
    }
    const existentes = await ctx.db.grupoUsuarioMiembro.findMany({
      where: { grupoId: grupo.id, userId: { in: pedidos } },
      select: { userId: true },
    });
    const yaEstaban = existentes.map((m) => m.userId);
    const agregados = pedidos.filter((u) => !yaEstaban.includes(u));
    const antes = await contarMiembros(ctx, grupo.id);
    const salida = (total: number) => ({ grupo: vistaGrupo(grupo, total), agregados, yaEstaban });
    if (dryRun || agregados.length === 0) return salida(antes + (dryRun ? agregados.length : 0));
    const total = await ctx.transaccion(async (tx) => {
      await tx.grupoUsuarioMiembro.createMany({
        data: agregados.map((userId) => ({ tenantId: ctx.tenantId, grupoId: grupo.id, userId })),
        skipDuplicates: true,
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.grupo.miembros_agregados",
        entidadTipo: "grupo_usuarios",
        entidadId: grupo.id,
        payload: { userIds: agregados },
      });
      return tx.grupoUsuarioMiembro.count({ where: { grupoId: grupo.id } });
    });
    return salida(total);
  },
});

export const gruposMiembrosRemove = defineCapability({
  id: "core.grupos.quitar_miembro",
  descripcion:
    "Quita a un usuario de un grupo o equipo vigente. No toca su acceso a la empresa. Solo owner o administrador.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    grupoId: uuidSchema.describe("Id del grupo."),
    userId: uuidSchema.describe("Id del usuario a quitar."),
  }),
  output: z.object({ grupo: grupoSchema, quitado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    const grupo = await grupoVigente(ctx, input.grupoId);
    const fila = await ctx.db.grupoUsuarioMiembro.findUnique({
      where: { grupoId_userId: { grupoId: grupo.id, userId: input.userId } },
      select: { id: true },
    });
    if (!fila) throw noEncontrado("Ese miembro del grupo");
    const antes = await contarMiembros(ctx, grupo.id);
    if (dryRun) return { grupo: vistaGrupo(grupo, antes - 1), quitado: input.userId };
    const total = await ctx.transaccion(async (tx) => {
      await tx.grupoUsuarioMiembro.delete({ where: { id: fila.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "core.grupo.miembro_quitado",
        entidadTipo: "grupo_usuarios",
        entidadId: grupo.id,
        payload: { userId: input.userId },
      });
      return tx.grupoUsuarioMiembro.count({ where: { grupoId: grupo.id } });
    });
    return { grupo: vistaGrupo(grupo, total), quitado: input.userId };
  },
});
