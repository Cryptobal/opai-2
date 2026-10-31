import { z } from "zod";

import { validarMontos } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { aFecha, diaSchema, escribirConEvento, hoy, sinDuplicado, textoOpcional } from "../core/maestros/comun";
import { conflicto, reglaDeNegocio } from "../errores";
import { PERMISO_COMPRAS, centroDe, centroRefSchema, montoSchema, proveedorDe, tipoDteSchema } from "./comun";
import { vistasDeCompras } from "./compras-consulta";
import { compraSchema } from "./vistas-compra";

/** Campos de un documento recibido, comunes al registro manual y a cada fila de la importación. */
export const camposDocumento = {
  tipoDte: tipoDteSchema,
  folio: z.number().int().min(1).max(2_000_000_000),
  fechaEmision: diaSchema,
  fechaRecepcion: diaSchema.optional().describe("Por defecto, hoy."),
  montoNeto: montoSchema.default(0),
  montoExento: montoSchema.default(0),
  montoIva: montoSchema.default(0),
  montoOtros: montoSchema.default(0).describe("Otros impuestos o retenciones que suman al total."),
  montoTotal: montoSchema.optional().describe("Si se omite, es neto + exento + IVA + otros."),
  glosa: textoOpcional(300),
};

type Montos = { montoNeto: number; montoExento: number; montoIva: number; montoOtros: number; montoTotal?: number | undefined };

/** Monto total efectivo y validación de cuadre; devuelve el mensaje de error o null. */
export function totalYError(m: Montos): { total: number; error: string | null } {
  const total = m.montoTotal ?? m.montoNeto + m.montoExento + m.montoIva + m.montoOtros;
  return {
    total,
    error: validarMontos({
      neto: m.montoNeto,
      exento: m.montoExento,
      iva: m.montoIva,
      otrosImpuestos: m.montoOtros,
      total,
    }),
  };
}

export const comprasRegistrar = defineCapability({
  id: "finanzas.compras.registrar",
  descripcion:
    "Registra a mano un documento recibido (factura, factura exenta, nota de débito o de crédito) en el libro de compras, con su proveedor, folio, fechas y montos. Puede asignar el centro de costo; si no, queda como «sin centro de costo» con una sugerencia. Rechaza un documento repetido o con total que no cuadra.",
  permiso: PERMISO_COMPRAS,
  input: z.object({
    proveedorId: uuidSchema,
    centro: centroRefSchema.optional(),
    ...camposDocumento,
  }),
  output: compraSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const proveedor = await proveedorDe(ctx, input.proveedorId);
    if (!proveedor.activo) throw reglaDeNegocio("El proveedor está desactivado.");
    const { total, error } = totalYError(input);
    if (error) throw reglaDeNegocio(error);
    const clave = { proveedorId: proveedor.id, tipoDte: input.tipoDte, folio: input.folio };
    if (await ctx.db.documentoRecibido.findFirst({ where: clave, select: { id: true } }))
      throw conflicto("Ese documento ya está en el libro de compras.");
    const centro = input.centro ? await centroDe(ctx, input.centro, !dryRun) : null;
    const data = {
      ...clave,
      fechaEmision: aFecha(input.fechaEmision),
      fechaRecepcion: aFecha(input.fechaRecepcion ?? hoy()),
      montoNeto: input.montoNeto,
      montoExento: input.montoExento,
      montoIva: input.montoIva,
      montoOtros: input.montoOtros,
      montoTotal: total,
      estadoRecepcion: "pendiente_revision",
      centroCostoId: centro?.id ?? null,
      origen: "manual",
      glosa: input.glosa ?? null,
    };
    const fila = dryRun
      ? { ...data, id: "", proveedor }
      : await sinDuplicado(
          escribirConEvento(ctx, { tipo: "finanzas.compra.registrada", entidadTipo: "documento_recibido" }, (tx) =>
            tx.documentoRecibido.create({ data: { ...data, tenantId: ctx.tenantId }, include: { proveedor: true } }),
          ),
          "Ese documento ya está en el libro de compras.",
        );
    const [vista] = await vistasDeCompras(ctx, [fila]);
    return vista!;
  },
});
