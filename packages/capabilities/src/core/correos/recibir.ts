// Correo que entró por el buzón de la empresa (CAR-233): respuesta del cliente al reply-to o CCO del
// vendedor. Lo entrega el receptor de Resend con el tenant que resolvió la dirección de destino.
import { z } from "zod";

import { defineCapability } from "../../define";
import { LARGO_TEXTO, recortar } from "./comun";
import { asociarEntrante, sentidoYContrapartes } from "./registrar";

/**
 * Interna: solo la ruta pública `/api/webhooks/resend/entrante` la ejecuta, tras verificar la firma
 * Svix y resolver el tenant por el token `t…` de la dirección de destino. Remitente, destinatarios,
 * asunto y texto son de un tercero: se guardan como dato externo y nunca habilitan una escritura.
 */
export const correosRecibir = defineCapability({
  id: "core.correos.recibir",
  descripcion:
    "Registra en el historial del cliente un correo que llegó a la dirección de registro de la empresa (respuesta del cliente o copia oculta del vendedor). Lo asocia por correo exacto del contacto o por dominio del sitio web de la cuenta; si no puede, queda sin asignar. Idempotente por id del correo.",
  permiso: null,
  interna: true,
  input: z.object({
    mensajeId: z.string().min(1).max(200),
    remitente: z.string().max(320),
    destinatarios: z.array(z.string().max(320)).max(50),
    asunto: z.string().max(500).nullable(),
    texto: z.string().max(LARGO_TEXTO),
    recibidoEn: z.string().datetime(),
  }),
  output: z.object({
    registrado: z.boolean(),
    sentido: z.enum(["enviado", "recibido"]),
    asociado: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const { sentido, contrapartes } = await sentidoYContrapartes(ctx, input);
    const previo = await ctx.db.correoCliente.findFirst({ where: { mensajeId: input.mensajeId }, select: { id: true } });
    if (previo) return { registrado: false, sentido, asociado: false };
    const a = await asociarEntrante(ctx, contrapartes, input.asunto);
    const asociado = a.asociacion !== null;
    if (dryRun) return { registrado: true, sentido, asociado };
    await ctx.transaccion(async (tx) => {
      const fila = await tx.correoCliente.create({
        data: {
          tenantId: ctx.tenantId, sentido, origen: "buzon", mensajeId: input.mensajeId,
          remitente: recortar(input.remitente, 320), destinatarios: input.destinatarios.slice(0, 50),
          asunto: input.asunto, texto: input.texto,
          cuentaId: a.cuentaId, contactoId: a.contactoId, negocioId: a.negocioId, asociacion: a.asociacion,
          asociadoEn: asociado ? new Date() : null, ocurridoEn: new Date(input.recibidoEn),
        },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "core.correo_cliente.registrado",
        entidadTipo: "correo_cliente",
        entidadId: fila.id,
        payload: { sentido, asociado, cuentaId: a.cuentaId },
      });
    });
    return { registrado: true, sentido, asociado };
  },
});
