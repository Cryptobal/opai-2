// CAR-222 · Prueba gratis por empresa: la activa la empresa una vez, dura 10 días, se desactiva sola;
// Plataforma la extiende o reactiva. No crea precios ni cargos. La RLS real va en prueba-gratis-db.
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { capacidadesDelNucleo } from "../src/core";
import { trabajoPruebasGratis } from "../src/core/pruebas-gratis";
import { executeCapability } from "../src/execute";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, TENANT_DE_PRUEBA, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const support = { ...USUARIO_DE_PRUEBA, platformRole: "support" as const };
const hoyStr = () => new Date().toISOString().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const modulo = (id: string) =>
  defineModule({
    id,
    nombre: id,
    version: "0.1.0",
    dependencias: [],
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

beforeEach(() => {
  limpiarRegistro();
  limpiarModulos();
  registrarCapacidades(capacidadesDelNucleo);
  registrarModulos([modulo("cpq"), modulo("finanzas"), modulo("tickets")]);
});

const contexto = (extra: Record<string, unknown[]> = {}, opts: Record<string, unknown> = {}) =>
  contextoDePrueba({ semilla: { ...semillaTenant(), ...extra }, ...opts });
const probar = (moduloId: string) => ({ moduloId });
const mod = (moduloId: string, estado: string) => ({
  id: `m-${moduloId}`,
  tenantId: TENANT_DE_PRUEBA,
  moduloId,
  estado,
});

describe("core.modules.probar", () => {
  it("la vista previa no escribe; la real crea la prueba de 10 días y pone el módulo en prueba", async () => {
    const { ctx, tabla } = contexto();
    const previa = await executeCapability(ctx, "core.modules.probar", probar("cpq"), {
      dryRun: true,
    });
    expect(previa).toMatchObject({ ok: true, data: { dias: 10, hasta: enDias(9) } });
    expect(tabla("pruebaGratis")).toHaveLength(0);
    const r = await executeCapability(ctx, "core.modules.probar", probar("cpq"));
    expect(r).toMatchObject({ ok: true, data: { moduloId: "cpq", inicio: hoyStr() } });
    expect(tabla("pruebaGratis")).toMatchObject([{ moduloId: "cpq" }]);
    expect(tabla("tenantModule")).toMatchObject([{ moduloId: "cpq", estado: "trial" }]);
    // Sin precios ni cargos: la prueba gratis no es una condición de cobro.
    expect(tabla("cobroCondicion")).toHaveLength(0);
    expect(tabla("cobroCargo")).toHaveLength(0);
  });

  it("solo una vez por módulo, aunque la prueba ya terminó", async () => {
    const { ctx } = contexto();
    await executeCapability(ctx, "core.modules.probar", probar("cpq"));
    expect(await executeCapability(ctx, "core.modules.probar", probar("cpq"))).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("ya se usó") },
    });
  });

  it("rechaza lo incluido en el plan base, el plan base, lo desconocido y un módulo ya contratado", async () => {
    const { ctx } = contexto({ tenantModule: [mod("cpq", "activo")] });
    const msg = (id: string) =>
      executeCapability(ctx, "core.modules.probar", probar(id)).then((r) =>
        r.ok ? "" : r.error.message,
      );
    expect(await msg("tickets")).toContain("plan base");
    expect(await msg("base")).toContain("plan base");
    expect(await msg("nada")).toContain("nada");
    expect(await msg("cpq")).toBe("CPQ ya está activo.");
  });

  it("una parte de Finanzas se prueba sin Finanzas contratado y valida sus dependencias", async () => {
    const { ctx, tabla } = contexto();
    expect(
      await executeCapability(ctx, "core.modules.probar", probar("finanzas.flujo")),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("Flujo de caja necesita Bancos") },
    });
    expect(
      await executeCapability(ctx, "core.modules.probar", probar("finanzas.bancos")),
    ).toMatchObject({ ok: true });
    expect(tabla("tenantModule")).toMatchObject([{ moduloId: "finanzas", estado: "trial" }]);
    expect(
      await executeCapability(ctx, "core.modules.probar", probar("finanzas.flujo")),
    ).toMatchObject({ ok: true });
    expect(tabla("pruebaGratis")).toHaveLength(2);
  });

  it("con Finanzas ya activo no hace falta probar una parte", async () => {
    const { ctx } = contexto({ tenantModule: [mod("finanzas", "activo")] });
    expect(
      await executeCapability(ctx, "core.modules.probar", probar("finanzas.bancos")),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("incluye todas") },
    });
  });

  it("exige el permiso de administrar la empresa", async () => {
    const { ctx } = contexto({}, { rol: "supervisor" });
    expect(await executeCapability(ctx, "core.modules.probar", probar("cpq"))).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("platform.cobros.prueba_gratis_extender", () => {
  const prueba = (hasta: string, estado = "trial", extensiones = 0) => ({
    pruebaGratis: [
      {
        id: "p1",
        tenantId: TENANT_DE_PRUEBA,
        moduloId: "cpq",
        inicio: new Date(`${enDias(-12)}T00:00:00Z`),
        hasta: new Date(`${hasta}T00:00:00Z`),
        extensiones,
        cerradaEn: null,
      },
    ],
    tenantModule: [mod("cpq", estado)],
  });
  const plataforma = (
    extra: Record<string, unknown[]>,
    usuario: typeof owner | typeof support = owner,
  ) => {
    const s = semillaTenant();
    return contextoDePrueba({
      usuario,
      conTenant: false,
      rol: null,
      semilla: {
        ...s,
        user: s.user.map((u) => (u.id === owner.id ? { ...u, platformRole: "owner" } : u)),
        ...extra,
      },
    });
  };
  const extender = (dias?: number) => ({
    tenantId: TENANT_DE_PRUEBA,
    moduloId: "cpq",
    ...(dias ? { dias } : {}),
  });

  it("extiende desde el último día si sigue vigente; la vista previa no escribe", async () => {
    const { ctx, tabla } = plataforma(prueba(enDias(3)));
    const previa = await executeCapability(
      ctx,
      "platform.cobros.prueba_gratis_extender",
      extender(),
      { dryRun: true },
    );
    expect(previa).toMatchObject({ ok: true, data: { hasta: enDias(13), reactivada: false } });
    expect(tabla("pruebaGratis")[0]?.["extensiones"]).toBe(0);
    await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender());
    expect(tabla("pruebaGratis")).toMatchObject([{ extensiones: 1, cerradaEn: null }]);
  });

  it("reactiva una prueba terminada desde hoy y devuelve el módulo a «en prueba»", async () => {
    const { ctx, tabla } = plataforma(prueba(enDias(-2), "solo_lectura"));
    const r = await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender(5));
    expect(r).toMatchObject({ ok: true, data: { hasta: enDias(5), reactivada: true } });
    expect(tabla("tenantModule")).toMatchObject([{ moduloId: "cpq", estado: "trial" }]);
  });

  it("no extiende lo que la empresa no activó, un módulo suspendido ni uno activo", async () => {
    const sin = plataforma({});
    expect(
      await executeCapability(sin.ctx, "platform.cobros.prueba_gratis_extender", extender()),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("no ha activado") },
    });
    for (const estado of ["suspendido", "activo"]) {
      const c = plataforma(prueba(enDias(1), estado));
      expect(
        await executeCapability(c.ctx, "platform.cobros.prueba_gratis_extender", extender()),
      ).toMatchObject({ ok: false });
    }
  });

  it("support no puede extender", async () => {
    const { ctx } = plataforma(prueba(enDias(3)), support);
    expect(
      await executeCapability(ctx, "platform.cobros.prueba_gratis_extender", extender()),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});

describe("trabajo core.pruebas_gratis.cerrar", () => {
  const fila = (moduloId: string, hasta: string) => ({
    id: `p-${moduloId}`,
    tenantId: TENANT_DE_PRUEBA,
    moduloId,
    inicio: new Date(`${enDias(-12)}T00:00:00Z`),
    hasta: new Date(`${hasta}T00:00:00Z`),
    extensiones: 0,
    cerradaEn: null,
  });

  it("al vencer deja el módulo en solo lectura y no vuelve a cerrar", async () => {
    const { ctx, tabla } = contexto({
      pruebaGratis: [fila("cpq", enDias(-1))],
      tenantModule: [mod("cpq", "trial")],
    });
    expect(await trabajoPruebasGratis.ejecutar(ctx, { dia: hoyStr() })).toMatchObject({
      cerradas: ["cpq"],
    });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "solo_lectura" }]);
    expect(tabla("pruebaGratis")[0]?.["cerradaEn"]).toBeTruthy();
    expect(await trabajoPruebasGratis.ejecutar(ctx, { dia: hoyStr() })).toMatchObject({
      cerradas: [],
    });
  });

  it("el último día todavía vale", async () => {
    const { ctx, tabla } = contexto({
      pruebaGratis: [fila("cpq", hoyStr())],
      tenantModule: [mod("cpq", "trial")],
    });
    expect(await trabajoPruebasGratis.ejecutar(ctx, { dia: hoyStr() })).toMatchObject({
      cerradas: [],
    });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "trial" }]);
  });

  it("no toca un módulo que Plataforma ya empezó a cobrar", async () => {
    const { ctx, tabla } = contexto({
      pruebaGratis: [fila("cpq", enDias(-1))],
      tenantModule: [mod("cpq", "trial")],
      cobroCondicion: [
        {
          id: "c1",
          tenantId: TENANT_DE_PRUEBA,
          moduloId: "cpq",
          moneda: "UF",
          forma: "fijo",
          precioMensual: 25_000,
        },
      ],
    });
    await trabajoPruebasGratis.ejecutar(ctx, { dia: hoyStr() });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "trial" }]);
  });

  it("Finanzas sigue en prueba mientras otra parte tenga la suya vigente", async () => {
    const { ctx, tabla } = contexto({
      pruebaGratis: [fila("finanzas.bancos", enDias(-1)), fila("finanzas.ventas", enDias(4))],
      tenantModule: [mod("finanzas", "trial")],
    });
    await trabajoPruebasGratis.ejecutar(ctx, { dia: hoyStr() });
    expect(tabla("tenantModule")).toMatchObject([{ estado: "trial" }]);
  });
});
