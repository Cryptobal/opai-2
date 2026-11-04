import { z } from "zod";

import { finDePeriodo } from "@opai/domain";

import { defineCapability } from "../define";
import { aFecha, dia, hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { PERMISO_READ } from "./comun";
import {
  periodosEntre,
  ranking,
  resultadoPorMes,
  type DocumentoParaResultado,
} from "./resultados-calculo";

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período aaaa-mm.");
const MAX_MESES = 24;

/** Período `n` meses antes de `periodo` (aaaa-mm). */
function mesesAntes(periodo: string, n: number): string {
  const d = new Date(Date.UTC(Number(periodo.slice(0, 4)), Number(periodo.slice(5, 7)) - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

const contraparte = z.object({ id: z.string(), nombre: z.string(), montoClp: z.number().int() });

export const reporteResultados = defineCapability({
  id: "finanzas.reportes.resultados",
  descripcion:
    "Resultado operacional por mes entre dos períodos (por defecto los últimos 6 meses): ventas, compras y su diferencia, todo sin IVA, más los 5 clientes y los 5 proveedores de mayor monto. Las ventas toman la fecha de emisión sin borradores y las compras la fecha de recepción; las notas de crédito restan. No es un estado de resultados contable: no incluye remuneraciones ni asientos.",
  permiso: PERMISO_READ,
  input: z.object({
    desde: periodoSchema
      .optional()
      .describe("Primer mes, aaaa-mm. Por defecto, 5 meses antes de hasta."),
    hasta: periodoSchema.optional().describe("Último mes, aaaa-mm. Por defecto, el mes actual."),
  }),
  output: z.object({
    desde: periodoSchema,
    hasta: periodoSchema,
    meses: z.array(
      z.object({
        periodo: periodoSchema,
        ventasClp: z.number().int(),
        comprasClp: z.number().int(),
        resultadoClp: z.number().int(),
        ventasDocumentos: z.number().int(),
        comprasDocumentos: z.number().int(),
      }),
    ),
    totales: z.object({
      ventasClp: z.number().int(),
      comprasClp: z.number().int(),
      resultadoClp: z.number().int(),
    }),
    topClientes: z.array(contraparte),
    topProveedores: z.array(contraparte),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => [...s.topClientes, ...s.topProveedores].map((c) => c.id),
  async handler(ctx, input) {
    const hasta = input.hasta ?? hoy().slice(0, 7);
    const desde = input.desde ?? mesesAntes(hasta, 5);
    const periodos = periodosEntre(desde, hasta);
    if (periodos.length === 0 || periodos.length > MAX_MESES) {
      throw reglaDeNegocio(
        `El rango debe ir de 1 a ${MAX_MESES} meses y «desde» no puede ser posterior a «hasta».`,
      );
    }
    const rango = { gte: aFecha(`${desde}-01`), lt: aFecha(finDePeriodo(hasta)) };
    const [emitidos, recibidos] = await Promise.all([
      ctx.db.documentoEmitido.findMany({
        where: { fechaEmision: rango, estadoDte: { not: "borrador" } },
        select: {
          tipoDte: true,
          fechaEmision: true,
          montoNeto: true,
          montoExento: true,
          cuentaId: true,
        },
      }),
      ctx.db.documentoRecibido.findMany({
        where: { fechaRecepcion: rango },
        select: {
          tipoDte: true,
          fechaRecepcion: true,
          montoNeto: true,
          montoExento: true,
          proveedorId: true,
        },
      }),
    ]);
    const ventas: DocumentoParaResultado[] = emitidos.map((d) => ({
      tipoDte: d.tipoDte,
      fecha: dia(d.fechaEmision) ?? "",
      montoNeto: d.montoNeto,
      montoExento: d.montoExento,
      contraparteId: d.cuentaId,
    }));
    const compras: DocumentoParaResultado[] = recibidos.map((d) => ({
      tipoDte: d.tipoDte,
      fecha: dia(d.fechaRecepcion) ?? "",
      montoNeto: d.montoNeto,
      montoExento: d.montoExento,
      contraparteId: d.proveedorId,
    }));
    const meses = resultadoPorMes(periodos, ventas, compras);
    const [rc, rp] = [ranking(ventas, 5), ranking(compras, 5)];
    const [cuentas, proveedores] = await Promise.all([
      rc.length
        ? ctx.db.cuenta.findMany({
            where: { id: { in: rc.map((r) => r.id) } },
            select: { id: true, nombre: true },
          })
        : Promise.resolve([]),
      rp.length
        ? ctx.db.proveedor.findMany({
            where: { id: { in: rp.map((r) => r.id) } },
            select: { id: true, razonSocial: true },
          })
        : Promise.resolve([]),
    ]);
    const suma = (k: "ventasClp" | "comprasClp") => meses.reduce((s, m) => s + m[k], 0);
    return {
      desde,
      hasta,
      meses,
      totales: {
        ventasClp: suma("ventasClp"),
        comprasClp: suma("comprasClp"),
        resultadoClp: suma("ventasClp") - suma("comprasClp"),
      },
      topClientes: rc.map((r) => ({
        ...r,
        nombre: cuentas.find((c) => c.id === r.id)?.nombre ?? "—",
      })),
      topProveedores: rp.map((r) => ({
        ...r,
        nombre: proveedores.find((p) => p.id === r.id)?.razonSocial ?? "—",
      })),
    };
  },
});
