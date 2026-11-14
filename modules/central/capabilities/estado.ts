import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { ESTADOS_ACTIVOS, estadoEfectivo, pesoSeveridad, SEVERIDADES } from "../domain";
import { PERMISO_VER, severidadSchema, uuidSchema } from "./esquemas";
import { dondeAlcance } from "./util";

const conteoSchema = z.object(Object.fromEntries(SEVERIDADES.map((s) => [s, z.number().int()])) as Record<
  (typeof SEVERIDADES)[number],
  z.ZodNumber
>);

export const centralEstado = defineCapability({
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  id: "central.estado",
  descripcion:
    "Foto en vivo de la central: alertas activas por severidad, pospuestas y las instalaciones con más problemas, ordenadas por la alerta más grave.",
  permiso: PERMISO_VER,
  input: z.object({}),
  output: z.object({
    activas: conteoSchema,
    pospuestas: z.number().int(),
    instalaciones: z.array(
      z.object({ instalacionId: uuidSchema, activas: z.number().int(), peor: severidadSchema }),
    ),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const ahora = new Date();
    const filas = await ctx.db.centralAlerta.findMany({
      where: { ...dondeAlcance(ctx), estado: { in: [...ESTADOS_ACTIVOS, "pospuesta"] } },
      select: { instalacionId: true, severidad: true, estado: true, estadoPrevio: true, pospuestaHasta: true },
    });
    const activas = Object.fromEntries(SEVERIDADES.map((s) => [s, 0])) as Record<(typeof SEVERIDADES)[number], number>;
    const porInstalacion = new Map<string, { activas: number; peor: (typeof SEVERIDADES)[number] }>();
    let pospuestas = 0;
    for (const f of filas) {
      if (estadoEfectivo(f, ahora) === "pospuesta") {
        pospuestas++;
        continue;
      }
      const sev = f.severidad as (typeof SEVERIDADES)[number];
      activas[sev]++;
      const i = porInstalacion.get(f.instalacionId) ?? { activas: 0, peor: sev };
      i.activas++;
      if (pesoSeveridad(sev) < pesoSeveridad(i.peor)) i.peor = sev;
      porInstalacion.set(f.instalacionId, i);
    }
    const instalaciones = [...porInstalacion.entries()]
      .map(([instalacionId, v]) => ({ instalacionId, ...v }))
      .sort((a, b) => pesoSeveridad(a.peor) - pesoSeveridad(b.peor) || b.activas - a.activas)
      .slice(0, 20);
    return { activas, pospuestas, instalaciones };
  },
});
