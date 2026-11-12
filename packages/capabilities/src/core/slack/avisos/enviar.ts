// Slack F3 (CAR-293): envío asíncrono de un aviso de terreno. Un hilo por instalación, canal y día; si
// Slack falla de forma transitoria, el runner reintenta con espera; si el error es definitivo (la app no
// está en el canal, token revocado), el aviso queda «fallido» con el motivo. OPAI nunca se ve afectado.
import { z } from "zod";

import { ErrorSlack } from "@opai/integrations";

import { defineTrabajo } from "../../../trabajos/registro";
import type { Contexto } from "../../../types";
import { tokenSlack } from "../comun";
import { bloquesAviso, textoPadreHilo } from "./bloques";
import { slackMensajes } from "./cliente";
import { mensajesDirectosPanico } from "./panico";
import { configSiConectada, TIPO_ENVIAR_AVISO, type TipoAviso } from "./registrar";

/** Errores que no se arreglan reintentando: se registran y el aviso queda «fallido». */
export const ERRORES_DEFINITIVOS = new Set([
  "not_in_channel",
  "channel_not_found",
  "is_archived",
  "invalid_auth",
  "token_revoked",
  "account_inactive",
  "missing_scope",
  "not_authed",
  "invalid_blocks",
  "msg_too_long",
]);

/** Fecha civil (AAAA-MM-DD) en la zona de la empresa. */
export function fechaEnZona(instante: Date, zona: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** `ts` del mensaje padre del hilo de la instalación ese día en ese canal; lo crea si no existe. */
async function hiloDelDia(
  ctx: Contexto,
  token: string,
  canal: string,
  instalacionId: string,
  fecha: string,
) {
  const dia = new Date(`${fecha}T00:00:00Z`);
  const donde = { tenantId: ctx.tenantId, canalId: canal, instalacionId, fecha: dia };
  const previo = await ctx.db.slackHilo.findFirst({ where: donde });
  if (previo) return previo.ts;
  const inst = await ctx.db.instalacion.findUnique({
    where: { id: instalacionId },
    select: { nombre: true },
  });
  const texto = textoPadreHilo(inst?.nombre ?? "la instalación", fecha);
  const ts = await slackMensajes().publicar(token, {
    canal,
    texto,
    bloques: [
      { type: "section", text: { type: "mrkdwn", text: `*${texto.replace(/[&<>]/g, "")}*` } },
    ],
  });
  await ctx.transaccion((tx) =>
    tx.slackHilo.createMany({ data: [{ ...donde, ts }], skipDuplicates: true }),
  );
  // Otro envío pudo crear el hilo a la vez: manda el que quedó guardado.
  return (await ctx.db.slackHilo.findFirst({ where: donde }))?.ts ?? ts;
}

async function fallar(ctx: Contexto, avisoId: string, codigo: string) {
  await ctx.db.slackAviso.update({
    where: { id: avisoId },
    data: { envio: "fallido", error: `Slack: ${codigo}` },
  });
  return { fallido: codigo };
}

export const trabajoEnviarAvisoSlack = defineTrabajo({
  tipo: TIPO_ENVIAR_AVISO,
  descripcion:
    "Publica en Slack un aviso de terreno (anomalía, incidente o pánico) en el hilo del día de su instalación, con los botones «Tomar» y «Ver en OPAI». Reintenta si Slack falla.",
  payload: z.object({ avisoId: z.uuid() }),
  async handler(ctx, { avisoId }) {
    const a = await ctx.db.slackAviso.findUnique({ where: { id: avisoId } });
    if (!a || a.envio !== "pendiente") return { omitido: "ya_procesado" };
    const c = await configSiConectada(ctx);
    if (!c) return fallar(ctx, a.id, "desconectado");
    const tenant = await ctx.db.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: { timezone: true },
    });
    try {
      const token = await tokenSlack(ctx);
      let ts: string | null = null;
      let hiloTs: string | null = null;
      if (a.canalId) {
        const fecha = fechaEnZona(a.createdAt, tenant?.timezone ?? "America/Santiago");
        hiloTs = a.instalacionId
          ? await hiloDelDia(ctx, token, a.canalId, a.instalacionId, fecha)
          : null;
        ts = await slackMensajes().publicar(token, {
          canal: a.canalId,
          texto: a.titulo,
          hiloTs,
          bloques: bloquesAviso(
            { ...a, tipo: a.tipo as TipoAviso, gestion: a.gestion as "abierto" },
            ctx.servicios.urlBase,
          ),
        });
      }
      await ctx.db.slackAviso.update({
        where: { id: a.id },
        data: { envio: "enviado", ts, hiloTs, error: null },
      });
      const directos =
        a.tipo === "panico" && c.panico.mensajeDirectoSupervisor
          ? await mensajesDirectosPanico(ctx, a)
          : 0;
      return { enviado: true, directos };
    } catch (e) {
      const codigo = e instanceof ErrorSlack ? e.codigo : "error_desconocido";
      if (ERRORES_DEFINITIVOS.has(codigo)) return fallar(ctx, a.id, codigo);
      throw new Error(`Slack no recibió el aviso (${codigo}); se reintenta.`, { cause: e });
    }
  },
});
