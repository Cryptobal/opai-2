import { excelLibroRemuneraciones, filaLibroRemuneraciones, nombreLibroRemuneraciones } from "@opai/domain";
import { z } from "zod";

import { defineCapability } from "../define";
import { uuidSchema } from "../core/esquemas";
import type { Contexto } from "../types";
import { datosArchivoPeriodo, montosFilaArchivo, personasReveladas, resultadoArchivo } from "./archivos-datos";
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

const ADVERTENCIAS_LIBRO = ["Totales alineados con las liquidaciones del período; no sustituye el LRE ante la DT."];

function filasLibro(ctx: Awaited<ReturnType<typeof datosArchivoPeriodo>>) {
  return ctx.filas.map((f) =>
    filaLibroRemuneraciones({
      ...montosFilaArchivo(f),
      nombre: ctx.nombres.get(f.personaId) ?? `${f.persona.nombres} ${f.persona.apellidos}`.trim(),
    }),
  );
}

async function salidaLibroBinaria(
  ctx: Contexto,
  periodoId: string,
  generar: (datos: Awaited<ReturnType<typeof datosArchivoPeriodo>>, filas: ReturnType<typeof filasLibro>) => Promise<{ mime: string; ext: "pdf" | "xlsx"; bytes: Uint8Array }>,
) {
  const datos = await datosArchivoPeriodo(ctx, periodoId, "libro");
  const filas = filasLibro(datos);
  const { mime, ext, bytes } = await generar(datos, filas);
  const nombre = nombreLibroRemuneraciones(datos.periodo.anio, datos.periodo.mes, ext);
  const común = resultadoArchivo({ errores: [] }, datos);
  return {
    ...común,
    filas: filas.length,
    nombre,
    mime,
    base64: Buffer.from(bytes).toString("base64"),
    advertencias: ADVERTENCIAS_LIBRO,
  };
}

const capLibroBinario = (
  id: `nomina.libro_remuneraciones.${string}`,
  descripcion: string,
  generar: Parameters<typeof salidaLibroBinaria>[2],
) =>
  defineCapability({
    id,
    descripcion,
    permiso: PERMISO_OBLIGACIONES,
    input: z.object({ periodoId: uuidSchema }),
    output: salidaBinaria,
    efecto: "lectura",
    dryRun: false,
    auditarLectura: personasReveladas,
    handler: (ctx, { periodoId }) => salidaLibroBinaria(ctx, periodoId, generar),
  });

/** Excel del libro de remuneraciones (CAR-99, diseño 06). */
export const libroRemuneracionesExcel = capLibroBinario(
  "nomina.libro_remuneraciones.excel",
  "Genera el Excel del libro de remuneraciones del período: una fila por liquidación con totales imponibles, no imponibles, descuentos y líquido. Mismas cifras que el LRE por persona.",
  async (_datos, filas) => ({
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: "xlsx",
    bytes: await excelLibroRemuneraciones(filas),
  }),
);

/** PDF del libro de remuneraciones (CAR-99, diseño 06). */
export const libroRemuneracionesPdf = capLibroBinario(
  "nomina.libro_remuneraciones.pdf",
  "Genera el PDF del libro de remuneraciones del período: tabla resumida por persona con los mismos totales que el Excel y el LRE.",
  async (datos, filas) => ({
    mime: "application/pdf",
    ext: "pdf",
    bytes: await pdfLibroRemuneraciones(`Libro de remuneraciones · ${datos.periodo.mes}/${datos.periodo.anio}`, filas),
  }),
);