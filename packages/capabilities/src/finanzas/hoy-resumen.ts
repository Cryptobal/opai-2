import { z } from "zod";

import { estaVencida, evaluarRecordatorio, saldoPendiente } from "@opai/domain";

import { defineCapability } from "../define";
import { PERMISO_READ } from "./comun";
import { documentosCobrables, parametrosCobranza } from "./cobranza-datos";

const grupoSchema = z.object({
  cantidad: z.number().int(),
  montoClp: z.number().int().describe("CLP enteros; 0 si el grupo no suma dinero."),
});

export const hoyEnFinanzas = defineCapability({
  id: "finanzas.hoy.resumen",
  descripcion:
    "Bandeja «Hoy en Finanzas»: qué emitir (borradores y programaciones que ya tocan), qué cobrar (facturas vencidas y recordatorios que tocan hoy) y qué conciliar (movimientos bancarios pendientes), con la cantidad y el monto de cada grupo.",
  permiso: PERMISO_READ,
  input: z.object({}),
  output: z.object({
    hoy: z.string(),
    emitir: z.object({ borradores: grupoSchema, programacionesPorGenerar: grupoSchema }),
    cobrar: z.object({ vencidas: grupoSchema, recordatoriosQueTocan: grupoSchema }),
    conciliar: z.object({ movimientosPendientes: grupoSchema }),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await parametrosCobranza(ctx);
    const ahora = new Date();
    const [docs, borradores, programaciones, movimientos, gestiones] = await Promise.all([
      documentosCobrables(ctx),
      ctx.db.documentoEmitido.aggregate({
        where: { estadoDte: "borrador", tipoDte: { in: [33, 34] } },
        _count: { _all: true },
        _sum: { montoTotal: true },
      }),
      ctx.db.ventasProgramacion.count({ where: { activa: true, proximaEjecucionEn: { lte: ahora } } }),
      ctx.db.movimientoBancario.groupBy({
        by: ["estado"],
        where: { estado: { in: ["pendiente", "sugerido", "por_autorizar"] } },
        _count: { _all: true },
        _sum: { monto: true },
      }),
      ctx.db.cobranzaGestion.findMany({
        where: { origen: "automatico", resultado: "enviado", paso: { not: null } },
        select: { documentoId: true, paso: true },
      }),
    ]);
    const vencidas = docs.filter((d) => estaVencida(d, p.hoy, p.plazoDefectoDias));
    const tocan = vencidas.filter(
      (d) =>
        evaluarRecordatorio({
          doc: d,
          hoy: p.hoy,
          pasos: p.pasos,
          ambito: p.ambito,
          plazoDefectoDias: p.plazoDefectoDias,
          pasosEnviados: gestiones.filter((g) => g.documentoId === d.id).map((g) => (g.paso as number) ?? 0),
        }).accion === "enviar",
    );
    const suma = (l: typeof vencidas) => l.reduce((s, d) => s + saldoPendiente(d), 0);
    return {
      hoy: p.hoy,
      emitir: {
        borradores: { cantidad: borradores._count._all, montoClp: borradores._sum.montoTotal ?? 0 },
        programacionesPorGenerar: { cantidad: programaciones, montoClp: 0 },
      },
      cobrar: {
        vencidas: { cantidad: vencidas.length, montoClp: suma(vencidas) },
        recordatoriosQueTocan: { cantidad: tocan.length, montoClp: suma(tocan) },
      },
      conciliar: {
        movimientosPendientes: {
          cantidad: movimientos.reduce((s, m) => s + m._count._all, 0),
          montoClp: Math.abs(movimientos.reduce((s, m) => s + Number(m._sum.monto ?? 0n), 0)),
        },
      },
    };
  },
});
