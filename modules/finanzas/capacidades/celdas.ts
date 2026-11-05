import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { celdaSchema, montoSchema, semanaSchema, uuidSchema, aNumeroSeguro } from "./esquemas";
import { PERMISO_GESTIONAR } from "./permisos";
import { aFecha, aIso, bloquearSemanaFlujo, filaDe, ID_VISTA_PREVIA, lunesHoy } from "./util";
import { sincronizarAvisosEnTx } from "./aviso";

const vista = (c: {
  id: string;
  filaId: string;
  semana: Date | string;
  capa: string;
  monto: bigint | number;
  nota: string | null;
}) => ({
  id: c.id,
  filaId: c.filaId,
  semana: aIso(c.semana),
  capa: c.capa as "plan",
  monto: aNumeroSeguro(c.monto),
  nota: c.nota,
});

export const celdasFijar = defineCapability({
  id: "finanzas.celdas.fijar",
  descripcion:
    "Fija la cifra planificada de una fila en una semana actual o futura (o la reemplaza) y su nota; no edita semanas pasadas ni celdas comprometidas o reales.",
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
    const hoy = lunesHoy();
    if (input.semana < hoy)
      throw reglaDeNegocio("Las semanas pasadas se leen de la cartola; no se ajustan montos a mano.");
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
      await bloquearSemanaFlujo(tx, ctx, input.semana);
      // Releer con el lock tomado: dos «fijar» sobre una celda nueva ya no chocan (hallazgo 11).
      const vigente = await tx.flujoCelda.findFirst({
        where: { filaId: fila.id, semana: aFecha(input.semana) },
      });
      if (vigente && vigente.capa !== "plan")
        throw reglaDeNegocio(
          "Esa celda ya es comprometida o real: viene de hechos y no se edita a mano.",
        );
      const r = vigente
        ? await tx.flujoCelda.update({
            where: { id: vigente.id },
            data: { monto: BigInt(input.monto), nota },
          })
        : await tx.flujoCelda.create({
            data: {
              tenantId: ctx.tenantId,
              filaId: fila.id,
              semana: aFecha(input.semana),
              capa: "plan",
              monto: BigInt(input.monto),
              nota,
            },
          });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.celda_fijada",
        entidadTipo: "flujoCelda",
        entidadId: r.id,
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
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
    const semana = aIso(c.semana);
    const hoy = lunesHoy();
    if (semana < hoy)
      throw reglaDeNegocio("Las semanas pasadas se leen de la cartola; no se ajustan montos a mano.");
    const montoNum = input.monto ?? aNumeroSeguro(c.monto);
    if (dryRun) return vista({ ...c, capa: "real", monto: montoNum });
    const r = await ctx.transaccion(async (tx) => {
      await bloquearSemanaFlujo(tx, ctx, semana);
      const vigente = await tx.flujoCelda.findFirst({ where: { id: c.id } });
      if (!vigente || vigente.capa !== "plan")
        throw reglaDeNegocio("Solo se da por cumplida una celda planificada.");
      const u = await tx.flujoCelda.update({
        where: { id: c.id },
        data: { capa: "real", monto: BigInt(montoNum), cumplidaEn: new Date() },
      });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.flujo.celda_cumplida",
        entidadTipo: "flujoCelda",
        entidadId: c.id,
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
      return u;
    });
    return vista(r);
  },
});
