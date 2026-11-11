import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";
import type { TenantTx } from "@opai/db";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import {
  bloquearVigente,
  contarMiembros,
  exigeGestionDeGrupos,
  grupoSchema,
  grupoVigente,
  vistaGrupo,
} from "./comun";
import { exigeElegibles, sinMiembroAjeno } from "./elegibles";

const salidaMiembros = z.object({
  grupo: grupoSchema,
  /** Usuarios que entraron al grupo con esta operación. */
  agregados: z.array(z.string()),
  /** Usuarios que ya eran miembros (no se duplican). */
  yaEstaban: z.array(z.string()),
});

type Lector = Pick<TenantTx, "grupoUsuarioMiembro">;

/** Separa lo pedido en quienes entran y quienes ya eran miembros del grupo. */
async function separar(db: Lector, grupoId: string, pedidos: string[]) {
  const existentes = await db.grupoUsuarioMiembro.findMany({
    where: { grupoId, userId: { in: pedidos } },
    select: { userId: true },
  });
  const yaEstaban = existentes.map((m) => m.userId);
  return { agregados: pedidos.filter((u) => !yaEstaban.includes(u)), yaEstaban };
}

export const gruposMiembrosAdd = defineCapability({
  id: "core.grupos.agregar_miembros",
  descripcion:
    "Agrega uno o más usuarios activos de la empresa (con acceso al ERP) a un grupo o equipo vigente. Quien ya es miembro no se duplica. Solo owner o administrador.",
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
  // La auditoría guarda el efecto real (agregados y ya presentes), no solo lo pedido.
  auditoriaPayload: (_ctx, e, s) => ({
    grupoId: e.grupoId,
    agregados: s.agregados,
    yaEstaban: s.yaEstaban,
  }),
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeGrupos(ctx);
    const grupo = await grupoVigente(ctx, input.grupoId);
    const pedidos = [...new Set(input.userIds)];
    await exigeElegibles(ctx, pedidos);
    const previo = await separar(ctx.db, grupo.id, pedidos);
    const antes = await contarMiembros(ctx, grupo.id);
    if (dryRun || previo.agregados.length === 0) {
      const total = antes + (dryRun ? previo.agregados.length : 0);
      return { grupo: vistaGrupo(grupo, total), ...previo };
    }
    return sinMiembroAjeno(
      ctx.transaccion(async (tx) => {
        await bloquearVigente(tx, grupo.id);
        // Con el lock tomado se recalcula: dos altas simultáneas del mismo usuario no lo informan
        // (ni lo auditan ni emiten evento) dos veces como agregado.
        const real = await separar(tx, grupo.id, pedidos);
        if (real.agregados.length) {
          await tx.grupoUsuarioMiembro.createMany({
            data: real.agregados.map((userId) => ({
              tenantId: ctx.tenantId,
              grupoId: grupo.id,
              userId,
            })),
            skipDuplicates: true,
          });
          await ctx.eventos.emitir(tx, {
            tipo: "core.grupo.miembros_agregados",
            entidadTipo: "grupo_usuarios",
            entidadId: grupo.id,
            payload: { userIds: real.agregados },
          });
        }
        const total = await tx.grupoUsuarioMiembro.count({ where: { grupoId: grupo.id } });
        return { grupo: vistaGrupo(grupo, total), ...real };
      }),
    );
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
  auditoriaPayload: (_ctx, e) => ({ grupoId: e.grupoId, quitado: e.userId }),
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
      await bloquearVigente(tx, grupo.id);
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
