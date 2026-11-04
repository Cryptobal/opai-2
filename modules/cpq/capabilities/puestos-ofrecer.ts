import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { cargarOferta } from "../persistencia/puestos-oferta";
import { uuidSchema } from "./esquemas";
import { PERMISO_COSTOS, PERMISO_PUESTOS_CONFIRMAR } from "./permisos";

export const lineaOfertaSchema = z.object({
  lineaId: uuidSchema,
  linea: z.string(),
  cargoId: uuidSchema.nullable(),
  cargo: z.string().nullable(),
  instalacionId: uuidSchema.nullable(),
  instalacion: z.string().nullable(),
  posiciones: z.number().int(),
  creados: z.number().int(),
  patron: z.string().nullable(),
  patronId: uuidSchema.nullable(),
  horaInicio: z.string().nullable(),
  horaFin: z.string().nullable(),
  /** Solo con `cpq:costos.ver` (R59): sueldo cotizado y su origen («referencia_cargo» o «manual»). */
  sueldoBaseClp: z.number().int().nullable().optional(),
  sueldoOrigen: z.string().nullable().optional(),
});

/**
 * Oferta de puestos al ganar (R2): lo que se propone crear desde la cotización aceptada. Solo lee;
 * crear exige la confirmación de RRHH (`cpq.puestos.confirmar`).
 */
export const puestosOfrecer = defineCapability({
  id: "cpq.puestos.ofrecer",
  descripcion:
    "Lista los puestos que ofrece la cotización aceptada (una fila por línea de guardias: cargo, posiciones, instalación, patrón, horario y lo ya creado) para que RRHH los confirme. No crea nada.",
  permiso: PERMISO_PUESTOS_CONFIRMAR,
  input: z.object({ cotizacionId: uuidSchema }),
  output: z.object({
    cotizacionId: uuidSchema,
    codigo: z.string(),
    items: z.array(lineaOfertaSchema),
    posiciones: z.number().int(),
    pendientes: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const o = await cargarOferta(ctx, input.cotizacionId);
    const verCostos = ctx.autorizar(PERMISO_COSTOS);
    return {
      cotizacionId: o.cotizacion.id,
      codigo: o.cotizacion.codigo,
      items: o.items.map(({ sueldoBaseClp, sueldoOrigen, ...resto }) =>
        verCostos ? { ...resto, sueldoBaseClp, sueldoOrigen } : resto,
      ),
      posiciones: o.items.reduce((t, i) => t + i.posiciones, 0),
      pendientes: o.items.reduce((t, i) => t + Math.max(i.posiciones - i.creados, 0), 0),
    };
  },
});
