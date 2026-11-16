import { z } from "zod";

import { uuidSchema } from "../core/esquemas";
import { dondeInstalacion, dondePuesto } from "../core/maestros/alcance";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { PERMISO_READ } from "./comun";
import { PERMISO_APROBAR_EXTRA } from "./turnos-extra-comun";

const montoSchema = z.object({
  id: z.string(),
  instalacionId: z.string(),
  puestoId: z.string().nullable().describe("Nulo: monto fijo de la instalación; si no, excepción del puesto."),
  montoClp: z.number().int(),
});

/** Fija (o quita) el monto del turno extra de una instalación o la excepción de un puesto (A6). */
export const montosTurnoExtraFijar = defineCapability({
  id: "pauta.montos_turno_extra.fijar",
  descripcion:
    "Fija el monto en CLP que se sugiere para cada turno extra de una instalación o, si se indica un puesto, la excepción de ese puesto. Con monto nulo se quita. No cambia los turnos extra ya registrados.",
  permiso: PERMISO_APROBAR_EXTRA,
  input: z.object({
    instalacionId: uuidSchema,
    puestoId: uuidSchema.optional(),
    montoClp: z.number().int().min(0).max(10_000_000).nullable(),
  }),
  output: z.object({ instalacionId: z.string(), puestoId: z.string().nullable(), montoClp: z.number().int().nullable() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { instalacionId, puestoId, montoClp }, { dryRun }) {
    const inst = await ctx.db.instalacion.findFirst({ where: { id: instalacionId, AND: [dondeInstalacion(ctx)] }, select: { id: true } });
    if (!inst) throw noEncontrado("La instalación");
    if (puestoId) {
      const p = await ctx.db.puesto.findFirst({ where: { id: puestoId, AND: [dondePuesto(ctx)] }, select: { instalacionId: true } });
      if (!p) throw noEncontrado("El puesto");
      if (p.instalacionId !== instalacionId) throw reglaDeNegocio("El puesto no es de esa instalación.");
    }
    const salida = { instalacionId, puestoId: puestoId ?? null, montoClp };
    if (dryRun) return salida;
    const donde = { instalacionId, puestoId: puestoId ?? null };
    await ctx.transaccion(async (tx) => {
      const actual = await tx.montoTurnoExtra.findFirst({ where: donde, select: { id: true } });
      if (montoClp === null) {
        if (actual) await tx.montoTurnoExtra.delete({ where: { id: actual.id } });
      } else if (actual) await tx.montoTurnoExtra.update({ where: { id: actual.id }, data: { montoClp } });
      else await tx.montoTurnoExtra.create({ data: { tenantId: ctx.tenantId, ...donde, montoClp } });
    });
    return salida;
  },
});

/** Montos de turno extra de una instalación: el fijo y las excepciones por puesto. */
export const montosTurnoExtraListar = defineCapability({
  auditarLectura: (s) => s.items.map((m) => m.id),
  id: "pauta.montos_turno_extra.listar",
  descripcion:
    "Lista los montos de turno extra de una instalación: el monto fijo de la instalación y las excepciones por puesto, en CLP.",
  permiso: PERMISO_READ,
  input: z.object({
    instalacionId: uuidSchema,
    cursor: z.string().optional().describe("El `siguiente` de la página anterior."),
    limite: z.number().int().min(1).max(200).default(100),
  }),
  output: z.object({ items: z.array(montoSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { instalacionId, cursor, limite }) {
    if (cursor && !uuidSchema.safeParse(cursor).success) throw reglaDeNegocio("El cursor no es válido.");
    const inst = await ctx.db.instalacion.findFirst({ where: { id: instalacionId, AND: [dondeInstalacion(ctx)] }, select: { id: true } });
    if (!inst) throw noEncontrado("La instalación");
    const filas = await ctx.db.montoTurnoExtra.findMany({
      where: { instalacionId, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: limite + 1,
      select: { id: true, instalacionId: true, puestoId: true, montoClp: true },
    });
    const items = filas.slice(0, limite);
    return { items, siguiente: filas.length > limite ? (items.at(-1)?.id ?? null) : null };
  },
});
