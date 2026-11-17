import type { Contexto } from "@opai/capabilities";
import type { Mensaje } from "@opai/integrations";

import { mensajeSchema } from "./conversaciones-guardado";

/** Tope de caracteres del historial enviado al modelo (el turno nuevo y el sistema van aparte). */
const TOPE_HISTORIAL_CHARS = 60_000;

function aModelo(rol: "usuario" | "agente", texto: string): Mensaje | null {
  const t = texto.trim();
  if (!t) return null;
  return rol === "usuario" ? { rol: "usuario", texto: t } : { rol: "asistente", texto: t };
}

function recortarCola(mensajes: Mensaje[]): Mensaje[] {
  let total = 0;
  const out: Mensaje[] = [];
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const m = mensajes[i]!;
    const len = m.rol === "asistente" ? (m.texto?.length ?? 0) : m.texto.length;
    if (total + len > TOPE_HISTORIAL_CHARS && out.length) break;
    total += len;
    out.unshift(m);
  }
  return out;
}

/** Mensajes guardados de la conversación, listos para el proveedor de IA. */
export async function historialConversacionModelo(
  ctx: Contexto,
  conversacionId: string,
  turnoId?: string,
): Promise<Mensaje[]> {
  const usuario = ctx.usuario;
  if (!usuario || ctx.principal?.tipo === "servicio") return [];
  const fila = await ctx.db.agenteConversacion.findFirst({
    where: {
      tenantId: ctx.tenantId,
      userId: usuario.id,
      id: conversacionId,
      archivadaEn: null,
    },
    select: { mensajes: true },
  });
  if (!fila) return [];
  const lista = mensajeSchema.array().safeParse(fila.mensajes);
  if (!lista.success) return [];
  const modelo: Mensaje[] = [];
  for (const m of lista.data) {
    if (turnoId && m.turno === turnoId) continue;
    const conv = aModelo(m.rol, m.texto);
    if (conv) modelo.push(conv);
  }
  return recortarCola(modelo);
}