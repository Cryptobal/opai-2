// CAR-393 parte 2: la ausencia es un registro de la persona que no depende de la pauta. Empresa qa-*, datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string } };

describe.skipIf(omitirSuiteDb())("Personas · ausencias sin pauta (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let otro = "";
  let persona = "";
  const ctx = (tenantId: string, rol: "owner" | "viewer" = "owner") =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const run = async (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    (await mod.executeCapability(c, id, input, o)) as R;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    const t = async (n: string) =>
      (
        await e.admin.tenant.create({
          data: { slug: `qa-${n}-${randomUUID().slice(0, 8)}`, nombre: n, vertical: "aseo" },
        })
      ).id;
    tenant = await t("c393");
    otro = await t("c393b");
    persona = (
      await e.admin.persona.create({
        data: {
          tenantId: tenant,
          nombres: "Admin",
          apellidos: "Ficticia",
          rut: "11111111-1",
          estado: "activa",
        },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("sin el módulo Pauta y sin turnos, la ausencia se registra, se lista y se anula", async () => {
    const vista = await run(
      ctx(tenant),
      "core.ausencias.registrar",
      {
        personaId: persona,
        tipo: "vacaciones",
        motivo: "Vacaciones",
        desde: "2026-12-21",
        hasta: "2026-12-31",
      },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, data: { ausenciaId: null, dias: 0 } });
    const r = await run(ctx(tenant), "core.ausencias.registrar", {
      personaId: persona,
      tipo: "vacaciones",
      motivo: "Vacaciones",
      desde: "2026-12-21",
      hasta: "2026-12-31",
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const id = r.data?.["ausenciaId"] as string;
    expect(await e.admin.ausencia.findUnique({ where: { id } })).toMatchObject({
      estado: "aprobada",
      personaId: persona,
    });
    const lista = await run(ctx(tenant), "core.ausencias.listar", { personaId: persona });
    expect(lista.data?.["grupos"]).toEqual([
      expect.objectContaining({
        ausenciaId: id,
        desde: "2026-12-21",
        hasta: "2026-12-31",
        dias: 0,
        estado: "activa",
      }),
    ]);
    expect(
      await run(ctx(tenant), "core.ausencias.anular", {
        personaId: persona,
        ausenciaId: id,
      }),
    ).toMatchObject({ ok: true, data: { turnosLiberados: 0 } });
    expect((await e.admin.ausencia.findUnique({ where: { id } }))?.estado).toBe("anulada");
    expect(
      (
        await run(ctx(tenant), "core.ausencias.anular", {
          personaId: persona,
          ausenciaId: id,
        })
      ).ok,
    ).toBe(false);
  });

  it("otra empresa no ve ni registra ausencias de la persona", async () => {
    expect(
      (await run(ctx(otro), "core.ausencias.listar", { personaId: persona })).error?.code,
    ).toBe("NOT_FOUND");
    expect(
      (
        await run(ctx(otro), "core.ausencias.registrar", {
          personaId: persona,
          tipo: "permiso",
          motivo: "Trámite",
          desde: "2026-12-01",
        })
      ).ok,
    ).toBe(false);
  });

  it("sin el permiso laboral no se registra; una ausencia de otra persona no se anula", async () => {
    const entrada = { personaId: persona, tipo: "permiso", motivo: "Trámite", desde: "2026-12-02" };
    expect(
      (await run(ctx(tenant, "viewer"), "core.ausencias.registrar", entrada)).error?.code,
    ).toBe("FORBIDDEN");
    const r = await run(ctx(tenant), "core.ausencias.registrar", entrada);
    const otra = (
      await e.admin.persona.create({
        data: {
          tenantId: tenant,
          nombres: "Otra",
          apellidos: "Ficticia",
          rut: "22222222-2",
          estado: "activa",
        },
      })
    ).id;
    const anular = await run(ctx(tenant), "core.ausencias.anular", {
      personaId: otra,
      ausenciaId: r.data?.["ausenciaId"],
    });
    expect(anular.error?.code).toBe("NOT_FOUND");
  });
});
