import type { TenantTx } from "@opai/db";

import type { Contexto } from "../types";

export async function emitirEntrada(
  tx: TenantTx,
  ctx: Contexto,
  p: { instalacionId: string; registroId: string; clave: string },
) {
  await ctx.eventos.emitir(tx, {
    tipo: "acceso.entrada",
    entidadTipo: "registro_acceso",
    entidadId: p.registroId,
    payload: p,
  });
}

export async function emitirSalida(
  tx: TenantTx,
  ctx: Contexto,
  { instalacionId, registroId }: { instalacionId: string; registroId: string },
) {
  await ctx.eventos.emitir(tx, {
    tipo: "acceso.salida",
    entidadTipo: "registro_acceso",
    entidadId: registroId,
    payload: { instalacionId, registroId },
  });
}

export async function emitirIntentoDenegado(
  tx: TenantTx,
  ctx: Contexto,
  p: { instalacionId: string; intentoId: string; motivo: string; clave: string },
) {
  await ctx.eventos.emitir(tx, {
    tipo: "acceso.intento_denegado",
    entidadTipo: "intento_denegado",
    entidadId: p.intentoId,
    payload: p,
  });
}

export async function emitirIngresoBloqueadoDiferido(
  tx: TenantTx,
  ctx: Contexto,
  p: { instalacionId: string; intentoId: string; clave: string },
) {
  await ctx.eventos.emitir(tx, {
    tipo: "acceso.ingreso_bloqueado_diferido",
    entidadTipo: "intento_denegado",
    entidadId: p.intentoId,
    payload: p,
  });
}