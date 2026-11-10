// Borrador de nota de débito (56) de cargo sobre una factura emitida (CAR-234). No toca el SII: se emite después con
// `finanzas.ventas.emitir`, igual que la factura (folio del CAF 56, firma fuera de la transacción, vista previa).
import { z } from "zod";

import { vencimientoPago } from "@opai/domain";

import { defineCapability } from "../define";
import { aFecha, escribirConEvento } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { PLAZO_PAGO_DEFECTO } from "./comun";
import { fechaEmisionBorrador, validarMontosDeLineas } from "./ventas-borrador-validar";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  cuentaDe,
  documentoEmitidoIdSchema,
  lineaInputSchema,
} from "./ventas-comun";
import {
  CODIGO_REFERENCIA_ND_CARGO,
  cargarFacturaParaCargo,
  montosNotaDebitoCargo,
  referenciaFacturaCargo,
} from "./ventas-nd-cargo";
import { ventaSchema } from "./vistas-venta";

export const ventasCrearBorradorNotaDebito = defineCapability({
  id: "finanzas.ventas.crear_borrador_nota_debito",
  descripcion:
    "Crea el borrador de una nota de débito (56) que agrega un cargo a una factura 33 o 34 ya emitida (CodRef 3, corrige montos), con motivo y líneas. No se envía al SII: se revisa y emite después con la emisión de ventas.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    facturaId: documentoEmitidoIdSchema.describe(
      "Factura 33 o 34 emitida a la que se agrega el cargo.",
    ),
    motivo: z
      .string()
      .trim()
      .min(3)
      .max(300)
      .describe("Razón de la nota de débito (obligatoria, va como RazonRef)."),
    lineas: z
      .array(lineaInputSchema)
      .min(1)
      .max(60)
      .describe("Detalle del cargo; montos netos (33) o exentos (34) según la factura."),
    plazoPagoDias: z.number().int().min(0).max(365).default(PLAZO_PAGO_DEFECTO),
    fechaEmision: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD.")
      .optional()
      .describe(
        "Fecha de emisión AAAA-MM-DD, hoy o anterior y no antes de la factura. Si falta, hoy.",
      ),
  }),
  output: ventaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const factura = await cargarFacturaParaCargo(ctx, input.facturaId);
    const cuenta = await cuentaDe(ctx, factura.cuentaId);
    if (!cuenta.rut)
      throw reglaDeNegocio("El cliente debe tener RUT para emitir la nota de débito.");
    validarMontosDeLineas(input.lineas);
    const montos = montosNotaDebitoCargo(
      factura.tipoDte,
      input.lineas.map((l) => l.monto),
    );
    const emision = fechaEmisionBorrador(input.fechaEmision);
    const referencia = referenciaFacturaCargo(factura, input.motivo, emision);
    const lineas = input.lineas.map((l, orden) => ({
      tenantId: ctx.tenantId,
      orden,
      glosa: l.glosa,
      monto: l.monto,
      ...(l.cantidad ? { cantidad: l.cantidad.replace(",", ".") } : {}),
      ...(l.unidad ? { unidad: l.unidad } : {}),
      ...(l.precioUnitario !== undefined ? { precioUnitario: l.precioUnitario } : {}),
      ...(l.descuentoPct !== undefined ? { descuentoPct: l.descuentoPct } : {}),
    }));
    const fila = {
      cuentaId: factura.cuentaId,
      instalacionId: factura.instalacionId,
      cotizacionId: factura.cotizacionId,
      tipoDte: 56,
      fechaEmision: aFecha(emision),
      fechaVencimiento: aFecha(vencimientoPago(emision, input.plazoPagoDias)),
      montoNeto: montos.neto,
      montoExento: montos.exento,
      montoIva: montos.iva,
      montoOtros: montos.otros,
      montoTotal: montos.total,
      glosa: input.motivo,
      documentoReferenciaId: factura.id,
      codigoReferencia: CODIGO_REFERENCIA_ND_CARGO,
      motivoNc: input.motivo,
    };
    if (dryRun) {
      const { vistaVenta } = await import("./vistas-venta");
      const vistaLineas = lineas.map((l, i) => ({
        id: `dry-${i}`,
        orden: l.orden,
        glosa: l.glosa,
        monto: l.monto,
      }));
      return vistaVenta(
        {
          ...fila,
          id: "",
          folio: null,
          estadoDte: "borrador",
          estadoCobro: "pendiente",
          montoCobrado: 0,
          trackIdSii: null,
        },
        cuenta,
        vistaLineas,
      );
    }
    const creado = await escribirConEvento(
      ctx,
      { tipo: "finanzas.venta.borrador_creado", entidadTipo: "documento_emitido" },
      (tx) =>
        tx.documentoEmitido.create({
          data: {
            ...fila,
            tenantId: ctx.tenantId,
            lineas: { create: lineas },
            referencias: { create: [{ ...referencia, tenantId: ctx.tenantId }] },
          },
        }),
    );
    return vistaDeDocumento(ctx, creado.id);
  },
});
