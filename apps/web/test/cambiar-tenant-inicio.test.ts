import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Identidad } from "@/lib/actor";

const estado = vi.hoisted(() => ({ identidad: null as Identidad | null, cookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: estado.cookie }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@opai/capabilities", () => ({ obtenerCapacidad: vi.fn() }));
vi.mock("@/lib/servidor", () => ({
  identidadActual: async () => estado.identidad,
  ejecutarComoUsuario: vi.fn(),
  tieneAccesoAPortal: vi.fn(),
}));

import { cambiarTenant } from "@/app/_acciones/capacidad";

beforeEach(() => {
  estado.cookie.mockClear();
  const m = (id: string, portalInicio: string) => ({
    id,
    tenantId: id,
    rol: "viewer",
    estado: "activa",
    portales: ["erp", "supervisor"],
    portalInicio,
    tenant: { id, slug: id, nombre: id, estado: "activo", vertical: "seguridad" },
  });
  const actual = m("a", "erp");
  estado.identidad = {
    usuario: { id: "u", nombre: "U", email: "u@example.test", platformRole: null },
    actual,
    membresias: [actual, m("b", "supervisor")],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
});

describe("cambio de empresa y portal de inicio", () => {
  it("usa la preferencia de la empresa elegida, no la anterior", async () => {
    await expect(cambiarTenant("b")).rejects.toThrow("redirect:/supervisor");
    expect(estado.cookie).toHaveBeenCalledWith("opai_tenant", "b", expect.any(Object));
  });
  it("next explícito prevalece y no permite redirección externa", async () => {
    await expect(cambiarTenant("b", "/")).rejects.toThrow("redirect:/");
    await expect(cambiarTenant("b", "/\\externo.test")).rejects.toThrow("redirect:/");
  });
  it("no acepta otro tenant ni membresías suspendidas", async () => {
    await cambiarTenant("ajeno");
    estado.identidad!.membresias[1]!.estado = "suspendida";
    await cambiarTenant("b");
    expect(estado.cookie).not.toHaveBeenCalled();
  });
});
