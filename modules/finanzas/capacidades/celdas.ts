import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { celdaSchema, montoSchema, semanaSchema, uuidSchema } from "./esquemas";
import { PERMISO_GESTIONAR } from "./permisos";
import { aFecha, aIso, exigirSemanaAbierta, filaDe, ID_VISTA_PREVIA } from "./util";

const vista = (c: {
  id: string;
  filaId: string;
  semana: Date | string;
  capa: string;
  monto: number;
  nota: string | null;
}) => ({
  id: c.id,
  filaId: c.filaId,
  semana: aIso(c.semana),
  capa: c.capa as "plan",
  monto: c.monto,
  nota: c.nota,
});

export const celdasFijar = defineCapability({
  id: "finanzas.celdas.fijar",
  descripcion:
    "Fija la cifra planificada de una fila en una semana (o la reemplaza) y su nota; no toca semanas selladas ni celdas comprometidas o reales.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({
    filaId: uuidSchema,
    semana: semanaSchema,
    monto: montoSchema,
    nota: z.string().trim().max(500).optional(),
  }),
  output: celdaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const fila = await filaDe(ctx, input.filaId);
    if (!fila.activa)
      throw reglaDeNegocio("La fila está inactiva: actívala antes de cargarle cifras.");
    await exigirSemanaAbierta(ctx, input.semana);
    const actual = await ctx.db.flujoCelda.findFirst({
      where: { filaId: fila.id, semana: aFecha(input.semana) },
    });
    if (actual && actual.capa !== "plan")
      throw reglaDeNegocio(
        "Esa celda ya es comprometida o real: viene de hechos y no se edita a mano.",
      );
    const nota = input.nota ?? actual?.nota ?? null;
    if (dryRun)
      return vista({
        id: actual?.id ?? ID_VISTA_PREVIA,
        filaId: fila.id,
        semana: input.semana,
        capa: "plan",
        monto: input.monto,
        nota,
      });
    const c = await ctx.transaccion(async (tx) => {
      const r = actual
        ? await tx.flujoCelda.update({
            where: { id: actual.id },
            data: { monto: input.monto, nota },
          })
        : await tx.flujoCelda.create({
            data: {
              tenantId: ctx.tenantId,
              filaId: fila.id,
              semana: aFecha(input.semana),
              capa: "plan",
              monto: input.monto,
              nota,
            },
          });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.celda_fijada",
        entidadTipo: "flujoCelda",
        entidadId: r.id,
      });
      return r;
    });
    return vista(c);
  },
});

export const celdasCumplir = defineCapability({
  id: "finanzas.celdas.cumplir",
  descripcion:
    "Da por cumplida una celda planificada del flujo de caja: pasa a capa real con la fecha de hoy, con el monto efectivo si difiere del plan.",
  permiso: PERMISO_GESTIONAR,
  input: z.object({ id: uuidSchema, monto: montoSchema.optional() }),
  output: celdaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await ctx.db.flujoCelda.findFirst({ where: { id: input.id } });
    if (!c) throw noEncontrado("La celda del flujo");
    if (c.capa !== "plan") throw reglaDeNegocio("Solo se da por cumplida una celda planificada.");
    await exigirSemanaAbierta(ctx, aIso(c.semana));
    const monto = input.monto ?? c.monto;
    if (dryRun) return vista({ ...c, capa: "real", monto });
    const r = await ctx.transaccion(async (tx) => {
      const u = await tx.flujoCelda.update({
        where: { id: c.id },
        data: { capa: "real", monto, cumplidaEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.celda_cumplida",
        entidadTipo: "flujoCelda",
        entidadId: c.id,
      });
      return u;
    });
    return vista(r);
  },
});
