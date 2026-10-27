import { beforeEach, describe, expect, it, vi } from "vitest";
import { contextoDePrueba } from "@opai/capabilities/testing";
import type * as Capacidades from "@opai/capabilities";

const dobles = vi.hoisted(() => ({ actor: vi.fn(), ejecutar: vi.fn(), permitir: vi.fn() }));
vi.mock("../lib/actor", () => ({ resolverActor: dobles.actor }));
vi.mock("../lib/rate-limit", () => ({ permitir: dobles.permitir }));
vi.mock("../lib/registro", () => ({ asegurarRegistro: vi.fn() }));
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<typeof Capacidades>()),
  executeCapability: dobles.ejecutar,
}));
import { POST } from "../app/api/agente/route";

const solicitud = (extra: Record<string, string> = {}, body = {}) =>
  new Request("https://prueba.local/api/agente", {
    method: "POST",
    headers: { origin: "https://prueba.local", ...extra },
    body: JSON.stringify({
      accion: "preparar",
      entrada: {},
      idempotencyKey: "0192f3a0-0000-7000-8000-000000000001",
      ...body,
    }),
  });
beforeEach(() => {
  dobles.actor.mockResolvedValue(contextoDePrueba({ modulosActivos: ["agente"] }).ctx);
  dobles.permitir.mockResolvedValue(true);
  dobles.ejecutar.mockResolvedValue({ ok: true, data: { texto: "Prevista" } });
  dobles.ejecutar.mockClear();
});
describe("POST /api/agente", () => {
  it("emite SSE e invoca la capacidad común con tenant y portal del servidor", async () => {
    const r = await POST(solicitud());
    expect(r.headers.get("content-type")).toBe("text/event-stream");
    expect(await r.text()).toContain("event: resultado");
    expect(dobles.ejecutar).toHaveBeenCalledWith(
      expect.objectContaining({ portal: "erp" }),
      "agente.turno.preparar",
      {},
      expect.anything(),
    );
  });
  it("rechaza bearer, otro origen, módulo apagado y portal sin acceso", async () => {
    expect((await POST(solicitud({ authorization: "Bearer ficticio" }))).status).toBe(403);
    expect((await POST(solicitud({ origin: "https://otra.local" }))).status).toBe(403);
    dobles.actor.mockResolvedValue(contextoDePrueba().ctx);
    expect((await POST(solicitud())).status).toBe(403);
    dobles.actor.mockResolvedValue(
      contextoDePrueba({ modulosActivos: ["agente"], portalesMembresia: ["supervisor"] }).ctx,
    );
    expect((await POST(solicitud())).status).toBe(403);
    expect(dobles.ejecutar).not.toHaveBeenCalled();
  });
  it("conserva 401 y corta si el rate limit falla cerrado", async () => {
    dobles.actor.mockResolvedValue(new Response(null, { status: 401 }));
    expect((await POST(solicitud())).status).toBe(401);
    dobles.actor.mockResolvedValue(contextoDePrueba({ modulosActivos: ["agente"] }).ctx);
    dobles.permitir.mockResolvedValue(false);
    expect((await POST(solicitud())).status).toBe(429);
  });
});
