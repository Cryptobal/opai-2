import { z } from "zod";

import { esEtiquetaFirmada } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { PERMISO_CONFIG, instalacionEnAlcance } from "./comun";

/**
 * Prepara el documento de etiquetas QR de una instalación (R7, R32): la lista de puntos con QR y su
 * código opaco, para la hoja imprimible con la marca del tenant (ADR-028). En el PR 1 devuelve el
 * manifiesto que la vista de impresión renderiza; el PDF persistido en `core.documentos` con la marca
 * y el código firmado se completa junto con `rondas.puntos.reemplazar_etiqueta` (PR 2, R7).
 */
export const etiquetasPdf = defineCapability({
  id: "rondas.etiquetas.pdf",
  descripcion:
    "Genera la hoja de etiquetas QR para imprimir de una instalación: cada punto con QR y su código opaco, lista para imprimir con la marca del tenant.",
  permiso: PERMISO_CONFIG,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({
    instalacionId: z.string(),
    total: z.number(),
    etiquetas: z.array(
      z.object({
        puntoId: z.string(),
        nombre: z.string(),
        codigo: z.string(),
        /** `true` si el código ya tiene el formato firmado de 2.0; `false` si es una etiqueta de 1.0. */
        firmada: z.boolean(),
      }),
    ),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input) {
    await instalacionEnAlcance(ctx, input.instalacionId);
    const puntos = await ctx.db.puntoControl.findMany({
      where: {
        instalacionId: input.instalacionId,
        estado: "activo",
        etiquetaQr: { not: null },
      },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, etiquetaQr: true },
    });
    const etiquetas = puntos
      .filter((p): p is { id: string; nombre: string; etiquetaQr: string } => p.etiquetaQr !== null)
      .map((p) => ({
        puntoId: p.id,
        nombre: p.nombre,
        codigo: p.etiquetaQr,
        firmada: esEtiquetaFirmada(p.etiquetaQr),
      }));
    return { instalacionId: input.instalacionId, total: etiquetas.length, etiquetas };
  },
});
