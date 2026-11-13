import { z } from "zod";

import { ErrorSlack, type FetchSlack, llamar } from "./api";

/** Usuario de Slack tal como lo necesita OPAI para decidir si se vincula (CAR-292). Sin perfil ni correo. */
export type UsuarioSlack = {
  id: string;
  teamId: string;
  eliminado: boolean;
  bot: boolean;
  /** Invitado de un canal o de varios (`is_restricted` / `is_ultra_restricted`): no es miembro completo. */
  invitado: boolean;
};

const usuarioSchema = z.object({
  user: z.object({
    id: z.string().regex(/^[UW][A-Z0-9]{4,}$/),
    team_id: z.string(),
    deleted: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    is_app_user: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    is_ultra_restricted: z.boolean().optional(),
  }),
});

const canalSchema = z.object({ channel: z.object({ id: z.string().regex(/^D[A-Z0-9]{4,}$/) }) });

/** Escapa `&`, `<` y `>` (los únicos que Slack interpreta en `mrkdwn`), para que un texto no arme enlaces ni menciones. */
export const escaparSlack = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type MensajeDirecto = { titulo: string; cuerpo?: string | null; enlace?: string | null };

/** Texto del mensaje directo: título en negrita, cuerpo y enlace «Abrir en OPAI». Todo escapado. */
export function textoMensajeDirecto(m: MensajeDirecto): string {
  const partes = [`*${escaparSlack(m.titulo.slice(0, 300))}*`];
  if (m.cuerpo) partes.push(escaparSlack(m.cuerpo.slice(0, 2000)));
  if (m.enlace && /^https:\/\/[^\s|<>]+$/.test(m.enlace))
    partes.push(`<${m.enlace.replace(/&/g, "&amp;")}|Abrir en OPAI>`);
  return partes.join("\n");
}

/** Usuarios y mensajes directos de Slack (CAR-292). `f` se inyecta en pruebas: nunca Slack real. */
export function clienteSlackUsuarios(f: FetchSlack = fetch) {
  return {
    /** Busca un usuario por correo. Sin cuenta con ese correo en el espacio, null (no es un error). */
    async usuarioPorCorreo(token: string, correo: string): Promise<UsuarioSlack | null> {
      let json: unknown;
      try {
        json = await llamar(
          f,
          "users.lookupByEmail",
          new URLSearchParams({ email: correo }),
          token,
        );
      } catch (e) {
        if (e instanceof ErrorSlack && e.codigo === "users_not_found") return null;
        throw e;
      }
      const r = usuarioSchema.safeParse(json);
      if (!r.success) throw new ErrorSlack("respuesta_invalida");
      const u = r.data.user;
      return {
        id: u.id,
        teamId: u.team_id,
        eliminado: u.deleted === true,
        bot: u.is_bot === true || u.is_app_user === true,
        invitado: u.is_restricted === true || u.is_ultra_restricted === true,
      };
    },

    /** Abre (o reutiliza) el mensaje directo de la app con el usuario y publica el texto. */
    async mensajeDirecto(token: string, slackUserId: string, m: MensajeDirecto): Promise<string> {
      const c = canalSchema.safeParse(
        await llamar(f, "conversations.open", new URLSearchParams({ users: slackUserId }), token),
      );
      if (!c.success) throw new ErrorSlack("respuesta_invalida");
      const texto = textoMensajeDirecto(m);
      const r = z
        .object({ ts: z.string() })
        .safeParse(
          await llamar(
            f,
            "chat.postMessage",
            new URLSearchParams({ channel: c.data.channel.id, text: texto, unfurl_links: "false" }),
            token,
          ),
        );
      if (!r.success) throw new ErrorSlack("respuesta_invalida");
      return r.data.ts;
    },
  };
}
