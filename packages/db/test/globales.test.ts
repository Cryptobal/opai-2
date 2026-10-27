import { describe, expect, it, vi } from "vitest";

const consultas = vi.hoisted(() => ({
  user: { findUnique: vi.fn().mockResolvedValue(null) },
  tenant: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
}));
vi.mock("../src/client", () => ({ clienteApp: () => consultas }));

import { tenantPorSlug, tenantsOperables, usuarioPorId } from "../src/globales";

describe("lecturas globales mínimas", () => {
  it("usuarioPorId no consulta credenciales, MFA ni datos privados", async () => {
    await usuarioPorId("usuario-de-la-sesion");
    expect(consultas.user.findUnique).toHaveBeenCalledWith({
      where: { id: "usuario-de-la-sesion" },
      select: { id: true, name: true, email: true, platformRole: true },
    });
  });

  it("tenantPorSlug no consulta el perfil legal, DPO ni integraciones", async () => {
    await tenantPorSlug("tenant-del-token");
    expect(consultas.tenant.findUnique).toHaveBeenCalledWith({
      where: { slug: "tenant-del-token" },
      select: { id: true, slug: true, nombre: true, estado: true },
    });
  });

  it("el cron solo enumera identificadores de tenants operables", async () => {
    await tenantsOperables();
    expect(consultas.tenant.findMany).toHaveBeenCalledWith({
      where: { estado: { in: ["activo", "trial"] } },
      select: { id: true, slug: true, timezone: true },
    });
  });
});
