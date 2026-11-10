// Editar un borrador de factura (33/34) o de nota de débito de cargo (56) antes de emitirlo (CAR-248). Sin folio ni
// envío al SII: lo emitido nunca se modifica. Con `dryRun` devuelve cómo quedaría, sin escribir.
import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { reglaDeNegocio } from "../errores";
import { bloquearDocumento } from "./ventas-borrador-editable";
import { referenciaBorradorSchema } from "./ventas-borrador";
import { calcularCambios } from "./ventas-borrador-cambios";
import { vistaDeDocumento } from "./ventas-consulta";
import { PERMISO_VENTAS, cuentaDe, lineaInputSchema } from "./ventas-comun";
import { ventaSchema, vistaVenta } from "./vistas-venta";

const diaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD.");

export const ventasActualizarBorrador = defineCapability({
  id: "finanzas.ventas.actualizar_borrador",
  descripcion:
    "Cambia un borrador de factura (33/34) o de nota de débito de cargo (56) que aún no tiene folio ni salió al SII: líneas, fecha de emisión, plazo de pago, glosa o motivo y referencias. Un documento emitido no se modifica; para otro cliente o tipo, descarte y cree uno nuevo.",
  permiso: PERMISO_VENTAS,
  input: z
    .object({
      documentoId: uuidSchema,
      lineas: z.array(lineaInputSchema).min(1).max(60).optional(),
      referencias: z.array(referenciaBorradorSchema).max(10).optional().describe("Solo facturas; reemplaza todas las referencias."),
      plazoPagoDias: z.number().int().min(0).max(365).optional(),
      fechaEmision: diaIso.optional().describe("AAAA-MM-DD, hoy o anterior."),
      glosa: z.string().trim().max(300).nullable().optional().describe("Solo facturas; vacío o null la quita."),
      motivo: z.string().trim().min(3).max(300).optional().describe("Solo nota de débito."),
    })
    .refine((i) => Object.keys(i).some((k) => k !== "documentoId" && i[k as keyof typeof i] !== undefined), {
      message: "Indique al menos un cambio.",
    }),
  output: ventaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await calcularCambios(ctx, input);
    if (dryRun) {
      const cuenta = await cuentaDe(ctx, c.doc.cuentaId);
      const lineas = (c.lineas ?? c.doc.lineas).map((l, i) => ({ id: `dry-${i}`, orden: l.orden, glosa: l.glosa, monto: l.monto }));
      return vistaVenta({ ...c.doc, ...c.fila } as Parameters<typeof vistaVenta>[0], cuenta, lineas);
    }
    await ctx.transaccion(async (tx) => {
      await bloquearDocumento(tx, ctx.tenantId, c.doc.id);
      const { count } = await tx.documentoEmitido.updateMany({
        where: { id: c.doc.id, estadoDte: "borrador", folio: null, trackIdSii: null, xmlStorageKey: null },
        data: c.fila,
      });
      if (count !== 1) throw reglaDeNegocio("El borrador ya no se puede cambiar; otro proceso pudo emitirlo o descartarlo.");
      if (c.lineas) {
        await tx.documentoEmitidoLinea.deleteMany({ where: { documentoId: c.doc.id } });
        await tx.documentoEmitidoLinea.createMany({ data: c.lineas.map((l) => ({ ...l, tenantId: ctx.tenantId, documentoId: c.doc.id })) });
      }
      if (c.referencias) {
        await tx.documentoEmitidoReferencia.deleteMany({ where: { documentoId: c.doc.id } });
        await tx.documentoEmitidoReferencia.createMany({ data: c.referencias.map((r) => ({ ...r, tenantId: ctx.tenantId, documentoId: c.doc.id })) });
      }
      await ctx.eventos.emitir(tx, { tipo: "finanzas.venta.borrador_actualizado", entidadTipo: "documento_emitido", entidadId: c.doc.id, payload: {} });
    });
    return vistaDeDocumento(ctx, c.doc.id);
  },
});
