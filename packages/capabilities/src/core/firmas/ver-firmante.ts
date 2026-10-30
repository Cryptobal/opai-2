import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { resolverFirmante } from "./firmar-util";

/**
 * Datos mínimos para la pantalla pública de firma (`/firmar/<slug>/<token>`, firma.md §5): se mira
 * antes de existir sesión, con el enlace personal como credencial, igual que `core.invitations.peek`.
 * Interna: no se expone por MCP ni API; la resuelve solo la página pública con el tenant del enlace.
 */
export const firmasVerFirmante = defineCapability({
  id: "core.firmas.ver_firmante",
  descripcion:
    "Muestra el documento, el nivel y el estado de una solicitud de firma a partir del enlace personal del firmante.",
  permiso: null,
  interna: true,
  input: z.object({ token: z.string().min(10).max(200) }),
  sensibles: ["token"],
  output: z.object({
    nombre: z.string(),
    rol: z.string(),
    estadoFirmante: z.string(),
    estadoSolicitud: z.string(),
    clase: z.string(),
    nivel: z.string(),
    mensaje: z.string().nullable(),
    plazoVence: z.string(),
    documentoVersion: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const firmante = await resolverFirmante(ctx, { token: input.token });
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: firmante.solicitudId },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    return {
      nombre: firmante.nombre,
      rol: firmante.rol,
      estadoFirmante: firmante.estado,
      estadoSolicitud: s.estado,
      clase: s.clase,
      nivel: s.nivel,
      mensaje: s.mensaje,
      plazoVence: s.plazoVence.toISOString(),
      documentoVersion: s.documentoVersion,
    };
  },
});
