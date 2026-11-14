// Entrada y salida de `pauta.excepciones.crear` (separadas para que la capacidad quepa en un archivo).
import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { rangoSchema } from "./comun";
import { tipoExcepcionSchema } from "./vistas";

export const crearInput = z
  .object({
    puestoId: uuidSchema,
    tipo: tipoExcepcionSchema,
    motivo: z.string().trim().min(3, "Cuenta brevemente el motivo.").max(200),
    /** Clase del catálogo de la empresa (CAR-393), del mismo tipo base; opcional. */
    clase: z.string().trim().min(3).max(80).optional(),
  })
  .and(rangoSchema);

export const crearSalida = z.object({
  puestoId: z.string(),
  tipo: tipoExcepcionSchema,
  desde: z.string(),
  hasta: z.string(),
  /** Días de turno registrados (los libres del rango se omiten). */
  dias: z.number().int(),
  /** Titulares a los que el sistema avisará (notificación, sin confirmar). */
  avisarA: z.array(z.string()),
});
