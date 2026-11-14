import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";

import { sincronizarAvisosEnTx } from "../aviso";
import { filaDeCopia } from "./descartes-copia";
import { planRestaurar } from "./descartes-plan";
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
    cursor: z.uuid().optional().describe("Id del último descarte de la página anterior."),
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
 * sincronización los trajo de nuevo, aun con otra huella o fecha) se omiten y se informan, para no duplicar. Un
 * movimiento vuelve con el estado que tenía, salvo «sugerido», que vuelve a «pendiente» (su propuesta se borró).
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
    if (dryRun) {
      const p = await planRestaurar(ctx.db, input.descarteId);
      return { descarteId: p.d.id, restaurados: p.nuevos.length, yaPresentes: p.yaPresentes, restaurado: false };
    }
    return ctx.transaccion(async (tx) => {
      // Primero se reclama el descarte: bloquea su fila, así un segundo «Restaurar» simultáneo espera y luego no reclama.
      const reclamo = await tx.movimientoBancarioDescarte.updateMany({
        where: { id: input.descarteId, restauradoEn: null },
        data: { restauradoEn: new Date(), restauradoPor: ctx.usuario?.id ?? null },
      });
      if (reclamo.count !== 1) {
        await planRestaurar(tx, input.descarteId); // no existe → NOT_FOUND; ya restaurado → regla de negocio
        throw reglaDeNegocio("Este descarte ya se restauró.");
      }
      const plan = await planRestaurar(tx, input.descarteId, true);
      const d = plan.d;
      if (plan.nuevos.length) {
        // Una cartola de la cuenta ya deshecha no existe: el movimiento vuelve sin ese vínculo.
        const cartolas = new Set(
          (await tx.cartolaImportada.findMany({ where: { id: { in: plan.nuevos.flatMap((c) => (c.cartolaId ? [c.cartolaId] : [])) } }, select: { id: true } })).map((c) => c.id),
        );
        await tx.movimientoBancario.createMany({
          data: plan.nuevos.map((c) => filaDeCopia({ ...c, cartolaId: c.cartolaId && cartolas.has(c.cartolaId) ? c.cartolaId : null }, ctx.tenantId, d.cuentaId)),
        });
      }
      // Ley 21.719: restaurado el descarte, la copia (glosas) ya no se necesita.
      await tx.movimientoBancarioDescarte.update({ where: { id: d.id }, data: { movimientos: [] } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.movimientos_restaurados",
        entidadTipo: "cuentaBancaria",
        entidadId: d.cuentaId,
        payload: { descarteId: d.id, restaurados: plan.nuevos.length, yaPresentes: plan.yaPresentes },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
      return { descarteId: d.id, restaurados: plan.nuevos.length, yaPresentes: plan.yaPresentes, restaurado: true };
    });
  },
});
