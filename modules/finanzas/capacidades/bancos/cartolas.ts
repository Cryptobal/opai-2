import { z } from "zod";

import { defineCapability, reglaDeNegocio } from "@opai/capabilities";
import type { TenantTx } from "@opai/db";

import { sincronizarAvisosEnTx } from "../aviso";
import { PERMISO_BANCOS_GESTIONAR, PERMISO_BANCOS_VER } from "./permisos";
import { aIso } from "./util";

const cartolaSchema = z.object({
  id: z.uuid(),
  nombreArchivo: z.string().nullable(),
  formato: z.string(),
  fechaDesde: z.string().nullable(),
  fechaHasta: z.string().nullable(),
  movimientos: z.number().int(),
  conciliados: z.number().int(),
  creadaEn: z.string(),
});

export const bancosCartolasListar = defineCapability({
  id: "finanzas.cartolas.listar",
  descripcion:
    "Lista las cartolas importadas de una cuenta bancaria, con su período, cuántos movimientos dejó cada una y cuántos ya están conciliados.",
  permiso: PERMISO_BANCOS_VER,
  input: z.object({ cuentaId: z.uuid(), limite: z.number().int().min(1).max(200).default(60) }),
  output: z.object({ items: z.array(cartolaSchema) }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((i) => i.id),
  async handler(ctx, input) {
    const cartolas = await ctx.db.cartolaImportada.findMany({
      where: { cuentaId: input.cuentaId },
      orderBy: { createdAt: "desc" },
      take: input.limite,
      include: { movimientos: { select: { estado: true } } },
    });
    return {
      items: cartolas.map((c) => ({
        id: c.id,
        nombreArchivo: c.nombreArchivo,
        formato: c.formato,
        fechaDesde: c.fechaDesde ? aIso(c.fechaDesde) : null,
        fechaHasta: c.fechaHasta ? aIso(c.fechaHasta) : null,
        movimientos: c.movimientos.length,
        conciliados: c.movimientos.filter((m) => m.estado === "conciliado").length,
        creadaEn: c.createdAt.toISOString(),
      })),
    };
  },
});

/** Movimientos de la importación y cuántos tienen una conciliación confirmada vigente (esos bloquean). */
async function contarImportacion(db: Pick<TenantTx, "movimientoBancario">, cartolaId: string) {
  const movs = await db.movimientoBancario.findMany({
    where: { cartolaId },
    select: { id: true, conciliaciones: { where: { activa: true, confirmada: true }, select: { id: true } } },
  });
  return { ids: movs.map((m) => m.id), conciliados: movs.filter((m) => m.conciliaciones.length > 0).length };
}

export const bancosCartolasDeshacer = defineCapability({
  id: "finanzas.cartolas.deshacer",
  descripcion:
    "Deshace una cartola importada: borra los movimientos que dejó esa importación y la importación misma, para volver a cargarla corregida. No procede si alguno de sus movimientos ya está conciliado.",
  permiso: PERMISO_BANCOS_GESTIONAR,
  input: z.object({ cartolaId: z.uuid(), motivo: z.string().trim().min(3).max(500) }),
  output: z.object({
    cartolaId: z.uuid(),
    nombreArchivo: z.string().nullable(),
    movimientos: z.number().int(),
    conciliados: z.number().int(),
    deshecha: z.boolean(),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const cartola = await ctx.db.cartolaImportada.findFirst({ where: { id: input.cartolaId } });
    if (!cartola) throw reglaDeNegocio("La importación no existe.");
    const previa = await contarImportacion(ctx.db, cartola.id);
    const base = { cartolaId: cartola.id, nombreArchivo: cartola.nombreArchivo, movimientos: previa.ids.length };
    if (dryRun) return { ...base, conciliados: previa.conciliados, deshecha: false };
    if (previa.conciliados > 0) throw bloqueo(previa.conciliados);

    await ctx.transaccion(async (tx) => {
      // Se vuelve a contar dentro de la transacción: una conciliación confirmada entre la vista previa y ahora bloquea.
      const actual = await contarImportacion(tx, cartola.id);
      if (actual.conciliados > 0) throw bloqueo(actual.conciliados);
      // Solo quedan conciliaciones deshechas o sugerencias sin confirmar: se van con su movimiento.
      await tx.conciliacionBanco.deleteMany({ where: { movimientoId: { in: actual.ids } } });
      await tx.movimientoBancario.deleteMany({ where: { id: { in: actual.ids }, cartolaId: cartola.id } });
      await tx.cartolaImportada.delete({ where: { id: cartola.id } });
      await ctx.eventos.emitir(tx, {
        tipo: "finanzas.banco.cartola_deshecha",
        entidadTipo: "cartolaImportada",
        entidadId: cartola.id,
        payload: { movimientos: actual.ids.length, cuentaId: cartola.cuentaId, motivo: input.motivo },
      });
      await sincronizarAvisosEnTx(ctx, tx, { dryRun: false });
    });
    return { ...base, conciliados: 0, deshecha: true };
  },
});

function bloqueo(n: number) {
  return reglaDeNegocio(
    `${n} movimiento${n === 1 ? "" : "s"} de esta cartola ya está${n === 1 ? "" : "n"} conciliado${n === 1 ? "" : "s"}. Deshaz esas conciliaciones antes de deshacer la importación.`,
  );
}
