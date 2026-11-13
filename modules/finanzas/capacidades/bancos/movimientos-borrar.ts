import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { sincronizarAvisosEnTx } from "../aviso";
import { PERMISO_BANCOS_GESTIONAR } from "./permisos";
import { aFecha, cuentaDe } from "./util";

const fechaIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe ser AAAA-MM-DD.");
const MAX_DIAS = 400;

/**
 * CAR-341: borra los movimientos de una cuenta que entraron por la sincronización con el banco (o a mano) entre dos
 * fechas, para volver a cargarlos limpios desde la cartola. Las cartolas se deshacen desde Importaciones. Los
 * movimientos con una conciliación confirmada se conservan y se informan.
 */
export const bancosMovimientosBorrarRango = defineCapability({
  id: "finanzas.movimientos_bancarios.borrar_rango",
  descripcion:
    "Borra los movimientos de una cuenta bancaria que entraron por la sincronización con el banco en línea (o a mano) entre dos fechas, con vista previa del conteo. Los conciliados se conservan. Las cartolas se deshacen aparte. No se puede revertir.",
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
    movimientos: z.number().int().describe("Movimientos que se borran."),
    conciliados: z.number().int().describe("Movimientos del rango con conciliación confirmada: se conservan."),
    borrados: z.boolean(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cuenta = await cuentaDe(ctx, input.cuentaId);
    const where = { cuentaId: cuenta.id, origen: input.origen, fecha: { gte: aFecha(input.desde), lte: aFecha(input.hasta) } };
    const contar = async (db: Pick<TenantTx, "movimientoBancario">) => {
      const movs = await db.movimientoBancario.findMany({
        where,
        select: { id: true, conciliaciones: { where: { activa: true, confirmada: true }, select: { id: true } } },
      });
      const libres = movs.filter((m) => m.conciliaciones.length === 0).map((m) => m.id);
      return { libres, conciliados: movs.length - libres.length };
    };
    const previa = await contar(ctx.db);
    const base = { cuentaId: cuenta.id, desde: input.desde, hasta: input.hasta };
    if (dryRun) return { ...base, movimientos: previa.libres.length, conciliados: previa.conciliados, borrados: false };
    if (!previa.libres.length) throw reglaDeNegocio("No hay movimientos sin conciliar en ese rango.");

    const actual = await ctx.transaccion(async (tx) => {
      // Se vuelve a contar dentro de la transacción: lo que se concilió entre la vista previa y ahora se conserva.
      const ahora = await contar(tx);
      await tx.conciliacionBanco.deleteMany({ where: { movimientoId: { in: ahora.libres } } });
      await tx.movimientoBancario.deleteMany({ where: { id: { in: ahora.libres } } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.movimientos_borrados",
        entidadTipo: "cuentaBancaria",
        entidadId: cuenta.id,
        payload: { movimientos: ahora.libres.length, conciliados: ahora.conciliados, desde: input.desde, hasta: input.hasta, origen: input.origen, motivo: input.motivo },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
      return ahora;
    });
    return { ...base, movimientos: actual.libres.length, conciliados: actual.conciliados, borrados: true };
  },
});
