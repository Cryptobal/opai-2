// Piezas de ejecución del seguimiento (CAR-67): actividad en la ficha, correo con Reply-To y respuesta del cliente.
import { DOMINIO_RESPUESTAS, type ConfigPlan, direccionRespuesta, transicionSeguimiento } from "@opai/domain";

import { refDe } from "../core/crm/comun";
import { remitenteDe } from "../core/comunicaciones/envio";
import { registrarSalienteDeNegocio } from "../core/correos/registrar";
import { correoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";
import { reglaDeNegocio } from "../errores";
import { avanzarAEtapa, cancelarPasosPendientes } from "./seguimiento-tareas";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];
type Seg = { id: string; negocioId: string; token: string; contactoId: string | null; estado: string; motivo?: string | null };

/** Registra en la ficha del negocio lo que pasó con un paso (nota, correo, llamada, whatsapp o tarea). */
export async function actividadDePaso(
  ctx: Contexto, tx: Tx,
  d: { tipo: "nota" | "correo" | "llamada" | "whatsapp" | "tarea"; titulo: string; detalle?: string | null; negocioId: string; responsables?: string[]; vencimiento?: Date },
): Promise<string> {
  const a = await tx.actividad.create({
    data: {
      tenantId: ctx.tenantId, tipo: d.tipo, titulo: d.titulo, detalle: d.detalle ?? null, ocurrioEn: new Date(),
      vencimiento: d.vencimiento ?? null, todoElDia: false, prioridad: d.tipo === "tarea" ? "media" : null,
      estado: d.tipo === "tarea" ? "pendiente" : null, asistentes: [], completadaEn: null, creadaPorId: ctx.usuario?.id ?? null,
    },
  });
  await tx.actividadVinculo.create({ data: { tenantId: ctx.tenantId, actividadId: a.id, ...refDe("negocio", d.negocioId) } });
  for (const usuarioId of d.responsables ?? [])
    await tx.actividadResponsable.create({ data: { tenantId: ctx.tenantId, actividadId: a.id, usuarioId } });
  await ctx.eventos.emitir(tx, { tipo: "core.actividad.registrada", entidadTipo: "actividad", entidadId: a.id, payload: { tipo: a.tipo } });
  // Como cualquier tarea asignada (CAR-160): mismo evento que core.actividades.create.
  if (d.tipo === "tarea" && d.responsables?.length)
    await ctx.eventos.emitir(tx, { tipo: "core.actividad.tarea_asignada", entidadTipo: "actividad", entidadId: a.id, payload: { responsables: d.responsables } });
  return a.id;
}

/** Envía el correo de un paso al contacto, con Reply-To al token del seguimiento y al vendedor. */
export async function enviarCorreoSeguimiento(ctx: Contexto, s: Seg, asunto: string, texto: string, vendedorId: string | null): Promise<string> {
  const contacto = s.contactoId ? await ctx.db.contacto.findUnique({ where: { id: s.contactoId }, select: { email: true } }) : null;
  if (!contacto?.email) throw reglaDeNegocio("El contacto del seguimiento no tiene correo.");
  const vendedor = vendedorId ? await ctx.db.user.findUnique({ where: { id: vendedorId }, select: { email: true } }) : null;
  const responderA = [direccionRespuesta(s.token, DOMINIO_RESPUESTAS), ...(vendedor ? [vendedor.email] : [])];
  const mailer = await correoDe(ctx, "comercial");
  await mailer.enviar({ para: contacto.email, asunto, texto, responderA });
  // CAR-233: el saliente queda en el historial del cliente (cuenta, contacto y negocio del seguimiento).
  await registrarSalienteDeNegocio(ctx, s.negocioId, { origen: "seguimiento", contactoId: s.contactoId, remitente: remitenteDe(mailer), destinatarios: [contacto.email], asunto, texto });
  return contacto.email;
}

/**
 * R13: al responder el cliente el negocio pasa a la etapa configurada, nunca hacia atrás y solo si
 * cumple los requisitos de entrada de esa etapa. Devuelve `"movido"`, `"sin_cambio"` o, si la etapa del
 * plan se borró o se desactivó después de guardarlo, `"etapa_invalida"` (el trabajo sigue; se avisa).
 */
export async function avanzarPorRespuesta(ctx: Contexto, tx: Tx, negocioId: string, etapaId: string | undefined): Promise<"movido" | "sin_cambio" | "etapa_invalida"> {
  const r = await avanzarAEtapa(ctx, tx, negocioId, etapaId, "El cliente respondió");
  return r === "requisitos" ? "sin_cambio" : r;
}

/**
 * El cliente respondió: según el plan, pausa o detiene el seguimiento (R: pausa y espera a la persona)
 * y deja una nota en la ficha. `texto` es de un tercero: se guarda como dato, nunca se interpreta.
 * No hace nada sobre un seguimiento ya terminado o cancelado (ganado, perdido, sin respuesta): no pisa
 * su motivo, no deja nota ni avisa; devuelve `null`. El estado se relee dentro de la transacción: el
 * que recibe `s` pudo leerse antes de que otro proceso lo cerrara.
 */
export async function aplicarRespuesta(ctx: Contexto, tx: Tx, s: Seg, config: ConfigPlan, nota: { titulo: string; detalle?: string | null }): Promise<string | null> {
  const actual = await tx.seguimiento.findUnique({ where: { id: s.id } });
  if (!actual || (actual.estado !== "activo" && actual.estado !== "pausado")) return null;
  // «Ya avisado» tiene su propio campo (`avisadoEn`): el motivo de la pausa (p. ej. «manual») no se pisa.
  // Se reserva con un UPDATE condicional antes de cambiar el estado: si dos correos llegan a la vez,
  // solo uno modifica la fila y avisa. Los registros anteriores a `avisadoEn` que ya pausó una respuesta
  // (motivo `cliente_respondio`) cuentan como avisados.
  const reservado = await tx.seguimiento.updateMany({
    where: { id: s.id, tenantId: ctx.tenantId, avisadoEn: null, OR: [{ motivo: null }, { motivo: { not: "cliente_respondio" } }] },
    data: { avisadoEn: new Date() },
  });
  const destino = transicionSeguimiento(actual.estado as Parameters<typeof transicionSeguimiento>[0], config.alResponder === "detener" ? "cancelar" : "pausar");
  const movido = await avanzarPorRespuesta(ctx, tx, actual.negocioId, config.etapaAlResponder);
  const detalle = [
    nota.detalle,
    movido === "movido" ? "El negocio pasó a la etapa configurada en el plan." : null,
    movido === "etapa_invalida" ? "El negocio no cambió de etapa: la etapa «al responder» del plan ya no existe o está inactiva. Revisa el plan." : null,
  ].filter(Boolean).join(" ");
  const actividadId = await actividadDePaso(ctx, tx, { tipo: "nota", titulo: nota.titulo, detalle: detalle || null, negocioId: actual.negocioId });
  if (destino) {
    await tx.seguimiento.update({ where: { id: s.id }, data: { estado: destino, motivo: "cliente_respondio" } });
    if (destino === "cancelado") await cancelarPasosPendientes(ctx, tx, s.id);
  }
  if (reservado.count > 0)
    await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.cliente_respondio", entidadTipo: "negocio", entidadId: actual.negocioId, payload: { seguimientoId: s.id } });
  return actividadId;
}
