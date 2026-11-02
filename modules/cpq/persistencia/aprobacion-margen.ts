import { conflicto, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { puedeTransicionar, type EstadoCotizacion } from "../domain";
import type { ResultadoCalculo } from "../domain/motor";
import { exigirDecisorAprobacionMargen, usuarioReal } from "./aprobacion-reglas";
import { versionDeCotizacion } from "./version";

function actorUsuario(ctx: Contexto) {
  return usuarioReal(ctx);
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
  const desde = v.estado as EstadoCotizacion;
  if (!puedeTransicionar(desde, "en_aprobacion"))
    throw reglaDeNegocio(`No se puede pasar de ${v.estado} a en_aprobacion.`);
  const actorId = actorUsuario(ctx);
  const fila = await ctx.transaccion(async (tx) => {
    const vr = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: desde },
      data: { estado: "en_aprobacion" },
    });
    if (vr.count === 0) throw conflicto("La versión cambió de estado mientras tanto; vuelve a intentar.");
    const creada = await tx.cpqAprobacion.create({
      data: {
        tenantId: ctx.tenantId,
        versionId,
        solicitadaPorId: actorId,
        comentario: comentario ?? null,
        estado: "pendiente",
      },
    });
    await ctx.eventos.emitir(tx, {
      tipo: "cpq.cotizacion.aprobacion_solicitada",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: { aprobacionId: creada.id, margenEfectivoPct: resultado.margenEfectivoPct },
    });
    return creada;
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
  const ahora = new Date();
  await ctx.transaccion(async (tx) => {
    const ar = await tx.cpqAprobacion.updateMany({
      where: { id: pend.id, estado: "pendiente" },
      data: { estado: "retirada", decididaPorId: actorId, decididaEn: ahora },
    });
    if (ar.count === 0) throw conflicto("La aprobación ya fue decidida; vuelve a cargar la ficha.");
    const vr = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: "en_aprobacion" },
      data: { estado: "borrador" },
    });
    if (vr.count === 0) throw conflicto("La versión cambió de estado mientras tanto; vuelve a intentar.");
  });
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
  if (!aprobar && !motivo?.trim()) throw reglaDeNegocio("Indica el motivo del rechazo.");
  const ahora = new Date();
  const actorId = actorUsuario(ctx);
  const nuevo = aprobar ? ("lista" as const) : ("borrador" as const);
  let autoaprobacion = false;
  await ctx.transaccion(async (tx) => {
    const pendViva = await tx.cpqAprobacion.findFirst({
      where: { id: pend.id, versionId, estado: "pendiente" },
    });
    if (!pendViva) throw conflicto("La aprobación ya fue decidida; vuelve a cargar la ficha.");
    ({ autoaprobacion } = exigirDecisorAprobacionMargen(ctx, pendViva.solicitadaPorId));
    const ar = await tx.cpqAprobacion.updateMany({
      where: { id: pendViva.id, estado: "pendiente" },
      data: {
        estado: aprobar ? "aprobada" : "rechazada",
        decididaPorId: actorId,
        decididaEn: ahora,
        motivo: aprobar ? null : motivo!.trim(),
      },
    });
    if (ar.count === 0) throw conflicto("La aprobación ya fue decidida; vuelve a cargar la ficha.");
    const vr = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: "en_aprobacion" },
      data: { estado: nuevo },
    });
    if (vr.count === 0) throw conflicto("La versión cambió de estado mientras tanto; vuelve a intentar.");
    await ctx.eventos.emitir(tx, {
      tipo: aprobar ? "cpq.cotizacion.aprobada" : "cpq.cotizacion.aprobacion_rechazada",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: {
        aprobacionId: pendViva.id,
        motivo: motivo ?? null,
        ...(aprobar ? { autoaprobacion } : {}),
      },
    });
  });
  ctx.despacharEventos();
  return { estado: nuevo, aprobacionId: pend.id, autoaprobacion: aprobar ? autoaprobacion : false };
}

export { aprobacionPendiente };
