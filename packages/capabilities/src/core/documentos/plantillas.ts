import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { claseSchema, plantillaSchema, vista } from "./plantillas-comun";

export const documentoPlantillasList = defineCapability({
  id: "core.documento_plantillas.list",
  descripcion:
    "Plantillas laborales de Documentos (contrato, anexo, recepción, carta) con su firma por defecto, versión vigente y última edición. Solo owner y admin.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({ clase: claseSchema.optional(), incluirInactivas: z.boolean().default(false) }),
  output: z.array(plantillaSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.documentoPlantilla.findMany({
      where: {
        ...(input.clase ? { clase: input.clase } : {}),
        ...(input.incluirInactivas ? {} : { activa: true }),
      },
      orderBy: [{ clase: "asc" }, { nombre: "asc" }],
    });
    const versiones = await ctx.db.documentoPlantillaVersion.findMany({
      where: { plantillaId: { in: filas.map((p) => p.id) } },
      select: { plantillaId: true, numero: true, creadoPorNombre: true, createdAt: true },
    });
    return filas.map((p) =>
      vista(
        p,
        versiones.find((v) => v.plantillaId === p.id && v.numero === p.versionVigente) ?? null,
      ),
    );
  },
});

export const documentoPlantillasGet = defineCapability({
  id: "core.documento_plantillas.get",
  descripcion:
    "Una plantilla laboral con el texto de su versión vigente y las variables que usa. Solo owner y admin.",
  permiso: PERMISOS_CORE.documentosPlantillasManage,
  portales: ["erp"],
  input: z.object({ id: uuidSchema }),
  output: plantillaSchema.extend({ contenido: z.string() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { id }) {
    const p = await ctx.db.documentoPlantilla.findUnique({ where: { id } });
    if (!p) throw noEncontrado("La plantilla");
    const v = await ctx.db.documentoPlantillaVersion.findFirst({
      where: { plantillaId: id, numero: p.versionVigente },
    });
    if (!v) throw noEncontrado("La versión vigente de la plantilla");
    return { ...vista(p, v), contenido: v.contenido };
  },
});
