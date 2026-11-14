// Borrador del F29 de un mes (CAR-173, primera parte): IVA débito de las ventas emitidas, IVA crédito de las compras
// recibidas no reclamadas y PPM, con los mismos criterios que la proyección de impuestos del flujo de caja (ADR-073).
// Solo lectura: no declara nada al SII.
import { z } from "zod";

import {
  type DocumentoImpuesto,
  fechaDePago,
  finDePeriodo,
  impuestosPorPeriodo,
  ivaConRemanente,
  sumarMeses,
} from "@opai/domain";

import { defineCapability } from "../define";
import { aFecha } from "../core/maestros/comun";
import { ajusteFinanzas } from "./ajuste-finanzas";
import { PERMISO_READ } from "./comun";
import { DIA_PAGO_IVA_DEFECTO } from "./impuestos-esperados-datos";
import { MESES_REMANENTE, remanenteDelMes } from "./impuestos-remanente";

const periodoSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Período aaaa-mm.");
const TIPOS = [33, 34, 56, 61];
const ESTADOS_VENTA = ["enviado", "aceptado", "anulado_nc"];

const libroSchema = z.object({
  documentos: z.number().int(),
  neto: z.number().int().describe("Las notas de crédito restan."),
  exento: z.number().int(),
  iva: z.number().int(),
});

type Fila = { tipoDte: number; montoNeto: number; montoExento: number; montoIva: number };
const signo = (t: number) => (t === 61 ? -1 : 1);
const libro = (filas: readonly Fila[]) => ({
  documentos: filas.length,
  neto: filas.reduce((a, f) => a + signo(f.tipoDte) * f.montoNeto, 0),
  exento: filas.reduce((a, f) => a + signo(f.tipoDte) * f.montoExento, 0),
  iva: filas.reduce((a, f) => a + signo(f.tipoDte) * f.montoIva, 0),
});

export const impuestosBorradorF29 = defineCapability({
  id: "finanzas.impuestos.borrador_f29",
  descripcion:
    "Borrador del F29 de un mes: IVA débito de las ventas emitidas, IVA crédito de las compras recibidas no reclamadas, remanente de crédito arrastrado de los meses anteriores, IVA a pagar o remanente para el mes siguiente, PPM con la tasa de la empresa y fecha de pago. El remanente no se reajusta por UTM y no se declara nada al SII.",
  permiso: PERMISO_READ,
  input: z.object({ periodo: periodoSchema.describe("Mes del libro, aaaa-mm.") }),
  output: z.object({
    periodo: periodoSchema,
    ventas: libroSchema.describe("Facturas, notas de débito y de crédito emitidas al SII (sin borradores)."),
    compras: libroSchema.extend({
      pendientesRevision: z.number().int().describe("Documentos aún sin aceptar: cuentan, pero pueden reclamarse."),
      reclamados: z.number().int().describe("Documentos reclamados: no dan crédito y no se suman."),
    }),
    debito: z.number().int(),
    credito: z.number().int(),
    remanenteAnterior: z
      .number()
      .int()
      .describe(`Crédito a favor arrastrado de hasta ${MESES_REMANENTE} meses anteriores, sin reajuste por UTM.`),
    ivaAPagar: z.number().int().describe("Débito − crédito − remanente anterior, si es positivo."),
    remanenteMes: z.number().int().describe("Crédito que queda a favor para el mes siguiente."),
    tasaPpmBps: z.number().int().describe("Puntos base sobre ventas netas y exentas (100 = 1 %)."),
    ppm: z.number().int(),
    totalAPagar: z.number().int().describe("IVA a pagar + PPM."),
    fechaPago: z.string().describe("Día de pago del F29 (aaaa-mm-dd), según el calendario de la empresa."),
    ivaPostergado: z.boolean().describe("El IVA de este mes está marcado para pagarse en M+2."),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const desde = aFecha(`${input.periodo}-01`);
    const hasta = aFecha(finDePeriodo(input.periodo));
    const sel = { tipoDte: true, montoNeto: true, montoExento: true, montoIva: true } as const;
    const [ventas, compras, reclamados, tasaPpmBps, ajustes, postergado, remanenteAnterior] = await Promise.all([
      ctx.db.documentoEmitido.findMany({
        where: { estadoDte: { in: ESTADOS_VENTA }, tipoDte: { in: TIPOS }, fechaEmision: { gte: desde, lt: hasta } },
        select: sel,
      }),
      ctx.db.documentoRecibido.findMany({
        where: { estadoRecepcion: { not: "reclamado" }, tipoDte: { in: TIPOS }, fechaRecepcion: { gte: desde, lt: hasta } },
        select: { ...sel, estadoRecepcion: true },
      }),
      ctx.db.documentoRecibido.count({
        where: { estadoRecepcion: "reclamado", tipoDte: { in: TIPOS }, fechaRecepcion: { gte: desde, lt: hasta } },
      }),
      ajusteFinanzas(ctx, "flujo_tasa_ppm_bps"),
      ctx.db.flujoAjustes.findFirst({ select: { calendarioPagos: true } }),
      ctx.db.flujoIvaPostergado.findFirst({ where: { periodo: input.periodo }, select: { periodo: true } }),
      remanenteDelMes(ctx, input.periodo),
    ]);
    const fecha = `${input.periodo}-01`;
    const doc = (f: Fila): DocumentoImpuesto => ({ fecha, ...f });
    const [imp] = impuestosPorPeriodo({ ventas: ventas.map(doc), compras: compras.map(doc), tasaPpmBps });
    const debito = imp?.debito ?? 0;
    const credito = imp?.credito ?? 0;
    const ppm = imp?.ppm ?? 0;
    const { ivaAPagar, remanenteSiguiente } = ivaConRemanente(debito, credito, remanenteAnterior);
    const dia = Number((ajustes?.calendarioPagos as { iva?: number } | null)?.iva ?? DIA_PAGO_IVA_DEFECTO);
    return {
      periodo: input.periodo,
      ventas: libro(ventas),
      compras: {
        ...libro(compras),
        pendientesRevision: compras.filter((c) => c.estadoRecepcion === "pendiente_revision").length,
        reclamados,
      },
      debito,
      credito,
      remanenteAnterior,
      ivaAPagar,
      remanenteMes: remanenteSiguiente,
      tasaPpmBps,
      ppm,
      totalAPagar: ivaAPagar + ppm,
      fechaPago: fechaDePago(sumarMeses(input.periodo, 1), dia),
      ivaPostergado: postergado !== null,
    };
  },
});
