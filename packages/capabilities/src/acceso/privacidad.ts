import { z } from "zod";

import { defineCapability } from "../define";
import { tenantActual } from "../core/comun";
import { uuidSchema } from "../core/esquemas";
import { instalacionEnAlcance } from "../rondas/comun";
import { PERMISO_READ } from "./comun";
import { configDeInstalacion } from "./config-comun";

export const privacidadCartel = defineCapability({
  id: "acceso.privacidad.cartel",
  descripcion:
    "Datos para imprimir el cartel de privacidad de un punto de acceso: texto del aviso, nombre del punto y la instalación, y la URL pública con código QR hacia la política del responsable con la marca del tenant.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema, puntoId: uuidSchema.optional() }),
  output: z.object({
    urlPolitica: z.string(),
    aviso: z.string(),
    instalacion: z.string(),
    punto: z.string().nullable(),
    empresa: z.string(),
  }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: () => [],
  async handler(ctx, { instalacionId, puntoId }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const [inst, punto, cfg, tenant] = await Promise.all([
      ctx.db.instalacion.findUnique({ where: { id: instalacionId }, select: { nombre: true } }),
      puntoId
        ? ctx.db.puntoAcceso.findFirst({ where: { id: puntoId, instalacionId }, select: { nombre: true } })
        : null,
      configDeInstalacion(ctx, instalacionId),
      tenantActual(ctx),
    ]);
    const q = new URLSearchParams({ instalacion: instalacionId, ...(puntoId ? { punto: puntoId } : {}) });
    const urlPolitica = `${ctx.servicios.urlBase}/acceso/${tenant.slug}/privacidad?${q}`;
    return {
      urlPolitica,
      aviso: cfg.avisoPrivacidad,
      instalacion: inst?.nombre ?? "Instalación",
      punto: punto?.nombre ?? null,
      empresa: tenant.nombre,
    };
  },
});