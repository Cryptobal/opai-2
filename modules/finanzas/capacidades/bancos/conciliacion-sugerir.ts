import { z } from "zod";

import { defineCapability, documentoEmitidoConciliable, notasCreditoPorDocumento } from "@opai/capabilities";
import { saldoPendiente, sugerirConciliacion } from "@opai/domain";

import { PERMISO_BANCOS_VER } from "./permisos";
import { montoDe } from "./esquemas";
import { reglasQueCalzan, sugerenciaReglaSchema } from "./reglas-sugerir";
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
  /** Folio y cliente/proveedor para reconocer el documento sin mostrar su id. */
  folio: z.number().int().nullable(),
  tipoDte: z.number().int().nullable(),
  contraparte: z.string().nullable(),
});

export const bancosConciliacionSugerir = defineCapability({
  id: "finanzas.conciliaciones.sugerir",
  descripcion:
    "Sugiere conciliaciones para un movimiento bancario (facturas por RUT o monto único y reglas del banco) sin marcar nada pagado.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ movimientoId: z.uuid() }),
  output: z.object({
    sugerencias: z.array(sugerenciaSchema),
    /** Reglas del banco que calzan: proponen la fila del flujo y la cuenta contable (CAR-328). */
    reglas: z.array(sugerenciaReglaSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s, input) => [input.movimientoId, ...s.sugerencias.map((x) => x.documentoId), ...s.reglas.map((r) => r.reglaId)],
  async handler(ctx, input) {
    const mov = await movimientoDe(ctx, input.movimientoId);
    if (mov.estado === "por_autorizar" || mov.estado === "ignorado") return { sugerencias: [], reglas: [] };
    const reglas = await reglasQueCalzan(ctx, mov);
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
          folio: true,
        },
      }),
      ctx.db.documentoRecibido.findMany({
        where: { fechaEmision: { gte: desde, lte: hasta } },
        select: { id: true, folio: true, montoTotal: true, glosa: true, proveedor: { select: { rut: true, razonSocial: true } } },
      }),
    ]);
    const nc = await notasCreditoPorDocumento(ctx.db, emitidos.map((e) => e.id));
    const cuentaIds = emitidos.map((e) => e.cuentaId);
    const cuentasMap = new Map(
      (
        await ctx.db.cuenta.findMany({
          where: { id: { in: cuentaIds } },
          select: { id: true, rut: true, nombre: true },
        })
      ).map((c) => [c.id, c]),
    );

    const docs = [
      ...emitidos
        .filter((d) => documentoEmitidoConciliable(d))
        .map((d) => ({
          id: d.id,
          tipo: "documento_emitido" as const,
          montoTotal: d.montoTotal,
          montoPendiente: saldoPendiente({ ...d, montoNotasCredito: nc.get(d.id) ?? 0 }),
          rut: cuentasMap.get(d.cuentaId)?.rut ?? null,
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

    if ((sugerencias.length || reglas.length) && mov.estado === "pendiente") {
      await ctx.db.movimientoBancario.update({
        where: { id: mov.id },
        data: { estado: "sugerido" },
      });
    }

    const info = new Map<string, { folio: number | null; tipoDte: number | null; contraparte: string | null }>([
      ...emitidos.map((d) => [d.id, { folio: d.folio, tipoDte: d.tipoDte, contraparte: cuentasMap.get(d.cuentaId)?.nombre ?? null }] as const),
      ...recibidos.map((d) => [d.id, { folio: d.folio, tipoDte: null, contraparte: d.proveedor.razonSocial }] as const),
    ]);
    return {
      reglas,
      sugerencias: sugerencias.map((x) => ({ ...x, ...(info.get(x.documentoId) ?? { folio: null, tipoDte: null, contraparte: null }) })),
    };
  },
});
