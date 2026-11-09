// CAR-222 PR 2 · Casos sintéticos de cierre (1/2): límites de días y permisos/aislamiento de las
// lecturas. Solo datos de prueba en memoria; no toca producción, aliases ni cobros reales.
import { describe, expect, it } from "vitest";

import { executeCapability } from "../src/execute";
import { TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA, contextoDePrueba } from "../src/testing";
import { modulesPruebas } from "../src/core/pruebas-gratis";
import { semillaTenant } from "./semilla";
import {
  OTRA,
  dia,
  extender,
  fecha,
  modCpq,
  owner,
  plataforma,
  prueba,
  registrarEntorno,
  rut,
  support,
} from "./prueba-gratis-comun";

registrarEntorno();

describe("límites de días al extender (platform.cobros.prueba_gratis_extender)", () => {
  it("rechaza 0 y 61 días y acepta 1 y 60", async () => {
    const e = () => ({
      pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(3))],
      tenantModule: [modCpq(TENANT_DE_PRUEBA, "trial")],
    });
    for (const dias of [0, 61, -1, 1.5]) {
      const { ctx, tabla } = plataforma(e());
      const r = await executeCapability(
        ctx,
        "platform.cobros.prueba_gratis_extender",
        extender(dias),
      );
      expect(r.ok, `dias=${dias}`).toBe(false);
      expect(tabla("pruebaGratis")[0]?.["extensiones"]).toBe(0);
    }
    for (const dias of [1, 60]) {
      const { ctx } = plataforma(e());
      const r = await executeCapability(
        ctx,
        "platform.cobros.prueba_gratis_extender",
        extender(dias),
      );
      expect(r, `dias=${dias}`).toMatchObject({ ok: true, data: { hasta: dia(3 + dias) } });
    }
  });

  it("dos extensiones seguidas se acumulan desde el último día y cuentan 2", async () => {
    const { ctx, tabla } = plataforma({
      pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(3))],
      tenantModule: [modCpq(TENANT_DE_PRUEBA, "trial")],
    });
    await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    const r = await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    expect(r).toMatchObject({
      ok: true,
      data: { hasta: dia(23), extensiones: 2, reactivada: false },
    });
    expect(tabla("pruebaGratis")).toMatchObject([{ extensiones: 2 }]);
  });

  it("el último día todavía está vigente: extender cuenta desde hoy, no reactiva", async () => {
    const { ctx } = plataforma({
      pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(0))],
      tenantModule: [modCpq(TENANT_DE_PRUEBA, "trial")],
    });
    const r = await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    expect(r).toMatchObject({ ok: true, data: { hasta: dia(10), reactivada: false } });
  });

  it("ayer ya terminó: reactivar cuenta desde hoy y marca reactivada", async () => {
    const { ctx } = plataforma({
      pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(-1))],
      tenantModule: [modCpq(TENANT_DE_PRUEBA, "solo_lectura")],
    });
    const r = await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    expect(r).toMatchObject({ ok: true, data: { hasta: dia(10), reactivada: true } });
  });
});

describe("permisos y aislamiento de las lecturas", () => {
  const dosEmpresas = {
    pruebaGratis: [prueba(TENANT_DE_PRUEBA, fecha(3)), prueba(OTRA, fecha(5))],
    tenantModule: [modCpq(TENANT_DE_PRUEBA, "trial"), modCpq(OTRA, "trial")],
  };

  it("platform.cobros.pruebas_gratis_list: owner y support leen; sin rol de plataforma, no", async () => {
    for (const u of [owner, support]) {
      const { ctx } = plataforma(dosEmpresas, u);
      const r = await executeCapability(ctx, "platform.cobros.pruebas_gratis_list", {
        tenantId: TENANT_DE_PRUEBA,
      });
      expect(r, u.platformRole).toMatchObject({ ok: true, data: [{ moduloId: "cpq" }] });
    }
    const { ctx } = plataforma(dosEmpresas, USUARIO_DE_PRUEBA);
    const r = await executeCapability(ctx, "platform.cobros.pruebas_gratis_list", {
      tenantId: TENANT_DE_PRUEBA,
    });
    expect(r.ok).toBe(false);
  });

  it("la lectura de Plataforma solo devuelve la empresa pedida y falla con una inexistente", async () => {
    const { ctx } = plataforma(dosEmpresas);
    const r = await executeCapability(ctx, "platform.cobros.pruebas_gratis_list", {
      tenantId: OTRA,
    });
    expect(r).toMatchObject({ ok: true, data: [{ moduloId: "cpq", diasRestantes: 6 }] });
    const nada = await executeCapability(ctx, "platform.cobros.pruebas_gratis_list", {
      tenantId: "0192f3a0-0000-7000-8000-0000000000ff",
    });
    expect(nada.ok).toBe(false);
  });

  it("core.modules.pruebas no muestra la prueba de otra empresa", async () => {
    // Empresa actual sin prueba propia; la prueba existe solo en OTRA.
    const { ctx } = contextoDePrueba({
      semilla: {
        ...semillaTenant(),
        perfilEmpresa: rut,
        pruebaGratis: [prueba(OTRA, fecha(5))],
        tenantModule: [modCpq(OTRA, "trial")],
      },
    });
    const r = await executeCapability(ctx, "core.modules.pruebas", {});
    if (!r.ok) throw new Error(r.error.message);
    const cpq = modulesPruebas.output.parse(r.data).items.find((i) => i.id === "cpq");
    expect(cpq).toMatchObject({ estado: "disponible", hasta: null });
  });

  it("un rol sin permiso de administrar no puede activar, pero la lectura sigue sin escribir", async () => {
    const { ctx, tabla } = contextoDePrueba({
      rol: "supervisor",
      semilla: { ...semillaTenant(), perfilEmpresa: rut },
    });
    const r = await executeCapability(ctx, "core.modules.probar", { moduloId: "cpq" });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(tabla("pruebaGratis")).toHaveLength(0);
    expect(tabla("tenantModule")).toHaveLength(0);
  });
});
