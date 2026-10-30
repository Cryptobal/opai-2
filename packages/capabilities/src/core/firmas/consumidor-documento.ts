import { defineConsumidor } from "../../eventos/consumidores";
import { registrarEvidencia } from "./comun-flujo";

/**
 * Al entrar una versión nueva de un documento, cancela sus solicitudes de firma vivas (R4, CA1):
 * editar un documento en firma crea una versión nueva y cancela la solicitud, avisando a los
 * firmantes. Idempotente: la transición va condicionada al estado y solo toca las vivas.
 */
export const consumidorFirmaDocumento = defineConsumidor({
  id: "core.firmas.documento",
  descripcion:
    "Cancela las solicitudes de firma vivas de un documento cuando entra una versión nueva que lo reemplaza (firma.md R4, CA1).",
  eventos: ["core.documento.registrado"],
  async handler(ctx, ev) {
    const p = ev.payload as { reemplazaAId?: string | null };
    if (!p.reemplazaAId) return;
    const vivas = await ctx.db.solicitudFirma.findMany({
      where: {
        documentoId: p.reemplazaAId,
        estado: { in: ["enviada", "en_curso", "espera_prestador"] },
      },
      select: { id: true, sha256: true, estado: true },
    });
    for (const s of vivas) {
      await ctx.transaccion(async (tx) => {
        const { count } = await tx.solicitudFirma.updateMany({
          where: { id: s.id, estado: s.estado },
          data: {
            estado: "cancelada",
            motivo: "El documento cambió: se creó una versión nueva (R4).",
            canceladaEn: new Date(),
          },
        });
        if (count !== 1) return;
        await registrarEvidencia(ctx, tx, s, { tipo: "cancelada" });
        await ctx.eventos.emitir(tx, {
          tipo: "documentos.firma.cancelada",
          entidadTipo: "solicitud_firma",
          entidadId: s.id,
          payload: { motivo: "documento_cambiado" },
        });
      });
    }
  },
});
