import { excelLibroRemuneraciones, filaLibroRemuneraciones, nombreLibroRemuneraciones } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import { datosArchivoPeriodo, personasReveladas, resultadoArchivo } from "./archivos-datos";
import { PERMISO_OBLIGACIONES } from "./comun";
import { pdfLibroRemuneraciones } from "./libro-remuneraciones-pdf";

const salidaBinaria = z.object({
  nombre: z.string(),
  mime: z.string(),
  base64: z.string(),
  filas: z.number().int(),
  personaIds: z.array(z.string()),
  errores: z.array(z.object({ personaId: z.string().nullable(), personaNombre: z.string().nullable(), mensaje: z.string() })),
  advertencias: z.array(z.string()),
});

function filasLibro(ctx: Awaited<ReturnType<typeof datosArchivoPeriodo>>) {
  return ctx.filas.map((f) =>
    filaLibroRemuneraciones({
      personaId: f.personaId,
      rut: f.persona.rut,
      nombre: ctx.nombres.get(f.personaId) ?? `${f.persona.nombres} ${f.persona.apellidos}`.trim(),
      inicioContrato: f.inicio,
      terminoContrato: f.terminoEnMes,
      diasTrabajados: f.diasTrabajados,
      diasLicencia: f.diasLicencia,
      haberes: f.haberes,
      descuentosLegales: f.descuentosLegales,
      otrosDescuentos: f.otrosDescuentos,
      aportesEmpleador: f.aportesEmpleador,
      liquido: f.liquido,
    }),
  );
}

const advertenciasLibro = () => ["Totales alineados con las liquidaciones del período; no sustituye el LRE ante la DT."];

/** Excel del libro de remuneraciones (CAR-99, diseño 06). */
export const libroRemuneracionesExcel = defineCapability({
  id: "nomina.libro_remuneraciones.excel",
  descripcion:
    "Genera el Excel del libro de remuneraciones del período: una fila por liquidación con totales imponibles, no imponibles, descuentos y líquido. Mismas cifras que el LRE por persona.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: salidaBinaria,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const datos = await datosArchivoPeriodo(ctx, periodoId, "libro");
    const filas = filasLibro(datos);
    const bytes = await excelLibroRemuneraciones(filas);
    const nombre = nombreLibroRemuneraciones(datos.periodo.anio, datos.periodo.mes, "xlsx");
    const común = resultadoArchivo({ errores: [] }, datos);
    return {
      ...común,
      filas: filas.length,
      nombre,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: Buffer.from(bytes).toString("base64"),
      advertencias: advertenciasLibro(),
    };
  },
});

/** PDF del libro de remuneraciones (CAR-99, diseño 06). */
export const libroRemuneracionesPdf = defineCapability({
  id: "nomina.libro_remuneraciones.pdf",
  descripcion:
    "Genera el PDF del libro de remuneraciones del período: tabla resumida por persona con los mismos totales que el Excel y el LRE.",
  permiso: PERMISO_OBLIGACIONES,
  input: z.object({ periodoId: uuidSchema }),
  output: salidaBinaria,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: personasReveladas,
  async handler(ctx, { periodoId }) {
    const datos = await datosArchivoPeriodo(ctx, periodoId, "libro");
    const filas = filasLibro(datos);
    const titulo = `Libro de remuneraciones · ${datos.periodo.mes}/${datos.periodo.anio}`;
    const bytes = await pdfLibroRemuneraciones(titulo, filas);
    const nombre = nombreLibroRemuneraciones(datos.periodo.anio, datos.periodo.mes, "pdf");
    const común = resultadoArchivo({ errores: [] }, datos);
    return {
      ...común,
      filas: filas.length,
      nombre,
      mime: "application/pdf",
      base64: Buffer.from(bytes).toString("base64"),
      advertencias: advertenciasLibro(),
    };
  },
});