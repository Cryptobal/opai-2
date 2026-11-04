import { z } from "zod";

import { defineCapability } from "../define";
import { aFecha, diaSchema, hoy } from "../core/maestros/comun";
import { PERMISO_READ } from "./comun";
import { montoMensual, porcentaje } from "./informes-calculo";

const MS_DIA = 86_400_000;
const hace = (dias: number) => new Date(Date.now() - dias * MS_DIA).toISOString().slice(0, 10);

const motivoFila = z.object({
  motivoId: z.string().nullable(),
  codigo: z.string().nullable(),
  nombre: z.string(),
  cantidad: z.number().int(),
  porcentaje: z.number().int().describe("Entero 0–100 sobre el total de perdidos del período."),
  montoMensualClp: z
    .number()
    .int()
    .describe("CLP enteros: suma del monto mensual de esos negocios."),
});

export const informesPerdidosPorMotivo = defineCapability({
  id: "comercial.informes.perdidos_por_motivo",
  descripcion:
    "Informe de negocios perdidos agrupados por motivo de pérdida en un rango de fechas (por defecto los últimos 90 días): cantidad, porcentaje y monto mensual perdido de cada motivo, para entender por qué se pierde.",
  permiso: PERMISO_READ,
  input: z.object({
    desde: diaSchema.optional().describe("Primer día (aaaa-mm-dd). Por defecto, hace 90 días."),
    hasta: diaSchema.optional().describe("Último día, inclusive (aaaa-mm-dd). Por defecto, hoy."),
  }),
  output: z.object({
    desde: z.string(),
    hasta: z.string(),
    totalPerdidos: z.number().int(),
    montoMensualPerdidoClp: z.number().int(),
    motivos: z.array(motivoFila),
  }),
  efecto: "lectura",
  dryRun: false,
  // Agregado por motivo: no revela negocios ni personas concretas.
  auditarLectura: () => [],
  async handler(ctx, input) {
    const desde = input.desde ?? hace(90);
    const hasta = input.hasta ?? hoy();
    const fin = new Date(aFecha(hasta).getTime() + MS_DIA);
    const [negocios, motivos] = await Promise.all([
      ctx.db.negocio.findMany({
        where: { estado: "perdido", perdidoEn: { gte: aFecha(desde), lt: fin } },
        select: { motivoPerdidaId: true, valorMensual: true, montoEstimadoMensual: true },
      }),
      ctx.db.motivoPerdida.findMany({ select: { id: true, codigo: true, nombre: true } }),
    ]);
    const grupos = new Map<string | null, { cantidad: number; monto: number }>();
    for (const n of negocios) {
      const k = n.motivoPerdidaId ?? null;
      const g = grupos.get(k) ?? { cantidad: 0, monto: 0 };
      grupos.set(k, { cantidad: g.cantidad + 1, monto: g.monto + montoMensual(n) });
    }
    const filas = [...grupos.entries()]
      .map(([id, g]) => {
        const m = motivos.find((x) => x.id === id);
        return {
          motivoId: id,
          codigo: m?.codigo ?? null,
          nombre: m?.nombre ?? "Sin motivo registrado",
          cantidad: g.cantidad,
          porcentaje: porcentaje(g.cantidad, negocios.length),
          montoMensualClp: g.monto,
        };
      })
      .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre));
    return {
      desde,
      hasta,
      totalPerdidos: negocios.length,
      montoMensualPerdidoClp: filas.reduce((s, f) => s + f.montoMensualClp, 0),
      motivos: filas,
    };
  },
});
