import { describe, expect, it, vi } from "vitest";

import type { TokenOAuth } from "@opai/auth";

import { fuentesFalsas, membresia, TENANT, USUARIO } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
vi.mock("../lib/medidor", () => ({
  medidorDiferido: { registrar: vi.fn() },
  diferirConAfter: vi.fn(),
  despacharDiferido: () => vi.fn(),
}));

const OTRO = "0192f3a0-0000-7000-8000-000000000002";
const token = (extra: Partial<TokenOAuth> = {}): TokenOAuth => ({
  userId: USUARIO.id,
  tenantId: TENANT,
  clientId: "claude",
  app: "Claude",
  alcances: ["mcp:leer", "mcp:escribir"],
  ...extra,
});

async function contexto(t: TokenOAuth | null, membresias = [membresia()]) {
  const { contextoDeTokenOAuth } = await import("../lib/oauth-mcp");
  const { fuentes } = fuentesFalsas({ membresias });
  return contextoDeTokenOAuth("t", { fuentes, token: async () => t });
}

// CAR-247: la empresa sale del token, nunca de otra parte; sin membresía usable en ella no hay acceso.
describe("token OAuth del MCP", () => {
  it("actúa como agente vía la persona en la empresa del token", async () => {
    const ctx = await contexto(token());
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.tenantId).toBe(TENANT);
    expect(ctx.actor).toMatchObject({ tipo: "agent", id: "oauth:claude", viaUserId: USUARIO.id });
    expect(ctx.portal).toBe("erp");
    expect(ctx.plataforma).toBeNull();
    expect(ctx.modulosSoloLectura).toEqual([]);
  });

  it("con solo mcp:leer deja todo en lectura", async () => {
    const ctx = await contexto(token({ alcances: ["mcp:leer"] }));
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.modulosSoloLectura).toEqual(expect.arrayContaining([...ctx.modulosActivos]));
  });

  it("rechaza token inválido y empresa sin membresía, suspendida o inactiva (sin caer a otra)", async () => {
    const otra = membresia({
      id: "m2",
      tenantId: OTRO,
      tenant: { ...membresia().tenant, id: OTRO },
    });
    const casos: [TokenOAuth | null, ReturnType<typeof membresia>[]][] = [
      [null, [membresia()]],
      [token(), [otra]],
      [token(), [membresia({ estado: "suspendida" }), otra]],
      [token(), [membresia({ tenant: { ...membresia().tenant, estado: "suspendido" } }), otra]],
    ];
    for (const [t, m] of casos) {
      const r = await contexto(t, m);
      expect(r instanceof Response && r.status).toBe(401);
    }
  });

  it("no opera desde portales de cliente o trabajador", async () => {
    const r = await contexto(token(), [membresia({ portales: ["trabajador"] })]);
    expect(r instanceof Response && r.status).toBe(403);
  });
});
