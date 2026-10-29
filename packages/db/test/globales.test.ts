import { describe, expect, it, vi } from "vitest";

type ModeloFalso = Record<string, (args: unknown) => unknown>;

/** `$extends` imita lo justo del real (ADR-002: cada operación corre con `query(args)` dentro de
 * `$transaction`) para probar que `clienteAuth()` (CAR-43) sigue las consultas al MISMO cliente
 * (pool, configuración y reintento), solo que con el rol `opai_auth` por transacción. */
function conExtends<T extends Record<string, ModeloFalso>>(base: T) {
  return {
    ...base,
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $extends(ext: {
      query: {
        $allModels: {
          $allOperations: (a: {
            model: string;
            args: unknown;
            query: () => unknown;
          }) => unknown;
        };
      };
    }) {
      const hook = ext.query.$allModels.$allOperations;
      const extendido: Record<string, ModeloFalso> = {};
      for (const [modelo, original] of Object.entries(base)) {
        const nombreModelo = modelo.charAt(0).toUpperCase() + modelo.slice(1);
        const envuelto: ModeloFalso = {};
        for (const [op, fn] of Object.entries(original)) {
          envuelto[op] = vi.fn((args: unknown) =>
            hook({ model: nombreModelo, args, query: () => fn(args) }),
          );
        }
        extendido[modelo] = envuelto;
      }
      return extendido;
    },
  };
}

const consultas = vi.hoisted(() =>
  conExtends({
    user: { findUnique: vi.fn().mockResolvedValue(null) },
    tenant: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    session: { findMany: vi.fn().mockResolvedValue([]) },
  }),
);
vi.mock("../src/client", () => ({ clienteApp: () => consultas }));

import { clienteAuth, tenantPorSlug, tenantsOperables, usuarioPorId } from "../src/globales";

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

  it("Better Auth comparte el mismo cliente de la app (pool, configuración y reintento), con el rol opai_auth por transacción (CAR-43)", async () => {
    await clienteAuth().user.findUnique({ where: { id: "x" } });
    expect(consultas.user.findUnique).toHaveBeenCalledWith({ where: { id: "x" } });
    expect(consultas.$executeRaw).toHaveBeenCalled();
  });
});
