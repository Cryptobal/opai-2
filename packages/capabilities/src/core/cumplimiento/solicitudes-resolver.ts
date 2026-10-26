import { z } from "zod";

import { type EstadoSolicitud, PERMISOS_CORE, puedeAvanzarSolicitud } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { solicitudSchema, transicionarSolicitud, vistaSolicitud } from "./comunes";

export const solicitudResolver = defineCapability({
  id: "core.cumplimiento.solicitud_resolver",
  descripcion:
    "Resuelve o rechaza una solicitud del titular con su resultado y la evidencia (Ley 21.719). Es un acto humano responsable; la transición y el documento de evidencia quedan auditados.",
  permiso: PERMISOS_CORE.cumplimientoManage,
  soloPersonas: true,
  input: z.object({
    id: uuidSchema,
    estado: z.enum(["resuelta", "rechazada"]),
    resultado: z.string().trim().min(3).max(2000).describe("Qué se hizo o por qué se rechaza."),
    documentoEvidenciaId: uuidSchema
      .optional()
      .describe("Documento de evidencia (p. ej. la exportación)."),
  }),
  output: solicitudSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await ctx.db.solicitudArco.findUnique({ where: { id: input.id } });
    if (!s) throw noEncontrado("La solicitud");
    if (!puedeAvanzarSolicitud(s.estado as EstadoSolicitud, input.estado))
      throw reglaDeNegocio(`No se puede pasar de "${s.estado}" a "${input.estado}".`);
    if (dryRun) return vistaSolicitud({ ...s, estado: input.estado, resultado: input.resultado });
    const fila = await transicionarSolicitud(
      ctx,
      s.id,
      s.estado,
      {
        estado: input.estado,
        resultado: input.resultado,
        documentoEvidenciaId: input.documentoEvidenciaId ?? s.documentoEvidenciaId ?? null,
      },
      {
        tipo:
          input.estado === "resuelta"
            ? "core.cumplimiento.solicitud_resuelta"
            : "core.cumplimiento.solicitud_avanzada",
        payload: {
          solicitud: { tipo: s.tipo, plazo: s.plazoEn ? s.plazoEn.toISOString().slice(0, 10) : "" },
          titular: { nombre: s.titularNombre ?? "" },
          estado: input.estado,
          url: `${ctx.servicios.urlBase}/configuracion/cumplimiento`,
        },
      },
    );
    return vistaSolicitud(fila);
  },
});
