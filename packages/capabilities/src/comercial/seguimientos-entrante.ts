// Correo entrante del cliente (CAR-67): lo entrega el receptor de Resend y pausa el seguimiento.
import { z } from "zod";

import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { aplicarRespuesta } from "./seguimiento-ejecucion";
import { configDeVersion } from "./seguimiento-comun";

/**
 * Interna: solo la ruta pública `/api/webhooks/resend/entrante` la ejecuta, con el tenant que resolvió
 * el token de la dirección. El texto y el remitente son de un tercero: se guardan como dato externo
 * y nunca habilitan una escritura.
 */
export const seguimientosRecibirCorreo = defineCapability({
  id: "comercial.seguimientos.recibir_correo",
  descripcion:
    "Registra la respuesta por correo de un cliente a un seguimiento: guarda el mensaje como contenido externo, deja una nota en el negocio y pausa o detiene el seguimiento según su plan. Idempotente por id del correo.",
  permiso: null,
  interna: true,
  // El contenido del correo es de un tercero: no se copia a la auditoría (CAR-297).
  sensibles: ["remitente", "asunto", "texto"],
  input: z.object({
    seguimientoId: z.uuid(),
    mensajeId: z.string().min(1).max(200),
    remitente: z.string().max(320),
    asunto: z.string().max(500).nullable(),
    texto: z.string().max(20000),
    recibidoEn: z.string().datetime(),
  }),
  output: z.object({ registrado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const s = await ctx.db.seguimiento.findUnique({ where: { id: input.seguimientoId } });
    if (!s) throw noEncontrado("El seguimiento");
    const previo = await ctx.db.seguimientoEntrante.findUnique({ where: { tenantId_mensajeId: { tenantId: ctx.tenantId, mensajeId: input.mensajeId } } });
    if (previo) return { registrado: false };
    if (dryRun) return { registrado: true };
    const config = await configDeVersion(ctx, s.planId, s.planVersion);
    await ctx.transaccion(async (tx) => {
      const vivo = s.estado === "activo" || s.estado === "pausado";
      const actividadId = vivo
        ? await aplicarRespuesta(ctx, tx, s, config, { titulo: "El cliente respondió por correo", detalle: `De ${input.remitente}. Contenido externo en el seguimiento.` })
        : null;
      await tx.seguimientoEntrante.create({
        data: {
          tenantId: ctx.tenantId, seguimientoId: s.id, mensajeId: input.mensajeId, remitente: input.remitente,
          asunto: input.asunto, texto: input.texto, actividadId, recibidoEn: new Date(input.recibidoEn),
        },
      });
    });
    return { registrado: true };
  },
});
