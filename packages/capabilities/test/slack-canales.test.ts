// Slack F1 (CAR-291, ADR-093): canales del espacio y paridad MCP. Slack simulado (nunca el real ni el de Gard).
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { executeCapability } from "../src";
import { herramientasMcp } from "../src/mcp";
import { contextoOwnerAgente } from "./paridad-util";
import { contextoDePrueba } from "../src/testing";
import { conectarSlack, limpiarSlack, prepararSlack, respuestas } from "./slack-util";

beforeEach(prepararSlack);
afterEach(limpiarSlack);

describe("core.slack: canales y paridad", () => {
  it("lista canales solo con Slack conectado", async () => {
    const { ctx } = contextoDePrueba();
    expect(await executeCapability(ctx, "core.slack.canales", {})).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    await conectarSlack(ctx);
    respuestas["conversations.list"] = {
      ok: true,
      channels: [{ id: "C0ALERTAS", name: "alertas", is_member: true }],
    };
    expect(await executeCapability(ctx, "core.slack.canales", {})).toMatchObject({
      ok: true,
      data: [{ id: "C0ALERTAS", nombre: "alertas", esMiembro: true }],
    });
    respuestas["conversations.list"] = { ok: false, error: "invalid_auth" };
    expect(await executeCapability(ctx, "core.slack.canales", {})).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("vuelve a conectar") },
    });
  });

  it("el MCP ve estado, canales y configurar; nunca conectar ni desconectar", () => {
    const nombres = herramientasMcp(contextoOwnerAgente()).map((h) => h.nombre);
    expect(nombres).toEqual(
      expect.arrayContaining(["core_slack_estado", "core_slack_canales", "core_slack_configurar"]),
    );
    expect(
      nombres.filter((n) => /slack_(iniciar|conectar|desconectar|desinstalada)/.test(n)),
    ).toEqual([]);
  });
});
