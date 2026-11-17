// Slack F4 (CAR-294): piezas comunes de la gestión de avisos de terreno (vista, alcance y el cambio
// condicional de estado que evita que dos personas tomen el mismo aviso a la vez).
import { z } from "zod";

import { noEncontrado } from "../../../errores";
import type { Contexto } from "../../../types";
import { iso } from "../../comun";
import { TIPO_ACTUALIZAR_AVISO } from "./registrar";

export const vistaSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  titulo: z.string(),
  gestion: z.enum(["abierto", "tomado", "cerrado"]),
  tomadoPor: z.string().nullable(),
  tomadoEn: z.string().nullable(),
  cerradoEn: z.string().nullable(),
});

export type Fila = NonNullable<Awaited<ReturnType<Contexto["db"]["slackAviso"]["findUnique"]>>>;
export const vista = (a: Fila) => ({
  id: a.id,
  tipo: a.tipo,
  titulo: a.titulo,
  gestion: a.gestion as "abierto" | "tomado" | "cerrado",
  tomadoPor: a.tomadoPor,
  tomadoEn: iso(a.tomadoEn),
  cerradoEn: iso(a.cerradoEn),
});

/** Aviso dentro del alcance del actor: un supervisor solo ve los de sus instalaciones (ADR-022). */
export async function avisoEnAlcance(ctx: Contexto, id: string) {
  const a = await ctx.db.slackAviso.findUnique({ where: { id } });
  const fuera =
    a && ctx.alcance && (!a.instalacionId || !ctx.alcance.instalaciones.includes(a.instalacionId));
  if (!a || fuera) throw noEncontrado("El aviso");
  return a;
}

/** Refuerzo: un pedido por aviso cada 5 minutos, aunque se apriete varias veces (CAR-294). */
const VENTANA_REFUERZO_MS = 5 * 60_000;

/**
 * Cambia la gestión en una transacción, con evento y la actualización del mensaje de Slack en cola.
 * El cambio es condicional (`desde`): si dos personas aprietan a la vez, solo una gana; la otra recibe
 * el estado que dejó la primera (`perdio`) y no se emite evento ni auditoría de más.
 */
export async function cambiar(
  ctx: Contexto,
  a: Fila,
  cambio: { data: Record<string, unknown>; desde: string[]; evento: string; extra?: string },
  perdio: (f: Fila) => ReturnType<typeof vista>,
) {
  return ctx.transaccion(async (tx) => {
    const n = await tx.slackAviso.updateMany({
      where: { id: a.id, gestion: { in: cambio.desde } },
      data: cambio.data,
    });
    const nuevo = await tx.slackAviso.findFirst({ where: { id: a.id } });
    if (!nuevo) throw noEncontrado("El aviso");
    if (n.count === 0) return perdio(nuevo);
    await ctx.eventos.emitir(tx, {
      tipo: cambio.evento,
      entidadTipo: "aviso_terreno",
      entidadId: a.id,
      payload: { avisoId: a.id },
    });
    if (a.ts && !cambio.extra)
      await ctx.trabajos.encolar(tx, {
        tipo: TIPO_ACTUALIZAR_AVISO,
        payload: { avisoId: a.id },
        claveUnica: `slack-aviso-actualizar:${a.id}:${cambio.evento}`,
        maxIntentos: 5,
      });
    if (cambio.extra)
      await ctx.trabajos.encolar(tx, {
        tipo: cambio.extra,
        payload: { avisoId: a.id, porUserId: ctx.usuario?.id ?? null },
        claveUnica: `${cambio.extra}:${a.id}:${Math.floor(Date.now() / VENTANA_REFUERZO_MS)}`,
        maxIntentos: 4,
      });
    return vista(nuevo);
  });
}

