import { z } from "zod";

import { SLACK_SCOPES_BOT } from "./manifiesto/manifiesto";

const BASE = "https://slack.com/api/";
const TIMEOUT_MS = 10_000;
const MAX_PAGINAS_CANALES = 5;

export type FetchSlack = (url: string, init: RequestInit) => Promise<Response>;

/** Error de Slack con un código corto y seguro (el `error` de Slack o uno propio); nunca el cuerpo. */
export class ErrorSlack extends Error {
  constructor(
    readonly codigo: string,
    readonly reintentarEnS: number | null = null,
  ) {
    super(`Slack respondió: ${codigo}`);
    this.name = "ErrorSlack";
  }
}

/** Código de error de Slack reducido a algo corto y seguro. */
const codigoSeguro = (x: unknown) =>
  typeof x === "string" && /^[a-z_]{1,64}$/.test(x) ? x : "error_desconocido";

export async function llamar(
  f: FetchSlack,
  metodo: string,
  cuerpo: URLSearchParams,
  token?: string,
) {
  let res: Response;
  try {
    res = await f(BASE + metodo, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo.toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ErrorSlack("sin_respuesta");
  }
  if (res.status === 429) {
    const s = Number(res.headers.get("retry-after") ?? "");
    throw new ErrorSlack("limite_de_slack", Number.isFinite(s) && s > 0 ? s : 30);
  }
  if (!res.ok) throw new ErrorSlack(`http_${res.status}`);
  const json: unknown = await res.json().catch(() => null);
  if (!json || typeof json !== "object") throw new ErrorSlack("respuesta_invalida");
  const r = json as { ok?: unknown; error?: unknown };
  if (r.ok !== true) throw new ErrorSlack(codigoSeguro(r.error));
  return json;
}

const instalacionSchema = z.object({
  access_token: z.string().startsWith("xoxb-"),
  token_type: z.literal("bot"),
  scope: z.string(),
  bot_user_id: z.string().regex(/^[UBW][A-Z0-9]{4,}$/),
  app_id: z.string().regex(/^A[A-Z0-9]{4,}$/),
  team: z.object({ id: z.string().regex(/^T[A-Z0-9]{4,}$/), name: z.string().max(200) }),
  is_enterprise_install: z.boolean().optional(),
});

export type InstalacionSlack = {
  token: string;
  teamId: string;
  teamNombre: string;
  botUserId: string;
  appId: string;
};

/** URL de autorización OAuth v2 de Slack con los scopes mínimos del manifiesto (ADR-093 §8). */
export function urlAutorizacionSlack(p: { clientId: string; redirectUri: string; estado: string }) {
  const q = new URLSearchParams({
    client_id: p.clientId,
    scope: SLACK_SCOPES_BOT.join(","),
    redirect_uri: p.redirectUri,
    state: p.estado,
  });
  return `https://slack.com/oauth/v2/authorize?${q.toString()}`;
}

/** Cliente HTTP mínimo de Slack (sin SDK, ADR-031). `f` se inyecta en pruebas: nunca Slack real. */
export function clienteSlack(f: FetchSlack = fetch) {
  return {
    /** Canjea el código del OAuth. Rechaza instalaciones de organización y scopes incompletos. */
    async intercambiarCodigo(p: {
      clientId: string;
      clientSecret: string;
      code: string;
      redirectUri: string;
    }): Promise<InstalacionSlack> {
      const cuerpo = new URLSearchParams({
        client_id: p.clientId,
        client_secret: p.clientSecret,
        code: p.code,
        redirect_uri: p.redirectUri,
      });
      const r = instalacionSchema.safeParse(await llamar(f, "oauth.v2.access", cuerpo));
      if (!r.success) throw new ErrorSlack("respuesta_invalida");
      if (r.data.is_enterprise_install) throw new ErrorSlack("instalacion_de_organizacion");
      const dados = new Set(r.data.scope.split(","));
      if (SLACK_SCOPES_BOT.some((s) => !dados.has(s))) throw new ErrorSlack("permisos_incompletos");
      return {
        token: r.data.access_token,
        teamId: r.data.team.id,
        teamNombre: r.data.team.name,
        botUserId: r.data.bot_user_id,
        appId: r.data.app_id,
      };
    },

    /** Revoca el token del bot (al desconectar). Un token ya revocado cuenta como revocado. */
    async revocar(token: string): Promise<void> {
      try {
        await llamar(f, "auth.revoke", new URLSearchParams(), token);
      } catch (e) {
        if (
          e instanceof ErrorSlack &&
          ["invalid_auth", "token_revoked", "account_inactive"].includes(e.codigo)
        )
          return;
        throw e;
      }
    },

    /** Canales públicos no archivados del espacio (máximo 5 páginas de 200). */
    async canalesPublicos(
      token: string,
    ): Promise<{ id: string; nombre: string; esMiembro: boolean }[]> {
      const canalSchema = z.object({
        id: z.string(),
        name: z.string(),
        is_member: z.boolean().optional(),
      });
      const paginaSchema = z.object({
        channels: z.array(canalSchema),
        response_metadata: z.object({ next_cursor: z.string().optional() }).optional(),
      });
      const todos: { id: string; nombre: string; esMiembro: boolean }[] = [];
      let cursor = "";
      for (let i = 0; i < MAX_PAGINAS_CANALES; i++) {
        const q = new URLSearchParams({
          types: "public_channel",
          exclude_archived: "true",
          limit: "200",
        });
        if (cursor) q.set("cursor", cursor);
        const p = paginaSchema.safeParse(await llamar(f, "conversations.list", q, token));
        if (!p.success) throw new ErrorSlack("respuesta_invalida");
        for (const c of p.data.channels)
          todos.push({ id: c.id, nombre: c.name, esMiembro: c.is_member ?? false });
        cursor = p.data.response_metadata?.next_cursor ?? "";
        if (!cursor) break;
      }
      return todos.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    },
  };
}
