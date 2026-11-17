import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { mesSchema } from "../pauta/comun";
import { dondeInstalacionId, PERMISO_READ } from "./comun";
import { derivarEstado } from "./ejecuciones-comun";
import { slotsNoRealizados } from "./programacion-slots";

const filaSchema = z.object({
  instalacionId: z.string(),
  instalacion: z.string(),
  cuenta: z.string(),
  realizadas: z.number().int(),
  completadas: z.number().int(),
  incompletas: z.number().int(),
  atrasadas: z.number().int(),
  noRealizadas: z.number().int(),
});

/** Cumplimiento de rondas del mes por instalación (compartido con portal cliente). */
export const informesCumplimiento = defineCapability({
  id: "rondas.informes.cumplimiento",
  descripcion:
    "Informe mensual de cumplimiento de rondas por instalación: realizadas, completas, incompletas, atrasadas y programadas no iniciadas. Misma fuente para el ERP y el portal del cliente.",
  permiso: PERMISO_READ,
  input: mesSchema.extend({ instalacionId: uuidSchema.optional() }),
  output: z.object({ anio: z.number().int(), mes: z.number().int(), instalaciones: z.array(filaSchema) }),
  auditarLectura: (s) => s.instalaciones.map((i) => i.instalacionId),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { anio, mes, instalacionId }) {
    const desde = `${anio}-${String(mes).padStart(2, "0")}-01`;
    const hasta =
      mes === 12
        ? `${anio}-12-31`
        : new Date(Date.parse(`${anio}-${String(mes + 1).padStart(2, "0")}-01T00:00:00.000Z`) - 1)
            .toISOString()
            .slice(0, 10);
    const instalaciones = await ctx.db.instalacion.findMany({
      where: {
        archivadaEn: null,
        ...dondeInstalacion(ctx),
        ...(instalacionId ? { id: instalacionId } : {}),
      },
      select: { id: true, nombre: true, cuenta: { select: { nombre: true } } },
    });
    const ahora = new Date();
    const filas = await ctx.db.ejecucionRonda.findMany({
      where: {
        ...dondeInstalacionId(ctx),
        ...(instalacionId ? { instalacionId } : {}),
        horaInicio: {
          gte: new Date(`${desde}T00:00:00.000Z`),
          lte: new Date(`${hasta}T23:59:59.999Z`),
        },
      },
      select: {
        instalacionId: true,
        horaInicio: true,
        plantilla: { select: { tiempoMaxMin: true } },
        cierre: { select: { estado: true, horaCierre: true, puntosMarcados: true, puntosObligatorios: true, motivo: true } },
      },
    });
    const faltantes = await slotsNoRealizados(ctx, {
      ...(instalacionId ? { instalacionId } : {}),
      desde,
      hasta,
    });
    const porInst = new Map<string, { r: number; c: number; i: number; a: number; n: number }>();
    for (const i of instalaciones) porInst.set(i.id, { r: 0, c: 0, i: 0, a: 0, n: 0 });
    for (const e of filas) {
      const b = porInst.get(e.instalacionId);
      if (!b) continue;
      b.r += 1;
      const est = derivarEstado(e.cierre, e.horaInicio, e.plantilla.tiempoMaxMin, ahora);
      if (est === "completada" || est === "cerrada_auto" || est === "cerrada_admin") b.c += 1;
      else if (est === "incompleta") b.i += 1;
      else if (est === "atrasada" || est === "en_curso") b.a += 1;
    }
    for (const f of faltantes) {
      const b = porInst.get(f.instalacionId);
      if (b) b.n += 1;
    }
    const instalacionesOut = instalaciones.map((ins) => {
      const s = porInst.get(ins.id) ?? { r: 0, c: 0, i: 0, a: 0, n: 0 };
      return {
        instalacionId: ins.id,
        instalacion: ins.nombre,
        cuenta: ins.cuenta.nombre,
        realizadas: s.r,
        completadas: s.c,
        incompletas: s.i,
        atrasadas: s.a,
        noRealizadas: s.n,
      };
    });
    return { anio, mes, instalaciones: instalacionesOut };
  },
});