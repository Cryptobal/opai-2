// Roles asignados a un grupo (CAR-359, referente GitHub: roles a equipos). Los heredan sus miembros
// mientras estén en el grupo y este no esté archivado. Asignar o quitar gobierna acceso: solo
// personas, solo owner o admin, y nadie da a un grupo un rol con permisos que él mismo no tiene.
import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { prohibido } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { cursorDe, escribirConEvento, pagina, sinDuplicado } from "../maestros/comun";
import { exigeGestionDeRoles, validarConcedibles } from "../permisos/comun";
import { rolConcedible } from "../permisos/roles-adicionales";
import { exigeSinAlcance, grupoDe, grupoVigente } from "./comun";

/** Permisos que un grupo concede a quien entra en él (roles vigentes). */
export async function permisosDeGrupo(ctx: Contexto, grupoId: string): Promise<string[]> {
  const filas = await ctx.db.rolGrupo.findMany({
    where: { grupoId, rol: { archivadoEn: null } },
    select: { rol: { select: { permisos: true } } },
  });
  return [...new Set(filas.flatMap((f) => f.rol.permisos))];
}

/**
 * Sumar a alguien a un grupo con roles le da esos permisos: nadie lo hace si no podría conceder esos
 * roles, y un agente nunca lo hace (gobierna acceso, igual que asignar un rol; ADR-032).
 */
export async function exigeConcederRolesDeGrupo(ctx: Contexto, grupoId: string): Promise<void> {
  const permisos = await permisosDeGrupo(ctx, grupoId);
  if (permisos.length === 0) return;
  if (ctx.actor.tipo !== "user") {
    throw prohibido("Este grupo da roles: solo una persona puede sumarle miembros.");
  }
  validarConcedibles(ctx, permisos);
}

const entrada = z.object({
  grupoId: uuidSchema.describe("Id del grupo."),
  roleId: uuidSchema.describe("Id del rol personalizado de la empresa."),
});
const salida = z.object({ grupoId: z.string(), roleId: z.string(), cambio: z.boolean() });

export const gruposRolesAsignar = defineCapability({
  id: "core.grupos.rol_asignar",
  soloPersonas: true,
  descripcion:
    "Da un rol personalizado a un grupo: todos sus miembros lo suman a su rol mientras estén en el grupo. Solo owner o admin, y solo roles que uno mismo podría conceder.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const g = await grupoVigente(ctx, input.grupoId);
    await rolConcedible(ctx, input.roleId);
    const clave = { tenantId: ctx.tenantId, grupoId: g.id, roleId: input.roleId };
    const ya = await ctx.db.rolGrupo.findFirst({ where: clave });
    if (ya || dryRun) return { grupoId: g.id, roleId: input.roleId, cambio: !ya };
    await escribirConEvento(
      ctx,
      { tipo: "core.grupo.rol_asignado", entidadTipo: "grupo_usuarios" },
      async (tx) => {
        await sinDuplicado(tx.rolGrupo.create({ data: clave }), "El grupo ya tiene ese rol.");
        return g;
      },
    );
    return { grupoId: g.id, roleId: input.roleId, cambio: true };
  },
});

export const gruposRolesQuitar = defineCapability({
  id: "core.grupos.rol_quitar",
  soloPersonas: true,
  descripcion:
    "Quita un rol a un grupo: sus miembros pierden los permisos que solo ese rol les daba. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: entrada,
  output: salida,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const g = await grupoDe(ctx, input.grupoId);
    const ya = await ctx.db.rolGrupo.findFirst({
      where: { grupoId: g.id, roleId: input.roleId },
    });
    if (!ya || dryRun) return { grupoId: g.id, roleId: input.roleId, cambio: !!ya };
    await escribirConEvento(
      ctx,
      { tipo: "core.grupo.rol_quitado", entidadTipo: "grupo_usuarios" },
      async (tx) => {
        await tx.rolGrupo.delete({ where: { id: ya.id } });
        return g;
      },
    );
    return { grupoId: g.id, roleId: input.roleId, cambio: true };
  },
});

export const gruposRolesList = defineCapability({
  id: "core.grupos.roles_list",
  descripcion:
    "Roles que da un grupo a sus miembros, con su nombre y si están archivados (un rol archivado no concede nada).",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({
    grupoId: uuidSchema.describe("Id del grupo."),
    cursor: uuidSchema.optional(),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({
    items: z.array(z.object({ roleId: z.string(), nombre: z.string(), archivado: z.boolean() })),
    siguiente: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    exigeSinAlcance(ctx);
    const g = await grupoDe(ctx, input.grupoId);
    const filas = await ctx.db.rolGrupo.findMany({
      where: { grupoId: g.id },
      include: { rol: { select: { nombre: true, archivadoEn: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: input.limite + 1,
      ...cursorDe(input.cursor),
    });
    const p = pagina(
      filas.map((f) => ({
        id: f.id,
        nombre: f.rol.nombre,
        roleId: f.roleId,
        archivado: !!f.rol.archivadoEn,
      })),
      input.limite,
    );
    return { items: p.items.map(({ id: _id, ...r }) => r), siguiente: p.siguiente };
  },
});
