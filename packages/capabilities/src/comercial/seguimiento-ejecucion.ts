// Piezas de ejecución del seguimiento (CAR-67): actividad en la ficha, correo con Reply-To y respuesta del cliente.
import { DOMINIO_RESPUESTAS, type ConfigPlan, direccionRespuesta, transicionSeguimiento } from "@opai/domain";

import { refDe } from "../core/crm/comun";
import { correoDe } from "../integraciones/adaptadores";
import type { Contexto } from "../types";
import { reglaDeNegocio } from "../errores";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];
type Seg = { id: string; negocioId: string; token: string; contactoId: string | null; estado: string };

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
  return a.id;
}

/** Envía el correo de un paso al contacto, con Reply-To al token del seguimiento y al vendedor. */
export async function enviarCorreoSeguimiento(ctx: Contexto, s: Seg, asunto: string, texto: string, vendedorId: string | null): Promise<string> {
  const contacto = s.contactoId ? await ctx.db.contacto.findUnique({ where: { id: s.contactoId }, select: { email: true } }) : null;
  if (!contacto?.email) throw reglaDeNegocio("El contacto del seguimiento no tiene correo.");
  const vendedor = vendedorId ? await ctx.db.user.findUnique({ where: { id: vendedorId }, select: { email: true } }) : null;
  const responderA = [direccionRespuesta(s.token, DOMINIO_RESPUESTAS), ...(vendedor ? [vendedor.email] : [])];
  await (await correoDe(ctx, "comercial")).enviar({ para: contacto.email, asunto, texto, responderA });
  return contacto.email;
}

/**
 * El cliente respondió: según el plan, pausa o detiene el seguimiento (R: pausa y espera a la persona)
 * y deja una nota en la ficha. `texto` es de un tercero: se guarda como dato, nunca se interpreta.
 */
export async function aplicarRespuesta(ctx: Contexto, tx: Tx, s: Seg, config: ConfigPlan, nota: { titulo: string; detalle?: string | null }): Promise<string> {
  const destino = transicionSeguimiento(s.estado as Parameters<typeof transicionSeguimiento>[0], config.alResponder === "detener" ? "cancelar" : "pausar");
  const actividadId = await actividadDePaso(ctx, tx, { tipo: "nota", titulo: nota.titulo, detalle: nota.detalle ?? null, negocioId: s.negocioId });
  if (destino) {
    await tx.seguimiento.update({ where: { id: s.id }, data: { estado: destino, motivo: "cliente_respondio" } });
    if (destino === "cancelado")
      await tx.seguimientoPaso.updateMany({ where: { seguimientoId: s.id, estado: { in: ["programado", "por_hacer", "por_preparar"] } }, data: { estado: "cancelado" } });
  }
  await ctx.eventos.emitir(tx, { tipo: "comercial.seguimiento.cliente_respondio", entidadTipo: "negocio", entidadId: s.negocioId, payload: { seguimientoId: s.id } });
  return actividadId;
}
