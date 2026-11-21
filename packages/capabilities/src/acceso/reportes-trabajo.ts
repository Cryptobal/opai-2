import { z } from "zod";

import { defineTrabajo } from "../trabajos/registro";
import { hoyEmpresa } from "./prerregistro-comun";
import { enviarReporteAcceso } from "./reportes-enviar";

/** Reporte periódico por instalación (R27): corre una vez al día en la mañana (zona de la empresa). */
export const trabajoReportesAcceso = defineTrabajo({
  tipo: "acceso.reportes.periodico",
  descripcion:
    "Envía por correo el reporte de accesos de cada instalación según la frecuencia configurada (diario, semanal o mensual).",
  periodicidad: "diaria",
  payload: z.object({}).passthrough(),
  async handler(ctx) {
    if (!ctx.modulosActivos.includes("acceso")) return { enviados: 0, instalaciones: 0 };
    await hoyEmpresa(ctx);
    const ids = await ctx.db.instalacion.findMany({ select: { id: true } });
    let enviados = 0;
    let instalaciones = 0;
    for (const { id } of ids) {
      const r = await enviarReporteAcceso(ctx, id);
      if (r.enviados > 0) {
        enviados += r.enviados;
        instalaciones += 1;
      }
    }
    return { enviados, instalaciones };
  },
});