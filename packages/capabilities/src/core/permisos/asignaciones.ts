import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { escribirConEvento } from "../maestros/comun";
import { validarConcedibles, validarEnCatalogo } from "./comun";

async function membresiaDe(ctx: Contexto, id: string) {
  const m = await ctx.db.membership.findUnique({ where: { id } });
  if (!m) throw noEncontrado("El usuario");
  return m;
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
    const m = await membresiaDe(ctx, input.membershipId);
    if (m.rol === "owner" && input.roleId !== null) {
      throw reglaDeNegocio("El rol owner no admite un rol personalizado.");
    }
    if (input.roleId !== null) {
      const rol = await ctx.db.rol.findUnique({ where: { id: input.roleId } });
      if (!rol) throw noEncontrado("El rol");
      if (rol.archivadoEn) throw reglaDeNegocio("Ese rol está archivado.");
      // Nadie asigna un rol con permisos que el asignador no tiene (§16.2).
      validarConcedibles(ctx, rol.permisos);
    }
    if (!dryRun) {
      await escribirConEvento(
        ctx,
        { tipo: "core.membresia.rol_asignado", entidadTipo: "membership" },
        (tx) => tx.membership.update({ where: { id: m.id }, data: { roleId: input.roleId } }),
      );
    }
    return { membershipId: m.id, roleId: input.roleId };
  },
});

const excepcionSchema = z.object({
  permiso: z.string(),
  conceder: z.boolean(),
});

export const excepcionesList = defineCapability({
  id: "core.excepciones.list",
  descripcion:
    "Excepciones de permiso de un usuario (permisos concedidos o denegados puntualmente sobre su rol).",
  permiso: PERMISOS_CORE.usersRead,
  input: z.object({ membershipId: uuidSchema }),
  output: z.array(excepcionSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    await membresiaDe(ctx, input.membershipId);
    const filas = await ctx.db.permisoExcepcion.findMany({
      where: { membershipId: input.membershipId },
      orderBy: { permiso: "asc" },
    });
    return filas.map((e) => ({ permiso: e.permiso, conceder: e.conceder }));
  },
});

export const excepcionesSet = defineCapability({
  id: "core.excepciones.set",
  soloPersonas: true,
  descripcion:
    "Concede o deniega un permiso puntual a un usuario sobre su rol (denegar gana); 'ninguna' quita la excepción. Solo owner o admin.",
  permiso: PERMISOS_CORE.usersManage,
  input: z.object({
    membershipId: uuidSchema,
    permiso: z.string().trim().min(1),
    efecto: z.enum(["conceder", "denegar", "ninguna"]),
  }),
  output: excepcionSchema.nullable(),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const m = await membresiaDe(ctx, input.membershipId);
    const quitar = input.efecto === "ninguna";
    if (!quitar) {
      validarEnCatalogo([input.permiso]);
      // Conceder exige tenerlo; denegar es restrictivo y no escala.
      if (input.efecto === "conceder") validarConcedibles(ctx, [input.permiso]);
    }
    const conceder = input.efecto === "conceder";
    if (dryRun) return quitar ? null : { permiso: input.permiso, conceder };
    await escribirConEvento(
      ctx,
      {
        tipo: "core.excepcion.fijada",
        entidadTipo: "membership",
        payload: () => ({ permiso: input.permiso, efecto: input.efecto }),
      },
      async (tx) => {
        await tx.permisoExcepcion.deleteMany({
          where: { membershipId: m.id, permiso: input.permiso },
        });
        if (!quitar) {
          await tx.permisoExcepcion.create({
            data: {
              tenantId: ctx.tenantId,
              membershipId: m.id,
              permiso: input.permiso,
              conceder,
            },
          });
        }
        return m;
      },
    );
    return quitar ? null : { permiso: input.permiso, conceder };
  },
});
