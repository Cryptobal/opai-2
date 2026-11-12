import { z } from "zod";

/** Botones de OPAI en Slack → capacidad que ejecutan (CAR-294). «Responder» solo orienta. */
export const ACCIONES_SLACK = {
  "opai.aviso.tomar": "core.avisos_terreno.tomar",
  "opai.aviso.cerrar": "core.avisos_terreno.cerrar",
  "opai.aviso.refuerzo": "core.avisos_terreno.pedir_refuerzo",
  "opai.aviso.responder": null,
} as const;
export type AccionSlack = keyof typeof ACCIONES_SLACK;

const payloadSchema = z.object({
  type: z.literal("block_actions"),
  team: z.object({ id: z.string().regex(/^T[A-Z0-9]{4,}$/) }),
  user: z.object({ id: z.string().regex(/^[UW][A-Z0-9]{4,}$/) }),
  container: z
    .object({
      channel_id: z
        .string()
        .regex(/^[CGD][A-Z0-9]{4,}$/)
        .optional(),
      message_ts: z
        .string()
        .regex(/^\d+\.\d+$/)
        .optional(),
      thread_ts: z
        .string()
        .regex(/^\d+\.\d+$/)
        .optional(),
    })
    .optional(),
  actions: z
    .array(
      z.object({
        action_id: z.string().max(80),
        value: z.uuid().optional(),
        action_ts: z.string().regex(/^\d+\.\d+$/),
      }),
    )
    .min(1),
});

export type ClicSlack = {
  teamId: string;
  slackUserId: string;
  accion: AccionSlack;
  avisoId: string;
  actionTs: string;
  canal: string | null;
  hiloTs: string | null;
};

/** Interpreta el cuerpo ya firmado de un clic. Lo que no es un botón de OPAI con su aviso se ignora. */
export function leerClicSlack(cuerpo: string): ClicSlack | null {
  let json: unknown;
  try {
    json = JSON.parse(new URLSearchParams(cuerpo).get("payload") ?? "");
  } catch {
    return null;
  }
  const p = payloadSchema.safeParse(json);
  if (!p.success) return null;
  const a = p.data.actions[0];
  if (!a?.value || !(a.action_id in ACCIONES_SLACK)) return null;
  return {
    teamId: p.data.team.id,
    slackUserId: p.data.user.id,
    accion: a.action_id as AccionSlack,
    avisoId: a.value,
    actionTs: a.action_ts,
    canal: p.data.container?.channel_id ?? null,
    hiloTs: p.data.container?.thread_ts ?? p.data.container?.message_ts ?? null,
  };
}
