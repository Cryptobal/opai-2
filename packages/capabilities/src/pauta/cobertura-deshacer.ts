import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { anotar } from "./anotar";
import { aFechaDb, diaSchema, PERMISO_WRITE, puestoParaPauta } from "./comun";

const inputSchema = z.object({ puestoId: uuidSchema, fecha: diaSchema });
const salidaSchema = z.object({ puestoId: z.string(), fecha: z.string(), deshecho: z.literal(true) });

/** Anula la confirmación operativa de cobertura de un día. */
export const coberturaDeshacer = defineCapability({
  id: "pauta.cobertura.deshacer",
  descripcion:
    "Deshace la confirmación operativa de cobertura de un puesto en una fecha: anula el registro activo sin tocar la serie ni las excepciones.",
  permiso: PERMISO_WRITE,
  input: inputSchema,
  output: salidaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const reg = await ctx.db.registroOperativoPauta.findFirst({
      where: {
        puestoId: puesto.id,
        fecha: aFechaDb(input.fecha),
        estado: "activa",
        tipo: "cobertura_confirmada",
      },
    });
    if (!reg) throw noEncontrado("La confirmación de cobertura");
    if (dryRun) return { puestoId: puesto.id, fecha: input.fecha, deshecho: true as const };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      const actual = await tx.registroOperativoPauta.findFirst({
        where: { id: reg.id, estado: "activa" },
      });
      if (!actual) throw noEncontrado("La confirmación de cobertura");
      await tx.registroOperativoPauta.update({
        where: { id: actual.id },
        data: { estado: "anulada", anuladaPor: ctx.usuario?.id ?? null, anuladaEn: new Date() },
      });
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "cobertura_deshacer",
        desde: input.fecha,
        hasta: input.fecha,
        detalle: {},
      });
      return { puestoId: puesto.id, fecha: input.fecha, deshecho: true as const };
    });
  },
});
