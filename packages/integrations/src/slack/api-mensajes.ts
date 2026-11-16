import { z } from "zod";

import { ErrorSlack, type FetchSlack, llamar } from "./api";
import { escaparSlack } from "./api-usuarios";

/** Bloques de Slack (Block Kit) que arma OPAI. Solo los tipos que se usan; el texto ya va escapado. */
export type BloqueSlack =
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "context"; elements: { type: "mrkdwn"; text: string }[] }
  | {
      type: "actions";
      block_id?: string;
      elements: {
        type: "button";
        action_id: string;
        text: { type: "plain_text"; text: string };
        value?: string;
        url?: string;
        style?: "primary" | "danger";
      }[];
    };

export type MensajeCanal = {
  canal: string;
  /** Texto de respaldo (notificaciones y lectores de pantalla). Se escapa aquí. */
  texto: string;
  bloques?: BloqueSlack[];
  /** `ts` del mensaje padre: publica como respuesta en su hilo. */
  hiloTs?: string | null;
};

const tsSchema = z.object({ ts: z.string().regex(/^\d+\.\d+$/), channel: z.string().optional() });

function cuerpo(m: MensajeCanal, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({
    channel: m.canal,
    text: escaparSlack(m.texto.slice(0, 3000)),
    unfurl_links: "false",
    unfurl_media: "false",
    ...extra,
  });
  if (m.bloques) q.set("blocks", JSON.stringify(m.bloques));
  if (m.hiloTs) q.set("thread_ts", m.hiloTs);
  return q;
}

/** Publicar y actualizar mensajes en canales públicos (CAR-293). `f` se inyecta en pruebas: nunca Slack real. */
export function clienteSlackMensajes(f: FetchSlack = fetch) {
  return {
    /** Publica en un canal (o en el hilo de `hiloTs`). Devuelve el `ts` del mensaje. */
    async publicar(token: string, m: MensajeCanal): Promise<string> {
      const r = tsSchema.safeParse(await llamar(f, "chat.postMessage", cuerpo(m), token));
      if (!r.success) throw new ErrorSlack("respuesta_invalida");
      return r.data.ts;
    },
    /** Reemplaza el contenido de un mensaje ya publicado por la app (resumen, «Tomado por…»). */
    async actualizar(token: string, m: MensajeCanal & { ts: string }): Promise<void> {
      const q = cuerpo(m, { ts: m.ts });
      q.delete("thread_ts");
      q.delete("unfurl_links");
      q.delete("unfurl_media");
      await llamar(f, "chat.update", q, token);
    },
    /** Mensaje efímero: solo lo ve `usuario` en el canal (avisos de F4 a quien no puede actuar). */
    async efimero(token: string, m: MensajeCanal & { usuario: string }): Promise<void> {
      const q = cuerpo(m, { user: m.usuario });
      await llamar(f, "chat.postEphemeral", q, token);
    },
  };
}
