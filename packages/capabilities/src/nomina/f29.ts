import { z } from "zod";

import { archivoF29Retencion, excelF29Retencion, retencionImpuestoUnico } from "@opai/domain";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { datosArchivoPeriodo, personasReveladas, resultadoArchivo } from "./archivos-datos";
import { PERMISO_OBLIGACIONES } from "./comun";

const salidaBinaria = z.object({
  nombre: z.string(),
  mime: z.string(),
  base64: z.string(),
  filas: z.number().int(),
  personaIds: z.array(z.string()),
  errores: z.array(z.object({ personaId: z.string().nullable(), personaNombre: z.string().nullable(), mensaje: z.string() })),
  advertencias: z.array(z.string()),
});

/** Excel de retenciones de impuesto único (F29) del período (CAR-99, diseño 06). */
export const f29RetencionGenerar = defineCapability({
  id: "nomina.f29.generar",
  descripcion:
    "Genera el Excel de retenciones de impuesto único del período para apoyar la declaración F29: una fila por trabajador con el monto retenido en la liquidación. El formato queda por verificar ante el SII.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: salidaBinaria,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const datos = await datosArchivoPeriodo(ctx, periodoId, "F29");
    const filas = datos.filas.map((f) => ({
      personaId: f.personaId,
      rut: f.persona.rut,
      nombre: datos.nombres.get(f.personaId) ?? `${f.persona.nombres} ${f.persona.apellidos}`.trim(),
      retencionClp: retencionImpuestoUnico(f.descuentosLegales),
    }));
    const meta = archivoF29Retencion({
      rutEmpleador: datos.rutEmpleador,
      anio: datos.periodo.anio,
      mes: datos.periodo.mes,
      filas,
    });
    const bytes = await excelF29Retencion(filas, meta.totalRetencionClp);
    const común = resultadoArchivo(meta, datos);
    return {
      ...común,
      filas: filas.length,
      nombre: meta.nombre,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: Buffer.from(bytes).toString("base64"),
      advertencias: meta.advertencias,
    };
  },
});