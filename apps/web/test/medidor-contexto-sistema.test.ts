import { beforeEach, describe, expect, it, vi } from "vitest";

const modulosActivos = vi.fn(async (_tenantId: string) => ["portal_cliente", "comercial"]);

vi.mock("next/server", () => ({ after: (fn: () => unknown) => fn() }));
vi.mock("../lib/registro", () => ({ asegurarRegistro: vi.fn() }));
vi.mock("../lib/fuentes", () => ({
  fuentesReales: { modulosActivos: (...a: [string]) => modulosActivos(...a) },
}));

const crearContexto = vi.fn((p: { tenantId: string; modulosActivos: readonly string[] }) => ({
  tenantId: p.tenantId,
  modulosActivos: [...p.modulosActivos],
  actor: { tipo: "system" as const },
}));
const despacharPendientes = vi.fn(
  async (_ctx: { modulosActivos: string[] }) => ({ publicados: 0, errores: 0 }),
);

vi.mock("@opai/capabilities", () => ({
  crearContexto: (p: unknown) => crearContexto(p as never),
  despacharPendientes: (ctx: { modulosActivos: string[] }) => despacharPendientes(ctx),
  medidorEnDb: { preparar: vi.fn(), registrar: vi.fn() },
}));

import { contextoSistemaDelTenant, despacharDiferido } from "../lib/medidor";

describe("contextoSistemaDelTenant (CAR-441)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modulosActivos.mockResolvedValue(["portal_cliente", "comercial"]);
  });

  it("pone en el contexto los módulos activos de la empresa, no []", async () => {
    const fuentes = {
      modulosActivos: vi.fn(async () => ["portal_cliente", "cpq"]),
    };

    const ctx = await contextoSistemaDelTenant("tenant-qa", fuentes);

    expect(fuentes.modulosActivos).toHaveBeenCalledWith("tenant-qa");
    expect(ctx.modulosActivos).toEqual(["portal_cliente", "cpq"]);
    expect(ctx.modulosActivos).not.toEqual([]);
  });

  it("despacharDiferido despacha el outbox con esos módulos", async () => {
    despacharDiferido("tenant-qa")();

    await vi.waitFor(() => expect(despacharPendientes).toHaveBeenCalled());
    expect(modulosActivos).toHaveBeenCalledWith("tenant-qa");
    const ctx = despacharPendientes.mock.calls[0]![0];
    expect(ctx.modulosActivos).toEqual(["portal_cliente", "comercial"]);
  });
});
