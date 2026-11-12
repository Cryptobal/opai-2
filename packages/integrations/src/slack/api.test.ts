import { describe, expect, it } from "vitest";

import { clienteSlack, ErrorSlack, type FetchSlack } from "./api";
import { SLACK_SCOPES_BOT } from "./manifiesto/manifiesto";

/** Slack simulado: nunca se llama a Slack real (ADR-093 §11). */
function falso(
  respuestas: Record<string, unknown>,
  llamadas: { metodo: string; cuerpo: string; auth?: string | undefined }[] = [],
): FetchSlack {
  return async (url, init) => {
    const metodo = url.replace("https://slack.com/api/", "");
    const headers = new Headers(init.headers);
    llamadas.push({
      metodo,
      cuerpo: String(init.body),
      auth: headers.get("authorization") ?? undefined,
    });
    const r = respuestas[metodo];
    if (r instanceof Response) return r;
    return new Response(JSON.stringify(r ?? { ok: false, error: "unknown_method" }), {
      status: 200,
    });
  };
}

const instalacion = {
  ok: true,
  access_token: "xoxb-falso",
  token_type: "bot",
  scope: SLACK_SCOPES_BOT.join(","),
  bot_user_id: "U0BOT1",
  app_id: "A0APP1",
  team: { id: "T0PRUEBA1", name: "Espacio de pruebas" },
};
const canje = {
  clientId: "1.2",
  clientSecret: "s",
  code: "c",
  redirectUri: "https://test.opai.cl/x",
};

describe("clienteSlack", () => {
  it("canjea el código y devuelve el espacio y el token", async () => {
    const llamadas: { metodo: string; cuerpo: string }[] = [];
    const r = await clienteSlack(
      falso({ "oauth.v2.access": instalacion }, llamadas),
    ).intercambiarCodigo(canje);
    expect(r).toEqual({
      token: "xoxb-falso",
      teamId: "T0PRUEBA1",
      teamNombre: "Espacio de pruebas",
      botUserId: "U0BOT1",
      appId: "A0APP1",
    });
    expect(llamadas[0]?.cuerpo).toContain("code=c");
  });

  it("rechaza permisos incompletos, instalaciones de organización y errores de Slack", async () => {
    const c = (r: unknown) =>
      clienteSlack(falso({ "oauth.v2.access": r })).intercambiarCodigo(canje);
    await expect(c({ ...instalacion, scope: "chat:write" })).rejects.toMatchObject({
      codigo: "permisos_incompletos",
    });
    await expect(c({ ...instalacion, is_enterprise_install: true })).rejects.toMatchObject({
      codigo: "instalacion_de_organizacion",
    });
    await expect(c({ ok: false, error: "invalid_code" })).rejects.toMatchObject({
      codigo: "invalid_code",
    });
    await expect(c({ ok: false, error: "<script>" })).rejects.toMatchObject({
      codigo: "error_desconocido",
    });
    await expect(c({ ...instalacion, token_type: "user" })).rejects.toMatchObject({
      codigo: "respuesta_invalida",
    });
  });

  it("respeta el límite de Slack y los fallos de red", async () => {
    const limite = new Response("", { status: 429, headers: { "retry-after": "7" } });
    await expect(
      clienteSlack(falso({ "auth.revoke": limite })).revocar("xoxb-x"),
    ).rejects.toMatchObject({ codigo: "limite_de_slack", reintentarEnS: 7 });
    const caido: FetchSlack = async () => {
      throw new Error("red");
    };
    await expect(clienteSlack(caido).canalesPublicos("xoxb-x")).rejects.toBeInstanceOf(ErrorSlack);
  });

  it("revocar manda el token en la cabecera y tolera un token ya revocado", async () => {
    const llamadas: { metodo: string; cuerpo: string; auth?: string | undefined }[] = [];
    await clienteSlack(falso({ "auth.revoke": { ok: true, revoked: true } }, llamadas)).revocar(
      "xoxb-abc",
    );
    expect(llamadas[0]).toMatchObject({
      metodo: "auth.revoke",
      auth: "Bearer xoxb-abc",
      cuerpo: "",
    });
    await expect(
      clienteSlack(falso({ "auth.revoke": { ok: false, error: "token_revoked" } })).revocar("x"),
    ).resolves.toBeUndefined();
  });

  it("lista canales públicos paginados y ordenados", async () => {
    let n = 0;
    const f: FetchSlack = async () => {
      n++;
      const cuerpo =
        n === 1
          ? {
              ok: true,
              channels: [{ id: "C0002", name: "zona-sur", is_member: true }],
              response_metadata: { next_cursor: "p2" },
            }
          : {
              ok: true,
              channels: [{ id: "C0001", name: "alertas" }],
              response_metadata: { next_cursor: "" },
            };
      return new Response(JSON.stringify(cuerpo));
    };
    expect(await clienteSlack(f).canalesPublicos("xoxb-x")).toEqual([
      { id: "C0001", nombre: "alertas", esMiembro: false },
      { id: "C0002", nombre: "zona-sur", esMiembro: true },
    ]);
  });
});
