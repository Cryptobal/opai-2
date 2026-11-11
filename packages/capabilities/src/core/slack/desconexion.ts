import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { reglaDeNegocio } from "../../errores";
import { estadoSlackSchema, instalacionSlack, tokenSlack, vistaSlack } from "./comun";
import { borrarConexionSlack, revocarSinFallar } from "./conexion-comun";

export const slackDesconectar = defineCapability({
  id: "core.slack.desconectar",
  soloPersonas: true,
  descripcion:
    "Desconecta Slack de la empresa: revoca el token del bot en Slack y lo borra de OPAI. La configuración de avisos se conserva para una reconexión. Mientras esté desconectado, nada se envía a Slack.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: estadoSlackSchema.extend({ revocadoEnSlack: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, _input, { dryRun }) {
    if (!(await instalacionSlack(ctx))) throw reglaDeNegocio("Slack no está conectado.");
    if (dryRun)
      return {
        ...(await vistaSlack(ctx)),
        conectada: false,
        espacio: null,
        conectadaEn: null,
        revocadoEnSlack: true,
      };
    // Si Slack no responde, igual se borra en OPAI: sin token, OPAI no puede enviar nada.
    const revocadoEnSlack = await revocarSinFallar(await tokenSlack(ctx).catch(() => ""));
    await borrarConexionSlack(ctx, "desconectada");
    return { ...(await vistaSlack(ctx)), revocadoEnSlack };
  },
});

/**
 * Interna: solo la ruta `/api/integraciones/slack/eventos` la ejecuta, tras verificar la firma de Slack
 * y resolver la empresa por el team_id (ADR-093 §10), cuando Slack avisa que la app se desinstaló o su
 * token se revocó. Borra la conexión local; no llama a Slack.
 */
export const slackDesinstalada = defineCapability({
  id: "core.slack.desinstalada",
  interna: true,
  descripcion:
    "Registra que la app de Slack se desinstaló o que su token fue revocado desde Slack: borra el token y la instalación de la empresa, y conserva la configuración.",
  permiso: null,
  input: z.object({ teamId: z.string().regex(/^T[A-Z0-9]{4,}$/) }),
  output: z.object({ borrada: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const inst = await instalacionSlack(ctx);
    if (!inst || inst.teamId !== input.teamId) return { borrada: false };
    if (!dryRun) await borrarConexionSlack(ctx, "desinstalada");
    return { borrada: true };
  },
});
