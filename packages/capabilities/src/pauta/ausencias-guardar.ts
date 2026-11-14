import type { TenantTx } from "@opai/db";

import { conflicto, reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import type { AusenciaPersona } from "./ausencias-plan";
import { aFechaDb } from "./comun";

/**
 * Deja aprobado el registro de la ausencia (CAR-393): lo crea desde la ficha o, con `solicitudId`, aprueba la solicitud
 * que la persona hizo desde su portal (CAR-508). La solicitud se bloquea y se revalida dentro de la transacción, después
 * de la persona y sus puestos (mismo orden que `core.ausencias.anular`).
 */
export async function guardarRegistro(
  tx: TenantTx,
  ctx: Contexto,
  input: AusenciaPersona & { hasta: string },
  ahora: Date,
  solicitudId?: string,
): Promise<{ id: string }> {
  const usuario = ctx.usuario?.id ?? null;
  if (!solicitudId)
    return tx.ausencia.create({
      data: {
        tenantId: ctx.tenantId,
        personaId: input.personaId,
        tipo: input.tipo,
        desde: aFechaDb(input.desde),
        hasta: aFechaDb(input.hasta),
        motivo: input.motivo,
        clase: input.clase ?? null,
        estado: "aprobada",
        registradaPor: usuario,
        aprobadaPor: usuario,
        aprobadaEn: ahora,
        createdAt: ahora,
      },
      select: { id: true },
    });
  await tx.$queryRaw`SELECT id FROM core.ausencias WHERE id = ${solicitudId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
  // RR. HH. pudo registrar otra ausencia en esas fechas mientras la solicitud esperaba (CAR-464).
  const choque = await tx.ausencia.count({
    where: {
      personaId: input.personaId,
      estado: "aprobada",
      desde: { lte: aFechaDb(input.hasta) },
      hasta: { gte: aFechaDb(input.desde) },
    },
  });
  if (choque > 0)
    throw conflicto("Ya hay una ausencia aprobada en esas fechas: anúlala o rechaza la solicitud.");
  const vigente = await tx.ausencia.updateMany({
    where: { id: solicitudId, personaId: input.personaId, estado: "solicitada" },
    data: { estado: "aprobada", aprobadaPor: usuario, aprobadaEn: ahora },
  });
  if (vigente.count !== 1) throw reglaDeNegocio("La solicitud ya fue respondida o retirada.");
  await ctx.eventos.emitir(tx, {
    tipo: "core.ausencia.respondida",
    entidadTipo: "persona",
    entidadId: input.personaId,
    payload: { ausenciaId: solicitudId, personaId: input.personaId, estado: "aprobada" },
  });
  return { id: solicitudId };
}
