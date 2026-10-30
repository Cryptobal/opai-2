import { z } from "zod";

import { estadoVivo, transicionValida, type EstadoSolicitudFirma } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto, noEncontrado, prohibido, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { PERMISO_FIRMAS_ENVIAR, registrarEvidencia } from "./comun-flujo";
import { solicitudVistaSchema, vistaSolicitud } from "./vistas";

type SolFila = { enviadaPorId: string | null; viaUserId: string | null; estado: string };

/** owner/admin operan cualquier solicitud; gerente y supervisor, solo la que enviaron (§8). */
function puedeGestionar(ctx: Contexto, s: SolFila): boolean {
  if (ctx.rol === "owner" || ctx.rol === "admin") return true;
  const propia =
    (s.enviadaPorId !== null && s.enviadaPorId === ctx.actor.id) ||
    (s.viaUserId !== null && s.viaUserId === ctx.actor.viaUserId);
  return propia;
}

export const firmasRecordar = defineCapability({
  id: "core.firmas.recordar",
  descripcion:
    "Reenvía el aviso de firma a los firmantes pendientes de una solicitud; en modo paralelo llega a todos los pendientes, en secuencial al que le toca (firma.md R7, CA6).",
  permiso: PERMISO_FIRMAS_ENVIAR,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: z.string(), recordados: z.number().int(), estado: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: input.id },
      include: { firmantes: { where: { rol: "firma", estado: "pendiente" }, orderBy: { orden: "asc" } } },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    if (!estadoVivo(s.estado as EstadoSolicitudFirma))
      throw reglaDeNegocio("La solicitud ya no admite recordatorios.");
    // Secuencial: solo el primer pendiente; paralelo: todos los pendientes (CA6).
    const pendientes = s.orden === "paralelo" ? s.firmantes : s.firmantes.slice(0, 1);
    if (dryRun) return { id: s.id, recordados: pendientes.length, estado: s.estado };
    await ctx.transaccion(async (tx) => {
      await tx.solicitudFirma.update({ where: { id: s.id }, data: { recordadaEn: new Date() } });
      await ctx.eventos.emitir(tx, {
        tipo: "documentos.firma.recordatorio",
        entidadTipo: "solicitud_firma",
        entidadId: s.id,
        payload: { firmantes: pendientes.map((f) => f.id) },
      });
    });
    return { id: s.id, recordados: pendientes.length, estado: s.estado };
  },
});

export const firmasCancelar = defineCapability({
  id: "core.firmas.cancelar",
  descripcion:
    "Cancela una solicitud de firma con un motivo y avisa a los firmantes; es irreversible, así que un agente la cancela con aprobación humana (firma.md R4, §8, §10).",
  permiso: PERMISO_FIRMAS_ENVIAR,
  portales: ["erp", "supervisor"],
  input: z.object({ id: uuidSchema, motivo: z.string().trim().min(3).max(300) }),
  output: solicitudVistaSchema,
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await ctx.db.solicitudFirma.findFirst({
      where: { tenantId: ctx.tenantId, id: input.id },
      include: { firmantes: true },
    });
    if (!s) throw noEncontrado("La solicitud de firma");
    if (!puedeGestionar(ctx, s)) throw prohibido("Solo quien la envió puede cancelarla (§8).");
    if (!transicionValida(s.estado as EstadoSolicitudFirma, "cancelada"))
      throw conflicto("La solicitud ya está en un estado terminal.");
    if (dryRun) return vistaSolicitud({ ...s, estado: "cancelada", motivo: input.motivo });
    const actualizada = await ctx.transaccion(async (tx) => {
      const { count } = await tx.solicitudFirma.updateMany({
        where: { id: s.id, estado: s.estado },
        data: { estado: "cancelada", motivo: input.motivo, canceladaEn: new Date() },
      });
      if (count !== 1) throw conflicto("La solicitud cambió de estado; vuelve a intentarlo.");
      await registrarEvidencia(ctx, tx, s, { tipo: "cancelada" });
      await ctx.eventos.emitir(tx, {
        tipo: "documentos.firma.cancelada",
        entidadTipo: "solicitud_firma",
        entidadId: s.id,
        payload: { motivo: input.motivo },
      });
      return tx.solicitudFirma.findUniqueOrThrow({ where: { id: s.id }, include: { firmantes: true } });
    });
    return vistaSolicitud(actualizada);
  },
});
