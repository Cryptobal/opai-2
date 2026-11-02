import { claveDedupe } from "@opai/domain";
import type { FilaCartolaParseada } from "@opai/domain";

import type { Contexto } from "@opai/capabilities";

import { sinDuplicado } from "../esquemas";
import { sincronizarAvisoSaldoBajo } from "./aviso-banco";
import { aFecha } from "./util";

type CuentaRow = { id: string };

export async function aplicarImportacionCartola(
  ctx: Contexto,
  p: {
    cuenta: CuentaRow;
    formato: "santander" | "generico";
    nombreArchivo?: string;
    idempotencyKey: string;
    nuevos: FilaCartolaParseada[];
    duplicados: number;
    rechazadas: { indice: number; motivo: string }[];
    saldoFinal: number | null;
    fechaDesde: string | null;
    fechaHasta: string | null;
  },
) {
  return ctx.transaccion(async (tx) => {
    const cartola = await sinDuplicado(
      tx.cartolaImportada.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId: p.cuenta.id,
          formato: p.formato,
          nombreArchivo: p.nombreArchivo ?? null,
          fechaDesde: p.fechaDesde ? aFecha(p.fechaDesde) : null,
          fechaHasta: p.fechaHasta ? aFecha(p.fechaHasta) : null,
          saldoFinal: BigInt(p.saldoFinal ?? 0),
          movimientosNuevos: p.nuevos.length,
          duplicados: p.duplicados,
          rechazados: p.rechazadas.length,
          idempotencyKey: p.idempotencyKey,
        },
      }),
      "Importación duplicada.",
    );

    for (const f of p.nuevos) {
      const estado = f.esRemuneracion ? "por_autorizar" : "pendiente";
      await tx.movimientoBancario.create({
        data: {
          tenantId: ctx.tenantId,
          cuentaId: p.cuenta.id,
          cartolaId: cartola.id,
          fecha: aFecha(f.fecha),
          monto: BigInt(f.monto),
          glosa: f.glosa,
          referencia: f.referencia,
          sucursal: f.sucursal,
          saldoDespues: f.saldoDespues != null ? BigInt(f.saldoDespues) : null,
          claveDedupe: claveDedupe({
            fecha: f.fecha,
            monto: f.monto,
            glosa: f.glosa,
            referencia: f.referencia,
          }),
          estado,
          origen: "cartola",
        },
      });
    }

    await sincronizarAvisoSaldoBajo(ctx, tx, p.cuenta.id, p.saldoFinal);
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.banco.cartola_importada",
      entidadTipo: "cartolaImportada",
      entidadId: cartola.id,
      payload: { nuevos: p.nuevos.length, duplicados: p.duplicados },
    });
    return cartola;
  });
}
