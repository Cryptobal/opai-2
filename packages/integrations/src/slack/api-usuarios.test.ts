import { describe, expect, it } from "vitest";

import type { FetchSlack } from "./api";
import { clienteSlackUsuarios, escaparSlack, textoMensajeDirecto } from "./api-usuarios";

/** Slack simulado (CAR-292): nunca se llama a Slack real. */
function falso(
  respuestas: Record<string, unknown>,
  llamadas: { metodo: string; cuerpo: string }[] = [],
): FetchSlack {
  return async (url, init) => {
    const metodo = url.replace("https://slack.com/api/", "");
    llamadas.push({ metodo, cuerpo: String(init.body) });
    return new Response(
      JSON.stringify(respuestas[metodo] ?? { ok: false, error: "unknown_method" }),
    );
  };
}

const usuario = (extra: Record<string, unknown> = {}) => ({
  ok: true,
  user: { id: "U0ANA1", team_id: "T0PRUEBA1", ...extra },
});

describe("Slack: usuarios por correo", () => {
  it("devuelve el usuario con su espacio y marcas de invitado, bot y desactivado", async () => {
    const c = clienteSlackUsuarios(
      falso({ "users.lookupByEmail": usuario({ is_restricted: true }) }),
    );
    expect(await c.usuarioPorCorreo("xoxb-x", "ana@ejemplo.cl")).toEqual({
      id: "U0ANA1",
      teamId: "T0PRUEBA1",
      eliminado: false,
      bot: false,
      invitado: true,
    });
  });

  it("un correo que no está en Slack devuelve null, sin error", async () => {
    const c = clienteSlackUsuarios(
      falso({ "users.lookupByEmail": { ok: false, error: "users_not_found" } }),
    );
    expect(await c.usuarioPorCorreo("xoxb-x", "nadie@ejemplo.cl")).toBeNull();
  });

  it("otros errores se propagan con su código", async () => {
    const c = clienteSlackUsuarios(
      falso({ "users.lookupByEmail": { ok: false, error: "invalid_auth" } }),
    );
    await expect(c.usuarioPorCorreo("xoxb-x", "a@b.cl")).rejects.toMatchObject({
      codigo: "invalid_auth",
    });
  });
});

describe("Slack: mensaje directo", () => {
  it("abre el mensaje directo y publica sin desplegar enlaces", async () => {
    const llamadas: { metodo: string; cuerpo: string }[] = [];
    const c = clienteSlackUsuarios(
      falso(
        {
          "conversations.open": { ok: true, channel: { id: "D0DM1" } },
          "chat.postMessage": { ok: true, ts: "1.2" },
        },
        llamadas,
      ),
    );
    const ts = await c.mensajeDirecto("xoxb-x", "U0ANA1", {
      titulo: "Hola",
      enlace: "https://test.opai.cl/x",
    });
    expect(ts).toBe("1.2");
    expect(llamadas.map((l) => l.metodo)).toEqual(["conversations.open", "chat.postMessage"]);
    const cuerpo = new URLSearchParams(llamadas[1]?.cuerpo);
    expect(cuerpo.get("channel")).toBe("D0DM1");
    expect(cuerpo.get("unfurl_links")).toBe("false");
  });

  it("escapa el texto: un aviso no puede armar menciones ni enlaces", () => {
    expect(escaparSlack("<!channel> & <https://malo|x>")).toBe(
      "&lt;!channel&gt; &amp; &lt;https://malo|x&gt;",
    );
    const t = textoMensajeDirecto({
      titulo: "<@U1>",
      cuerpo: "a > b",
      enlace: "javascript:alert(1)",
    });
    expect(t).toBe("*&lt;@U1&gt;*\na &gt; b");
  });
});
