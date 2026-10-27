import { describe, expect, it, vi } from "vitest";

import { fuentesFalsas, membresia } from "./fuentes-falsas";

vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");

vi.mock("../lib/medidor", () => ({
  medidorDiferido: { registrar: vi.fn() },
  diferirConAfter: vi.fn(),
  despacharDiferido: () => vi.fn(),
}));

describe("principal de la API key", () => {
  it("servicio no hereda rol owner ni permisos ajenos a su lista", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      key: {
        principalTipo: "servicio",
        heredaPermisos: false,
        permisos: ["core:cuentas.read"],
        presupuestoMensualMicro: 1_000_000n,
      },
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.rol).toBe(null);
    expect(ctx.principal).toEqual({ tipo: "servicio", id: "k1" });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
  });
  it("invalida el servicio si el responsable pasa a supervisor con alcance restringido", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      membresias: [membresia({ rol: "supervisor" })],
      key: {
        principalTipo: "servicio",
        heredaPermisos: false,
        permisos: ["core:instalaciones.read"],
        presupuestoMensualMicro: 1_000_000n,
      },
      acceso: { permisosRol: null, excepciones: [], instalaciones: ["i1"] },
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    expect(ctx).toBeInstanceOf(Response);
    expect(ctx instanceof Response && ctx.status).toBe(401);
  });
  it.each(["usuario", "servicio"])("no da plataforma a una key de %s", async (tipo) => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      key: {
        principalTipo: tipo,
        heredaPermisos: false,
        permisos: ["core:cuentas.read"],
        presupuestoMensualMicro: 1_000_000n,
      },
    });
    const usuario = await fuentes.usuario("0192f3a0-0000-7000-8000-0000000000a1");
    fuentes.usuario = async () => usuario && { ...usuario, platformRole: "owner" };
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.plataforma).toBeNull();
    expect(ctx.autorizar("platform:tenants.manage")).toBe(false);
  });
  it("la key delegada conserva alcance y cruza permisos con excepciones del responsable", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const { fuentes, secreto } = fuentesFalsas({
      key: { heredaPermisos: false, permisos: ["core:cuentas.read", "core:cuentas.manage"] },
      acceso: {
        permisosRol: null,
        excepciones: [{ permiso: "core:cuentas.manage", conceder: false }],
        instalaciones: ["i1"],
      },
    });
    const ctx = await contextoDeApiKey(secreto, fuentes);
    if (ctx instanceof Response) throw new Error("No autenticado");
    expect(ctx.alcance).toEqual({ instalaciones: ["i1"] });
    expect(ctx.autorizar("core:cuentas.read")).toBe(true);
    expect(ctx.autorizar("core:cuentas.manage")).toBe(false);
    expect(ctx.autorizar("core:users.read")).toBe(false);
  });
  it("H15: la key de servicio nunca supera el rol actual de su responsable", async () => {
    const { contextoDeApiKey } = await import("../lib/api-key");
    const base = {
      key: {
        principalTipo: "servicio" as const,
        heredaPermisos: false,
        permisos: ["core:instalaciones.manage"],
        presupuestoMensualMicro: 1_000_000n,
      },
    };
    const conGerente = fuentesFalsas({ ...base, membresias: [membresia({ rol: "gerente" })] });
    const concede = await contextoDeApiKey(conGerente.secreto, conGerente.fuentes);
    if (concede instanceof Response) throw new Error("No autenticado");
    expect(concede.autorizar("core:instalaciones.manage")).toBe(true);
    // Mismo responsable, bajado a viewer: la key lista el permiso igual, pero el techo real lo frena.
    const conViewer = fuentesFalsas({ ...base, membresias: [membresia({ rol: "viewer" })] });
    const niega = await contextoDeApiKey(conViewer.secreto, conViewer.fuentes);
    if (niega instanceof Response) throw new Error("No autenticado");
    expect(niega.autorizar("core:instalaciones.manage")).toBe(false);
  });
});
