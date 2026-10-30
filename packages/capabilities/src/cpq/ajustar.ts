import { z } from "zod";

import { estadoTrasEditar } from "@opai/domain";

import { defineCapability } from "../define";
import { conflicto, noEncontrado } from "../errores";
import { uuidSchema } from "../core/esquemas";
import {
  PERMISO_MANAGE,
  cotizacionDe,
  exigirEditable,
  revalidarCostos,
  ultimaVersion,
  veCostos,
} from "./comun";
import { aplicar } from "./ajustar-aplicar";
import { camposDeCosto, operacionSchema } from "./ajustar-ops";
import { renombrada } from "./renombrada";
import { exigirCostos } from "./validaciones";
import { resumenSchema, versionSchema, vistaResumen, vistaVersion } from "./vistas";

/** Señal para revertir la transacción de la vista previa (no es un error de negocio). */
const REVERTIR = new Error("cpq.cotizaciones.ajustar: vista previa revertida");

type FilaC = Parameters<typeof vistaResumen>[0];
type FilaV = Parameters<typeof vistaResumen>[1];
const salida = (costos: boolean, c: FilaC, v: FilaV, cambios: string[]) => ({
  cotizacion: vistaResumen(c, v, costos),
  version: vistaVersion(v, costos),
  cambios,
});

/**
 * Lote de cambios tipados sobre la versión editable (cpq.md §9): todo o nada, en una transacción.
 * Editar una versión en aprobación o lista la devuelve a borrador (R41). Control optimista: si otro
 * guardó antes, responde CONFLICT y nada se aplica (§12). La vista previa
 * aplica el lote igual que la ejecución y revierte. Renombrar deja antes/después en la
 * auditoría y emite `cpq.cotizacion.renombrada` (R67); el código no cambia.
 */
export const cotizacionesAjustar = defineCapability({
  id: "cpq.cotizaciones.ajustar",
  descripcion:
    "Aplica un lote de cambios tipados a la versión editable de una cotización: renombrar, moneda, validez, margen o precio objetivo, agregar o quitar secciones, agregar, editar o quitar líneas de puesto, ítem o adicional. Todo o nada.",
  permiso: PERMISO_MANAGE,
  input: z.object({
    id: uuidSchema.describe("Cotización."),
    revisionEsperada: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Revisión de la versión que leíste; si cambió, CONFLICT (control optimista)."),
    operaciones: z.array(operacionSchema).min(1).max(50),
  }),
  output: z.object({
    cotizacion: resumenSchema,
    version: versionSchema,
    cambios: z.array(z.string()),
  }),
  efecto: "escritura",
  dryRun: true,
  autorizarRepeticion: revalidarCostos,
  async handler(ctx, input, { dryRun }) {
    const costo = [...new Set(input.operaciones.flatMap(camposDeCosto))];
    // R59: sin `cpq:costos.ver` no se escribe costo, sueldo ni margen (prohibido, no oculto).
    exigirCostos(ctx, costo);
    const c = await cotizacionDe(ctx, input.id);
    const v = await ultimaVersion(ctx, c.id);
    const estado = exigirEditable(v.estado);
    if (input.revisionEsperada !== undefined && input.revisionEsperada !== v.revision)
      throw conflicto("La cotización cambió mientras la editabas. Recarga e inténtalo de nuevo.");
    const nuevoEstado = estadoTrasEditar(estado);
    // La vista previa ES la ejecución real dentro de una transacción que se revierte: aplica el lote
    // en el mismo orden (cada operación ve lo que dejó la anterior) y nada queda escrito ni auditado.
    let previa: ReturnType<typeof salida> | undefined;
    try {
      return await ctx.transaccion(async (tx) => {
        // Control optimista PRIMERO: subir la revisión leída toma el lock de la fila de la versión,
        // así las ediciones concurrentes se serializan aquí y solo gana una (§12, sin TOCTOU).
        const r = await tx.versionCotizacion.updateMany({
          where: { id: v.id, revision: v.revision, estado: v.estado },
          data: { revision: v.revision + 1, estado: nuevoEstado },
        });
        if (r.count !== 1)
          throw conflicto(
            "La cotización cambió mientras la editabas. Recarga e inténtalo de nuevo.",
          );
        const cambios: string[] = [];
        for (const op of input.operaciones)
          cambios.push(await aplicar(ctx, tx, v, op, c.negocioId));
        if (estado !== nuevoEstado) cambios.push(`Estado: ${estado} → ${nuevoEstado} (R41)`);
        await tx.cotizacion.update({ where: { id: c.id }, data: { estado: nuevoEstado } });
        if (!dryRun) await renombrada(ctx, tx, c, input.operaciones);
        const c2 = await tx.cotizacion.findUnique({ where: { id: c.id } });
        const v2 = await tx.versionCotizacion.findUnique({ where: { id: v.id } });
        if (!c2 || !v2) throw noEncontrado("La cotización");
        const resultado = salida(veCostos(ctx), c2, v2, cambios);
        if (!dryRun) return resultado;
        previa = resultado;
        throw REVERTIR;
      });
    } catch (e) {
      if (e === REVERTIR && previa) return previa;
      throw e;
    }
  },
});
