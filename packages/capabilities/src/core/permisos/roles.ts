import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { escribirConEvento, sinDuplicado } from "../maestros/comun";
import { exigeGestionDeRoles, normalizarPermisosRol } from "./comun";

export const rolTenantSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  sistema: z.boolean(),
  permisos: z.array(z.string()),
  archivado: z.boolean(),
});

export const nombreSchema = z.string().trim().min(2).max(60);
export const descripcionSchema = z.string().trim().max(500).nullable().optional();
export const permisosSchema = z.array(z.string().trim().min(1)).max(500);

export type RolFila = {
  id: string;
  nombre: string;
  descripcion: string | null;
  sistema: boolean;
  permisos: string[];
  archivadoEn: Date | null;
};

export const vista = (r: RolFila) => ({
  id: r.id,
  nombre: r.nombre,
  descripcion: r.descripcion,
  sistema: r.sistema,
  permisos: r.permisos,
  archivado: r.archivadoEn != null,
});

export async function rolDe(ctx: Contexto, id: string): Promise<RolFila> {
  const r = await ctx.db.rol.findUnique({ where: { id } });
  if (!r) throw noEncontrado("El rol");
  return r;
}

export const rolesList = defineCapability({
  id: "core.roles.list",
  descripcion: "Roles personalizados de la empresa con sus permisos; para la matriz de permisos.",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ incluirArchivados: z.boolean().default(false) }),
  output: z.array(rolTenantSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const roles = await ctx.db.rol.findMany({
      where: input.incluirArchivados ? {} : { archivadoEn: null },
      orderBy: { nombre: "asc" },
    });
    return roles.map(vista);
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
