import { z } from "zod";

import { defineCapability } from "../define";
import { diaSchema, escribirConEvento } from "../core/maestros/comun";
import { uuidSchema } from "../core/esquemas";
import { reglaDeNegocio } from "../errores";
import { PERMISO_VENTAS, folioVista, tipoDteVentaSchema } from "./ventas-comun";

const folioVistaSchema = z.object({
  id: z.string(),
  tipoDte: z.number().int(),
  folioDesde: z.number().int(),
  folioHasta: z.number().int(),
  folioActual: z.number().int(),
  restantes: z.number().int(),
  alerta: z.boolean(),
  cafVenceEn: z.string().nullable(),
  activo: z.boolean(),
});

export const foliosListar = defineCapability({
  id: "finanzas.folios.listar",
  descripcion:
    "Lista los rangos de folios autorizados por CAF: folio actual, restantes y aviso cuando quedan pocos según el umbral del tenant.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    tipoDte: tipoDteVentaSchema.optional(),
    soloActivos: z.boolean().default(true),
  }),
  output: z.object({ items: z.array(folioVistaSchema) }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.dteFolio.findMany({
      where: {
        ...(input.tipoDte ? { tipoDte: input.tipoDte } : {}),
        ...(input.soloActivos ? { activo: true } : {}),
      },
      orderBy: [{ tipoDte: "asc" }, { folioDesde: "asc" }],
    });
    return { items: filas.map(folioVista) };
  },
});

export const foliosCargarCaf = defineCapability({
  id: "finanzas.folios.cargar_caf",
  descripcion:
    "Registra un rango de folios autorizados por CAF (referencia al secreto cifrado, sin subir el XML aquí). Desactiva rangos anteriores del mismo tipo de DTE.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    tipoDte: tipoDteVentaSchema,
    folioDesde: z.number().int().min(1).max(2_000_000_000),
    folioHasta: z.number().int().min(1).max(2_000_000_000),
    cafVenceEn: diaSchema,
    secretoId: uuidSchema.optional().describe("Id del secreto donde quedó cifrado el CAF (ADR-027)."),
  }),
  output: folioVistaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (input.folioHasta < input.folioDesde) {
      throw reglaDeNegocio("folioHasta debe ser mayor o igual a folioDesde.");
    }
    const data = {
      tenantId: ctx.tenantId,
      tipoDte: input.tipoDte,
      folioDesde: input.folioDesde,
      folioHasta: input.folioHasta,
      folioActual: input.folioDesde,
      cafSecretoId: input.secretoId ?? null,
      cafVenceEn: new Date(`${input.cafVenceEn}T00:00:00.000Z`),
      activo: true,
    };
    if (dryRun) {
      return folioVista({
        ...data,
        id: "",
        umbralAviso: 10,
        cafVenceEn: data.cafVenceEn,
      });
    }
    const fila = await escribirConEvento(ctx, {
      tipo: "finanzas.folios.caf_cargado",
      entidadTipo: "dte_folio",
      payload: (r) => ({ tipoDte: r.tipoDte, folioDesde: r.folioDesde, folioHasta: r.folioHasta }),
    }, async (tx) => {
      await tx.dteFolio.updateMany({ where: { tipoDte: input.tipoDte, activo: true }, data: { activo: false } });
      return tx.dteFolio.create({ data });
    });
    return folioVista(fila);
  },
});
