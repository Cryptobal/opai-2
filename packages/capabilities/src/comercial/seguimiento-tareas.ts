// Tareas y efectos de los pasos del seguimiento (CAR-160). La tarea de un paso de persona es una tarea
// del núcleo (core.actividades) asignada al responsable: aparece en Mis tareas, en Inicio y en la Bandeja
// como cualquier otra. Al hacerse el paso se cierra sola; al omitirse o cancelarse el seguimiento, queda
// cancelada. Un paso con etapa destino mueve el negocio hacia adelante (R11), nunca hacia atrás.
import type { Contexto } from "../types";
import { aplicarEtapa } from "./transiciones-util";
import { validarEntrada } from "./validaciones";

type Tx = Parameters<Parameters<Contexto["transaccion"]>[0]>[0];

/** Estados de paso que se cancelan cuando el seguimiento se cancela, se reemplaza o termina. */
export const PASOS_CANCELABLES = ["programado", "por_hacer", "por_preparar", "fallido"];

/** Cierra las tareas pendientes indicadas (idempotente: una tarea ya hecha o cancelada no se toca). */
export async function cerrarTareas(ctx: Contexto, tx: Tx, ids: (string | null)[], estado: "hecha" | "cancelada"): Promise<number> {
  const validos = ids.filter((x): x is string => Boolean(x));
  if (!validos.length) return 0;
  const tareas = await tx.actividad.findMany({ where: { id: { in: validos }, tipo: "tarea", estado: "pendiente" }, select: { id: true } });
  let cerradas = 0;
  for (const t of tareas) {
    const hecha = estado === "hecha";
    const r = await tx.actividad.updateMany({
      where: { id: t.id, estado: "pendiente" },
      data: { estado, completadaEn: hecha ? new Date() : null, completadaPorId: hecha ? (ctx.usuario?.id ?? null) : null },
    });
    if (!r.count) continue;
    cerradas += 1;
    await ctx.eventos.emitir(tx, {
      tipo: hecha ? "core.actividad.tarea_completada" : "core.actividad.actualizada",
      entidadTipo: "actividad",
      entidadId: t.id,
      payload: hecha ? {} : { estado },
    });
  }
  return cerradas;
}

/** Cancela los pasos pendientes de un seguimiento y sus tareas. Devuelve cuántos pasos canceló. */
export async function cancelarPasosPendientes(ctx: Contexto, tx: Tx, seguimientoId: string): Promise<number> {
  const pasos = await tx.seguimientoPaso.findMany({ where: { seguimientoId, estado: { in: PASOS_CANCELABLES } }, select: { actividadId: true } });
  if (!pasos.length) return 0;
  await tx.seguimientoPaso.updateMany({ where: { seguimientoId, estado: { in: PASOS_CANCELABLES } }, data: { estado: "cancelado" } });
  await cerrarTareas(ctx, tx, pasos.map((p) => p.actividadId), "cancelada");
  return pasos.length;
}

export type ResultadoAvance = "movido" | "sin_cambio" | "requisitos" | "etapa_invalida";

/**
 * Avanza el negocio abierto a una etapa abierta de su embudo, solo si está más adelante que la actual
 * y cumple sus requisitos de entrada (R9 de comercial.md). Nunca baja, nunca gana ni pierde. Una etapa
 * borrada o desactivada después de guardar el plan devuelve `etapa_invalida` sin romper a quien llama.
 */
export async function avanzarAEtapa(ctx: Contexto, tx: Tx, negocioId: string, etapaId: string | undefined, motivo: string): Promise<ResultadoAvance> {
  if (!etapaId) return "sin_cambio";
  const negocio = await tx.negocio.findUnique({ where: { id: negocioId } });
  if (!negocio || negocio.estado !== "abierto") return "sin_cambio";
  const [destino, actual] = await Promise.all([
    tx.etapa.findUnique({ where: { id: etapaId } }),
    tx.etapa.findUnique({ where: { id: negocio.etapaId } }),
  ]);
  if (!destino || !destino.activa) return "etapa_invalida";
  const embudoDestino = await tx.embudo.findUnique({ where: { id: destino.embudoId }, select: { activo: true } });
  if (!embudoDestino?.activo) return "etapa_invalida";
  if (!actual || destino.tipo !== "abierta") return "sin_cambio";
  if (destino.embudoId !== negocio.embudoId || destino.orden <= actual.orden) return "sin_cambio";
  try {
    await validarEntrada(ctx, negocio, destino);
  } catch {
    return "requisitos";
  }
  await aplicarEtapa(ctx, tx, negocio, destino, { evento: "comercial.negocio.etapa_cambiada", motivo });
  return "movido";
}

/** Motivo con que el seguimiento mueve un negocio al hacerse un paso; el consumidor de pausa lo ignora. */
export const MOTIVO_PASO = "Paso del seguimiento";

/**
 * Efectos de un paso hecho: su tarea queda hecha y, si el paso declara etapa destino, el negocio avanza.
 * Devuelve un texto para la Actividad cuando la etapa no se pudo aplicar (se avisa, no se falla).
 */
export async function efectosPasoHecho(ctx: Contexto, tx: Tx, p: { tareaId: string | null; negocioId: string; etapaDestino?: string | undefined }): Promise<string | null> {
  await cerrarTareas(ctx, tx, [p.tareaId], "hecha");
  const r = await avanzarAEtapa(ctx, tx, p.negocioId, p.etapaDestino, MOTIVO_PASO);
  if (r === "requisitos") return "El paso pedía mover el negocio de etapa, pero no cumple los requisitos de entrada de esa etapa.";
  if (r === "etapa_invalida") return "El paso pedía mover el negocio a una etapa que ya no existe o está inactiva. Revisa el plan.";
  return null;
}
