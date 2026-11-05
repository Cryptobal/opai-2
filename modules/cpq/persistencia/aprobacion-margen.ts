import { conflicto, noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import { puedeTransicionar, type EstadoCotizacion } from "../domain";
import type { ResultadoCalculo } from "../domain/motor";
import {
  aprobacionPendiente,
  creadoPorIdDeVersion,
  exigirDecisorAprobacionMargen,
  usuarioReal,
} from "./aprobacion-reglas";
import { versionDeCotizacion } from "./version";
export async function solicitarAprobacionMargen(
  ctx: Contexto,
  versionId: string,
  resultado: ResultadoCalculo,
  comentario?: string,
) {
  // La capacidad ya validó los requisitos (`exigirParaPedirAprobacion`); aquí queda la defensa mínima.
  if (!resultado.requiereAprobacion || resultado.noEnviable)
    throw reglaDeNegocio("La cotización no está en condiciones de pedir aprobación.");
  const v = await versionDeCotizacion(ctx, versionId);
  const prev = await aprobacionPendiente(ctx, versionId);
  if (v.estado === "en_aprobacion" && prev) return { aprobacionId: prev.id, estado: v.estado as EstadoCotizacion };
  const desde = v.estado as EstadoCotizacion;
  if (!puedeTransicionar(desde, "en_aprobacion"))
    throw reglaDeNegocio(`No se puede pasar de ${v.estado} a en_aprobacion.`);
  const actorId = usuarioReal(ctx);
  const fila = await ctx.transaccion(async (tx) => {
    const vr = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: desde },
      // Se congela lo que se pide aprobar: la ficha muestra este cálculo hasta que cambie el estado.
      data: { estado: "en_aprobacion", ...datosCongelados(resultado) },
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
      payload: {
        aprobacionId: creada.id,
        solicitadaPorId: actorId,
        margenEfectivoPct: resultado.margenEfectivoPct,
      },
    });
    return creada;
  });
  ctx.despacharEventos();
  return { aprobacionId: fila.id, estado: "en_aprobacion" as const };
}
/** Venta y cálculo que queda congelado al dejar lista o pedir aprobación (R-CPQ-010). */
function datosCongelados(resultado: ResultadoCalculo) {
  return { ventaMensualClp: resultado.ventaMensual, calculoCongeladoJson: JSON.stringify(resultado) };
}

/** Requisitos ya validados por la capacidad (`exigirParaMarcarLista`); congela el cálculo aprobado. */
export async function marcarLista(ctx: Contexto, versionId: string, resultado: ResultadoCalculo) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (!puedeTransicionar(v.estado as EstadoCotizacion, "lista"))
    throw reglaDeNegocio(`No se puede pasar de ${v.estado} a lista.`);
  await ctx.db.cpqVersion.update({
    where: { id: versionId },
    data: { estado: "lista", ...datosCongelados(resultado) },
  });
  return { estado: "lista" as const };
}
export async function retirarAprobacion(ctx: Contexto, versionId: string) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (v.estado !== "en_aprobacion") throw reglaDeNegocio("No hay un pedido de aprobación activo.");
  const pend = await aprobacionPendiente(ctx, versionId);
  if (!pend) throw noEncontrado("La aprobación");
  const actorId = usuarioReal(ctx);
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
  const actorId = usuarioReal(ctx);
  const nuevo = aprobar ? ("lista" as const) : ("borrador" as const);
  let autoaprobacion = false;
  await ctx.transaccion(async (tx) => {
    const pendViva = await tx.cpqAprobacion.findFirst({
      where: { id: pend.id, versionId, estado: "pendiente" },
    });
    if (!pendViva) throw conflicto("La aprobación ya fue decidida; vuelve a cargar la ficha.");
    ({ autoaprobacion } = exigirDecisorAprobacionMargen(
      ctx,
      await creadoPorIdDeVersion(tx, versionId),
    ));
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

/** «Reabrir para editar» (R41): una versión lista vuelve a borrador; la aprobación anterior no se reutiliza. */
export async function reabrirParaEditar(ctx: Contexto, versionId: string) {
  const v = await versionDeCotizacion(ctx, versionId);
  if (v.estado !== "lista")
    throw reglaDeNegocio("Solo se reabre una cotización que está lista; las demás se editan o se versionan.");
  await ctx.transaccion(async (tx) => {
    const r = await tx.cpqVersion.updateMany({
      where: { id: versionId, estado: "lista" },
      data: { estado: "borrador" },
    });
    if (r.count === 0) throw conflicto("La versión cambió de estado mientras tanto; vuelve a cargar la ficha.");
    await ctx.eventos.emitir(tx, {
      tipo: "cpq.cotizacion.reabierta",
      entidadTipo: "cotizacion_version",
      entidadId: versionId,
      payload: { desde: "lista" },
    });
  });
  ctx.despacharEventos();
  return { estado: "borrador" as const };
}
