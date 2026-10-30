import { z } from "zod";

import { estadoVivo, METODOS_FIRMA_N1, type EstadoSolicitudFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { registrarEvidencia } from "./comun-flujo";
import { completarSolicitud } from "./completar";
import { esSuTurno, resolverFirmante } from "./firmar-util";

export const firmasFirmar = defineCapability({
  id: "core.firmas.firmar",
  // Interna: el enlace personal (token) es la credencial, como al aceptar una invitación. soloPersonas:
  // un agente nunca firma por una persona (firma.md R19, §10). No se expone por MCP ni API.
  interna: true,
  soloPersonas: true,
  descripcion:
    "Firma un documento como firmante N1: revisa el documento, acepta expresamente (casilla con su texto) y firma con su trazo o nombre; al firmar el último se arma el PDF firmado (firma.md R5, R6, R12).",
  permiso: null,
  portales: ["erp", "trabajador", "cliente", "supervisor", "terreno"],
  input: z
    .object({
      token: z.string().min(10).optional(),
      solicitudId: uuidSchema.optional(),
      metodo: z.enum(METODOS_FIRMA_N1),
      nombreFirma: z.string().trim().min(2).max(160),
      aceptaMedio: z.boolean(),
      textoAceptacion: z.string().trim().min(5).max(500),
      versionAceptacion: z.string().trim().min(1).max(20),
    })
    .refine((v) => Boolean(v.token) !== Boolean(v.solicitudId), {
      message: "Indica el enlace personal o la solicitud, no ambos.",
    }),
  sensibles: ["token"],
  output: z.object({
    solicitudId: z.string(),
    firmanteId: z.string(),
    estadoFirmante: z.string(),
    estadoSolicitud: z.string(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!input.aceptaMedio)
      throw reglaDeNegocio("Debes aceptar expresamente para firmar (R12).");
    const firmante = await resolverFirmante(ctx, input);
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: firmante.solicitudId },
      include: { firmantes: true },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    if (!estadoVivo(s.estado as EstadoSolicitudFirma))
      throw conflicto("La solicitud ya no admite firmas.");
    // N2/N3 quedan fuera de este PR: la firma N2 espera la prueba de vida (decisión 29-oct-2026).
    if (s.nivel !== "N1")
      throw reglaDeNegocio("La firma N2/N3 llega en una próxima entrega (prueba de vida).");
    if (firmante.rol !== "firma") throw reglaDeNegocio("Este firmante solo recibe copia.");
    if (firmante.estado !== "pendiente") throw conflicto("Ya firmaste o rechazaste (R11).");
    if (!esSuTurno(s.orden, s.firmantes, firmante))
      throw reglaDeNegocio("Aún no es tu turno de firmar (orden secuencial).");
    if (dryRun)
      return {
        solicitudId: s.id,
        firmanteId: firmante.id,
        estadoFirmante: "firmado",
        estadoSolicitud: s.estado,
      };
    const ultima = await ctx.transaccion(async (tx) => {
      // R11: una sola firma por firmante; la transición va condicionada al estado pendiente.
      const { count } = await tx.firmante.updateMany({
        where: { id: firmante.id, estado: "pendiente" },
        data: { estado: "firmado", firmadoEn: new Date(), vistoEn: new Date(), nombre: input.nombreFirma },
      });
      if (count !== 1) throw conflicto("Ya firmaste o rechazaste (R11).");
      if (s.estado === "enviada")
        await tx.solicitudFirma.update({ where: { id: s.id }, data: { estado: "en_curso" } });
      await registrarEvidencia(ctx, tx, s, {
        tipo: "firmada",
        firmanteId: firmante.id,
        nivel: s.nivel,
        metodo: input.metodo,
        textoAceptacion: input.textoAceptacion,
        versionAceptacion: input.versionAceptacion,
      });
      const pendientes = await tx.firmante.count({
        where: { solicitudId: s.id, rol: "firma", estado: "pendiente" },
      });
      return pendientes === 0;
    });
    if (ultima) {
      const completa = await ctx.db.solicitudFirma.findFirstOrThrow({
        where: { tenantId: ctx.tenantId, id: s.id },
        include: { firmantes: { where: { rol: "firma" } } },
      });
      await completarSolicitud(ctx, completa);
    }
    const fin = await ctx.db.solicitudFirma.findFirstOrThrow({
      where: { tenantId: ctx.tenantId, id: s.id },
    });
    return {
      solicitudId: s.id,
      firmanteId: firmante.id,
      estadoFirmante: "firmado",
      estadoSolicitud: fin.estado,
    };
  },
});
