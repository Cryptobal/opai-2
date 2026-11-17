import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { PERMISO_READ } from "./comun";

/** Lee tarifas sugeridas de turno extra de una instalación y sus puestos (CAR-620). */
export const turnosExtraTarifasListar = defineCapability({
  id: "pauta.turnos_extra.tarifas_listar",
  descripcion:
    "Devuelve el monto sugerido de turno extra de la instalación y de cada puesto activo. Solo lectura; no cambia turnos ya registrados.",
  permiso: PERMISO_READ,
  input: z.object({ instalacionId: uuidSchema }),
  output: z.object({
    instalacionClp: z.number().int().nullable(),
    puestos: z.array(z.object({ puestoId: z.string(), montoClp: z.number().int().nullable() })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId }) {
    const ok = await ctx.db.instalacion.findFirst({
      where: { id: instalacionId, archivadaEn: null, AND: [dondeInstalacion(ctx)] },
      select: { id: true },
    });
    if (!ok) throw noEncontrado("La instalación");
    const puestos = await ctx.db.puesto.findMany({
      where: { instalacionId, estado: "activo", AND: [dondePuesto(ctx)] },
      select: { id: true },
    });
    const tarifas = await ctx.db.tarifaTurnoExtra.findMany({
      where: {
        OR: [
          { sujetoTipo: "instalacion", sujetoId: instalacionId },
          ...(puestos.length
            ? [{ sujetoTipo: "puesto" as const, sujetoId: { in: puestos.map((p) => p.id) } }]
            : []),
        ],
      },
      select: { sujetoTipo: true, sujetoId: true, montoClp: true },
    });
    const inst = tarifas.find((t) => t.sujetoTipo === "instalacion")?.montoClp ?? null;
    const porPuesto = new Map(
      tarifas.filter((t) => t.sujetoTipo === "puesto").map((t) => [t.sujetoId, t.montoClp]),
    );
    return {
      instalacionClp: inst,
      puestos: puestos.map((p) => ({ puestoId: p.id, montoClp: porPuesto.get(p.id) ?? null })),
    };
  },
});