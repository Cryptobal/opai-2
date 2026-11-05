import { z } from "zod";

import { defineCapability } from "../define";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado } from "../errores";
import { autorDe, enviarRecordatorio } from "./cobranza-envio";
import { PERMISO_VENTAS, documentoEmitidoIdSchema } from "./ventas-comun";

export const cobranzaRecordar = defineCapability({
  id: "finanzas.cobranza.recordar",
  descripcion:
    "Envía por correo el recordatorio de cobro de una factura vencida, con el PDF, a los contactos del cliente con rol facturación (el primero como destinatario, los demás en copia), y lo deja en el historial de gestiones del deudor.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema }),
  output: z.object({
    documentoId: z.string(),
    estado: z.enum(["enviado", "fallido", "omitido", "vista_previa"]),
    para: z.string().nullable(),
    cc: z.array(z.string()),
  }),
  efecto: "irreversible",
  dryRun: true,
  exigeAprobacion: () => true,
  async handler(ctx, input, { dryRun }) {
    return enviarRecordatorio(ctx, { documentoId: input.documentoId, origen: "manual", dryRun });
  },
});

export const cobranzaPausar = defineCapability({
  id: "finanzas.cobranza.pausar",
  descripcion:
    "Pausa o reanuda la cobranza de una factura: pausada, la secuencia automática de recordatorios no le envía nada hasta que se reanude. No afecta los envíos manuales.",
  permiso: PERMISO_VENTAS,
  input: z.object({ documentoId: documentoEmitidoIdSchema, pausada: z.boolean() }),
  output: z.object({ documentoId: z.string(), pausada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId }, select: { id: true, cuentaId: true } });
    if (!doc) throw noEncontrado("El documento");
    if (dryRun) return { documentoId: doc.id, pausada: input.pausada };
    await escribirConEvento(
      ctx,
      { tipo: "finanzas.cobranza.pausa_cambiada", entidadTipo: "documento_emitido", payload: () => ({ pausada: input.pausada }) },
      async (tx) => {
        await tx.documentoEmitido.update({ where: { id: doc.id }, data: { cobranzaPausada: input.pausada } });
        return tx.cobranzaGestion.create({
          data: {
            tenantId: ctx.tenantId, documentoId: doc.id, cuentaId: doc.cuentaId, canal: "nota", origen: "manual",
            resultado: "enviado", detalle: input.pausada ? "Cobranza pausada." : "Cobranza reanudada.", creadoPor: autorDe(ctx),
          },
        });
      },
    );
    return { documentoId: doc.id, pausada: input.pausada };
  },
});

export const cobranzaRegistrarGestion = defineCapability({
  id: "finanzas.cobranza.registrar_gestion",
  descripcion:
    "Anota en el historial del deudor una gestión de cobranza hecha fuera del sistema: una llamada, un acuerdo de pago o un mensaje de WhatsApp enviado a mano.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    documentoId: documentoEmitidoIdSchema,
    canal: z.enum(["nota", "whatsapp_manual"]).default("nota"),
    detalle: z.string().trim().min(3).max(500),
  }),
  output: z.object({ id: z.string(), documentoId: z.string() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({ where: { id: input.documentoId }, select: { id: true, cuentaId: true } });
    if (!doc) throw noEncontrado("El documento");
    if (dryRun) return { id: "vista_previa", documentoId: doc.id };
    const g = await escribirConEvento(
      ctx,
      { tipo: "finanzas.cobranza.gestion_registrada", entidadTipo: "documento_emitido", payload: () => ({ canal: input.canal }) },
      (tx) =>
        tx.cobranzaGestion.create({
          data: {
            tenantId: ctx.tenantId, documentoId: doc.id, cuentaId: doc.cuentaId, canal: input.canal, origen: "manual",
            resultado: "enviado", detalle: input.detalle, creadoPor: autorDe(ctx),
          },
        }),
    );
    return { id: g.id, documentoId: doc.id };
  },
});
