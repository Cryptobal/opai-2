import { z } from "zod";

import { defineCapability, documentoEmitidoConciliable } from "@opai/capabilities";
import { sugerirConciliacion } from "@opai/domain";

import { PERMISO_BANCOS_VER } from "./permisos";
import { montoDe } from "./esquemas";
import { aIso, movimientoDe } from "./util";

const sugerenciaSchema = z.object({
  documentoId: z.string(),
  tipo: z.enum(["documento_emitido", "documento_recibido"]),
  nivel: z.string(),
  confianza: z.number(),
  motivo: z.string(),
  montoDocumento: z.number().int(),
  montoPendiente: z.number().int(),
  diferencia: z.number().int(),
});

export const bancosConciliacionSugerir = defineCapability({
  id: "finanzas.conciliaciones.sugerir",
  descripcion:
    "Sugiere conciliaciones para un movimiento bancario (tres niveles, RUT o monto único) sin marcar pagada.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ movimientoId: z.uuid() }),
  output: z.object({ sugerencias: z.array(sugerenciaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const mov = await movimientoDe(ctx, input.movimientoId);
    if (mov.estado === "por_autorizar" || mov.estado === "ignorado") return { sugerencias: [] };
    const desde = new Date(mov.fecha);
    desde.setUTCDate(desde.getUTCDate() - 15);
    const hasta = new Date(mov.fecha);
    hasta.setUTCDate(hasta.getUTCDate() + 15);

    const [emitidos, recibidos] = await Promise.all([
      ctx.db.documentoEmitido.findMany({
        where: {
          estadoDte: { not: "borrador" },
          fechaEmision: { gte: desde, lte: hasta },
        },
        select: {
          id: true,
          tipoDte: true,
          estadoDte: true,
          cesionEstado: true,
          montoTotal: true,
          montoCobrado: true,
          glosa: true,
          cuentaId: true,
        },
      }),
      ctx.db.documentoRecibido.findMany({
        where: { fechaEmision: { gte: desde, lte: hasta } },
        select: { id: true, montoTotal: true, glosa: true, proveedor: { select: { rut: true } } },
      }),
    ]);
    const cuentaIds = emitidos.map((e) => e.cuentaId);
    const cuentasMap = new Map(
      (
        await ctx.db.cuenta.findMany({
          where: { id: { in: cuentaIds } },
          select: { id: true, rut: true },
        })
      ).map((c) => [c.id, c.rut]),
    );

    const docs = [
      ...emitidos
        .filter((d) => documentoEmitidoConciliable(d))
        .map((d) => ({
          id: d.id,
          tipo: "documento_emitido" as const,
          montoTotal: d.montoTotal,
          montoPendiente: d.montoTotal - d.montoCobrado,
          rut: cuentasMap.get(d.cuentaId) ?? null,
          glosa: d.glosa,
          fecha: null,
        })),
      ...recibidos.map((d) => ({
        id: d.id,
        tipo: "documento_recibido" as const,
        montoTotal: d.montoTotal,
        montoPendiente: d.montoTotal,
        rut: d.proveedor.rut,
        glosa: d.glosa,
        fecha: null,
      })),
    ];

    const montos = new Map<number, number>();
    for (const d of docs) {
      const k = Math.abs(d.montoPendiente);
      montos.set(k, (montos.get(k) ?? 0) + 1);
    }

    const sugerencias = sugerirConciliacion(
      { monto: montoDe(mov.monto), glosa: mov.glosa, fecha: aIso(mov.fecha) },
      docs,
      { montosUnicosVentana: montos },
    );

    if (sugerencias.length && mov.estado === "pendiente") {
      await ctx.db.movimientoBancario.update({
        where: { id: mov.id },
        data: { estado: "sugerido" },
      });
    }

    return { sugerencias };
  },
});
