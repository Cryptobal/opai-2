import { z } from "zod";

import { diaSchema } from "../core/maestros/comun";
import { uuidSchema } from "../core/esquemas";
import { clpSchema, modoMargenSchema, monedaSchema, pctSchema, tituloSchema } from "./comun";

// Operaciones tipadas de `cpq.cotizaciones.ajustar` (cpq.md §9). Las de instrumentos financieros,
// condiciones y reajuste (R57, R60, R63) llegan con el PR 10.3; las de catálogo y paquetes, con el
// motor del Brief 08.

const tramoSchema = z.object({
  dias: z.array(z.number().int().min(0).max(6)).min(1).max(7).describe("0 = domingo … 6 = sábado."),
  inicio: z.string().regex(/^\d{2}:\d{2}$/),
  fin: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .describe("Fin exclusivo; si es ≤ inicio, cruza la medianoche."),
});

/** Campos de una línea. Sueldo, costo unitario y margen propio son de costos (R59). */
export const camposLinea = {
  nombre: z.string().trim().min(1).max(120),
  grupo: z.string().trim().max(120).nullable().optional(),
  cantidad: z.number().int().min(1).max(10_000).optional().describe("Posiciones o cantidad."),
  cargoId: uuidSchema.nullable().optional().describe("Obligatorio en una línea de puesto (§4)."),
  patronId: uuidSchema.nullable().optional(),
  horario: z.array(tramoSchema).max(14).nullable().optional(),
  personasPorPosicion: z
    .number()
    .int()
    .min(1)
    .max(10_000)
    .nullable()
    .optional()
    .describe("Personas × 100 (2 personas = 200); sobrescribirlas exige motivo (R21)."),
  motivoPersonas: z.string().trim().min(3).max(300).nullable().optional(),
  sueldoBruto: clpSchema.nullable().optional().describe("CLP; exige ver costos (R20, R59)."),
  costoUnitario: clpSchema.nullable().optional().describe("CLP; exige ver costos (R59)."),
  recurrencia: z.enum(["mensual", "unico"]).optional(),
  margenPropio: pctSchema.nullable().optional().describe("Adicional (R32); exige ver costos."),
  visibleCliente: z.boolean().optional(),
  habilitada: z.boolean().optional().describe("Deshabilitar no borra la línea (R16)."),
};

export const CAMPOS_COSTO = ["sueldoBruto", "costoUnitario", "margenPropio"] as const;

export const operacionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("renombrar"), titulo: tituloSchema }),
  z.object({ op: z.literal("cambiar_moneda"), moneda: monedaSchema }),
  z.object({ op: z.literal("cambiar_validez"), validaHasta: diaSchema }),
  z.object({
    op: z.literal("fijar_margen"),
    margenObjetivo: pctSchema,
    modoMargen: modoMargenSchema.optional(),
  }),
  z.object({
    op: z.literal("fijar_precio"),
    precioManual: clpSchema
      .nullable()
      .describe("Venta mensual en CLP; null vuelve al margen (R36)."),
  }),
  z.object({ op: z.literal("agregar_seccion"), instalacionId: uuidSchema }),
  z.object({ op: z.literal("agregar_comun") }),
  z.object({ op: z.literal("quitar_seccion"), seccionId: uuidSchema }),
  z.object({
    op: z.literal("agregar_linea"),
    seccionId: uuidSchema,
    tipo: z.enum(["puesto", "item", "adicional"]),
    ...camposLinea,
  }),
  z.object({
    op: z.literal("actualizar_linea"),
    lineaId: uuidSchema,
    ...camposLinea,
    nombre: camposLinea.nombre.optional(),
  }),
  z.object({ op: z.literal("quitar_linea"), lineaId: uuidSchema }),
]);
export type Operacion = z.output<typeof operacionSchema>;

/** Campos de costo que toca una operación (para exigir `cpq:costos.ver`, R59). */
export function camposDeCosto(op: Operacion): string[] {
  if (op.op === "fijar_margen") return ["el margen"];
  if (op.op !== "agregar_linea" && op.op !== "actualizar_linea") return [];
  return CAMPOS_COSTO.filter((k) => op[k] !== undefined);
}
