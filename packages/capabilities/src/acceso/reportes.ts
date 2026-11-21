import { z } from "zod";

import { instalacionesEnAlcance } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { reglaDeNegocio } from "../errores";
import { instalacionEnAlcance } from "../rondas/comun";
import { uuidSchema } from "../core/esquemas";
import { configDeInstalacion, PERMISO_CONFIG } from "./config-comun";
import { enviarReporteAcceso } from "./reportes-enviar";

export const reportesProbar = defineCapability({
  id: "acceso.reportes.probar",
  descripcion:
    "Envía un correo de prueba del reporte periódico de accesos a los destinatarios configurados para la empresa o para una instalación, con los registros de los últimos siete días en un CSV adjunto (documentos enmascarados).",
  permiso: PERMISO_CONFIG,
  input: z.object({ instalacionId: uuidSchema.optional() }),
  output: z.object({
    enviados: z.number(),
    registros: z.number(),
    omitido: z.string().optional(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const instalacionId = await instalacionObjetivo(ctx, input.instalacionId);
    if (dryRun) {
      const cfg = await configDeInstalacion(ctx, instalacionId);
      return {
        enviados: cfg.reporteDestinatarios.length,
        registros: 0,
        ...(cfg.reporteDestinatarios.length ? {} : { omitido: "sin_destinatarios" }),
      };
    }
    return enviarReporteAcceso(ctx, instalacionId, { prueba: true });
  },
});

async function instalacionObjetivo(ctx: Parameters<typeof instalacionEnAlcance>[0], id?: string) {
  if (id) {
    await instalacionEnAlcance(ctx, id);
    return id;
  }
  const ids = instalacionesEnAlcance(ctx);
  const inst = await ctx.db.instalacion.findFirst({
    where: ids ? { id: { in: [...ids] } } : {},
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!inst) throw reglaDeNegocio("No hay instalaciones en el alcance.");
  return inst.id;
}