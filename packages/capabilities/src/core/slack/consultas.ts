import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { externo } from "../../externo";
import { errorDeSlack, estadoSlackSchema, slack, tokenSlack, vistaSlack } from "./comun";

export const slackEstado = defineCapability({
  id: "core.slack.estado",
  descripcion:
    "Estado de la conexión de la empresa con Slack (conectada o no, nombre del espacio) y su configuración de avisos: canales, qué se avisa, margen de atraso, pánico y resumen. Nunca devuelve el token.",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: estadoSlackSchema,
  efecto: "lectura",
  dryRun: false,
  handler: (ctx) => vistaSlack(ctx),
});

export const slackCanales = defineCapability({
  id: "core.slack.canales",
  descripcion:
    "Lista los canales públicos del espacio de Slack conectado, para elegir a qué canal van los avisos. Indica si la app ya está en cada canal (si no, hay que invitarla).",
  permiso: PERMISOS_CORE.integracionesManage,
  input: z.object({}),
  output: z.array(
    z.object({ id: z.string(), nombre: externo(z.string()), esMiembro: z.boolean() }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const token = await tokenSlack(ctx);
    try {
      return await slack().canalesPublicos(token);
    } catch (e) {
      throw errorDeSlack(e);
    }
  },
});
