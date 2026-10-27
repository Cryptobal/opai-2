import { beforeEach, describe, expect, it, vi } from "vitest";

// `vi.hoisted` porque las fábricas de `vi.mock` se elevan sobre las declaraciones del archivo.
const { permitir } = vi.hoisted(() => ({
  permitir: vi.fn<(c: string, m: number, v?: number) => Promise<boolean>>(),
}));
const { crearUsuarioConPassword, signInEmail, getSession } = vi.hoisted(() => ({
  crearUsuarioConPassword: vi.fn(),
  signInEmail: vi.fn(),
  getSession: vi.fn(),
}));
const { executeCapability } = vi.hoisted(() => ({ executeCapability: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  permitir,
  ipDeCabeceras: () => "1.2.3.4",
  LIMITES: { invitacion: { maximo: 30, ventanaMs: 15 * 60_000 } },
}));
vi.mock("@/lib/registro", () => ({ asegurarRegistro: () => undefined }));
vi.mock("@/lib/tenant-actual", () => ({ COOKIE_TENANT: "opai_tenant" }));
vi.mock("@/lib/medidor", () => ({ medidorDiferido: {} }));
vi.mock("@opai/capabilities", () => ({ crearContexto: () => ({ tenantId: "t1" }), executeCapability }));
vi.mock("@opai/auth", () => ({
  auth: { api: { signInEmail } },
  crearUsuarioConPassword,
  getSession,
}));
vi.mock("@opai/db", () => ({
  globales: () => ({ tenant: { findUnique: async () => ({ id: "t1" }) } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));

import { registrarYAceptar } from "@/app/(auth)/invitacion/[slug]/[token]/acciones";

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue(null);
});

// H2: antes el tope se cobraba en `verInvitacion` y de nuevo en `aceptarComo`; si caía entre las dos,
// la cuenta quedaba creada sin aceptar la invitación. Ahora se cobra una sola vez, antes de crear.
describe("registrarYAceptar: el tope se cobra una sola vez, antes de crear (H2)", () => {
  it("con el tope agotado no crea la cuenta y cobra una sola vez", async () => {
    permitir.mockResolvedValue(false);
    const msg = await registrarYAceptar("gard", "tok", "Ana", "secreta123");
    expect(msg).toBe("Demasiados intentos. Inténtalo más tarde.");
    expect(permitir).toHaveBeenCalledTimes(1);
    expect(crearUsuarioConPassword).not.toHaveBeenCalled();
    expect(executeCapability).not.toHaveBeenCalled();
  });

  it("en el camino feliz cobra el tope una sola vez (no dos) y crea una vez", async () => {
    permitir.mockResolvedValue(true);
    executeCapability.mockImplementation(async (_ctx: unknown, id: string) =>
      id === "core.invitations.peek"
        ? {
            ok: true,
            dryRun: false,
            data: { email: "ana@x.cl", estado: "pendiente", usuarioExiste: false },
          }
        : { ok: true, dryRun: false, data: {} },
    );
    crearUsuarioConPassword.mockResolvedValue({ id: "u1" });
    signInEmail.mockResolvedValue({});
    await registrarYAceptar("gard", "tok", "Ana", "secreta123");
    expect(permitir).toHaveBeenCalledTimes(1);
    expect(crearUsuarioConPassword).toHaveBeenCalledTimes(1);
    // La clave lleva el token (H1): aislamiento por invitación, no un solo cupo por red.
    expect(permitir.mock.calls[0]?.[0]).toBe("invitacion-ip:1.2.3.4:tok");
  });
});
