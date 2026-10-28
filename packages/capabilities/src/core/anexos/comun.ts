import { Prisma, type TenantTx } from "@opai/db";

import { noEncontrado } from "../../errores";
import type { Contexto } from "../../types";
import { dondePersona } from "../maestros/alcance";
import type { FilaAnexo } from "./vista";

/** Un anexo solo es visible si su persona está en el alcance del actor (owner/admin: todo el tenant). */
export async function anexoDe(ctx: Contexto, id: string): Promise<FilaAnexo> {
  const a = await ctx.db.anexoContrato.findFirst({
    where: { id, persona: dondePersona(ctx) },
  });
  if (!a) throw noEncontrado("El anexo");
  return a;
}

export type DatosBorrador = {
  personaId: string;
  vinculoId: string;
  motivoCambio: "capa" | "monto" | "instalacion" | "rol";
  snapshotAntes: unknown;
  snapshotDespues: unknown;
  generadoPorTipo: "evento" | "usuario" | "agente";
  generadoPorId: string | null;
  origenEventoId: string | null;
};

/**
 * Crea el borrador del anexo (R11). Idempotente por (tenant, origenEventoId, personaId): un evento
 * reintentado por el outbox no duplica el borrador de la misma persona (ADR-029); varias altas
 * manuales (origenEventoId null) nunca colisionan entre sí.
 */
export async function crearBorrador(
  ctx: Contexto,
  tx: TenantTx,
  datos: DatosBorrador,
): Promise<FilaAnexo> {
  if (datos.origenEventoId) {
    const existente = await tx.anexoContrato.findFirst({
      where: {
        tenantId: ctx.tenantId,
        origenEventoId: datos.origenEventoId,
        personaId: datos.personaId,
      },
    });
    if (existente) return existente;
  }
  const creado = await tx.anexoContrato.create({
    data: {
      tenantId: ctx.tenantId,
      personaId: datos.personaId,
      vinculoId: datos.vinculoId,
      motivoCambio: datos.motivoCambio,
      snapshotAntes:
        datos.snapshotAntes === null ? Prisma.DbNull : (datos.snapshotAntes as object),
      snapshotDespues: datos.snapshotDespues as object,
      generadoPorTipo: datos.generadoPorTipo,
      generadoPorId: datos.generadoPorId,
      origenEventoId: datos.origenEventoId,
      estado: "borrador",
      aprobadoPorId: null,
      aprobadoEn: null,
      rechazadoPorId: null,
      rechazadoEn: null,
      motivoRechazo: null,
      documentoId: null,
    },
  });
  await ctx.eventos.emitir(tx, {
    tipo: "core.anexo.generado",
    entidadTipo: "anexo",
    entidadId: creado.id,
    payload: { personaId: datos.personaId, motivoCambio: datos.motivoCambio },
  });
  return creado;
}
