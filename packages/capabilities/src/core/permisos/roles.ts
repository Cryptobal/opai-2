import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { escribirConEvento, sinDuplicado } from "../maestros/comun";
import { exigeGestionDeRoles, normalizarPermisosRol } from "./comun";
import { rolesSistema } from "./roles-sistema";

export const rolTenantSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  sistema: z.boolean(),
  permisos: z.array(z.string()),
  archivado: z.boolean(),
  /** Membresías activas que usan este rol (A03/A17: «N usuarios» / «en uso por N»). */
  usuarios: z.number(),
});

export const nombreSchema = z.string().trim().min(2).max(60);
// Sábana A16: descripción hasta 140 (antes 500). Solo en la escritura; los datos previos que la
// superen no se truncan (el output no limita el largo).
export const descripcionSchema = z.string().trim().max(140).nullable().optional();
export const permisosSchema = z.array(z.string().trim().min(1)).max(500);

export type RolFila = {
  id: string;
  nombre: string;
  descripcion: string | null;
  sistema: boolean;
  permisos: string[];
  archivadoEn: Date | null;
};

export const vista = (r: RolFila, usuarios = 0) => ({
  id: r.id,
  nombre: r.nombre,
  descripcion: r.descripcion ?? null,
  sistema: r.sistema,
  permisos: r.permisos,
  archivado: r.archivadoEn != null,
  usuarios,
});

/** Membresías activas por rol personalizado (roleId). Una sola consulta para la lista. */
export async function usuariosPorRol(ctx: Contexto): Promise<Map<string, number>> {
  const g = await ctx.db.membership.groupBy({
    by: ["roleId"],
    where: { estado: "activa", roleId: { not: null } },
    _count: { _all: true },
  });
  return new Map(g.flatMap((x) => (x.roleId ? [[x.roleId, x._count._all] as const] : [])));
}

export async function rolDe(ctx: Contexto, id: string): Promise<RolFila> {
  const r = await ctx.db.rol.findUnique({ where: { id } });
  if (!r) throw noEncontrado("El rol");
  return r;
}

export const rolesList = defineCapability({
  id: "core.roles.list",
  descripcion:
    "Roles personalizados de la empresa con sus permisos y cuántos usuarios los usan; opcionalmente también los roles base del sistema (para «Partir de»).",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({
    incluirArchivados: z.boolean().default(false),
    // A09: incluye los cinco roles base del sistema con sus permisos expandidos (sistema:true).
    incluirSistema: z.boolean().default(false),
  }),
  output: z.array(rolTenantSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const roles = await ctx.db.rol.findMany({
      where: input.incluirArchivados ? {} : { archivadoEn: null },
      orderBy: { nombre: "asc" },
    });
    const conteo = await usuariosPorRol(ctx);
    const filas = roles.map((r) => vista(r, conteo.get(r.id) ?? 0));
    if (!input.incluirSistema) return filas;
    return [...(await rolesSistema(ctx)), ...filas];
  },
});

export const rolesCreate = defineCapability({
  id: "core.roles.create",
  soloPersonas: true,
  descripcion:
    "Crea un rol personalizado de la empresa con los permisos elegidos del catálogo. Solo owner o admin, y nadie concede un permiso que no tiene.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    nombre: nombreSchema,
    descripcion: descripcionSchema,
    permisos: permisosSchema.default([]),
  }),
  output: rolTenantSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    // Comodines expandidos al guardar: el rol no hereda permisos que se agreguen al catálogo después.
    const permisos = normalizarPermisosRol(ctx, input.permisos);
    const data = {
      tenantId: ctx.tenantId,
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      permisos,
      sistema: false,
    };
    if (dryRun) return vista({ id: "", archivadoEn: null, ...data });
    const r = await sinDuplicado(
      escribirConEvento<RolFila>(
        ctx,
        { tipo: "core.rol.creado", entidadTipo: "rol", payload: (x) => ({ nombre: x.nombre }) },
        (tx) => tx.rol.create({ data }),
      ),
      `Ya existe un rol llamado "${input.nombre}".`,
    );
    return vista(r);
  },
});
