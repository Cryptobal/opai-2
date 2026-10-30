import { z } from "zod";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { resolverFirmante } from "./firmar-util";

/**
 * URL firmada de corta duración para revisar el documento congelado antes de firmar (firma.md R5:
 * "la pantalla de firma muestra el documento completo"). Interna, igual que `ver_firmante`: el
 * enlace personal es la credencial, se mira antes de existir sesión y no revela nada a quien no
 * tiene el token (sin enumeración).
 */
export const firmasDocumentoUrl = defineCapability({
  // NÚCLEO-H: la salida trae la URL de descarga, así que el id revelado sale de la salida (el
  // input solo trae el token; el documento se resuelve dentro del handler autorizado por él).
  auditarLectura: (salida) => [salida.documentoId],
  id: "core.firmas.documento_url",
  descripcion:
    "URL firmada de corta duración para ver el documento congelado de una solicitud antes de firmar, a partir del enlace personal del firmante (firma.md R5).",
  permiso: null,
  interna: true,
  input: z.object({ token: z.string().min(10).max(200) }),
  sensibles: ["token"],
  output: z.object({
    url: z.string(),
    nombre: z.string(),
    mime: z.string(),
    documentoId: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const firmante = await resolverFirmante(ctx, { token: input.token });
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: firmante.solicitudId },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    const doc = await ctx.db.documento.findFirst({
      where: { tenantId: ctx.tenantId, id: s.documentoId },
    });
    if (!doc) throw noEncontrado("El documento");
    const url = await ctx.servicios.almacenamiento.urlDescarga(doc.storageKey, doc.nombre, 300);
    return { url, nombre: doc.nombre, mime: doc.mime, documentoId: doc.id };
  },
});
