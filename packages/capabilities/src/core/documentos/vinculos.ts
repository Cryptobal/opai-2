import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { verificarEntidad } from "./entidad";
import { disponible } from "./gestion";
import { filtroDocumentoSensible } from "./sensibles";
import { entidadSchema } from "./vista";

const vinculoSchema = z.object({
  documentoId: z.string(),
  entidadTipo: z.string(),
  entidadId: z.string(),
  rol: z.string(),
});

export const documentosVincular = defineCapability({
  id: "core.documentos.vincular",
  descripcion:
    "Vincula un documento existente a otra entidad como referencia (p. ej. el contrato de una cuenta también en su instalación), sin copiar el archivo.",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({ id: uuidSchema, entidad: entidadSchema }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, entidad }, { dryRun }) {
    await disponible(ctx, id);
    await verificarEntidad(ctx, entidad);
    const existe = await ctx.db.documentoVinculo.findFirst({
      where: { documentoId: id, entidadTipo: entidad.tipo, entidadId: entidad.id },
    });
    if (existe) throw conflicto("El documento ya está vinculado a esa entidad.");
    const fila = {
      documentoId: id,
      entidadTipo: entidad.tipo,
      entidadId: entidad.id,
      rol: "referencia",
    };
    if (dryRun) return fila;
    const v = await ctx.db.documentoVinculo.create({ data: { ...fila, tenantId: ctx.tenantId } });
    return {
      documentoId: v.documentoId,
      entidadTipo: v.entidadTipo,
      entidadId: v.entidadId,
      rol: v.rol,
    };
  },
});

export const documentosDesvincular = defineCapability({
  id: "core.documentos.desvincular",
  descripcion:
    "Quita un vínculo de referencia de un documento. El vínculo propietario no se quita (para eso, archiva el documento).",
  permiso: PERMISOS_CORE.documentosManage,
  input: z.object({ id: uuidSchema, entidad: entidadSchema }),
  output: vinculoSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, entidad }, { dryRun }) {
    const v = await ctx.db.documentoVinculo.findFirst({
      where: {
        documentoId: id,
        entidadTipo: entidad.tipo,
        entidadId: entidad.id,
        documento: filtroDocumentoSensible(ctx),
      },
    });
    if (!v) throw noEncontrado("El vínculo");
    if (v.rol === "propietario")
      throw reglaDeNegocio("El vínculo propietario no se quita: archiva el documento.");
    if (!dryRun) await ctx.db.documentoVinculo.deleteMany({ where: { id: v.id } });
    return {
      documentoId: v.documentoId,
      entidadTipo: v.entidadTipo,
      entidadId: v.entidadId,
      rol: v.rol,
    };
  },
});
