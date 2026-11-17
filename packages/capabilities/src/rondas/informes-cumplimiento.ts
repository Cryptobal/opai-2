import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { mesSchema } from "../pauta/comun";
import { PERMISO_READ } from "./comun";
import { calcularCumplimientoMes } from "./informes-cumplimiento-calc";

const filaSchema = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  cuenta: z.string(),
  realizadas: z.number().int(),
  completadas: z.number().int(),
  incompletas: z.number().int(),
  atrasadas: z.number().int(),
  noRealizadas: z.number().int(),
});

/** Cumplimiento de rondas del mes por instalación (compartido con portal cliente). */
export const informesCumplimiento = defineCapability({
  id: "rondas.informes.cumplimiento",
  descripcion:
    "Informe mensual de cumplimiento de rondas por instalación: realizadas, completas, incompletas, atrasadas y programadas no iniciadas. Misma fuente para el ERP y el portal del cliente.",
  permiso: PERMISO_READ,
  input: mesSchema.extend({ instalacionId: uuidSchema.optional() }),
  output: z.object({ anio: z.number().int(), mes: z.number().int(), instalaciones: z.array(filaSchema) }),
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const { anio, mes, instalacionId } = input;
    return calcularCumplimientoMes(ctx, {
      anio,
      mes,
      ...(instalacionId !== undefined ? { instalacionId } : {}),
    });
  },
});