// Slack F2 (CAR-292, ADR-093): avisos personales por mensaje directo. Se alimenta de los avisos en la
// app que ya creó Comunicaciones (ADR-020): si la persona está vinculada y la empresa no lo apagó, se
// encola un trabajo que manda el mismo título, texto y enlace. Si Slack falla, el aviso en la app queda.
import { z } from "zod";

import type { TenantTx } from "@opai/db";
import { ErrorSlack, slackConfigEfectiva } from "@opai/integrations";

import { defineTrabajo } from "../../trabajos/registro";
import type { Contexto } from "../../types";
import { filaIntegracionSlack, instalacionSlack, tokenSlack } from "./comun";
import { slackUsuarios } from "./vinculo";

export const TIPO_MENSAJE_DIRECTO = "core.slack.mensaje_directo";
/** Canal con que queda el envío en `core.envios`. */
export const CANAL_SLACK_DM = "slack_dm";

/** Errores de Slack que no se arreglan reintentando: se registra el fallo y no se reintenta. */
const DEFINITIVOS = new Set([
  "invalid_auth",
  "token_revoked",
  "account_inactive",
  "user_not_found",
  "user_disabled",
  "cannot_dm_bot",
  "channel_not_found",
  "not_allowed_token_type",
  "missing_scope",
]);

/** Errores que dicen que la cuenta de Slack de la persona ya no sirve. */
const CUENTA_PERDIDA = new Set(["user_not_found", "user_disabled", "cannot_dm_bot"]);

/**
 * Encola (en `tx`) el mensaje directo de un aviso en la app, solo si Slack está conectado, la empresa
 * no apagó los mensajes directos y la persona está vinculada. Uno por aviso (clave única).
 */
export async function encolarMensajeDirecto(
  ctx: Contexto,
  tx: TenantTx,
  aviso: { notificacionId: string; usuarioId: string },
): Promise<boolean> {
  const [inst, fila, vinculo] = await Promise.all([
    tx.slackInstalacion.findUnique({ where: { tenantId: ctx.tenantId }, select: { id: true } }),
    tx.integracion.findUnique({
      where: { tenantId_proveedor: { tenantId: ctx.tenantId, proveedor: "slack" } },
      select: { config: true },
    }),
    tx.slackUsuario.findFirst({
      where: { userId: aviso.usuarioId, estado: "vinculado" },
      select: { id: true },
    }),
  ]);
  if (!inst || !vinculo || !slackConfigEfectiva(fila?.config).mensajesDirectos.activo) return false;
  return ctx.trabajos.encolar(tx, {
    tipo: TIPO_MENSAJE_DIRECTO,
    payload: { notificacionId: aviso.notificacionId },
    claveUnica: `slack-dm:${aviso.notificacionId}`,
    maxIntentos: 4,
  });
}

function enlaceAbsoluto(enlace: string | null, base: string): string | null {
  if (!enlace) return null;
  try {
    return new URL(enlace, base).toString();
  } catch {
    return null;
  }
}

async function registrar(
  ctx: Contexto,
  n: { eventoId: string | null; usuarioId: string },
  estado: string,
  error: string | null,
) {
  await ctx.db.envio.create({
    data: {
      tenantId: ctx.tenantId,
      eventoId: n.eventoId,
      canal: CANAL_SLACK_DM,
      destinatario: n.usuarioId,
      estado,
      error,
    },
  });
}

export const trabajoMensajeDirectoSlack = defineTrabajo({
  tipo: TIPO_MENSAJE_DIRECTO,
  descripcion:
    "Envía por mensaje directo de Slack un aviso en la app a la persona vinculada; si Slack falla, reintenta y el aviso en la app no cambia.",
  payload: z.object({ notificacionId: z.uuid() }),
  async handler(ctx, { notificacionId }) {
    const n = await ctx.db.notificacion.findUnique({ where: { id: notificacionId } });
    if (!n) return { omitido: "sin_aviso" };
    // Se vuelve a verificar al enviar: Slack pudo desconectarse o la persona desvincularse.
    const [inst, fila, vinculo] = await Promise.all([
      instalacionSlack(ctx),
      filaIntegracionSlack(ctx),
      ctx.db.slackUsuario.findFirst({ where: { userId: n.usuarioId, estado: "vinculado" } }),
    ]);
    if (!inst || !vinculo?.slackUserId) return { omitido: "sin_vinculo" };
    if (!slackConfigEfectiva(fila?.config).mensajesDirectos.activo) return { omitido: "apagado" };
    const yaEnviado = await ctx.db.envio.findFirst({
      where: {
        canal: CANAL_SLACK_DM,
        destinatario: n.usuarioId,
        eventoId: n.eventoId,
        estado: "enviado",
      },
    });
    if (n.eventoId && yaEnviado) return { omitido: "ya_enviado" };
    // Un enlace inválido se omite (no es motivo para reintentar el envío).
    const enlace = enlaceAbsoluto(n.enlace, ctx.servicios.urlBase);
    try {
      await slackUsuarios().mensajeDirecto(await tokenSlack(ctx), vinculo.slackUserId, {
        titulo: n.titulo,
        cuerpo: n.cuerpo,
        enlace,
      });
    } catch (e) {
      const codigo = e instanceof ErrorSlack ? e.codigo : "error_desconocido";
      if (DEFINITIVOS.has(codigo)) {
        await registrar(ctx, n, "fallido", `Slack: ${codigo}`);
        // La cuenta de Slack ya no sirve: el vínculo vuelve a «sin vincular» y el trabajo diario la revisa.
        if (CUENTA_PERDIDA.has(codigo))
          await ctx.db.slackUsuario.update({
            where: { id: vinculo.id },
            data: {
              estado: "sin_vincular",
              slackUserId: null,
              motivo: "desactivado",
              revisadoEn: new Date(),
            },
          });
        return { fallido: codigo };
      }
      // Transitorio (sin respuesta, límite de Slack): el runner reintenta con espera.
      throw new Error(`Slack no entregó el mensaje directo (${codigo}); se reintenta.`, {
        cause: e,
      });
    }
    await registrar(ctx, n, "enviado", null);
    return { enviado: true };
  },
});
