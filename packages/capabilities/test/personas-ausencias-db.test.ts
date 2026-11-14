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
    expect(lista.data?.["siguiente"]).toBeNull();
    expect(lista.data?.["items"]).toEqual([
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

  it("la lista pagina con cursor sin repetir ni saltar registros (CAR-353)", async () => {
    for (const desde of ["2027-01-05", "2027-01-12"])
      expect(
        (
          await run(ctx(tenant), "core.ausencias.registrar", {
            personaId: persona,
            tipo: "permiso",
            motivo: "Trámite",
            desde,
          })
        ).ok,
      ).toBe(true);
    const vistos: string[] = [];
    let cursor: string | undefined;
    for (let i = 0; i < 10; i++) {
      const p = await run(ctx(tenant), "core.ausencias.listar", {
        personaId: persona,
        limite: 1,
        ...(cursor ? { cursor } : {}),
      });
      const items = p.data?.["items"] as { ausenciaId: string }[];
      vistos.push(...items.map((x) => x.ausenciaId));
      cursor = (p.data?.["siguiente"] as string | null) ?? undefined;
      if (!cursor) break;
    }
    const todos = await e.admin.ausencia.findMany({
      where: { personaId: persona, estado: { in: ["aprobada", "anulada"] } },
    });
    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos.length).toBe(todos.length);
  });

  it("la clase se valida contra el catálogo de la vertical y se guarda con su nombre (CAR-393)", async () => {
    const clases = await run(ctx(tenant), "core.ausencias.clases", {});
    const items = clases.data?.["items"] as { nombre: string; tipo: string }[];
    expect(items).toContainEqual({ nombre: "Feriado legal", tipo: "vacaciones" });
    const base = {
      personaId: persona,
      tipo: "vacaciones",
      motivo: "Feriado anual",
      desde: "2027-02-01",
      hasta: "2027-02-05",
    };
    const mal = await run(ctx(tenant), "core.ausencias.registrar", {
      ...base,
      clase: "Con goce de sueldo",
    });
    expect(mal.error?.code).toBe("UNPROCESSABLE");
    const r = await run(ctx(tenant), "core.ausencias.registrar", {
      ...base,
      clase: "feriado legal",
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const lista = await run(ctx(tenant), "core.ausencias.listar", {
      personaId: persona,
      limite: 100,
    });
    const g = (lista.data?.["items"] as { ausenciaId: string; clase: string | null }[]).find(
      (x) => x.ausenciaId === r.data?.["ausenciaId"],
    );
    expect(g?.clase).toBe("Feriado legal");
  });

  it("al anonimizar a la persona, el motivo de sus ausencias se reemplaza y el resto queda (CAR-393)", async () => {
    const otra = (
      await e.admin.persona.create({
        data: {
          tenantId: tenant,
          nombres: "Otra",
          apellidos: "Ficticia",
          rut: "17777777-7",
          estado: "activa",
        },
      })
    ).id;
    const r = await run(ctx(tenant), "core.ausencias.registrar", {
      personaId: otra,
      tipo: "licencia",
      clase: "Enfermedad común",
      motivo: "Folio ficticio 999",
      desde: "2027-03-01",
      hasta: "2027-03-03",
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    // El motivo nunca llega en claro a la auditoría inmutable.
    const auditoria = await e.admin.auditEvent.findMany({
      where: { tenantId: tenant, capability: "core.ausencias.registrar" },
      select: { payload: true },
    });
    expect(auditoria.length).toBeGreaterThan(0);
    expect(JSON.stringify(auditoria)).not.toContain("Folio ficticio 999");
    // Una ausencia de otra empresa, con el mismo motivo, no se toca al anonimizar.
    const ajena = (
      await e.admin.persona.create({
        data: {
          tenantId: otro,
          nombres: "Ajena",
          apellidos: "Ficticia",
          rut: "17777777-7",
          estado: "activa",
        },
      })
    ).id;
    const rAjena = await run(ctx(otro), "core.ausencias.registrar", {
      personaId: ajena,
      tipo: "licencia",
      motivo: "Folio ficticio 999",
      desde: "2027-03-01",
      hasta: "2027-03-03",
    });
    expect(rAjena.ok, JSON.stringify(rAjena)).toBe(true);
    const { anonimizarPersona, MARCA_ANONIMO } =
      await import("../src/core/cumplimiento/retencion-anonimizar");
    const hecho = await ctx(tenant).transaccion((tx) =>
      anonimizarPersona(tx, otra, new Date(), null),
    );
    expect(hecho).toBe(true);
    const fila = await e.admin.ausencia.findFirst({ where: { personaId: otra } });
    expect(fila).toMatchObject({
      motivo: MARCA_ANONIMO,
      tipo: "licencia",
      clase: "Enfermedad común",
    });
    // La ausencia de otra persona no cambia.
    const ajenas = await e.admin.ausencia.findMany({
      where: { personaId: persona },
      select: { motivo: true },
    });
    expect(ajenas.length).toBeGreaterThan(0);
    expect(ajenas.every((a) => a.motivo !== MARCA_ANONIMO)).toBe(true);
    const deOtraEmpresa = await e.admin.ausencia.findFirst({ where: { personaId: ajena } });
    expect(deOtraEmpresa?.motivo).toBe("Folio ficticio 999");
  });
});
