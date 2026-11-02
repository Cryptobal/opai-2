import { conflicto, noEncontrado, reglaDeNegocio } from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

import { puedeTransicionar, type EstadoCotizacion } from "../domain";
import type { ResultadoCalculo } from "../domain/motor";
import { versionDeCotizacion } from "./version";

function actorUsuario(ctx: Contexto) {
  const id = ctx.actor.id ?? ctx.actor.viaUserId;
  if (!id) throw reglaDeNegocio("Falta identidad del actor.");
  return id;
}

async function aprobacionPendiente(ctx: Contexto, versionId: string) {
  return ctx.db.cpqAprobacion.findFirst({
    where: { versionId, estado: "pendiente" },
    orderBy: { createdAt: "desc" },
  });
}

export async function transicionVersion(
  ctx: Contexto,
  versionId: string,
  hasta: EstadoCotizacion,
  data?: Partial<{ estado: string }>,
) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (!puedeTransicionar(v.estado as EstadoCotizacion, hasta))
    throw reglaDeNegocio(`No se puede pasar de ${v.estado} a ${hasta}.`);
  await ctx.db.cpqVersion.update({ where: { id: versionId }, data: { estado: hasta, ...data } });
  return v;
}

export async function solicitarAprobacionMargen(
  ctx: Contexto,
  versionId: string,
  resultado: ResultadoCalculo,
  comentario?: string,
) {
  if (!resultado.requiereAprobacion)
    throw reglaDeNegocio("El margen no requiere aprobación; puedes dejarla lista o enviar.");
  if (resultado.noEnviable)
    throw reglaDeNegocio("Completa los costos pendientes antes de pedir aprobación.");
  const v = await versionDeCotizacion(ctx, versionId);
  const prev = await aprobacionPendiente(ctx, versionId);
  if (v.estado === "en_aprobacion" && prev) return { aprobacionId: prev.id, estado: v.estado as EstadoCotizacion };
  await transicionVersion(ctx, versionId, "en_aprobacion");
  const fila = await ctx.db.cpqAprobacion.create({
    data: {
      tenantId: ctx.tenantId,
      versionId,
      solicitadaPorId: actorUsuario(ctx),
      comentario: comentario ?? null,
      estado: "pendiente",
    },
  });
  await ctx.transaccion(async (tx) => {
    await ctx.eventos.emitir(tx, {
      tipo: "cpq.cotizacion.aprobacion_solicitada",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: { aprobacionId: fila.id, margenEfectivoPct: resultado.margenEfectivoPct },
    });
  });
  ctx.despacharEventos();
  return { aprobacionId: fila.id, estado: "en_aprobacion" as const };
}

export async function marcarLista(ctx: Contexto, versionId: string, resultado: ResultadoCalculo) {
  if (resultado.noEnviable) throw reglaDeNegocio("La cotización no está lista: hay costos o UF pendientes.");
  if (resultado.requiereAprobacion)
    throw reglaDeNegocio("El margen requiere aprobación; usa «Pedir aprobación».");
  await transicionVersion(ctx, versionId, "lista");
  return { estado: "lista" as const };
}

export async function retirarAprobacion(ctx: Contexto, versionId: string) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (v.estado !== "en_aprobacion") throw reglaDeNegocio("No hay un pedido de aprobación activo.");
  const pend = await aprobacionPendiente(ctx, versionId);
  if (!pend) throw noEncontrado("La aprobación");
  const actorId = actorUsuario(ctx);
  if (pend.solicitadaPorId !== actorId && !ctx.autorizar("cpq:aprobar"))
    throw reglaDeNegocio("Solo quien pidió la aprobación o un aprobador puede retirarla.");
  await ctx.db.cpqAprobacion.update({
    where: { id: pend.id },
    data: { estado: "retirada", decididaPorId: actorId, decididaEn: new Date() },
  });
  await transicionVersion(ctx, versionId, "borrador");
  return { estado: "borrador" as const };
}

export async function resolverAprobacionMargen(
  ctx: Contexto,
  versionId: string,
  aprobar: boolean,
  motivo?: string,
) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (v.estado !== "en_aprobacion") throw reglaDeNegocio("La versión no está en aprobación.");
  const pend = await aprobacionPendiente(ctx, versionId);
  if (!pend) throw noEncontrado("La aprobación");
  if (pend.estado !== "pendiente") throw conflicto(`La aprobación ya está ${pend.estado}.`);
  if (!aprobar && !motivo?.trim()) throw reglaDeNegocio("Indica el motivo del rechazo.");
  const ahora = new Date();
  const actorId = actorUsuario(ctx);
  await ctx.db.cpqAprobacion.update({
    where: { id: pend.id },
    data: {
      estado: aprobar ? "aprobada" : "rechazada",
      decididaPorId: actorId,
      decididaEn: ahora,
      motivo: aprobar ? null : motivo!.trim(),
    },
  });
  const nuevo = aprobar ? ("lista" as const) : ("borrador" as const);
  await transicionVersion(ctx, versionId, nuevo);
  await ctx.transaccion(async (tx) => {
    await ctx.eventos.emitir(tx, {
      tipo: aprobar ? "cpq.cotizacion.aprobada" : "cpq.cotizacion.aprobacion_rechazada",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: { aprobacionId: pend.id, motivo: motivo ?? null },
    });
  });
  ctx.despacharEventos();
  return { estado: nuevo, aprobacionId: pend.id };
}

export { aprobacionPendiente };
