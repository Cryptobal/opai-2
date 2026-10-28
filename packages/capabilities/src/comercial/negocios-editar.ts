import { z } from "zod";

import { defineCapability } from "../define";
import { conflicto } from "../errores";
import { uuidSchema } from "../core/esquemas";
import { definidos, opcionalAFecha } from "../core/maestros/comun";
import { PERMISO_MANAGE, negocioDe, negocioSchema, vistaNegocio } from "./comun";
import { camposNegocio } from "./negocios-escritura";
import { responsableValido } from "./validaciones";

export const negociosUpdate = defineCapability({
  id: "comercial.negocios.update",
  descripcion:
    "Actualiza los datos editables de un negocio (título, tipo, origen, responsable, probabilidad, monto estimado y fechas). Solo cambia lo enviado.",
  permiso: PERMISO_MANAGE,
  input: z.object({ id: uuidSchema, ...z.object(camposNegocio).partial().shape }),
  output: negocioSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await negocioDe(ctx, id);
    await responsableValido(ctx, cambios.responsableId);
    if (cambios.montoEstimadoMensual !== undefined && actual.valorMensual != null) {
      throw conflicto("El monto lo fija la cotización vigente; no se edita a mano.");
    }
    const data = definidos({
      titulo: cambios.titulo,
      tipoId: cambios.tipoId,
      origenId: cambios.origenId,
      responsableId: cambios.responsableId,
      probabilidad: cambios.probabilidad,
      montoEstimadoMensual: cambios.montoEstimadoMensual,
      cierreEstimado: opcionalAFecha(cambios.cierreEstimado),
      inicioServicioEstimado: opcionalAFecha(cambios.inicioServicioEstimado),
    });
    if (dryRun) return vistaNegocio({ ...actual, ...data });
    const n = await ctx.transaccion(async (tx) => {
      const r = await tx.negocio.update({ where: { id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "comercial.negocio.actualizado",
        entidadTipo: "negocio",
        entidadId: r.id,
        payload: { campos: Object.keys(data) },
      });
      return r;
    });
    return vistaNegocio(n);
  },
});
