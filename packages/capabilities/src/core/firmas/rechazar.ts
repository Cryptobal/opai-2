import { z } from "zod";

import { estadoVivo, transicionValida, type EstadoSolicitudFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { registrarEvidencia } from "./comun-flujo";
import { resolverFirmante } from "./firmar-util";

export const firmasRechazar = defineCapability({
  id: "core.firmas.rechazar",
  // Interna + soloPersonas: rechazar es un acto personal del firmante; el token es la credencial y un
  // agente nunca rechaza por una persona (firma.md R9, R19, §10). Fuera de MCP y API.
  interna: true,
  soloPersonas: true,
  descripcion:
    "Rechaza una solicitud de firma como firmante, con un motivo; la solicitud queda rechazada y se avisa a quien la envió, que decide si corrige y reenvía (firma.md R9).",
  permiso: null,
  portales: ["erp", "trabajador", "cliente", "supervisor", "terreno"],
  input: z
    .object({
      token: z.string().min(10).optional(),
      solicitudId: uuidSchema.optional(),
      motivo: z.string().trim().min(3).max(300),
    })
    .refine((v) => Boolean(v.token) !== Boolean(v.solicitudId), {
      message: "Indica el enlace personal o la solicitud, no ambos.",
    }),
  sensibles: ["token"],
  output: z.object({ solicitudId: z.string(), estadoSolicitud: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const firmante = await resolverFirmante(ctx, input);
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: firmante.solicitudId },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    if (!estadoVivo(s.estado as EstadoSolicitudFirma) || firmante.estado !== "pendiente")
      throw conflicto("La solicitud ya no admite el rechazo de este firmante.");
    if (!transicionValida(s.estado as EstadoSolicitudFirma, "rechazada"))
      throw conflicto("La solicitud ya está en un estado terminal.");
    if (dryRun) return { solicitudId: s.id, estadoSolicitud: "rechazada" };
    await ctx.transaccion(async (tx) => {
      const { count } = await tx.firmante.updateMany({
        where: { id: firmante.id, estado: "pendiente" },
        data: { estado: "rechazado", motivoRechazo: input.motivo },
      });
      if (count !== 1) throw conflicto("Ya firmaste o rechazaste (R11).");
      await tx.solicitudFirma.update({
        where: { id: s.id },
        data: { estado: "rechazada", motivo: input.motivo },
      });
      await registrarEvidencia(ctx, tx, s, { tipo: "rechazada", firmanteId: firmante.id });
      await ctx.eventos.emitir(tx, {
        tipo: "documentos.firma.rechazada",
        entidadTipo: "solicitud_firma",
        entidadId: s.id,
        payload: { firmanteId: firmante.id, motivo: input.motivo },
      });
    });
    return { solicitudId: s.id, estadoSolicitud: "rechazada" };
  },
});
