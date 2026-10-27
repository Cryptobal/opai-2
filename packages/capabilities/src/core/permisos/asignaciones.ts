import { z } from "zod";

import { esRol, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";
import { exigeGestionDeRoles, validarConcedeRol, validarConcedibles } from "./comun";

export async function membresiaDe(ctx: Contexto, id: string) {
  const m = await ctx.db.membership.findUnique({ where: { id } });
  if (!m) throw noEncontrado("El usuario");
  return m;
}

/**
 * Valida asignar o quitar un rol personalizado (§16.2, ADR-022, A21) y devuelve el roleId validado.
 * Owner nunca lleva un personalizado; el rol existe y no está archivado; nadie asigna un rol con
 * permisos que no tiene (acceso real). Quitarlo (null) vuelve al rol base `rolBase`: exige poder
 * conceder todo lo que ese rol otorga (si no, se escalaría quitando el rol que limitaba, §16.2).
 * La usan `core.roles.assign` y `core.users.update` para asignar el rol en una sola llamada.
 */
export async function validarAsignacionRol(
  ctx: Contexto,
  { rolBase, roleId }: { rolBase: string; roleId: string | null },
): Promise<string | null> {
  if (roleId !== null) {
    if (rolBase === "owner") throw reglaDeNegocio("El rol owner no admite un rol personalizado.");
    const rol = await ctx.db.rol.findUnique({ where: { id: roleId } });
    if (!rol) throw noEncontrado("El rol");
    if (rol.archivadoEn) throw reglaDeNegocio("Ese rol está archivado.");
    validarConcedibles(ctx, rol.permisos);
    return roleId;
  }
  if (esRol(rolBase)) validarConcedeRol(ctx, rolBase);
  return null;
}

const asignacionSchema = z.object({
  membershipId: z.string(),
  roleId: z.string().nullable(),
});

export const rolesAssign = defineCapability({
  id: "core.roles.assign",
  soloPersonas: true,
  descripcion:
    "Asigna a un usuario un rol personalizado de la empresa (o null para volver a su rol base). Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({ membershipId: uuidSchema, roleId: uuidSchema.nullable() }),
  output: asignacionSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    exigeGestionDeRoles(ctx);
    const m = await membresiaDe(ctx, input.membershipId);
    const roleId = await validarAsignacionRol(ctx, { rolBase: m.rol, roleId: input.roleId });
    if (!dryRun) {
      await escribirConEvento(
        ctx,
        { tipo: "core.membresia.rol_asignado", entidadTipo: "membership" },
        (tx) => tx.membership.update({ where: { id: m.id }, data: { roleId } }),
      );
    }
    return { membershipId: m.id, roleId };
  },
});
