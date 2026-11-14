import { z } from "zod";

import { archivoLre } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { conNombres, datosArchivoPeriodo, errorArchivoSchema, personasReveladas } from "./archivos-datos";
import { PERMISO_OBLIGACIONES } from "./comun";

// Libro de Remuneraciones Electrónico (CAR-99, ADR-057): arma el archivo del período con sus
// liquidaciones. Lleva RUT y montos por persona: exige ver a todo el personal y los sueldos sensibles, y
// la lectura queda auditada con los IDs de las personas reveladas. OPAI no envía nada a la DT (R11).
export const lreGenerar = defineCapability({
  id: "nomina.lre.generar",
  descripcion:
    "Genera el archivo del Libro de Remuneraciones Electrónico (LRE) de un período con sus liquidaciones calculadas, listo para que el representante laboral lo revise y lo cargue en Mi DT. Valida RUT, cuadratura y datos del empleador. El formato queda «por verificar» hasta contrastarlo con el Suplemento LRE vigente. La lectura queda auditada.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: z.object({
    nombre: z.string().describe("Nombre del archivo: rutempleador_aaaamm.csv."),
    contenido: z.string().describe("Archivo CSV separado por «;», con encabezado y una fila por persona."),
    filas: z.number().int(),
    personaIds: z.array(z.string()).describe("Personas incluidas en el archivo."),
    errores: z.array(errorArchivoSchema),
    advertencias: z.array(z.string()),
    formatoVerificado: z.literal(false).describe("Siempre false: el formato oficial está por verificar."),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const { periodo, filas, errores, rutEmpleador, nombres } = await datosArchivoPeriodo(ctx, periodoId, "LRE");
    const a = archivoLre({
      rutEmpleador, anio: periodo.anio, mes: periodo.mes,
      filas: filas.map((f) => ({
        personaId: f.personaId, rut: f.persona.rut, inicioContrato: f.inicio, terminoContrato: f.terminoEnMes,
        diasTrabajados: f.diasTrabajados, diasLicencia: f.diasLicencia, haberes: f.haberes,
        descuentosLegales: f.descuentosLegales, otrosDescuentos: f.otrosDescuentos,
        aportesEmpleador: f.aportesEmpleador, liquido: f.liquido,
      })),
    });
    return { ...a, errores: conNombres([...errores, ...a.errores], nombres), personaIds: filas.map((f) => f.personaId), formatoVerificado: false as const };
  },
});
