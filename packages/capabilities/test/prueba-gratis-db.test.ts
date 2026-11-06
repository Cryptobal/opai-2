// CAR-222 contra Postgres real (RLS y FORCE): la prueba gratis de una empresa no se ve ni se toca desde
// otra, la unicidad (empresa, módulo) es la regla «una sola vez» y extender o vencer la de A no cambia
// a B. Aplica la migración 20261111090000_core_pruebas_gratis.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const hoyStr = () => new Date().toISOString().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("prueba gratis entre empresas", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  let a = "";
  let b = "";
  let plat = "";
  let userA = "";
  let userB = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(
      ["cpq", "finanzas"].map((id) =>
        mod.defineModule({
          id,
          nombre: id,
          version: "0.1.0",
          dependencias: [],
          permisos: [],
          navegacion: [],
          configuracion: z.object({}),
          eventos: [],
          capacidades: [],
        }),
      ),
    );
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    a = (await tenant(`car222-a-${s}`)).id;
    b = (await tenant(`car222-b-${s}`)).id;
    const user = (nombre: string, platformRole?: string) =>
      e.admin.user
        .create({
          data: {
            name: nombre,
            email: `${nombre}-${s}@prueba.cl`,
            emailVerified: true,
            ...(platformRole ? { platformRole } : {}),
          },
        })
        .then((u) => u.id);
    plat = await user("plat", "owner");
    userA = await user("admin-a");
    userB = await user("admin-b");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const empresa = (tenantId: string, userId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userId },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: {
        id: userId,
        nombre: "admin",
        email: `admin-${userId}@prueba.cl`,
        platformRole: null,
      },
      medidor: { registrar: async () => undefined },
    });
  const persona = () =>
    mod.crearContexto({
      tenantId: null,
      actor: { tipo: "user", id: plat },
      rol: null,
      portal: "platform",
      portalesMembresia: [],
      usuario: { id: plat, nombre: "plat", email: `plat-${s}@prueba.cl`, platformRole: "owner" },
      medidor: { registrar: async () => undefined },
    });

  it("cada empresa activa su prueba una sola vez y no ve la de la otra", async () => {
    const ctxA = empresa(a, userA);
    const r = await mod.executeCapability(ctxA, "core.modules.probar", { moduloId: "cpq" });
    expect(r).toMatchObject({ ok: true, data: { hasta: enDias(9) } });
    expect(
      await mod.executeCapability(ctxA, "core.modules.probar", { moduloId: "cpq" }),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("ya se usó") },
    });
    expect(await e.admin.pruebaGratis.count({ where: { tenantId: b } })).toBe(0);
    // B puede activar la suya: la unicidad es por empresa.
    expect(
      await mod.executeCapability(empresa(b, userB), "core.modules.probar", { moduloId: "cpq" }),
    ).toMatchObject({ ok: true });
    expect(
      (await e.admin.tenantModule.findFirst({ where: { tenantId: a, moduloId: "cpq" } }))?.estado,
    ).toBe("trial");
    // Sin precios ni cargos.
    expect(await e.admin.cobroCondicion.count({ where: { tenantId: { in: [a, b] } } })).toBe(0);
    expect(await e.admin.cobroCargo.count({ where: { tenantId: { in: [a, b] } } })).toBe(0);
  });

  it("con app.tenant_id de B no se ve la prueba de A", async () => {
    expect(await e.forTenant(b).pruebaGratis.count()).toBe(1);
    expect(await e.forTenant(b).pruebaGratis.count({ where: { tenantId: a } })).toBe(0);
    expect(await e.forTenant(a).pruebaGratis.count()).toBe(1);
  });

  it("extender la de A no toca la de B, y Plataforma reactiva una terminada", async () => {
    await e.admin.pruebaGratis.updateMany({
      where: { tenantId: a },
      data: {
        inicio: new Date(`${enDias(-12)}T00:00:00Z`),
        hasta: new Date(`${enDias(-3)}T00:00:00Z`),
        cerradaEn: new Date(),
      },
    });
    await e.admin.tenantModule.updateMany({
      where: { tenantId: a, moduloId: "cpq" },
      data: { estado: "solo_lectura" },
    });
    const antesB = await e.admin.pruebaGratis.findFirst({ where: { tenantId: b } });
    const r = await mod.executeCapability(persona(), "platform.cobros.prueba_gratis_extender", {
      tenantId: a,
      moduloId: "cpq",
      dias: 5,
    });
    expect(r).toMatchObject({
      ok: true,
      data: { reactivada: true, hasta: enDias(5), estadoModulo: "trial" },
    });
    expect(
      (await e.admin.tenantModule.findFirst({ where: { tenantId: a, moduloId: "cpq" } }))?.estado,
    ).toBe("trial");
    expect(
      (await e.admin.pruebaGratis.findFirst({ where: { tenantId: a } }))?.cerradaEn,
    ).toBeNull();
    expect(await e.admin.pruebaGratis.findFirst({ where: { tenantId: b } })).toEqual(antesB);
  });

  it("el trabajo diario cierra solo la vencida de su empresa", async () => {
    const { trabajoPruebasGratis } = await import("../src/core/pruebas-gratis");
    await e.admin.pruebaGratis.updateMany({
      where: { tenantId: a },
      data: {
        inicio: new Date(`${enDias(-12)}T00:00:00Z`),
        hasta: new Date(`${enDias(-1)}T00:00:00Z`),
      },
    });
    const ctxA = mod.crearContexto({
      tenantId: a,
      actor: { tipo: "system" },
      rol: null,
      portal: "erp",
      portalesMembresia: [],
      medidor: { registrar: async () => undefined },
    });
    expect(await trabajoPruebasGratis.ejecutar(ctxA, { dia: hoyStr() })).toMatchObject({
      cerradas: ["cpq"],
    });
    expect(
      (await e.admin.tenantModule.findFirst({ where: { tenantId: a, moduloId: "cpq" } }))?.estado,
    ).toBe("solo_lectura");
    expect(
      (await e.admin.tenantModule.findFirst({ where: { tenantId: b, moduloId: "cpq" } }))?.estado,
    ).toBe("trial");
    expect(
      (await e.admin.pruebaGratis.findFirst({ where: { tenantId: b } }))?.cerradaEn,
    ).toBeNull();
  });
});
