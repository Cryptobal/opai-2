import { z } from "zod";

import { PERMISOS_CORE, variablesFueraDeClase, type ClasePlantilla } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import {
  claseSchema,
  contenidoSchema,
  firmantesSchema,
  nivelSchema,
  nombreSchema,
  plantillaSchema,
  validarNivel,
  vista,
} from "./plantillas-comun";

export const documentoPlantillasCreate = defineCapability({
  id: "core.documento_plantillas.create",
  descripcion:
    "Crea una plantilla laboral con su versión 1. La firma por defecto debe valer para la clase y el texto solo puede usar las variables del catálogo.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    nombre: nombreSchema,
    clase: claseSchema,
    nivelFirma: nivelSchema,
    firmantes: firmantesSchema.default("ambos"),
    contenido: contenidoSchema.default(""),
  }),
  output: plantillaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    validarNivel(input.clase, input.nivelFirma);
    const desconocidas = variablesFueraDeClase(input.contenido, input.clase);
    if (desconocidas.length > 0)
      throw reglaDeNegocio(`Variables que no existen o no valen para este tipo de plantilla: ${desconocidas.join(", ")}.`, {
        desconocidas,
      });
    if (await ctx.db.documentoPlantilla.findFirst({ where: { nombre: input.nombre } }))
      throw conflicto("Ya hay una plantilla con ese nombre.");
    const ahora = new Date();
    const base = {
      nombre: input.nombre,
      clase: input.clase,
      nivelFirma: input.nivelFirma,
      firmantes: input.firmantes,
      origen: "creada",
      versionVigente: 1,
      activa: true,
    };
    const previa = { ...base, id: "" };
    if (dryRun)
      return vista(previa, { creadoPorNombre: ctx.usuario?.nombre ?? null, createdAt: ahora });
    return ctx.transaccion(async (tx) => {
      const p = await tx.documentoPlantilla.create({ data: { ...base, tenantId: ctx.tenantId } });
      const v = await tx.documentoPlantillaVersion.create({
        data: {
          tenantId: ctx.tenantId,
          plantillaId: p.id,
          numero: 1,
          contenido: input.contenido,
          creadoPorId: ctx.usuario?.id ?? null,
          creadoPorNombre: ctx.usuario?.nombre ?? null,
        },
      });
      return vista(p, v);
    });
  },
});

export const documentoPlantillasUpdate = defineCapability({
  id: "core.documento_plantillas.update",
  descripcion:
    "Cambia el nombre, la firma por defecto o quién firma una plantilla laboral, o la archiva. El texto no se toca aquí: se guarda como borrador y al publicarlo crea una versión nueva.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({
    id: uuidSchema,
    nombre: nombreSchema.optional(),
    nivelFirma: nivelSchema.optional(),
    firmantes: firmantesSchema.optional(),
    activa: z.boolean().optional(),
  }),
  output: plantillaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await ctx.db.documentoPlantilla.findUnique({ where: { id } });
    if (!actual) throw noEncontrado("La plantilla");
    if (cambios.nivelFirma) validarNivel(actual.clase as ClasePlantilla, cambios.nivelFirma);
    if (cambios.nombre && cambios.nombre !== actual.nombre) {
      const otra = await ctx.db.documentoPlantilla.findFirst({
        where: { nombre: cambios.nombre, NOT: { id } },
      });
      if (otra) throw conflicto("Ya hay una plantilla con ese nombre.");
    }
    const data = Object.fromEntries(Object.entries(cambios).filter(([, v]) => v !== undefined));
    const v = await ctx.db.documentoPlantillaVersion.findFirst({
      where: { plantillaId: id, numero: actual.versionVigente },
    });
    if (dryRun) return vista({ ...actual, ...data }, v);
    return vista(await ctx.db.documentoPlantilla.update({ where: { id }, data }), v);
  },
});
