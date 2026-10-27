import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ membership: vi.fn(), instalaciones: vi.fn(), tenant: vi.fn() }));
vi.mock("@opai/db", () => ({
  forTenant: (id: string) => {
    mocks.tenant(id);
    return {
      membership: { findUnique: mocks.membership },
      supervisorInstalacion: { findMany: mocks.instalaciones },
    };
  },
  forUser: vi.fn(),
  usuarioPorId: vi.fn(),
  tenantPorSlug: vi.fn(),
}));
import { fuentesReales } from "../lib/fuentes";

beforeEach(() => {
  vi.clearAllMocks();
});
it("carga módulos y acceso del tenant/usuario elegido con una sola consulta", async () => {
  mocks.membership.mockResolvedValue({
    rol: "viewer",
    rolTenant: { archivadoEn: null, permisos: ["core:cuentas.read"] },
    excepciones: [{ permiso: "core:personas.read", conceder: false }],
    tenant: { modules: [{ moduloId: "comercial" }] },
  });
  expect(await fuentesReales.accesoConModulos!("tenant-propio", "usuario")).toEqual({
    modulosActivos: ["comercial"],
    acceso: {
      permisosRol: ["core:cuentas.read"],
      excepciones: [{ permiso: "core:personas.read", conceder: false }],
      instalaciones: null,
    },
  });
  expect(mocks.tenant).toHaveBeenCalledWith("tenant-propio");
  expect(mocks.membership).toHaveBeenCalledTimes(1);
  expect(mocks.membership).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { tenantId_userId: { tenantId: "tenant-propio", userId: "usuario" } },
      include: expect.objectContaining({
        tenant: {
          select: {
            modules: {
              where: { estado: { in: ["activo", "trial"] } },
              select: { moduloId: true },
            },
          },
        },
      }),
    }),
  );
});
it("un rol archivado no hereda permisos; un supervisor sin asignaciones conserva alcance vacío", async () => {
  mocks.membership.mockResolvedValue({
    id: "m",
    rol: "supervisor",
    rolTenant: { archivadoEn: new Date(), permisos: ["*"] },
    excepciones: [],
    tenant: { modules: [] },
  });
  mocks.instalaciones.mockResolvedValue([]);
  expect(await fuentesReales.accesoConModulos!("tenant", "usuario")).toMatchObject({
    acceso: { permisosRol: [], instalaciones: [] },
    modulosActivos: [],
  });
  expect(mocks.instalaciones).toHaveBeenCalledWith({
    where: { membershipId: "m" },
    select: { instalacionId: true },
  });
});
