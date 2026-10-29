import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { ejecutarHerramienta, herramientasMcp } from "../src/mcp";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, listarCapacidades, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { type OpcionesPrueba } from "../src/testing/contexto";
import { contextoPlataformaAgente, nombresDeHerramientas } from "./paridad-util";
import { semillaTenant } from "./semilla";

// ADR-055: una key de plataforma (scope "platform" explícito + responsable con platformRole vigente)
// ve todas las capacidades platform.* por MCP, con las mismas reglas que la pantalla.
beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([
    defineModule({
      id: "crm",
      nombre: "CRM",
      version: "0.1.0",
      dependencias: [],
      permisos: [],
      navegacion: [],
      configuracion: z.object({}),
      eventos: [],
      capacidades: [],
    }),
  ]);
});

const actor = { tipo: "agent" as const, id: "k-1", viaUserId: USUARIO_DE_PRUEBA.id };
const key = (o: Partial<OpcionesPrueba> = {}) =>
  contextoDePrueba({
    actor,
    usuario: { ...USUARIO_DE_PRUEBA, platformRole: "owner" },
    scopes: ["*", "platform"],
    claveApi: { permisos: null, servicio: false, plataforma: true },
    semilla: semillaTenant(),
    ...o,
  });
const plataforma = (ctx: Parameters<typeof herramientasMcp>[0]) =>
  nombresDeHerramientas(ctx).filter((n) => n.includes("platform_"));

describe("MCP de plataforma (ADR-055)", () => {
  it("una key de plataforma ve toda capacidad platform.* (con preview_ en las escrituras)", () => {
    // Salvo las de solo personas (resolver la cola de plataforma, CAR-36): ninguna key las ve.
    const ids = listarCapacidades()
      .filter((c) => c.modulo === "platform" && !c.soloPersonas)
      .map((c) => c.id);
    const vistas = new Set(herramientasMcp(contextoPlataformaAgente()).map((h) => h.capacidad.id));
    expect(ids.filter((id) => !vistas.has(id))).toEqual([]);
    const nombres = plataforma(contextoPlataformaAgente());
    for (const n of [
      "platform_modules_set",
      "preview_platform_modules_set",
      "platform_tenants_list",
    ])
      expect(nombres).toContain(n);
    expect(nombres).toContain("platform_tenants_get");
    expect(nombres).toContain("platform_users_set_role");
    expect(nombres).toContain("preview_platform_users_set_role");
  });

  it("sin el scope explícito, sin platformRole, de servicio o con permisos finos: nada de plataforma", () => {
    const sinRol = { ...USUARIO_DE_PRUEBA, platformRole: null };
    expect(plataforma(key({ scopes: ["*"] }).ctx)).toEqual([]);
    expect(plataforma(key({ usuario: sinRol }).ctx)).toEqual([]);
    expect(
      plataforma(key({ claveApi: { permisos: null, servicio: true, plataforma: true } }).ctx),
    ).toEqual([]);
    expect(
      plataforma(
        key({ claveApi: { permisos: ["core:tenant.read"], servicio: false, plataforma: true } })
          .ctx,
      ),
    ).toEqual([]);
    expect(key({ claveApi: { permisos: null, servicio: false } }).ctx.plataforma).toBeNull();
  });

  it("support de plataforma solo ve lecturas", () => {
    const { ctx } = key({ usuario: { ...USUARIO_DE_PRUEBA, platformRole: "support" } });
    const reales = herramientasMcp(ctx).filter((h) => h.capacidad.modulo === "platform");
    expect(reales.length).toBeGreaterThan(0);
    expect(reales.every((h) => h.capacidad.efecto === "lectura")).toBe(true);
  });

  it("platform_modules_set: preview no guarda; la real activa, siembra y audita en el tenant objetivo", async () => {
    const { ctx, tabla, eventos } = key();
    const [real, preview] = ["platform_modules_set", "preview_platform_modules_set"].map((n) =>
      herramientasMcp(ctx).find((h) => h.nombre === n)!,
    );
    const input = { tenantId: TENANT_DE_PRUEBA, moduloId: "crm", estado: "activo" };
    expect(await ejecutarHerramienta(ctx, preview!, input)).toMatchObject({
      ok: true,
      dryRun: true,
    });
    expect(tabla("tenantModule").filter((m) => m.moduloId === "crm")).toEqual([]);
    expect(eventos).toEqual([]);
    const r = await ejecutarHerramienta(ctx, real!, {
      ...input,
      idempotency_key: "clave-plataforma-1",
    });
    expect(r).toMatchObject({ ok: true, data: { moduloId: "crm", estado: "activo" } });
    expect(tabla("tenantModule").find((m) => m.moduloId === "crm")?.estado).toBe("activo");
    expect(eventos).toMatchObject([
      { tenantId: TENANT_DE_PRUEBA, capability: "platform.modules.set", actor },
    ]);
  });

  it("una key común no ejecuta plataforma aunque su responsable sea owner de plataforma", async () => {
    const { ctx } = key({ scopes: ["*"], claveApi: { permisos: null, servicio: false } });
    const { executeCapability } = await import("../src/execute");
    const r = await executeCapability(ctx, "platform.tenants.list", {});
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("instantánea de las herramientas de plataforma", async () => {
    const texto = `${plataforma(contextoPlataformaAgente()).join("\n")}\n`;
    await expect(texto).toMatchFileSnapshot("./__snapshots__/herramientas-mcp-plataforma.txt");
  });
});
