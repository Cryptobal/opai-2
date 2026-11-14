import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { sincronizarAvisosEnTx } from "../aviso";
import { copiaDe } from "./descartes-copia";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { aFecha, cuentaDe } from "./util";

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe ser AAAA-MM-DD.");
const MAX_DIAS = 400;

/**
 * CAR-341: saca los movimientos de una cuenta que entraron por la sincronización con el banco (o a mano) entre dos
 * fechas, para volver a cargarlos limpios desde la cartola. Las cartolas se deshacen desde Importaciones. Los
 * movimientos con una conciliación confirmada se conservan y se informan.
 * CAR-412: ya no es irreversible. Los movimientos quedan en un descarte (quién, cuándo, motivo y copia exacta) que se
 * restaura con `finanzas.descartes_bancarios.restaurar`.
 */
export const bancosMovimientosBorrarRango = defineCapability({
  id: "finanzas.movimientos_bancarios.borrar_rango",
  descripcion:
    "Descarta los movimientos de una cuenta bancaria que entraron por la sincronización con el banco en línea (o a mano) entre dos fechas, con vista previa del conteo. Los conciliados se conservan. Dejan de contar en saldos, conciliación y flujo, y el descarte se puede restaurar. Las cartolas se deshacen aparte.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z
    .object({
      cuentaId: z.uuid(),
      desde: fechaIso,
      hasta: fechaIso,
      origen: z.enum(["web4leads", "manual"]).default("web4leads").describe("web4leads = sincronización con el banco."),
      motivo: z.string().trim().min(3).max(500),
    })
    .refine((i) => i.desde <= i.hasta, { message: "«Desde» no puede ser posterior a «hasta»." })
    .refine((i) => (aFecha(i.hasta).getTime() - aFecha(i.desde).getTime()) / 86_400_000 <= MAX_DIAS, {
      message: `El rango no puede pasar de ${MAX_DIAS} días.`,
    }),
  output: z.object({
    cuentaId: z.uuid(),
    desde: z.string(),
    hasta: z.string(),
    movimientos: z.number().int().describe("Movimientos que se descartan."),
    conciliados: z.number().int().describe("Movimientos del rango con conciliación confirmada: se conservan."),
    borrados: z.boolean().describe("true si se descartaron (se pueden restaurar)."),
    descarteId: z.uuid().nullable().describe("Descarte para restaurar; null en la vista previa."),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const where = { cuentaId: cuenta.id, origen: input.origen, fecha: { gte: aFecha(input.desde), lte: aFecha(input.hasta) } };
    const contar = async (db: Pick<TenantTx, "movimientoBancario">) => {
      const movs = await db.movimientoBancario.findMany({
        where,
        include: { conciliaciones: { where: { activa: true, confirmada: true }, select: { id: true } } },
      });
      const libres = movs.filter((m) => m.conciliaciones.length === 0);
      return { libres, conciliados: movs.length - libres.length };
    };
    const previa = await contar(ctx.db);
    const base = { cuentaId: cuenta.id, desde: input.desde, hasta: input.hasta };
    if (dryRun) return { ...base, movimientos: previa.libres.length, conciliados: previa.conciliados, borrados: false, descarteId: null };
    if (!previa.libres.length) throw reglaDeNegocio("No hay movimientos sin conciliar en ese rango.");

    const actual = await ctx.transaccion(async (tx) => {
      // Se vuelve a contar dentro de la transacción: lo que se concilió entre la vista previa y ahora se conserva.
      const ahora = await contar(tx);
      const ids = ahora.libres.map((m) => m.id);
      const descarte = await tx.movimientoBancarioDescarte.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId: cuenta.id,
          desde: aFecha(input.desde),
          hasta: aFecha(input.hasta),
          origen: input.origen,
          motivo: input.motivo,
          cantidad: ids.length,
          movimientos: ahora.libres.map(copiaDe),
          descartadoPor: ctx.usuario?.id ?? null,
        },
        select: { id: true },
      });
      // Solo propuestas sin confirmar: si alguien confirmó una entre el recuento y aquí, la FK Restrict aborta todo.
      await tx.conciliacionBanco.deleteMany({ where: { movimientoId: { in: ids }, confirmada: false } });
      await tx.movimientoBancario.deleteMany({ where: { id: { in: ids } } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.movimientos_borrados",
        entidadTipo: "cuentaBancaria",
        entidadId: cuenta.id,
        payload: { descarteId: descarte.id, movimientos: ids.length, conciliados: ahora.conciliados, desde: input.desde, hasta: input.hasta, origen: input.origen, motivo: input.motivo },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
      return { ...ahora, descarteId: descarte.id };
    });
    return { ...base, movimientos: actual.libres.length, conciliados: actual.conciliados, borrados: true, descarteId: actual.descarteId };
  },
});
