// CAR-294 (Slack F4, ADR-093 §10): interactividad. Slack simulado; nunca el real.
import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { leerClicSlack } from "@/lib/slack-clic";

const SECRETO = "signing-secret-de-prueba";
const AVISO = "0192f3a0-0000-7000-8000-000000000e01";
const firmar = (ts: string, cuerpo: string) =>
  `v0=${createHmac("sha256", SECRETO).update(`v0:${ts}:${cuerpo}`).digest("hex")}`;
const clic = (action_id: string, value: string | undefined = AVISO) =>
  `payload=${encodeURIComponent(
    JSON.stringify({
      type: "block_actions",
      team: { id: "T0PRUEBA1" },
      user: { id: "U0SUP1" },
      container: { channel_id: "C0GENERAL1", message_ts: "1.000200" },
      actions: [{ action_id, value, action_ts: "1700000000.000100" }],
    }),
  )}`;

describe("leerClicSlack", () => {
  it("reconoce solo los botones de OPAI con su aviso", () => {
    expect(leerClicSlack(clic("opai.aviso.tomar"))).toMatchObject({
      teamId: "T0PRUEBA1",
      slackUserId: "U0SUP1",
      accion: "opai.aviso.tomar",
      avisoId: AVISO,
      canal: "C0GENERAL1",
    });
    expect(leerClicSlack(clic("otro.boton"))).toBeNull();
    expect(leerClicSlack(clic("opai.aviso.tomar", "no-es-uuid"))).toBeNull();
    expect(leerClicSlack("payload=no-json")).toBeNull();
  });
});

describe("POST /api/integraciones/slack/acciones", () => {
  const resolver = vi.fn();
  const ejecutar = vi.fn();
  const vinculado = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    resolver.mockReset().mockResolvedValue({ tenantId: "0192f3a0-0000-7000-8000-000000000001" });
    ejecutar
      .mockReset()
      .mockImplementation(async (_ctx: unknown, id: string) =>
        id === "core.slack.vinculado_de"
          ? { ok: true, data: { userId: "0192f3a0-0000-7000-8000-0000000000a1" } }
          : { ok: true, data: {} },
      );
    vinculado.mockReset().mockResolvedValue({ persona: true });
    vi.stubEnv("SLACK_CLIENT_ID", "1.2");
    vi.stubEnv("SLACK_CLIENT_SECRET", "cs");
    vi.stubEnv("SLACK_SIGNING_SECRET", SECRETO);
    vi.doMock("@opai/db", () => ({ resolverInstalacionSlack: resolver, usuarioPorId: vi.fn() }));
    vi.doMock("@opai/capabilities", () => ({
      crearContexto: (p: unknown) => p,
      executeCapability: ejecutar,
    }));
    vi.doMock("@/lib/registro", () => ({ asegurarRegistro: () => undefined }));
    vi.doMock("@/lib/medidor", () => ({ medidorDiferido: {} }));
    vi.doMock("@/lib/rate-limit", () => ({ permitir: async () => true, ipDe: () => "1.2.3.4" }));
    vi.doMock("@/lib/slack-acciones", () => ({ contextoDeVinculado: vinculado }));
  });
  const pedir = async (cuerpo: string, firma?: string) => {
    const ts = String(Math.floor(Date.now() / 1000));
    const { POST } = await import("../app/api/integraciones/slack/acciones/route");
    return POST(
      new Request("https://test.opai.cl/api/integraciones/slack/acciones", {
        method: "POST",
        body: cuerpo,
        headers: {
          "x-slack-request-timestamp": ts,
          "x-slack-signature": firma ?? firmar(ts, cuerpo),
        },
      }),
    );
  };
  const ids = () => ejecutar.mock.calls.map((c) => c[1]);

  it("sin firma válida responde 401 y no hace nada", async () => {
    expect((await pedir(clic("opai.aviso.tomar"), "v0=" + "0".repeat(64))).status).toBe(401);
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it("«Tomar» se ejecuta como la persona vinculada, con clave de idempotencia por clic", async () => {
    expect((await pedir(clic("opai.aviso.tomar"))).status).toBe(200);
    const llamada = ejecutar.mock.calls.find((c) => c[1] === "core.avisos_terreno.tomar");
    expect(llamada?.[0]).toEqual({ persona: true });
    expect(llamada?.[2]).toEqual({ avisoId: AVISO });
    expect(llamada?.[3]).toEqual({ idempotencyKey: "slack:T0PRUEBA1:U0SUP1:1700000000.000100" });
  });

  it("sin vínculo: aviso efímero y no se ejecuta la acción", async () => {
    vinculado.mockResolvedValue(null);
    await pedir(clic("opai.aviso.cerrar"));
    expect(ids()).toEqual(["core.slack.vinculado_de", "core.slack.efimero"]);
  });

  it("sin permiso: la acción falla y le llega un efímero", async () => {
    ejecutar.mockImplementation(async (_ctx: unknown, id: string) =>
      id === "core.slack.vinculado_de"
        ? { ok: true, data: { userId: "0192f3a0-0000-7000-8000-0000000000a1" } }
        : id === "core.avisos_terreno.cerrar"
          ? { ok: false, error: { code: "FORBIDDEN", message: "x" } }
          : { ok: true, data: {} },
    );
    await pedir(clic("opai.aviso.cerrar"));
    expect(ids()).toEqual([
      "core.slack.vinculado_de",
      "core.avisos_terreno.cerrar",
      "core.slack.efimero",
    ]);
  });

  it("«Responder» solo orienta, sin ejecutar nada en OPAI", async () => {
    await pedir(clic("opai.aviso.responder"));
    expect(ids()).toEqual(["core.slack.vinculado_de", "core.slack.efimero"]);
  });
});
