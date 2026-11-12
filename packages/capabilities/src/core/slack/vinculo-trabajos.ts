// Slack F2 (CAR-292): cuándo se busca a las personas en Slack, sin que nadie lo pida. Al conectar, al
// entrar alguien nuevo a la empresa y una vez al día para los pendientes. Sin Slack conectado no se
// encola nada ni se llama a Slack.
import { z } from "zod";

import { defineConsumidor } from "../../eventos/consumidores";
import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { instalacionSlack, PROVEEDOR_SLACK } from "./comun";
import { buscarEnSlack, candidatos, guardarVinculos } from "./vinculo";

export const TIPO_VINCULAR = "core.slack.vincular_usuarios";

async function encolarVincular(ctx: Contexto, clave: string, usuarioId?: string, cuando?: Date) {
  return ctx.transaccion((tx) =>
    ctx.trabajos.encolar(tx, {
      tipo: TIPO_VINCULAR,
      payload: usuarioId ? { usuarioId } : {},
      claveUnica: clave,
      maxIntentos: 3,
      ...(cuando ? { programadoPara: cuando } : {}),
    }),
  );
}

export const trabajoVincularUsuariosSlack = defineTrabajo({
  tipo: TIPO_VINCULAR,
  descripcion:
    "Busca en Slack, por su correo, a las personas internas que aún no están vinculadas y guarda el resultado. Diario; también al conectar Slack y al entrar alguien nuevo.",
  periodicidad: "diaria",
  payload: z.object({ usuarioId: z.uuid().optional() }),
  async handler(ctx, { usuarioId }) {
    if (!(await instalacionSlack(ctx))) return { omitido: "sin_slack" };
    const lista = await candidatos(ctx, { usuarioId, soloPendientes: true });
    if (!lista.length) {
      await guardarVinculos(ctx, []); // limpia a quien dejó de ser interno
      return { revisadas: 0 };
    }
    const r = await buscarEnSlack(ctx, lista);
    const finales = await guardarVinculos(ctx, r.resultados);
    // Más personas que el tope por corrida: sigue en un minuto, sin esperar al día siguiente.
    if (r.quedan > 0)
      await encolarVincular(
        ctx,
        `slack-vincular:${Date.now()}`,
        undefined,
        new Date(Date.now() + 60_000),
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
    await encolarVincular(ctx, `slack-vincular-conexion:${ev.id}`);
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
    await encolarVincular(ctx, `slack-vincular-alta:${ev.id}`, usuarioId.data);
  },
});
