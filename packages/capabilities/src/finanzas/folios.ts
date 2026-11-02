import { z } from "zod";

import { mensajeAvisoFoliosSinUsarPorVencer } from "@opai/domain";

import { defineCapability } from "../define";
import { escribirConEvento, hoy } from "../core/maestros/comun";
import { reglaDeNegocio } from "../errores";
import {
  PERMISO_VENTAS,
  PERMISO_VENTAS_CONFIGURE,
  avisosDteDe,
  folioVista,
} from "./ventas-comun";
import {
  persistirCafCargado,
  validarCafParaTenant,
  vistaPreviaCafCargado,
} from "./folios-caf-logica";

const folioVistaSchema = z.object({
  id: z.string(),
  tipoDte: z.number().int(),
  folioDesde: z.number().int(),
  folioHasta: z.number().int(),
  folioActual: z.number().int(),
  restantes: z.number().int(),
  alertaFoliosBajos: z.boolean(),
  alertaCafPorVencer: z.boolean(),
  alerta: z.boolean(),
  cafVenceEn: z.string().nullable(),
  activo: z.boolean(),
  lectura: z.string(),
});

export const foliosListar = defineCapability({
  id: "finanzas.folios.listar",
  descripcion:
    "Lista los rangos de folios autorizados por CAF: folio actual, restantes, avisos por folios bajos o CAF por vencer, y resumen de folios que vencerán sin usar.",
  permiso: PERMISO_VENTAS,
  input: z.object({
    tipoDte: z.union([z.literal(33), z.literal(34), z.literal(56), z.literal(61)]).optional(),
    soloActivos: z.boolean().default(true),
  }),
  output: z.object({
    items: z.array(folioVistaSchema),
    avisoFoliosSinUsarPorVencer: z.string().nullable(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const avisos = await avisosDteDe(ctx);
    const hoyIso = hoy();
    const filas = await ctx.db.dteFolio.findMany({
      where: {
        ...(input.tipoDte ? { tipoDte: input.tipoDte } : {}),
        ...(input.soloActivos ? { activo: true } : {}),
      },
      orderBy: [{ tipoDte: "asc" }, { folioDesde: "asc" }],
    });
    let foliosSinUsar = 0;
    const items = filas.map((f) => {
      const v = folioVista(f, { ...avisos, hoyIso });
      if (v.alertaCafPorVencer && v.restantes > 0) foliosSinUsar += v.restantes;
      return { ...v, lectura: `CAF ${v.tipoDte} · ${v.folioDesde}–${v.folioHasta} · restantes ${v.restantes}` };
    });
    return {
      items,
      avisoFoliosSinUsarPorVencer: mensajeAvisoFoliosSinUsarPorVencer(foliosSinUsar),
    };
  },
});

export const foliosCargarCaf = defineCapability({
  id: "finanzas.folios.cargar_caf",
  // El XML trae la llave privada del CAF: solo personas lo cargan; un agente no encola el XML en aprobaciones.
  soloPersonas: true,
  descripcion:
    "Registra un rango de folios a partir del XML del CAF: valida RUT, tipo, solape y vencimiento; cifra el XML en core.secretos (ADR-027). dryRun devuelve la lectura sin guardar.",
  permiso: PERMISO_VENTAS_CONFIGURE,
  input: z.object({
    cafXml: z
      .string()
      .min(20)
      .max(500_000)
      .describe("Contenido XML del CAF emitido por el SII (texto UTF-8)."),
  }),
  output: folioVistaSchema,
  efecto: "escritura",
  dryRun: true,
  sensibles: ["cafXml"],
  async handler(ctx, input, { dryRun }) {
    const cfg = await ctx.db.dteConfig.findUnique({ where: { tenantId: ctx.tenantId } });
    if (!cfg?.rutEmisor) {
      throw reglaDeNegocio("Configure el RUT emisor en la configuración DTE antes de cargar un CAF.");
    }
    const rutEmisor = cfg.rutEmisor;
    const avisos = await avisosDteDe(ctx);
    const { lectura, hoyIso, ultimoFolioOpai1, folioActual } = await validarCafParaTenant(
      ctx,
      input.cafXml,
      rutEmisor,
      cfg.fechaCorte1_0,
    );
    const preview = vistaPreviaCafCargado(lectura, avisos, hoyIso, ultimoFolioOpai1, folioActual);
    if (dryRun) return preview;
    const fila = await escribirConEvento(
      ctx,
      {
        tipo: "finanzas.folios.caf_cargado",
        entidadTipo: "dte_folio",
        payload: () => ({
          tipoDte: lectura.tipoDte,
          folioDesde: lectura.folioDesde,
          folioHasta: lectura.folioHasta,
        }),
      },
      (tx) =>
        persistirCafCargado(ctx, tx, input.cafXml, lectura, rutEmisor, avisos, cfg.fechaCorte1_0),
    );
    return {
      ...folioVista(fila as Parameters<typeof folioVista>[0], { ...avisos, hoyIso }),
      lectura: preview.lectura,
    };
  },
});
