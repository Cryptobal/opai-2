// Slack F4 (CAR-294): reflejo en Slack de lo que pasó en OPAI con un aviso. El mensaje se reemplaza
// (chat.update) con quién lo tomó o cerró y los botones que siguen; pedir refuerzo se anota en el hilo
// y avisa al grupo de escalamiento. Si Slack falla, se reintenta; OPAI ya quedó con el cambio.
import { z } from "zod";

import { ErrorSlack } from "@opai/integrations";

import { defineTrabajo } from "../../../trabajos/registro";
import type { Contexto } from "../../../types";
import { tokenSlack } from "../comun";
import { bloquesAviso } from "./bloques";
import { slackMensajes } from "./cliente";
import { ERRORES_DEFINITIVOS, fechaEnZona } from "./enviar";
import { activos, directos, vinculados } from "./panico";
import {
  configSiConectada,
  TIPO_ACTUALIZAR_AVISO,
  TIPO_REFUERZO_AVISO,
  type TipoAviso,
} from "./registrar";

async function nombreDe(ctx: Contexto, userId: string | null) {
  if (!userId) return "alguien";
  const m = await ctx.db.membership.findFirst({
    where: { userId },
    include: { user: { select: { name: true } } },
  });
  return m?.user.name ?? "alguien";
}

async function horaLocal(ctx: Contexto, d: Date | null) {
  if (!d) return "";
  const t = await ctx.db.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { timezone: true },
  });
  const zona = t?.timezone ?? "America/Santiago";
  const hora = new Intl.DateTimeFormat("es-CL", {
    timeZone: zona,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return fechaEnZona(d, zona) === fechaEnZona(new Date(), zona)
    ? `a las ${hora}`
    : `el ${fechaEnZona(d, zona)} a las ${hora}`;
}

/** Lanza para reintentar salvo errores definitivos de Slack, que solo se registran. */
function reintentarSalvoDefinitivo(e: unknown) {
  const codigo = e instanceof ErrorSlack ? e.codigo : "error_desconocido";
  if (
    ERRORES_DEFINITIVOS.has(codigo) ||
    codigo === "message_not_found" ||
    codigo === "cant_update_message"
  )
    return { fallido: codigo };
  throw new Error(`Slack no actualizó el aviso (${codigo}); se reintenta.`, { cause: e });
}

export const trabajoActualizarAvisoSlack = defineTrabajo({
  tipo: TIPO_ACTUALIZAR_AVISO,
  descripcion:
    "Actualiza en Slack el mensaje de un aviso de terreno con quién lo tomó o cerró y los botones que siguen.",
  payload: z.object({ avisoId: z.uuid() }),
  async handler(ctx, { avisoId }) {
    const a = await ctx.db.slackAviso.findUnique({ where: { id: avisoId } });
    if (!a?.canalId || !a.ts) return { omitido: "sin_mensaje" };
    if (!(await configSiConectada(ctx))) return { omitido: "sin_slack" };
    const estadoTexto =
      a.gestion === "cerrado"
        ? `Cerrado por ${await nombreDe(ctx, a.cerradoPor)} ${await horaLocal(ctx, a.cerradoEn)}`
        : a.gestion === "tomado"
          ? `Tomado por ${await nombreDe(ctx, a.tomadoPor)} ${await horaLocal(ctx, a.tomadoEn)}`
          : null;
    try {
      await slackMensajes().actualizar(await tokenSlack(ctx), {
        canal: a.canalId,
        ts: a.ts,
        texto: estadoTexto ? `${a.titulo} · ${estadoTexto}` : a.titulo,
        bloques: bloquesAviso(
          { ...a, tipo: a.tipo as TipoAviso, gestion: a.gestion as "abierto", estadoTexto },
          ctx.servicios.urlBase,
        ),
      });
    } catch (e) {
      return reintentarSalvoDefinitivo(e);
    }
    return { actualizado: true };
  },
});

export const trabajoRefuerzoAvisoSlack = defineTrabajo({
  tipo: TIPO_REFUERZO_AVISO,
  descripcion:
    "Anota en el hilo de Slack que se pidió refuerzo para un aviso y avisa por mensaje directo al grupo de escalamiento de la empresa.",
  payload: z.object({ avisoId: z.uuid(), porUserId: z.uuid().nullable() }),
  async handler(ctx, { avisoId, porUserId }) {
    const a = await ctx.db.slackAviso.findUnique({ where: { id: avisoId } });
    const c = await configSiConectada(ctx);
    if (!a || !c) return { omitido: "sin_slack" };
    const quien = await nombreDe(ctx, porUserId);
    let enHilo = false;
    if (a.canalId && a.ts) {
      try {
        await slackMensajes().publicar(await tokenSlack(ctx), {
          canal: a.canalId,
          hiloTs: a.ts,
          texto: `${quien} pidió refuerzo para este aviso.`,
        });
        enHilo = true;
      } catch (e) {
        reintentarSalvoDefinitivo(e);
      }
    }
    const grupoId = c.panico.escalarAGrupoId;
    const miembros = grupoId
      ? await ctx.db.grupoUsuarioMiembro.findMany({ where: { grupoId }, select: { userId: true } })
      : [];
    const ids = await vinculados(
      ctx,
      await activos(
        ctx,
        miembros.map((m) => m.userId),
      ),
    );
    const n = await directos(ctx, a, ids, `Refuerzo pedido por ${quien}: `);
    return { enHilo, directos: n };
  },
});
