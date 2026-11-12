// Slack F2 (CAR-292): cuándo se busca a las personas en Slack, sin que nadie lo pida. Al conectar, al
// entrar alguien nuevo a la empresa y una vez al día para los pendientes. Sin Slack conectado no se
// encola nada ni se llama a Slack.
import { z } from "zod";

import type { TenantTx } from "@opai/db";

import { defineConsumidor } from "../../eventos/consumidores";
import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { instalacionSlack, PROVEEDOR_SLACK } from "./comun";
import { buscarEnSlack, candidatos, guardarVinculos } from "./vinculo";

export const TIPO_VINCULAR = "core.slack.vincular_pendientes";
/** Tope de continuaciones por ciclo: 25 × 40 = 1.000 personas por empresa y día. */
const MAX_VUELTAS = 25;

type Continuacion = { desde: string; vuelta: number };

/**
 * Encola la búsqueda (en su propia transacción o en `tx`). Una continuación lleva el inicio del ciclo
 * (`desde`): solo busca a quien no se revisó desde entonces, así que siempre avanza y termina.
 */
export function encolarVincular(
  ctx: Contexto,
  tx: TenantTx,
  clave: string,
  o: { usuarioId?: string; continuacion?: Continuacion } = {},
) {
  const c = o.continuacion;
  return ctx.trabajos.encolar(tx, {
    tipo: TIPO_VINCULAR,
    payload: {
      ...(o.usuarioId ? { usuarioId: o.usuarioId } : {}),
      ...(c ? { desde: c.desde, vuelta: c.vuelta } : {}),
    },
    claveUnica: c ? `slack-vincular:${c.desde}:${c.vuelta}` : clave,
    maxIntentos: 3,
    ...(c ? { programadoPara: new Date(Date.now() + 60_000) } : {}),
  });
}

export const trabajoVincularUsuariosSlack = defineTrabajo({
  tipo: TIPO_VINCULAR,
  descripcion:
    "Busca en Slack, por su correo, a las personas internas que aún no están vinculadas y guarda el resultado. Diario; también al conectar Slack y al entrar alguien nuevo. Si son más de 40, sigue en un minuto con las que faltan.",
  periodicidad: "diaria",
  payload: z.object({
    usuarioId: z.uuid().optional(),
    desde: z.iso.datetime().optional(),
    vuelta: z.number().int().min(1).max(MAX_VUELTAS).optional(),
  }),
  async handler(ctx, { usuarioId, desde, vuelta = 0 }) {
    if (!(await instalacionSlack(ctx))) return { omitido: "sin_slack" };
    const inicio = desde ?? new Date().toISOString();
    // Una corrida nueva revisa a todos los pendientes; una continuación, solo a quien no se revisó en el ciclo.
    const lista = await candidatos(ctx, {
      usuarioId,
      soloPendientes: true,
      ...(desde ? { revisadasAntesDe: new Date(desde) } : {}),
    });
    if (!lista.length) {
      await guardarVinculos(ctx, []); // limpia a quien dejó de ser interno
      return { revisadas: 0 };
    }
    const r = await buscarEnSlack(ctx, lista);
    const finales = await guardarVinculos(ctx, r.resultados);
    // Quedan personas sin revisar en este ciclo: sigue en un minuto, con un tope de vueltas.
    if (r.quedan > 0 && finales.length > 0 && vuelta + 1 <= MAX_VUELTAS)
      await ctx.transaccion((tx) =>
        encolarVincular(ctx, tx, "", { continuacion: { desde: inicio, vuelta: vuelta + 1 } }),
      );
    return { revisadas: finales.length, quedan: r.quedan };
  },
});

/** Al conectar Slack: busca a todas las personas internas. */
export const consumidorSlackConectada = defineConsumidor({
  id: "core.slack.vincular_al_conectar",
  descripcion: "Al conectar Slack, encola la búsqueda de las personas internas en el espacio.",
  eventos: ["core.integracion.actualizada"],
  async handler(ctx, ev) {
    const p = (ev.payload ?? {}) as { proveedor?: unknown; accion?: unknown };
    if (p.proveedor !== PROVEEDOR_SLACK || p.accion !== "conectada") return;
    await ctx.transaccion((tx) => encolarVincular(ctx, tx, `slack-vincular-conexion:${ev.id}`));
  },
});

/** Al entrar alguien a la empresa (acepta una invitación): si hay Slack, lo busca. */
export const consumidorSlackMiembroNuevo = defineConsumidor({
  id: "core.slack.vincular_miembro_nuevo",
  descripcion:
    "Al entrar una persona a la empresa, encola su búsqueda en Slack si Slack está conectado.",
  eventos: ["core.membresia.creada"],
  async handler(ctx, ev) {
    const usuarioId = z.uuid().safeParse((ev.payload as { usuarioId?: unknown } | null)?.usuarioId);
    if (!usuarioId.success || !(await instalacionSlack(ctx))) return;
    await ctx.transaccion((tx) =>
      encolarVincular(ctx, tx, `slack-vincular-alta:${ev.id}`, { usuarioId: usuarioId.data }),
    );
  },
});
