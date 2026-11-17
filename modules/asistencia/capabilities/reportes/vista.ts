import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { METADATOS_REPORTE } from "../../domain/reportes";
import { alcanceReportes } from "./alcance";
import { cabeceraReporte } from "./cabecera";
import { filtroReporte, vistaReporteSchema } from "./esquema";
import { generarFilasReporte } from "./generar-filas";

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
    const alcance = alcanceReportes(ctx);
    const meta = METADATOS_REPORTE[i.tipo];
    const filtro = {
      desde: i.desde,
      hasta: i.hasta,
      ...(i.personaId ? { personaId: i.personaId } : {}),
      ...(i.instalacionId ? { instalacionId: i.instalacionId } : {}),
    };
    const cabecera = await cabeceraReporte(ctx, filtro);
    const { columnas, filas, siglasUsadas, provisorio } = await generarFilasReporte(ctx, i.tipo, filtro, alcance);
    return {
      tipo: i.tipo,
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