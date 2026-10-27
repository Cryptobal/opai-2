import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Identidad } from "@/lib/actor";

const estado = vi.hoisted(() => ({ identidad: null as Identidad | null, ejecutar: vi.fn() }));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@opai/auth", () => ({ getSession: async () => ({ user: {} }) }));
vi.mock("@opai/capabilities", () => ({ executeCapability: estado.ejecutar }));
vi.mock("@/lib/registro", () => ({ asegurarRegistro: vi.fn() }));
vi.mock("@/lib/metricas-navegacion", () => ({
  medirFase: (_n: string, fn: () => unknown) => fn(),
}));
vi.mock("@/lib/actor", () => ({
  identidadDe: async () => estado.identidad,
  contextoDeIdentidad: () => ({}),
}));

import { ejecutarComoUsuario } from "@/lib/servidor";

beforeEach(() => {
  estado.ejecutar.mockReset().mockResolvedValue({ ok: true, data: {} });
  estado.identidad = {
    usuario: { id: "u", nombre: "U", email: "u@example.test", platformRole: null },
    actual: {
      id: "m",
      tenantId: "t",
      rol: "viewer",
      portales: ["erp"],
      estado: "activa",
      tenant: { id: "t", slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
    },
    membresias: [],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
});

describe("ejecutor de servidor: portal antes del catálogo", () => {
  it.each(["supervisor", "trabajador", "terreno", "cliente", "platform", "", "desconocido"])(
    "rechaza %s igual exista o no capacidad",
    async (portal) => {
      const a = await ejecutarComoUsuario(portal, "core.me");
      expect(a).toEqual({
        ok: false,
        error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
      });
      expect(await ejecutarComoUsuario(portal, "no.existe")).toEqual(a);
      expect(estado.ejecutar).not.toHaveBeenCalled();
    },
  );
  it("Plataforma solo con rol global válido, nunca por portales del tenant", async () => {
    estado.identidad!.actual!.portales.push("platform");
    expect(await ejecutarComoUsuario("platform", "core.me")).toMatchObject({ ok: false });
    estado.identidad!.usuario.platformRole = "support";
    expect(await ejecutarComoUsuario("platform", "platform.tenants.list")).toMatchObject({
      ok: true,
    });
  });
});
