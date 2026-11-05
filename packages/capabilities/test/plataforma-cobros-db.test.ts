// CAR-188 contra Postgres real (RLS y FORCE): las condiciones y los cargos de una empresa nunca se
// leen ni se tocan desde otra. Un owner de plataforma fija una condición en X y genera octubre en X;
// la empresa Y no la ve en su resumen ni en sus cargos, y anular un cargo de X pidiendo Y da
// NOT_FOUND. Además, generar dos veces el mismo mes deja un solo cargo (índice único parcial).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { platformCobrosResumen } from "../src/core/plataforma/cobros/resumen";

type Resumen = z.output<typeof platformCobrosResumen.output>;

describe.skipIf(!urlPropietario)("cobro por módulo entre empresas", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  let x = "";
  let y = "";
  let plat = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos([
      ...["rendiciones", "crm"].map((id) =>
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
    ]);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    x = (await tenant(`car188-x-${s}`)).id;
    y = (await tenant(`car188-y-${s}`)).id;
    for (const t of [x, y])
      for (const moduloId of ["rendiciones", "crm"])
        await e.admin.tenantModule.create({ data: { tenantId: t, moduloId, estado: "activo" } });
    plat = (
      await e.admin.user.create({
        data: {
          name: "plat",
          email: `plat-${s}@prueba.cl`,
          emailVerified: true,
          platformRole: "owner",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
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

  it("lo de una empresa no se ve ni se anula desde otra, y generar dos veces no duplica", async () => {
    const ctx = persona();
    const fijar = await mod.executeCapability(ctx, "platform.cobros.condiciones_set", {
      tenantId: x,
      moduloId: "rendiciones",
      condicion: { moneda: "CLP", precio: "150000", cobroDesde: "2026-01-01" },
    });
    expect(fijar).toMatchObject({ ok: true });
    const gen = { periodo: "2026-10", tenantId: x };
    expect(await mod.executeCapability(ctx, "platform.cobros.cargos_generar", gen)).toMatchObject({
      ok: true,
      data: { creados: 1, montoClp: 150_000 },
    });
    expect(await mod.executeCapability(ctx, "platform.cobros.cargos_generar", gen)).toMatchObject({
      data: { creados: 0 },
    });
    const filas = await e.admin.cobroCargo.findMany({ where: { tenantId: x } });
    expect(filas).toHaveLength(1);

    const deY = await mod.executeCapability(ctx, "platform.cobros.resumen", {
      periodo: "2026-10",
      tenantId: y,
    });
    if (!deY.ok) throw new Error(deY.error.message);
    expect(
      (deY.data as Resumen).empresas[0]?.modulos.find((m) => m.moduloId === "rendiciones"),
    ).toMatchObject({
      condicion: null,
      cargo: null,
      calculo: { facturable: false, motivo: "sin_condicion" },
    });
    expect(
      await mod.executeCapability(ctx, "platform.cobros.cargos_list", { tenantId: y }),
    ).toMatchObject({ ok: true, data: [] });
    const cruzado = await mod.executeCapability(ctx, "platform.cobros.cargo_anular", {
      tenantId: y,
      cargoId: filas[0]?.id,
      motivo: "intento cruzado",
    });
    expect(cruzado).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await e.admin.cobroCargo.count({ where: { tenantId: x, estado: "listo" } })).toBe(1);
  });

  it("el conteo de unidades de una empresa no incluye usuarios, trabajadores ni instalaciones de otra", async () => {
    const ctx = persona();
    // X: 3 usuarios, 2 trabajadores, 2 instalaciones activas. Y: 1, 1 y 1.
    const poblar = async (
      t: string,
      usuarios: number,
      trabajadores: number,
      instalaciones: number,
    ) => {
      for (let i = 0; i < usuarios; i++) {
        const u = await e.admin.user.create({
          data: {
            name: `u${i}`,
            email: `u${i}-${t}@prueba.cl`,
            emailVerified: true,
          },
        });
        await e.admin.membership.create({
          data: { tenantId: t, userId: u.id, rol: "viewer", portales: ["erp"], estado: "activa" },
        });
      }
      const cargo = await e.admin.cargo.create({ data: { tenantId: t, nombre: "Guardia" } });
      for (let i = 0; i < trabajadores; i++) {
        const p = await e.admin.persona.create({
          data: { tenantId: t, nombres: `P${i}`, apellidos: "Prueba", rut: `1${i}.000.000-${i}` },
        });
        await e.admin.vinculoLaboral.create({
          data: {
            tenantId: t,
            personaId: p.id,
            cargoId: cargo.id,
            tipo: "indefinido",
            inicio: new Date("2026-01-05"),
          },
        });
      }
      const cuenta = await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cuenta" } });
      for (let i = 0; i < instalaciones; i++)
        await e.admin.instalacion.create({
          data: { tenantId: t, cuentaId: cuenta.id, nombre: `I${i}`, estado: "activa" },
        });
    };
    await poblar(x, 3, 2, 2);
    await poblar(y, 1, 1, 1);
    const unidades = {
      base: "usuario_activo",
      rendiciones: "trabajador_activo",
      crm: "instalacion_activa",
    };
    for (const t of [x, y])
      for (const [moduloId, unidad] of Object.entries(unidades)) {
        const r = await mod.executeCapability(ctx, "platform.cobros.condiciones_set", {
          tenantId: t,
          moduloId,
          condicion: { forma: "por_unidad", unidad, precio: "1", cobroDesde: "2026-01-01" },
        });
        expect(r).toMatchObject({ ok: true });
      }
    const cantidades = async (t: string) => {
      const r = await mod.executeCapability(ctx, "platform.cobros.resumen", {
        periodo: "2026-10",
        tenantId: t,
      });
      if (!r.ok) throw new Error(r.error.message);
      const filas = (r.data as Resumen).empresas[0]?.modulos ?? [];
      return Object.fromEntries(
        Object.keys(unidades).map((m) => [
          m,
          filas.find((f) => f.moduloId === m)?.calculo.cantidad,
        ]),
      );
    };
    expect(await cantidades(x)).toEqual({ base: 3, rendiciones: 2, crm: 2 });
    expect(await cantidades(y)).toEqual({ base: 1, rendiciones: 1, crm: 1 });
  });
});
