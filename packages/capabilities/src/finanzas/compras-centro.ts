import { z } from "zod";

import { vistaPreviaAsignacion } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { escribirConEvento } from "../core/maestros/comun";
import { noEncontrado } from "../errores";
import { PERMISO_COMPRAS, centroDe, centroRefSchema } from "./comun";

export const comprasAsignarCentro = defineCapability({
  id: "finanzas.compras.asignar_centro",
  descripcion:
    "Asigna un centro de costo (una instalación o el general «Administración / Oficina central») a varios documentos del libro de compras a la vez. La vista previa dice cuántos cambian, cuántos ya lo tienen y cuántos tienen otro centro; por defecto no pisa un centro ya asignado, salvo que se pida sobrescribir.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    documentoIds: z.array(uuidSchema).min(1).max(200),
    centro: centroRefSchema,
    sobrescribir: z.boolean().default(false),
  }),
  output: z.object({
    centroCostoId: z.string().nullable(),
    centroCostoNombre: z.string(),
    aplican: z.array(z.string()),
    sinCambio: z.array(z.string()),
    conOtroCentro: z.array(z.string()),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const ids = [...new Set(input.documentoIds)];
    const filas = await ctx.db.documentoRecibido.findMany({
      where: { id: { in: ids } },
      select: { id: true, centroCostoId: true },
    });
    if (filas.length !== ids.length) throw noEncontrado("Alguno de los documentos");
    const destino = await centroDe(ctx, input.centro, !dryRun);
    // Sin centro creado (vista previa de un centro que nunca se usó), nadie lo tiene todavía.
    const vista = vistaPreviaAsignacion(filas, destino.id ?? "", input.sobrescribir);
    if (!dryRun && vista.aplican.length > 0 && destino.id) {
      const centroCostoId = destino.id;
      await escribirConEvento(
        ctx,
        {
          tipo: "finanzas.compras.centro_asignado",
          entidadTipo: "centro_costo",
          payload: () => ({ cantidad: vista.aplican.length }),
        },
        async (tx) => {
          await tx.documentoRecibido.updateMany({ where: { id: { in: vista.aplican } }, data: { centroCostoId } });
          return { id: centroCostoId };
        },
      );
    }
    return { centroCostoId: destino.id, centroCostoNombre: destino.nombre, ...vista };
  },
});
