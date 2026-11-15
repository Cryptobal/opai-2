// CAR-528: `ejecutarComoUsuario` usa el contexto de la persona vista solo con una vista vigente de esa
// misma sesión, empresa y permiso, y solo en el portal de la vista; el ERP sigue con la identidad propia.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";
import { COOKIE_VER_COMO, firmarVerComo, type VerComo } from "@/lib/ver-como-token";

const estado = vi.hoisted(() => ({
  token: "",
  sesionId: "s-1",
  permiso: true,
  ejecutar: vi.fn(),
  identidad: null as unknown as Identidad,
  vista: null as unknown as Identidad,
}));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) => (n === COOKIE_VER_COMO ? { value: estado.token } : undefined),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@opai/auth", () => ({
  getSession: async () => ({ user: {}, session: { id: estado.sesionId } }),
}));
vi.mock("@/lib/mfa", () => ({ verificarMfaDe: async () => false, estadoMfaDe: async () => ({}) }));
vi.mock("@opai/capabilities", () => ({ executeCapability: estado.ejecutar }));
vi.mock("@/lib/registro", () => ({ asegurarRegistro: vi.fn() }));
vi.mock("@/lib/metricas-navegacion", () => ({
  medirFase: (_n: string, fn: () => unknown) => fn(),
}));
vi.mock("@/lib/fuentes", () => ({
  fuentesReales: {
    usuario: async (id: string) => ({ id, name: "P", email: "p@qa-e2e.test", platformRole: null }),
  },
}));
vi.mock("@/lib/actor", () => ({
  identidadDe: async (u: { id: string }) =>
    u.id === "u-persona" ? estado.vista : estado.identidad,
  contextoDeIdentidad: (identidad: Identidad, portal: string) => ({
    usuarioId: identidad.usuario.id,
    portal,
    autorizar: () => estado.permiso,
  }),
}));

import { ejecutarComoUsuario } from "@/lib/servidor";

const identidad = (id: string, portales: string[]): Identidad => ({
  usuario: { id, nombre: id, email: `${id}@qa-e2e.test`, platformRole: null },
  mfaActiva: false,
  actual: {
    id: `m-${id}`,
    tenantId: "t",
    rol: "admin",
    portales,
    estado: "activa",
    tenant: { id: "t", slug: "qa-e2e", nombre: "QA", vertical: "seguridad", estado: "activo" },
  },
  membresias: [],
  modulosActivos: ["portal_trabajador"],
  acceso: { permisosRol: null, excepciones: [], instalaciones: null },
});

const vigente: VerComo = {
  tenantId: "t",
  porUserId: "u-admin",
  sesionId: "s-1",
  portal: "trabajador",
  objetivoId: "0192f3a0-0000-7000-8000-00000000c001",
  nombre: "Persona Prueba",
  userId: "u-persona",
  dispositivoId: null,
  expira: Date.now() + 60_000,
};

beforeAll(() => {
  process.env["BETTER_AUTH_SECRET"] ??= "secreto-de-prueba-ver-como-solo-tests";
});

beforeEach(() => {
  estado.ejecutar.mockReset().mockResolvedValue({ ok: true, data: {} });
  estado.identidad = identidad("u-admin", ["erp"]);
  estado.vista = identidad("u-persona", ["trabajador"]);
  estado.token = firmarVerComo(vigente);
  estado.sesionId = "s-1";
  estado.permiso = true;
});

const leerPortal = () => ejecutarComoUsuario("trabajador", "portal_trabajador.mis_datos.obtener");
const sinAcceso = {
  ok: false,
  error: { code: "FORBIDDEN", message: "No tienes acceso a este portal." },
};

describe("ejecutarComoUsuario con «ver como»", () => {
  it("con la vista vigente ejecuta como la persona vista, marcada verComo", async () => {
    expect(await leerPortal()).toMatchObject({ ok: true });
    const [ctx] = estado.ejecutar.mock.calls[0] ?? [];
    expect(ctx).toMatchObject({
      usuarioId: "u-persona",
      portal: "trabajador",
      verComo: { porUserId: "u-admin" },
    });
  });

  it("otra sesión, sin el permiso, otra empresa o vencida: no hay vista", async () => {
    const casos: (() => void)[] = [
      () => (estado.sesionId = "s-2"),
      () => (estado.permiso = false),
      () => (estado.token = firmarVerComo({ ...vigente, tenantId: "otra" })),
      () => (estado.token = firmarVerComo({ ...vigente, expira: Date.now() - 1 })),
    ];
    for (const preparar of casos) {
      preparar();
      expect(await leerPortal()).toEqual(sinAcceso);
      estado.token = firmarVerComo(vigente);
      estado.sesionId = "s-1";
      estado.permiso = true;
    }
    expect(estado.ejecutar).not.toHaveBeenCalled();
  });

  it("el ERP sigue con la identidad propia aunque haya una vista abierta", async () => {
    await ejecutarComoUsuario("erp", "core.me");
    const [ctx] = estado.ejecutar.mock.calls[0] ?? [];
    expect(ctx).toMatchObject({ usuarioId: "u-admin", portal: "erp" });
    expect(ctx).not.toHaveProperty("verComo");
  });
});
