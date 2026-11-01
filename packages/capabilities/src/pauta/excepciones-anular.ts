import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { anotar } from "./anotar";
import { aFechaDb, diasDelRango, PERMISO_WRITE, puestoParaPauta, rangoSchema } from "./comun";

const anularInput = z.object({ puestoId: uuidSchema }).and(rangoSchema);

/** Anula las excepciones activas de un puesto en un rango: los turnos vuelven a la serie. */
export const excepcionesAnular = defineCapability({
  id: "pauta.excepciones.anular",
  descripcion:
    "Anula las excepciones activas de un puesto en un día o rango de la pauta: los turnos vuelven a cubrirse según su serie. La anulación queda en el historial.",
  permiso: PERMISO_WRITE,
  input: anularInput,
  output: z.object({ puestoId: z.string(), anuladas: z.number().int() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const puesto = await puestoParaPauta(ctx, input.puestoId);
    const dias = diasDelRango(input.desde, input.hasta);
    const donde = {
      puestoId: puesto.id,
      estado: "activa",
      fecha: { gte: aFechaDb(dias[0]!), lte: aFechaDb(dias[dias.length - 1]!) },
    };
    if (dryRun)
      return { puestoId: puesto.id, anuladas: await ctx.db.excepcionPauta.count({ where: donde }) };
    return ctx.transaccion(async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${input.puestoId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
      await puestoParaPauta({ ...ctx, db: tx }, input.puestoId);
      const resultado = await tx.excepcionPauta.updateMany({
        where: donde,
        data: { estado: "anulada", anuladaEn: new Date(), anuladaPor: ctx.usuario?.id ?? null },
      });
      if (resultado.count === 0) throw reglaDeNegocio("No hay excepciones activas en esas fechas.");
      await anotar(tx, ctx, {
        instalacionId: puesto.instalacionId,
        puestoId: puesto.id,
        accion: "excepcion_anulada",
        desde: input.desde,
        hasta: input.hasta ?? input.desde,
        detalle: { anuladas: resultado.count },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "pauta.excepcion.anulada",
        entidadTipo: "puesto",
        entidadId: puesto.id,
        payload: { puestoId: puesto.id, desde: input.desde, hasta: input.hasta ?? input.desde },
      });
      return { puestoId: puesto.id, anuladas: resultado.count };
    });
  },
});
