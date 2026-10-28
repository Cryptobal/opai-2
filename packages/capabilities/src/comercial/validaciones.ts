import { noEncontrado } from "../errores";
import type { Contexto } from "../types";

/** La cuenta existe en esta empresa (la RLS ya acota la búsqueda al tenant). */
export async function cuentaValida(ctx: Contexto, cuentaId: string) {
  const c = await ctx.db.cuenta.findUnique({ where: { id: cuentaId }, select: { id: true } });
  if (!c) throw noEncontrado("La cuenta");
}

/** El responsable es un usuario con membresía activa en esta empresa (core.users es global). */
export async function responsableValido(ctx: Contexto, userId: string | null | undefined) {
  if (!userId) return;
  const m = await ctx.db.membership.findFirst({
    where: { userId, estado: "activa" },
    select: { id: true },
  });
  if (!m) throw noEncontrado("El responsable");
}

/** Evento `comercial.negocio.actualizado` por outbox, en la transacción de la capacidad. */
export async function emitirActualizado(
  ctx: Contexto,
  negocioId: string,
  payload: Record<string, unknown>,
) {
  await ctx.transaccion(async (tx) => {
    await ctx.eventos.emitir(tx, {
      tipo: "comercial.negocio.actualizado",
      entidadTipo: "negocio",
      entidadId: negocioId,
      payload,
    });
  });
}
