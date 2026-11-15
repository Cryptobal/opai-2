import type { FilaCartolaParseada } from "@opai/domain";

import type { Contexto } from "@opai/capabilities";

import { sinDuplicado } from "../esquemas";
import type { AjusteFecha } from "./cartola-emparejar";
import { sincronizarAvisoSaldoBajo } from "./aviso-banco";
import { aplicarReglasBanco } from "./reglas-aplicar";
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
    /** Movimientos ya guardados con otra fecha: manda la fecha de la cartola (CAR-341). */
    ajustes?: AjusteFecha[];
    duplicados: number;
    rechazadas: { indice: number; motivo: string }[];
    saldoFinal: number | null;
    saldoInicial: number | null;
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
          saldoFinal: p.saldoFinal == null ? null : BigInt(p.saldoFinal),
          saldoInicial: p.saldoInicial == null ? null : BigInt(p.saldoInicial),
          // Quién importó: la persona, o la persona por la que actúa el agente (CAR-341).
          creadoPorId: ctx.usuario?.id ?? null,
          creadoPorNombre: ctx.usuario?.nombre ?? null,
          viaAgente: ctx.actor.tipo === "agent",
          movimientosNuevos: p.nuevos.length,
          duplicados: p.duplicados,
          rechazados: p.rechazadas.length,
          idempotencyKey: p.idempotencyKey,
        },
      }),
      "Importación duplicada.",
    );

    for (const a of p.ajustes ?? []) {
      await tx.movimientoBancario.update({
        where: { id: a.existenteId },
        data: {
          fecha: aFecha(a.fecha),
          claveDedupe: a.claveDedupe,
          ...(a.saldoDespues != null ? { saldoDespues: BigInt(a.saldoDespues) } : {}),
          ...(a.referencia != null ? { referencia: a.referencia } : {}),
        },
      });
    }

    const ids: string[] = [];
    for (const f of p.nuevos) {
      const estado = f.esRemuneracion ? "por_autorizar" : "pendiente";
      const mov = await tx.movimientoBancario.create({
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
          claveDedupe: f.claveDedupe,
          estado,
          origen: "cartola",
        },
        select: { id: true },
      });
      ids.push(mov.id);
    }
    // Reglas del banco (ADR-074): concilian solas con monto y referencia exactos; si no, dejan sugerencia.
    const reglas = await aplicarReglasBanco(ctx, tx, { movimientoIds: ids });

    await sincronizarAvisoSaldoBajo(ctx, tx, p.cuenta.id, p.saldoFinal);
    await ctx.eventos.emitir(tx, {
      tipo: "finanzas.banco.cartola_importada",
      entidadTipo: "cartolaImportada",
      entidadId: cartola.id,
      payload: { nuevos: p.nuevos.length, duplicados: p.duplicados, fechasAjustadas: p.ajustes?.length ?? 0, ...reglas },
    });
    return { cartola, reglas };
  });
}
