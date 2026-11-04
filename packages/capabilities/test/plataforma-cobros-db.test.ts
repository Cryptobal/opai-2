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
      mod.defineModule({
        id: "rendiciones",
        nombre: "Rendiciones",
        version: "0.1.0",
        dependencias: [],
        permisos: [],
        navegacion: [],
        configuracion: z.object({}),
        eventos: [],
        capacidades: [],
      }),
    ]);
    const tenant = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    x = (await tenant(`car188-x-${s}`)).id;
    y = (await tenant(`car188-y-${s}`)).id;
    for (const t of [x, y])
      await e.admin.tenantModule.create({
        data: { tenantId: t, moduloId: "rendiciones", estado: "activo" },
      });
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
      condicion: { moneda: "CLP", precioMensual: "150000", cobroDesde: "2026-01-01" },
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
});
