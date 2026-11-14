import { ESTADOS_AL_DEVOLVER, LIMITES_ROPA } from "@opai/domain";
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { conflicto, noEncontrado } from "../errores";
import { PERMISOS_INVENTARIO } from "./comun";
import { dondeEntregaEnAlcance, entregaSchema, vistaEntrega } from "./entregas-comun";
import { aplicarMovimiento } from "./ropa-movimiento";

/**
 * R22: cierra una entrega abierta. Un activo vuelve a «Disponible» o a «En reparación» si vuelve
 * dañado; la ropa devuelta vuelve a las existencias de su talla.
 */
export const entregasDevolver = defineCapability({
  id: "inventario.entregas.devolver",
  descripcion:
    "Registra la devolución de una entrega abierta: el activo vuelve a «Disponible» (o a «En reparación» si vuelve dañado) y la ropa devuelta vuelve a las existencias de su talla.",
  permiso: PERMISOS_INVENTARIO.gestionar,
  input: z.object({
    id: uuidSchema,
    estadoActivo: z.enum(ESTADOS_AL_DEVOLVER).default("disponible").describe("Solo para activos."),
    nota: z.string().trim().max(LIMITES_ROPA.notaMax).optional(),
  }),
  output: entregaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.inventarioEntrega.findFirst({ where: { id: input.id, AND: [await dondeEntregaEnAlcance(ctx)] } });
    if (!actual) throw noEncontrado("La entrega");
    if (actual.devueltaEn) throw conflicto("Esta entrega ya se devolvió.");
    // Nunca antes de la entrega (CHECK), aunque los relojes de la app y la base difieran.
    const ahora = new Date();
    const cierre = { devueltaEn: ahora > actual.entregadaEn ? ahora : actual.entregadaEn, notaDevolucion: input.nota || null };
    if (dryRun) return vistaEntrega(ctx, { ...actual, ...cierre });
    const fila = await ctx.transaccion(async (tx) => {
      const r = await tx.inventarioEntrega.updateMany({ where: { id: actual.id, devueltaEn: null }, data: cierre });
      if (r.count !== 1) throw conflicto("Esta entrega ya se devolvió.");
      if (actual.activoId) {
        const a = await tx.inventarioActivo.updateMany({
          where: { id: actual.activoId, estado: "asignado" },
          data: { estado: input.estadoActivo },
        });
        if (a.count !== 1) throw conflicto("El activo no figura como asignado: revisa su estado.");
      } else if (actual.tipoId && actual.talla && actual.cantidad) {
        const nota = cierre.notaDevolucion;
        await aplicarMovimiento(ctx, tx, { tipoId: actual.tipoId, talla: actual.talla, delta: actual.cantidad, motivo: "devolucion", nota });
      }
      await ctx.eventos.emitir(tx, {
        tipo: "inventario.entrega.devuelta",
        entidadTipo: "inventario_entrega",
        entidadId: actual.id,
        payload: { clase: actual.activoId ? "activo" : "ropa" },
      });
      return tx.inventarioEntrega.findFirstOrThrow({ where: { id: actual.id } });
    });
    return vistaEntrega(ctx, fila);
  },
});
