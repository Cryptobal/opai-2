// Slack F4 (CAR-294, ADR-093 §10): piezas internas de la ruta de interactividad. Solo las ejecuta
// `/api/integraciones/slack/acciones` después de verificar la firma de Slack y resolver la empresa por
// el team_id. Nunca se exponen por API ni MCP.
import { z } from "zod";

import { defineCapability } from "../../define";
import { instalacionSlack, tokenSlack } from "./comun";
import { slackMensajes } from "./avisos/cliente";

export const slackVinculadoDe = defineCapability({
  id: "core.slack.vinculado_de",
  // Interna: la llama la ruta de interactividad de Slack ya firmada; resuelve el actor de un clic.
  interna: true,
  descripcion:
    "Devuelve la persona de OPAI vinculada a un usuario de Slack del espacio conectado a la empresa, o null si no está vinculada.",
  permiso: null,
  input: z.object({
    teamId: z.string().regex(/^T[A-Z0-9]{4,}$/),
    slackUserId: z.string().regex(/^[UW][A-Z0-9]{4,}$/),
  }),
  output: z.object({ userId: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const inst = await instalacionSlack(ctx);
    // Solo el espacio ligado a esta empresa: lo de otro espacio (Slack Connect) se ignora.
    if (!inst || inst.teamId !== input.teamId) return { userId: null };
    const v = await ctx.db.slackUsuario.findFirst({
      where: { slackUserId: input.slackUserId, estado: "vinculado" },
      select: { userId: true },
    });
    if (!v) return { userId: null };
    const m = await ctx.db.membership.findFirst({
      where: { userId: v.userId, estado: "activa" },
      select: { id: true },
    });
    return { userId: m ? v.userId : null };
  },
});

export const slackEfimero = defineCapability({
  id: "core.slack.efimero",
  // Interna: avisa solo a quien apretó un botón por qué no se hizo nada (sin vínculo, sin permiso).
  interna: true,
  descripcion:
    "Muestra un aviso efímero en Slack, visible solo para una persona, en el canal donde apretó un botón de OPAI.",
  permiso: null,
  input: z.object({
    canal: z.string().regex(/^[CGD][A-Z0-9]{4,}$/),
    slackUserId: z.string().regex(/^[UW][A-Z0-9]{4,}$/),
    texto: z.string().min(1).max(500),
    hiloTs: z
      .string()
      .regex(/^\d+\.\d+$/)
      .optional(),
  }),
  output: z.object({ enviado: z.boolean() }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (dryRun || !(await instalacionSlack(ctx))) return { enviado: false };
    try {
      await slackMensajes().efimero(await tokenSlack(ctx), {
        canal: input.canal,
        usuario: input.slackUserId,
        texto: input.texto,
        ...(input.hiloTs ? { hiloTs: input.hiloTs } : {}),
      });
      return { enviado: true };
    } catch {
      return { enviado: false };
    }
  },
});
