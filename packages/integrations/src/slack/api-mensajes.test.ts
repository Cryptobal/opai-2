import { describe, expect, it } from "vitest";

import type { FetchSlack } from "./api";
import { clienteSlackMensajes } from "./api-mensajes";

/** Slack simulado (CAR-293): nunca se llama a Slack real. */
function falso(llamadas: { metodo: string; cuerpo: URLSearchParams }[]): FetchSlack {
  return async (url, init) => {
    const metodo = url.replace("https://slack.com/api/", "");
    llamadas.push({ metodo, cuerpo: new URLSearchParams(String(init.body)) });
    return new Response(JSON.stringify({ ok: true, ts: "1700000000.000200" }));
  };
}

describe("Slack: mensajes en canales", () => {
  it("publica en el hilo con bloques, texto escapado y sin desplegar enlaces", async () => {
    const llamadas: { metodo: string; cuerpo: URLSearchParams }[] = [];
    const ts = await clienteSlackMensajes(falso(llamadas)).publicar("xoxb-x", {
      canal: "C0AAAAAA1",
      texto: "<!channel> atraso",
      hiloTs: "1700000000.000100",
      bloques: [{ type: "section", text: { type: "mrkdwn", text: "x" } }],
    });
    expect(ts).toBe("1700000000.000200");
    const c = llamadas[0]?.cuerpo;
    expect(c?.get("text")).toBe("&lt;!channel&gt; atraso");
    expect(c?.get("thread_ts")).toBe("1700000000.000100");
    expect(c?.get("unfurl_links")).toBe("false");
    expect(JSON.parse(c?.get("blocks") ?? "[]")).toHaveLength(1);
  });

  it("actualizar usa chat.update con el ts y sin hilo", async () => {
    const llamadas: { metodo: string; cuerpo: URLSearchParams }[] = [];
    await clienteSlackMensajes(falso(llamadas)).actualizar("xoxb-x", {
      canal: "C0AAAAAA1",
      texto: "Tomado",
      ts: "1700000000.000200",
      hiloTs: "1700000000.000100",
    });
    expect(llamadas[0]?.metodo).toBe("chat.update");
    expect(llamadas[0]?.cuerpo.get("ts")).toBe("1700000000.000200");
    expect(llamadas[0]?.cuerpo.has("thread_ts")).toBe(false);
  });
});
