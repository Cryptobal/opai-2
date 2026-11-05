import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { semanaDeCobroEsperado } from "@opai/domain";
import { PERMISO_GESTIONAR } from "./permisos";
import { aFecha, lunesHoy } from "./util";

const fechaIso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe ser AAAA-MM-DD.")
  .refine((f) => new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f, "La fecha no existe en el calendario.")
  .refine((f) => f >= "2000-01-01" && f <= "2100-12-31", "La fecha debe estar entre los años 2000 y 2100.");

export const cobroEsperadoFijar = defineCapability({
  id: "finanzas.cobros.fijar_fecha_esperada",
  descripcion:
    "Fija a mano la fecha esperada de cobro de una factura en el flujo de caja, o vuelve a la automática (promedio real de pago del cliente con 3 o más facturas pagadas; si no, el vencimiento) si no se pasa fecha. Una fecha ya pasada se proyecta en la semana en curso. Con vista previa.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({
    documentoId: z.uuid(),
    fecha: fechaIso.nullish().describe("Día esperado del cobro; vacío para volver a la fecha automática."),
  }),
  output: z.object({
    documentoId: z.string(),
    fecha: z.string().nullable(),
    semana: z.string().nullable().describe("Semana del flujo (lunes) donde cae el cobro con la fecha fijada."),
    automatica: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const doc = await ctx.db.documentoEmitido.findFirst({
      where: { id: input.documentoId },
      select: { id: true, tipoDte: true, estadoDte: true, estadoCobro: true, cesionEstado: true },
    });
    if (!doc) throw noEncontrado("Factura");
    if (doc.tipoDte !== 33 && doc.tipoDte !== 34) throw reglaDeNegocio("Solo las facturas (33 y 34) tienen fecha esperada de cobro.");
    if (doc.estadoCobro === "pagada" || doc.estadoCobro === "cedida" || doc.cesionEstado === "cedido")
      throw reglaDeNegocio("La factura ya está pagada o cedida: no se proyecta en el flujo.");
    if (!["borrador", "enviado", "aceptado"].includes(doc.estadoDte))
      throw reglaDeNegocio("La factura no está vigente: no se proyecta en el flujo.");
    const salida = {
      documentoId: doc.id,
      fecha: input.fecha ?? null,
      semana: input.fecha ? semanaDeCobroEsperado(input.fecha, lunesHoy()) : null,
      automatica: !input.fecha,
    };
    if (dryRun) return salida;
    await ctx.transaccion(async (tx) => {
      if (input.fecha) {
        await tx.flujoCobroEsperado.upsert({
          where: { documentoId: doc.id },
          create: { tenantId: ctx.tenantId, documentoId: doc.id, fecha: aFecha(input.fecha), createdById: ctx.actor.tipo === "user" ? ctx.actor.id : null },
          update: { fecha: aFecha(input.fecha) },
        });
      } else {
        const { count } = await tx.flujoCobroEsperado.deleteMany({ where: { documentoId: doc.id } });
        if (count === 0) return; // ya estaba automática: nada cambió, no se emite el evento
      }
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.cobro_esperado_cambiado",
        entidadTipo: "documentoEmitido",
        entidadId: doc.id,
      });
    });
    return salida;
  },
});

