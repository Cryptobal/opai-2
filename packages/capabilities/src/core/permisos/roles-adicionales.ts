// Roles adicionales de un miembro (CAR-359, referente GitHub): roles personalizados de la empresa que
// se SUMAN a su rol. Asignar o quitar gobierna acceso: solo personas, solo owner o admin, y nadie
// asigna un rol con permisos que él mismo no tiene (§16.2). Quitar nunca escala: solo resta.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { cursorDe, escribirConEvento, pagina, sinDuplicado } from "../maestros/comun";
import { membresiaDe } from "./asignaciones";
import { exigeGestionDeRoles, validarConcedibles } from "./comun";

/** Rol personalizado vigente de la empresa que el actor puede conceder entero. */
export async function rolConcedible(ctx: Contexto, roleId: string) {
  const rol = await ctx.db.rol.findUnique({ where: { id: roleId } });
  if (!rol) throw noEncontrado("El rol");
  if (rol.archivadoEn) throw reglaDeNegocio("Ese rol está archivado.");
  validarConcedibles(ctx, rol.permisos);
  return rol;
}

const entrada = z.object({
  membershipId: uuidSchema.describe("Id de la membresía del usuario en la empresa."),
  roleId: uuidSchema.describe("Id del rol personalizado de la empresa."),
});
const salida = z.object({ membershipId: z.string(), roleId: z.string(), cambio: z.boolean() });

export const rolesAdicionalesAsignar = defineCapability({
  id: "core.roles.adicional_asignar",
  soloPersonas: true,
  descripcion:
    "Suma a un usuario un rol personalizado de la empresa además de su rol: sus permisos se agregan y una excepción que deniega sigue ganando. Solo owner o admin, y solo roles que uno mismo podría conceder.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const m = await membresiaDe(ctx, input.membershipId);
    if (m.rol === "owner") throw reglaDeNegocio("El rol owner ya tiene todos los permisos.");
    if (m.estado !== "activa") throw reglaDeNegocio("El usuario está suspendido en la empresa.");
    await rolConcedible(ctx, input.roleId);
    const clave = { tenantId: m.tenantId, userId: m.userId, roleId: input.roleId };
    const ya = await ctx.db.rolMiembro.findFirst({ where: clave });
    if (ya || dryRun) return { membershipId: m.id, roleId: input.roleId, cambio: !ya };
    await escribirConEvento(
      ctx,
      { tipo: "core.membresia.rol_adicional_asignado", entidadTipo: "membership" },
      async (tx) => {
        await sinDuplicado(tx.rolMiembro.create({ data: clave }), "El usuario ya tiene ese rol.");
        return m;
      },
    );
    return { membershipId: m.id, roleId: input.roleId, cambio: true };
  },
});

export const rolesAdicionalesQuitar = defineCapability({
  id: "core.roles.adicional_quitar",
  soloPersonas: true,
  descripcion:
    "Quita a un usuario un rol adicional: pierde los permisos que solo ese rol le daba. Su rol principal y sus excepciones no cambian. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const m = await membresiaDe(ctx, input.membershipId);
    const clave = { tenantId: m.tenantId, userId: m.userId, roleId: input.roleId };
    const ya = await ctx.db.rolMiembro.findFirst({ where: clave });
    if (!ya || dryRun) return { membershipId: m.id, roleId: input.roleId, cambio: !!ya };
    await escribirConEvento(
      ctx,
      { tipo: "core.membresia.rol_adicional_quitado", entidadTipo: "membership" },
      async (tx) => {
        await tx.rolMiembro.delete({ where: { id: ya.id } });
        return m;
      },
    );
    return { membershipId: m.id, roleId: input.roleId, cambio: true };
  },
});

const rolAsignadoSchema = z.object({
  roleId: z.string(),
  nombre: z.string(),
  archivado: z.boolean(),
});

export const rolesAdicionalesList = defineCapability({
  id: "core.roles.adicionales_list",
  descripcion:
    "Roles adicionales de un usuario, los que se suman a su rol principal, con su nombre y si están archivados (un rol archivado no concede nada).",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({
    membershipId: uuidSchema.describe("Id de la membresía del usuario en la empresa."),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({ items: z.array(rolAsignadoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const m = await membresiaDe(ctx, input.membershipId);
    const filas = await ctx.db.rolMiembro.findMany({
      where: { userId: m.userId },
      include: { rol: { select: { nombre: true, archivadoEn: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const vista = filas.map((f) => ({
      id: f.id,
      roleId: f.roleId,
      nombre: f.rol.nombre,
      archivado: f.rol.archivadoEn !== null,
    }));
    const p = pagina(vista, input.limite);
    return { items: p.items.map(({ id: _id, ...r }) => r), siguiente: p.siguiente };
  },
});
