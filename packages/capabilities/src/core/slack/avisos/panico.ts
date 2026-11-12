// Slack F3 (CAR-293, decisión 4 de Carlos): pánico. Además del canal, mensaje directo a los supervisores
// a cargo de la instalación (si la empresa lo activa) y, si nadie lo toma en los minutos configurados,
// escalamiento a un grupo de usuarios de OPAI (CAR-251). Solo a personas vinculadas (F2). Si Slack
// falla con alguien, se sigue con el resto: el pánico ya quedó registrado en OPAI.
import { z } from "zod";

import { defineTrabajo } from "../../../trabajos/registro";
import type { Contexto } from "../../../types";
import { tokenSlack } from "../comun";
import { slackUsuarios } from "../vinculo";
import { slackMensajes } from "./cliente";
import { configSiConectada, TIPO_DIRECTO_PANICO, TIPO_ESCALAR_PANICO } from "./registrar";
import { urlOpai } from "./bloques";

type AvisoPanico = {
  id: string;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  instalacionId: string | null;
};

/** Solo personas con membresía activa en la empresa. */
export async function activos(ctx: Contexto, userIds: string[]) {
  if (!userIds.length) return [];
  const m = await ctx.db.membership.findMany({
    where: { userId: { in: userIds }, estado: "activa" },
    select: { userId: true },
  });
  return m.map((x) => x.userId);
}

/** Ids de Slack de los usuarios vinculados entre `userIds`. */
export async function vinculados(ctx: Contexto, userIds: string[]) {
  if (!userIds.length) return [];
  const filas = await ctx.db.slackUsuario.findMany({
    where: { userId: { in: userIds }, estado: "vinculado" },
    select: { slackUserId: true },
  });
  return filas.flatMap((f) => (f.slackUserId ? [f.slackUserId] : []));
}

/**
 * Manda el mismo aviso por mensaje directo a cada destinatario y devuelve cuántos salieron. Si no salió
 * ninguno y hubo errores, lanza para que el runner reintente.
 */
export async function directos(ctx: Contexto, a: AvisoPanico, slackIds: string[], prefijo = "") {
  if (!slackIds.length) return 0;
  const token = await tokenSlack(ctx);
  let enviados = 0;
  let fallidos = 0;
  for (const id of slackIds) {
    try {
      await slackUsuarios().mensajeDirecto(token, id, {
        titulo: `${prefijo}${a.titulo}`,
        cuerpo: a.detalle,
        enlace: urlOpai(a.enlace, ctx.servicios.urlBase),
      });
      enviados += 1;
    } catch {
      // Un supervisor sin mensaje directo no frena a los demás.
      fallidos += 1;
    }
  }
  if (!enviados && fallidos)
    throw new Error("Slack no entregó ningún mensaje directo del pánico; se reintenta.");
  return enviados;
}

/** Mensaje directo a los supervisores a cargo de la instalación del pánico. */
export async function mensajesDirectosPanico(ctx: Contexto, a: AvisoPanico): Promise<number> {
  if (!a.instalacionId) return 0;
  const aCargo = await ctx.db.supervisorInstalacion.findMany({
    where: { instalacionId: a.instalacionId },
    select: { membershipId: true },
  });
  if (!aCargo.length) return 0;
  const miembros = await ctx.db.membership.findMany({
    where: { id: { in: aCargo.map((s) => s.membershipId) }, estado: "activa" },
    select: { userId: true },
  });
  const ids = miembros.map((m) => m.userId);
  return directos(ctx, a, await vinculados(ctx, ids));
}

export const trabajoEscalarPanicoSlack = defineTrabajo({
  tipo: TIPO_ESCALAR_PANICO,
  descripcion:
    "Si un pánico sigue sin que nadie lo tome pasados los minutos configurados, avisa por mensaje directo al grupo de usuarios elegido por la empresa y lo anota en el hilo del aviso.",
  payload: z.object({ avisoId: z.uuid() }),
  async handler(ctx, { avisoId }) {
    const a = await ctx.db.slackAviso.findUnique({ where: { id: avisoId } });
    if (!a || a.gestion !== "abierto") return { omitido: "ya_tomado" };
    const c = await configSiConectada(ctx);
    const grupoId = c?.panico.escalar ? c.panico.escalarAGrupoId : null;
    if (!c || !grupoId) return { omitido: "sin_escalamiento" };
    const miembros = await ctx.db.grupoUsuarioMiembro.findMany({
      where: { grupoId },
      select: { userId: true },
    });
    const n = await directos(
      ctx,
      a,
      await vinculados(
        ctx,
        await activos(
          ctx,
          miembros.map((m) => m.userId),
        ),
      ),
      "Escalado: ",
    );
    if (a.canalId && a.ts) {
      try {
        await slackMensajes().publicar(await tokenSlack(ctx), {
          canal: a.canalId,
          hiloTs: a.ts,
          texto: `Nadie tomó el pánico en ${c.panico.escalarMinutos} minutos: se avisó al grupo de escalamiento.`,
        });
      } catch {
        // La nota en el hilo es informativa; los mensajes directos ya salieron.
      }
    }
    return { escalado: n };
  },
});

export const trabajoDirectoPanicoSlack = defineTrabajo({
  tipo: TIPO_DIRECTO_PANICO,
  descripcion:
    "Manda el pánico por mensaje directo a los supervisores a cargo de la instalación, sin esperar al aviso en el canal.",
  payload: z.object({ avisoId: z.uuid() }),
  async handler(ctx, { avisoId }) {
    const a = await ctx.db.slackAviso.findUnique({ where: { id: avisoId } });
    if (!a) return { omitido: "sin_aviso" };
    const c = await configSiConectada(ctx);
    if (!c?.panico.mensajeDirectoSupervisor) return { omitido: "apagado" };
    return { directos: await mensajesDirectosPanico(ctx, a) };
  },
});
