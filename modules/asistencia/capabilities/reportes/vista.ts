import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { METADATOS_REPORTE } from "../../domain/reportes";
import { alcanceReportes } from "./alcance";
import { filtroReporte, vistaReporteSchema } from "./esquema";
import { prepararReporteDt } from "./preparar";

export const reportesVista = defineCapability({
  id: "asistencia.reportes.vista",
  descripcion:
    "Arma la vista previa de un reporte DT (Res. 38): cabecera oficial, columnas, filas desde días consolidados, marcas, correcciones aceptadas e incidentes. Alcance por instalación.",
  permiso: "asistencia:reportes",
  portales: ["erp", "supervisor"],
  input: filtroReporte,
  output: vistaReporteSchema,
  efecto: "lectura",
  dryRun: false,
  auditarLectura: () => [],
  async handler(ctx, i) {
    const { meta, cabecera, columnas, filas, siglasUsadas, provisorio, tipo } = await prepararReporteDt(ctx, i);
    return {
      tipo,
      titulo: meta.titulo,
      cabecera,
      columnas,
      filas,
      siglasUsadas,
      totalFilas: filas.length,
      provisorio,
    };
  },
});

export const reportesCatalogo = defineCapability({
  id: "asistencia.reportes.catalogo",
  descripcion: "Lista los reportes DT obligatorios y su descripción.",
  permiso: "asistencia:reportes",
  portales: ["erp", "supervisor"],
  input: z.object({}),
  output: z.object({
    items: z.array(z.object({ id: z.string(), titulo: z.string(), descripcion: z.string(), obligatorio: z.boolean() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    alcanceReportes(ctx);
    return {
      items: Object.entries(METADATOS_REPORTE).map(([id, m]) => ({ id, ...m })),
    };
  },
});