import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { instalacionEnAlcance } from "../rondas/comun";
import { aparienciaDe, aparienciaSchema, MAX_MENSAJE, validarFondo } from "./apariencia-comun";
import { PERMISO_READ, quien } from "./comun";
import { PERMISO_CONFIG } from "./config-comun";

export const aparienciaGet = defineCapability({
  id: "acceso.apariencia.get",
  descripcion:
    "Fondo y mensaje de bienvenida propios de la portería de una instalación. Lo que viene en null lo pone la marca de la empresa (su logo y «Bienvenido a <nombre comercial>»).",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema }),
  output: aparienciaSchema,
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const { mensaje, doc } = await aparienciaDe(ctx, instalacionId);
    return { mensaje, fondo: doc ? { id: doc.id, nombre: doc.nombre } : null };
  },
});

export const aparienciaCambiar = defineCapability({
  id: "acceso.apariencia.set",
  descripcion:
    "Cambia el fondo y el mensaje de bienvenida de la portería de una instalación. El fondo es el id de una imagen ya subida a esa instalación con core.documentos.iniciar_subida; null en cualquiera de los dos vuelve a la marca de la empresa. Un agente necesita aprobación humana.",
  permiso: PERMISO_CONFIG,
  input: z.object({
    instalacionId: uuidSchema,
    mensaje: z.string().trim().min(2).max(MAX_MENSAJE).nullable(),
    fondoDocumentoId: uuidSchema.nullable(),
  }),
  output: aparienciaSchema,
  efecto: "escritura",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, { instalacionId, mensaje, fondoDocumentoId }, { dryRun }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const fondo = fondoDocumentoId
      ? await validarFondo(ctx, instalacionId, fondoDocumentoId)
      : null;
    if (dryRun) return { mensaje, fondo };
    const datos = { mensaje, fondoDocumentoId, actualizadoPor: quien(ctx) };
    await ctx.db.aparienciaAcceso.upsert({
      where: { tenantId_instalacionId: { tenantId: ctx.tenantId, instalacionId } },
      create: { ...datos, tenantId: ctx.tenantId, instalacionId },
      update: datos,
    });
    return { mensaje, fondo };
  },
});
