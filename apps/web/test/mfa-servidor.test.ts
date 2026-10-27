import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as Capabilities from "@opai/capabilities";

const estado = vi.hoisted(() => ({ activa: false, verificada: false, ejecutar: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => new Headers(),
}));
vi.mock("@opai/auth", () => ({
  getSession: async () => ({
    user: {
      id: "u1",
      name: "Prueba",
      email: "u@example.test",
      platformRole: "owner",
      twoFactorEnabled: estado.activa,
    },
    session: { mfaVerified: estado.verificada },
  }),
}));
vi.mock("@opai/capabilities", async (original) => ({
  ...(await original<typeof Capabilities>()),
  executeCapability: estado.ejecutar,
  ajuste: async () => false,
}));
vi.mock("@/lib/fuentes", () => ({
  fuentesReales: {
    membresiasDe: async () => [],
    modulosActivos: async () => [],
  },
}));
vi.mock("@/lib/registro", () => ({ asegurarRegistro: vi.fn() }));
vi.mock("@/lib/metricas-navegacion", () => ({
  medirFase: async (_n: string, fn: () => unknown) => fn(),
}));
vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");

import { ejecutarComoUsuario } from "@/lib/servidor";

describe("MFA en Server Actions", () => {
  beforeEach(() => {
    estado.ejecutar.mockReset();
  });
  it("una cuenta obligada sin enrolar no invoca ninguna capacidad", async () => {
    estado.activa = false;
    estado.verificada = false;
    expect(await ejecutarComoUsuario("platform", "core.apikeys.create", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });
  it("una sesión Google con MFA activo pero sin verificar tampoco invoca capacidades", async () => {
    estado.activa = true;
    estado.verificada = false;
    expect(await ejecutarComoUsuario("platform", "core.me", {})).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });
  it("una sesión verificada transmite la garantía a la capacidad", async () => {
    estado.activa = true;
    estado.verificada = true;
    estado.ejecutar.mockResolvedValue({ ok: true, data: {} });
    expect(await ejecutarComoUsuario("platform", "core.me", {})).toMatchObject({ ok: true });
    expect(estado.ejecutar.mock.calls[0]?.[0]).toMatchObject({
      mfa: { activa: true, verificada: true, obligatoria: true },
    });
  });
});
