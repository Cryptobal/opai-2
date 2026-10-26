import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { escribirConEvento, sinDuplicado } from "../maestros/comun";
import { validarPermisos } from "./comun";
import {
  descripcionSchema,
  nombreSchema,
  permisosSchema,
  rolDe,
  type RolFila,
  rolTenantSchema,
  vista,
} from "./roles";

export const rolesUpdate = defineCapability({
  id: "core.roles.update",
  soloPersonas: true,
  descripcion:
    "Edita el nombre, la descripción o los permisos de un rol personalizado. No toca los roles del sistema.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    id: uuidSchema,
    nombre: nombreSchema.optional(),
    descripcion: descripcionSchema,
    permisos: permisosSchema.optional(),
  }),
  output: rolTenantSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await rolDe(ctx, input.id);
    if (actual.sistema) throw reglaDeNegocio("Un rol del sistema no se edita.");
    if (input.permisos) validarPermisos(ctx, input.permisos);
    const data = {
      ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
      ...(input.descripcion !== undefined ? { descripcion: input.descripcion } : {}),
      ...(input.permisos !== undefined ? { permisos: input.permisos } : {}),
    };
    if (dryRun) return vista({ ...actual, ...data });
    const r = await sinDuplicado(
      escribirConEvento<RolFila>(
        ctx,
        { tipo: "core.rol.actualizado", entidadTipo: "rol" },
        (tx) => tx.rol.update({ where: { id: actual.id }, data }),
      ),
      `Ya existe un rol llamado "${input.nombre ?? actual.nombre}".`,
    );
    return vista(r);
  },
});

export const rolesArchive = defineCapability({
  id: "core.roles.archive",
  soloPersonas: true,
  descripcion:
    "Archiva un rol personalizado (sale de la lista). Exige que ninguna membresía lo use: primero reasigna.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ id: uuidSchema }),
  output: rolTenantSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await rolDe(ctx, input.id);
    if (actual.sistema) throw reglaDeNegocio("Un rol del sistema no se archiva.");
    if (actual.archivadoEn) return vista(actual);
    const enUso = await ctx.db.membership.count({ where: { roleId: actual.id } });
    if (enUso > 0) {
      throw reglaDeNegocio("El rol está en uso: reasigna a esas personas antes de archivarlo.");
    }
    if (dryRun) return vista({ ...actual, archivadoEn: new Date() });
    const r = await escribirConEvento<RolFila>(
      ctx,
      { tipo: "core.rol.archivado", entidadTipo: "rol" },
      (tx) => tx.rol.update({ where: { id: actual.id }, data: { archivadoEn: new Date() } }),
    );
    return vista(r);
  },
});
