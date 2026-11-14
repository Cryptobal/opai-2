import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { sincronizarAvisosEnTx } from "../aviso";
import { copiasDe, filaDeCopia } from "./descartes-copia";
import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_VER } from "./permisos";
import { aIso, cuentaDe } from "./util";

const descarteSchema = z.object({
  id: z.uuid(),
  desde: z.string(),
  hasta: z.string(),
  origen: z.string(),
  motivo: z.string(),
  movimientos: z.number().int(),
  descartadoEn: z.string(),
  restauradoEn: z.string().nullable(),
});

/** CAR-412: descartes de «Borrar por fechas» de una cuenta, del más reciente al más antiguo, para restaurarlos. */
export const bancosDescartesListar = defineCapability({
  id: "finanzas.descartes_bancarios.list",
  descripcion:
    "Lista los descartes de movimientos bancarios de una cuenta (lo que se sacó con «Borrar por fechas»): rango, motivo, cuántos movimientos y si ya se restauró.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({
    cuentaId: z.uuid(),
    cursor: z.string().optional(),
    limite: z.number().int().min(1).max(100).default(20),
  }),
  output: z.object({ items: z.array(descarteSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const filas = await ctx.db.movimientoBancarioDescarte.findMany({
      where: { cuentaId: cuenta.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: input.limite + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: { id: true, desde: true, hasta: true, origen: true, motivo: true, cantidad: true, createdAt: true, restauradoEn: true },
    });
    const pagina = filas.slice(0, input.limite);
    return {
      items: pagina.map((d) => ({
        id: d.id,
        desde: aIso(d.desde),
        hasta: aIso(d.hasta),
        origen: d.origen,
        motivo: d.motivo,
        movimientos: d.cantidad,
        descartadoEn: d.createdAt.toISOString(),
        restauradoEn: d.restauradoEn?.toISOString() ?? null,
      })),
      siguiente: filas.length > input.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});

/**
 * CAR-412: devuelve a la cuenta los movimientos de un descarte. Los que ya volvieron por otra vía (una cartola o la
 * sincronización los trajo de nuevo) se omiten y se informan, para no duplicar.
 */
export const bancosDescartesRestaurar = defineCapability({
  id: "finanzas.descartes_bancarios.restaurar",
  descripcion:
    "Restaura un descarte de movimientos bancarios: los devuelve a la cuenta tal como estaban, con vista previa. Omite los que ya volvieron por una cartola o por la sincronización con el banco.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({ descarteId: z.uuid() }),
  output: z.object({
    descarteId: z.uuid(),
    restaurados: z.number().int().describe("Movimientos que vuelven a la cuenta."),
    yaPresentes: z.number().int().describe("Movimientos que ya estaban de vuelta: se omiten."),
    restaurado: z.boolean(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const plan = async (db: typeof ctx.db) => {
      const d = await db.movimientoBancarioDescarte.findFirst({ where: { id: input.descarteId } });
      if (!d) throw noEncontrado("El descarte");
      if (d.restauradoEn) throw reglaDeNegocio("Este descarte ya se restauró.");
      const copias = copiasDe(d.movimientos);
      const presentes = await db.movimientoBancario.findMany({
        where: {
          cuentaId: d.cuentaId,
          OR: [
            { id: { in: copias.map((c) => c.id) } },
            { claveDedupe: { in: copias.map((c) => c.claveDedupe) } },
            { idExterno: { in: copias.flatMap((c) => (c.idExterno ? [c.idExterno] : [])) } },
          ],
        },
        select: { id: true, claveDedupe: true, idExterno: true },
      });
      const choca = (c: (typeof copias)[number]) =>
        presentes.some((p) => p.id === c.id || p.claveDedupe === c.claveDedupe || (c.idExterno !== null && p.idExterno === c.idExterno));
      return { d, nuevos: copias.filter((c) => !choca(c)), yaPresentes: copias.filter(choca).length };
    };
    const previa = await plan(ctx.db);
    const base = { descarteId: previa.d.id };
    if (dryRun) return { ...base, restaurados: previa.nuevos.length, yaPresentes: previa.yaPresentes, restaurado: false };
    return ctx.transaccion(async (tx) => {
      const p = await plan(tx);
      if (p.nuevos.length) {
        await tx.movimientoBancario.createMany({ data: p.nuevos.map((c) => filaDeCopia(c, ctx.tenantId, p.d.cuentaId)) });
      }
      // Guarda optimista: si otro restauró entre el plan y aquí, no se marca dos veces (y la unicidad ya abortó los duplicados).
      const marcado = await tx.movimientoBancarioDescarte.updateMany({
        where: { id: p.d.id, restauradoEn: null },
        data: { restauradoEn: new Date(), restauradoPor: ctx.usuario?.id ?? null },
      });
      if (marcado.count !== 1) throw reglaDeNegocio("Este descarte ya se restauró.");
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.movimientos_restaurados",
        entidadTipo: "cuentaBancaria",
        entidadId: p.d.cuentaId,
        payload: { descarteId: p.d.id, restaurados: p.nuevos.length, yaPresentes: p.yaPresentes },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
      return { ...base, restaurados: p.nuevos.length, yaPresentes: p.yaPresentes, restaurado: true };
    });
  },
});
