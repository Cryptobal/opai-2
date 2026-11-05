import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  membership: vi.fn(),
  instalaciones: vi.fn(),
  tenant: vi.fn(),
  acceso: vi.fn(),
  instalacion: vi.fn(),
}));
vi.mock("@opai/db", () => ({
  forTenant: (id: string) => {
    mocks.tenant(id);
    return {
      membership: { findUnique: mocks.membership },
      supervisorInstalacion: { findMany: mocks.instalaciones },
      accesoCliente: { findUnique: mocks.acceso },
      instalacion: { findMany: mocks.instalacion },
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
    id: "membresia",
    rol: "viewer",
    portales: ["erp"],
    rolTenant: { archivadoEn: null, permisos: ["core:cuentas.read"] },
    excepciones: [{ permiso: "core:personas.read", conceder: false }],
    tenant: { modules: [{ moduloId: "comercial" }] },
  });
  expect(await fuentesReales.accesoConModulos!("tenant-propio", "usuario")).toEqual({
    modulosActivos: ["comercial"],
    modulosSoloLectura: [],
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
              where: { estado: { in: ["activo", "trial", "solo_lectura"] } },
              select: { moduloId: true, estado: true },
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

const contacto = {
  id: "m-cliente",
  rol: "viewer",
  portales: ["cliente"],
  rolTenant: { archivadoEn: null, permisos: ["portal_cliente:read"] },
  excepciones: [],
  tenant: { modules: [{ moduloId: "portal_cliente" }] },
};
const instalaciones = [
  { id: "i1", cuentaId: "c1", estado: "activa", archivadaEn: null },
  { id: "i2", cuentaId: "c1", estado: "activa", archivadaEn: null },
  { id: "i3", cuentaId: "c2", estado: "activa", archivadaEn: null },
];

it("el contacto de un cliente solo alcanza las instalaciones que su acceso habilita (CAR-88)", async () => {
  mocks.membership.mockResolvedValue(contacto);
  mocks.acceso.mockResolvedValue({
    estado: "activo",
    cuentaId: "c1",
    todasInstalaciones: false,
    instalaciones: [{ instalacionId: "i2" }, { instalacionId: "i3" }],
  });
  mocks.instalacion.mockResolvedValue(instalaciones);
  const r = await fuentesReales.accesoConModulos!("tenant", "usuario");
  // i3 es de otra cuenta: se ignora aunque esté en su lista.
  expect(r.acceso.instalaciones).toEqual(["i2"]);
});

it("un contacto de cliente sin acceso activo no alcanza nada (fail-closed)", async () => {
  mocks.membership.mockResolvedValue(contacto);
  mocks.acceso.mockResolvedValue(null);
  expect((await fuentesReales.accesoConModulos!("tenant", "usuario")).acceso.instalaciones).toEqual(
    [],
  );
  mocks.acceso.mockResolvedValue({
    estado: "suspendido",
    cuentaId: "c1",
    todasInstalaciones: true,
    instalaciones: [],
  });
  expect((await fuentesReales.accesoConModulos!("tenant", "usuario")).acceso.instalaciones).toEqual(
    [],
  );
});

it("un módulo en solo lectura sigue activo y además se informa aparte (CAR-188)", async () => {
  mocks.membership.mockResolvedValue({
    id: "membresia",
    rol: "viewer",
    portales: ["erp"],
    rolTenant: null,
    excepciones: [],
    tenant: {
      modules: [
        { moduloId: "comercial", estado: "activo" },
        { moduloId: "cpq", estado: "solo_lectura" },
      ],
    },
  });
  expect(await fuentesReales.accesoConModulos!("tenant-propio", "usuario")).toMatchObject({
    modulosActivos: ["comercial", "cpq"],
    modulosSoloLectura: ["cpq"],
  });
});
