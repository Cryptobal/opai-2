import { z } from "zod";

import { CODIGOS_REFERENCIA_SII, validarMontosVenta, validarReferenciaSii, vencimientoPago } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, escribirConEvento, hoy, textoOpcional } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import { PLAZO_PAGO_DEFECTO } from "./comun";
import { vistaDeDocumento } from "./ventas-consulta";
import {
  PERMISO_VENTAS,
  cotizacionDe,
  cuentaDe,
  instalacionDe,
  lineaInputSchema,
  montosDesdeLineas,
} from "./ventas-comun";
import { ventaSchema } from "./vistas-venta";

const tipoBorradorSchema = z.union([z.literal(33), z.literal(34)]);

const diaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD.");

const referenciaBorradorSchema = z.object({
  tipoDteRef: z
    .number()
    .int()
    .refine((n) => CODIGOS_REFERENCIA_SII.includes(n), {
      message: `Referencia fuera del catálogo del SII (${CODIGOS_REFERENCIA_SII.join(", ")}).`,
    })
    .describe("Tipo de referencia del catálogo SII: 801 orden de compra, 802 HES, 803 contrato, 804 resolución, 52 guía."),
  folioRef: z.number().int().min(1).describe("Folio o número del documento referenciado."),
  fechaRef: diaIso.describe("Fecha del documento referenciado (FchRef)."),
  codigoRef: z.number().int().min(1).max(3).default(1),
  razonRef: textoOpcional(90),
});

export const ventasCrearBorrador = defineCapability({
  id: "finanzas.ventas.crear_borrador",
  descripcion:
    "Crea un borrador de factura electrónica (33) o exenta (34) para un cliente, con líneas de detalle y plazo de pago. Valida montos y referencias de instalación o cotización antes de guardar.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    cuentaId: uuidSchema,
    instalacionId: uuidSchema.optional(),
    cotizacionId: uuidSchema.optional(),
    tipoDte: tipoBorradorSchema,
    lineas: z.array(lineaInputSchema).min(1).max(60),
    referencias: z.array(referenciaBorradorSchema).max(10).optional(),
    plazoPagoDias: z.number().int().min(0).max(365).default(PLAZO_PAGO_DEFECTO),
    glosa: textoOpcional(300),
  }),
  output: ventaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    if (input.instalacionId) await instalacionDe(ctx, input.instalacionId, cuenta.id);
    if (input.cotizacionId) await cotizacionDe(ctx, input.cotizacionId, cuenta.id);
    const montos = montosDesdeLineas(input.tipoDte, input.lineas);
    const error = validarMontosVenta(input.tipoDte, montos);
    if (error) throw reglaDeNegocio(error);
    const emision = hoy();
    for (const r of input.referencias ?? []) {
      const errRef = validarReferenciaSii({ codigo: r.tipoDteRef, folio: r.folioRef, fecha: r.fechaRef }, emision);
      if (errRef) throw reglaDeNegocio(errRef);
    }
    const vencimiento = vencimientoPago(emision, input.plazoPagoDias);
    const lineasData = input.lineas.map((l, orden) => ({
      tenantId: ctx.tenantId,
      orden,
      glosa: l.glosa,
      monto: l.monto,
    }));
    if (dryRun) {
      const { vistaVenta } = await import("./vistas-venta");
      return vistaVenta(
        {
          id: "",
          cuentaId: cuenta.id,
          instalacionId: input.instalacionId ?? null,
          cotizacionId: input.cotizacionId ?? null,
          tipoDte: input.tipoDte,
          folio: null,
          fechaEmision: aFecha(emision),
          fechaVencimiento: aFecha(vencimiento),
          montoNeto: montos.neto,
          montoExento: montos.exento,
          montoIva: montos.iva,
          montoOtros: montos.otros,
          montoTotal: montos.total,
          estadoDte: "borrador",
          estadoCobro: "pendiente",
          montoCobrado: 0,
          glosa: input.glosa ?? null,
          trackIdSii: null,
          documentoReferenciaId: null,
          lineas: lineasData.map((l, i) => ({ ...l, id: `dry-${i}` })),
        },
        cuenta,
        lineasData.map((l, i) => ({ id: `dry-${i}`, orden: l.orden, glosa: l.glosa, monto: l.monto })),
      );
    }
    const creado = await escribirConEvento(
      ctx,
      { tipo: "finanzas.venta.borrador_creado", entidadTipo: "documento_emitido" },
      (tx) =>
        tx.documentoEmitido.create({
          data: {
            tenantId: ctx.tenantId,
            cuentaId: cuenta.id,
            instalacionId: input.instalacionId ?? null,
            cotizacionId: input.cotizacionId ?? null,
            tipoDte: input.tipoDte,
            fechaEmision: aFecha(emision),
            fechaVencimiento: aFecha(vencimiento),
            montoNeto: montos.neto,
            montoExento: montos.exento,
            montoIva: montos.iva,
            montoOtros: montos.otros,
            montoTotal: montos.total,
            glosa: input.glosa ?? null,
            lineas: { create: lineasData },
            ...(input.referencias?.length
              ? {
                  referencias: {
                    create: input.referencias.map((r) => ({
                      tenantId: ctx.tenantId,
                      tipoDteRef: r.tipoDteRef,
                      folioRef: r.folioRef,
                      fechaRef: aFecha(r.fechaRef),
                      codigoRef: r.codigoRef,
                      razonRef: r.razonRef ?? null,
                    })),
                  },
                }
              : {}),
          },
          include: { lineas: { orderBy: { orden: "asc" } } },
        }),
    );
    return vistaDeDocumento(ctx, creado.id);
  },
});
