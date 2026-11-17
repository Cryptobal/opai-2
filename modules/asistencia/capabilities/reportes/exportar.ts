import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { filtroReporte } from "./esquema";
import { pdfReporteDt } from "./exportar-pdf";
import { xlsxReporteDt } from "./exportar-xlsx";
import { prepararReporteDt } from "./preparar";

export const reportesExportar = defineCapability({
  id: "asistencia.reportes.exportar",
  descripcion:
    "Exporta un reporte DT a Excel o PDF con la cabecera de la Res. 38. Devuelve el archivo en base64.",
  permiso: "asistencia:reportes",
  portales: ["erp", "supervisor"],
  input: filtroReporte.and(z.object({ formato: z.enum(["xlsx", "pdf"]) })),
  output: z.object({
    nombreArchivo: z.string(),
    mime: z.string(),
    contenidoBase64: z.string(),
    totalFilas: z.number().int(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: () => [],
  async handler(ctx, i) {
    const { meta, cabecera, columnas, filas, tipo } = await prepararReporteDt(ctx, i);
    if (filas.length > 20_000) throw reglaDeNegocio("El reporte es demasiado grande: acota el período o la instalación.");
    const base = `reporte-dt-${tipo}-${i.desde}-${i.hasta}`;
    if (i.formato === "xlsx") {
      return {
        nombreArchivo: `${base}.xlsx`,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        contenidoBase64: await xlsxReporteDt(meta.titulo, cabecera, columnas, filas),
        totalFilas: filas.length,
      };
    }
    return {
      nombreArchivo: `${base}.pdf`,
      mime: "application/pdf",
      contenidoBase64: await pdfReporteDt(meta.titulo, cabecera, columnas, filas),
      totalFilas: filas.length,
    };
  },
});