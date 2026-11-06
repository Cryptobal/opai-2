// CAR-204 contra Postgres real (RLS y FORCE): el catálogo no cruza empresas. Fijar la parte
// finanzas.bancos en X no cambia nada en Y, generar los cargos de X no crea filas en Y, y con
// app.tenant_id de Y no se ven las condiciones ni los cargos de X. El precio de lista es de
// plataforma (sin tenant): dryRun no escribe y la escritura real queda en core.auditoria_global.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

describe.skipIf(!urlPropietario)("catálogo de Plataforma contra Postgres real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  let x = "";
  let y = "";
  let plat = "";
  let soporte = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(
      ["finanzas", "tickets"].map((id) =>
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
    x = (await tenant(`car204-x-${s}`)).id;
    y = (await tenant(`car204-y-${s}`)).id;
    for (const t of [x, y])
      for (const moduloId of ["finanzas", "tickets"])
        await e.admin.tenantModule.create({ data: { tenantId: t, moduloId, estado: "activo" } });
    const user = (nombre: string, platformRole: string) =>
      e.admin.user
        .create({
          data: {
            name: nombre,
            email: `${nombre}-${s}@prueba.cl`,
            emailVerified: true,
            platformRole,
          },
        })
        .then((u) => u.id);
    plat = await user("plat", "owner");
    soporte = await user("soporte", "support");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const persona = (id: string, platformRole: "owner" | "support") =>
    mod.crearContexto({
      tenantId: null,
      actor: { tipo: "user", id },
      rol: null,
      portal: "platform",
      portalesMembresia: [],
      usuario: { id, nombre: platformRole, email: `${platformRole}@prueba.cl`, platformRole },
      medidor: { registrar: async () => undefined },
    });
  const fijar = (t: string, moduloId: string) => ({
    tenantId: t,
    moduloId,
    condicion: { moneda: "CLP", precio: "100000", cobroDesde: "2026-01-01" },
  });

  it("fijar la parte finanzas.bancos en X no cambia nada en Y y los cargos no cruzan", async () => {
    const ctx = persona(plat, "owner");
    expect(
      await mod.executeCapability(
        ctx,
        "platform.cobros.condiciones_set",
        fijar(x, "finanzas.flujo"),
      ),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("Flujo de caja necesita Bancos") },
    });
    for (const parte of ["finanzas.bancos", "finanzas.flujo"])
      expect(
        await mod.executeCapability(ctx, "platform.cobros.condiciones_set", fijar(x, parte)),
      ).toMatchObject({ ok: true });
    expect(
      await mod.executeCapability(ctx, "platform.cobros.condiciones_set", fijar(x, "tickets")),
    ).toMatchObject({
      ok: false,
      error: { message: expect.stringContaining("plan base") },
    });
    expect(await e.admin.cobroCondicion.count({ where: { tenantId: y } })).toBe(0);
    expect(
      (await e.admin.cobroCondicion.findMany({ where: { tenantId: x } }))
        .map((c) => c.moduloId)
        .sort(),
    ).toEqual(["finanzas.bancos", "finanzas.flujo"]);

    const gen = await mod.executeCapability(ctx, "platform.cobros.cargos_generar", {
      periodo: "2026-10",
      tenantId: x,
    });
    expect(gen).toMatchObject({ ok: true, data: { creados: 2 } });
    expect(await e.admin.cobroCargo.count({ where: { tenantId: x } })).toBe(2);
    expect(await e.admin.cobroCargo.count({ where: { tenantId: y } })).toBe(0);
  });

  it("con app.tenant_id de Y no se ven las condiciones ni los cargos de X", async () => {
    const deY = e.forTenant(y);
    expect(await deY.cobroCondicion.count()).toBe(0);
    expect(await deY.cobroCargo.count()).toBe(0);
    const deX = e.forTenant(x);
    expect(await deX.cobroCondicion.count()).toBe(2);
    expect(await deX.cobroCargo.count()).toBe(2);
  });

  it("el precio de lista: dryRun no escribe; la real queda auditada con antes y después; support solo lee", async () => {
    const ctx = persona(plat, "owner");
    const entrada = {
      moduloId: "finanzas.bancos",
      precio: { moneda: "UF", forma: "fijo", precio: "2,5" },
    };
    const antes = await e.admin.ajustePlataforma.findFirst({
      where: { modulo: "catalogo", clave: "finanzas.bancos" },
    });
    await mod.executeCapability(ctx, "platform.catalogo.precio_set", entrada, { dryRun: true });
    expect(
      await e.admin.ajustePlataforma.findFirst({
        where: { modulo: "catalogo", clave: "finanzas.bancos" },
      }),
    ).toEqual(antes);
    expect(await mod.executeCapability(ctx, "platform.catalogo.precio_set", entrada)).toMatchObject(
      {
        ok: true,
        data: { despues: { version: (antes?.version ?? 0) + 1 } },
      },
    );
    await mod.executeCapability(ctx, "platform.catalogo.precio_set", {
      ...entrada,
      precio: { ...entrada.precio, precio: "3" },
    });
    const auditoria = await e.admin.auditoriaGlobal.findMany({
      where: { capability: "platform.catalogo.precio_set", actorId: plat },
      orderBy: { createdAt: "asc" },
    });
    expect(auditoria.length).toBeGreaterThanOrEqual(2);
    expect(auditoria.at(-1)).toMatchObject({
      ambito: "plataforma",
      antes: { precio: { precio: 25_000 } },
      despues: { precio: { precio: 30_000 } },
    });
    // Cambiar el precio de lista no toca las condiciones ni los cargos de las empresas.
    expect(await e.admin.cobroCondicion.count({ where: { tenantId: x } })).toBe(2);
    expect(
      (
        await e.admin.cobroCondicion.findFirst({
          where: { tenantId: x, moduloId: "finanzas.bancos" },
        })
      )?.precioMensual,
    ).toBe(100_000);

    const lectura = persona(soporte, "support");
    expect(await mod.executeCapability(lectura, "platform.catalogo.list", {})).toMatchObject({
      ok: true,
    });
    expect(
      await mod.executeCapability(lectura, "platform.catalogo.precio_set", entrada),
    ).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });
});
