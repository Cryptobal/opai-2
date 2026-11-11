// CAR-291 (Slack F1, ADR-093 §10): Events API y vuelta del OAuth. Slack simulado; nunca el real.
import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { leerEventoSlack, motivoDeError } from "@/lib/slack-eventos";

const SECRETO = "signing-secret-de-prueba";
const firmar = (ts: string, cuerpo: string) =>
  `v0=${createHmac("sha256", SECRETO).update(`v0:${ts}:${cuerpo}`).digest("hex")}`;
const callback = (type: string, extra: object = {}) =>
  JSON.stringify({ type: "event_callback", team_id: "T0PRUEBA1", event: { type, ...extra } });

describe("leerEventoSlack y motivoDeError", () => {
  it("reconoce verificación, desinstalación y revocación del bot; ignora lo demás", () => {
    expect(leerEventoSlack('{"type":"url_verification","challenge":"abc"}')).toEqual({
      tipo: "verificacion",
      challenge: "abc",
    });
    expect(leerEventoSlack(callback("app_uninstalled"))).toEqual({
      tipo: "desinstalada",
      teamId: "T0PRUEBA1",
    });
    expect(
      leerEventoSlack(callback("tokens_revoked", { tokens: { bot: ["U0BOT1"] } })),
    ).toMatchObject({ tipo: "desinstalada" });
    expect(leerEventoSlack(callback("tokens_revoked", { tokens: { oauth: ["U1"] } }))).toEqual({
      tipo: "ignorado",
    });
    expect(leerEventoSlack(callback("message", { text: "hola" }))).toEqual({ tipo: "ignorado" });
    expect(leerEventoSlack("no es json")).toEqual({ tipo: "ignorado" });
  });

  it("solo deja pasar motivos cortos y seguros", () => {
    expect(motivoDeError({ code: "UNPROCESSABLE", detalles: { motivo: "otro_espacio" } })).toBe(
      "otro_espacio",
    );
    expect(motivoDeError({ code: "UNPROCESSABLE", detalles: { motivo: "<script>" } })).toBe(
      "slack",
    );
    expect(motivoDeError({ code: "FORBIDDEN" })).toBe("enlace");
  });
});

describe("POST /api/integraciones/slack/eventos", () => {
  const resolver = vi.fn();
  const ejecutar = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    resolver.mockReset().mockResolvedValue({ tenantId: "0192f3a0-0000-7000-8000-000000000001" });
    ejecutar.mockReset().mockResolvedValue({ ok: true, data: { borrada: true } });
    vi.stubEnv("SLACK_CLIENT_ID", "1.2");
    vi.stubEnv("SLACK_CLIENT_SECRET", "cs");
    vi.stubEnv("SLACK_SIGNING_SECRET", SECRETO);
    vi.doMock("@opai/db", () => ({ resolverInstalacionSlack: resolver }));
    vi.doMock("@opai/capabilities", () => ({
      crearContexto: (p: unknown) => p,
      executeCapability: ejecutar,
    }));
    vi.doMock("@/lib/registro", () => ({ asegurarRegistro: () => undefined }));
    vi.doMock("@/lib/medidor", () => ({ medidorDiferido: {} }));
    vi.doMock("@/lib/rate-limit", () => ({ permitir: async () => true, ipDe: () => "1.2.3.4" }));
  });
  const pedir = async (
    cuerpo: string,
    firma?: string,
    ts = String(Math.floor(Date.now() / 1000)),
  ) => {
    const { POST } = await import("../app/api/integraciones/slack/eventos/route");
    return POST(
      new Request("https://test.opai.cl/api/integraciones/slack/eventos", {
        method: "POST",
        body: cuerpo,
        headers: {
          "x-slack-request-timestamp": ts,
          "x-slack-signature": firma ?? firmar(ts, cuerpo),
        },
      }),
    );
  };

  it("sin firma válida o vieja responde 401 y no hace nada", async () => {
    expect((await pedir(callback("app_uninstalled"), "v0=" + "0".repeat(64))).status).toBe(401);
    const viejo = String(Math.floor(Date.now() / 1000) - 600);
    const cuerpo = callback("app_uninstalled");
    expect((await pedir(cuerpo, firmar(viejo, cuerpo), viejo)).status).toBe(401);
    expect(resolver).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("sin la app en el entorno falla cerrado", async () => {
    vi.stubEnv("SLACK_SIGNING_SECRET", "");
    expect((await pedir(callback("app_uninstalled"))).status).toBe(401);
  });

  it("responde el challenge de la verificación de URL", async () => {
    const r = await pedir('{"type":"url_verification","challenge":"reto-123"}');
    expect(await r.json()).toEqual({ challenge: "reto-123" });
  });

  it("la desinstalación borra la conexión de la empresa del team_id", async () => {
    expect((await pedir(callback("app_uninstalled"))).status).toBe(200);
    expect(resolver).toHaveBeenCalledWith("T0PRUEBA1");
    expect(ejecutar).toHaveBeenCalledWith(expect.anything(), "core.slack.desinstalada", {
      teamId: "T0PRUEBA1",
    });
  });

  it("la revocación de un token pasa los bots revocados para que solo se borre el de la empresa", async () => {
    expect((await pedir(callback("tokens_revoked", { tokens: { bot: ["U0BOT1"] } }))).status).toBe(
      200,
    );
    expect(ejecutar).toHaveBeenCalledWith(expect.anything(), "core.slack.desinstalada", {
      teamId: "T0PRUEBA1",
      botUserIds: ["U0BOT1"],
    });
  });

  it("un espacio desconocido o un mensaje se ignoran sin ejecutar nada", async () => {
    resolver.mockResolvedValue(null);
    expect((await pedir(callback("app_uninstalled"))).status).toBe(200);
    expect((await pedir(callback("message", { text: "hola" }))).status).toBe(200);
    expect(ejecutar).not.toHaveBeenCalled();
  });
});
