import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { PERMISO_GESTIONAR } from "./permisos";

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "El mes debe ser AAAA-MM.");

export const impuestosPostergarIva = defineCapability({
  id: "finanzas.impuestos.postergar_iva",
  descripcion:
    "Marca o desmarca, para un mes, la postergación del pago del IVA de ese mes de M+1 a M+2 en el flujo de caja. El PPM no se posterga y se paga siempre en M+1. Con vista previa.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({
    periodo: periodoSchema.describe("Mes del IVA (el que se declara), aaaa-mm."),
    postergar: z.boolean().describe("true posterga el pago a M+2; false vuelve a M+1."),
  }),
  output: z.object({ periodo: z.string(), postergado: z.boolean(), cambio: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.flujoIvaPostergado.findFirst({ where: { periodo: input.periodo }, select: { id: true } });
    const cambio = Boolean(actual) !== input.postergar;
    const salida = { periodo: input.periodo, postergado: input.postergar, cambio };
    if (dryRun || !cambio) return salida;
    await ctx.transaccion(async (tx) => {
      if (input.postergar) {
        await tx.flujoIvaPostergado.create({
          data: { tenantId: ctx.tenantId, periodo: input.periodo, createdById: ctx.actor.tipo === "user" ? ctx.actor.id : null },
        });
      } else {
        await tx.flujoIvaPostergado.deleteMany({ where: { periodo: input.periodo } });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.iva_postergacion_cambiada",
        entidadTipo: "flujoIvaPostergado",
        entidadId: input.periodo,
      });
    });
    return salida;
  },
});
