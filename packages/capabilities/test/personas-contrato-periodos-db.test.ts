// CAR-409: períodos del contrato como historia del vínculo, con Postgres real y rol sin BYPASSRLS. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
type Contrato = {
  periodos: { id: string; tipo: string; numero: number | null; termino: string | null }[];
  periodoVigente: number | null;
  terminoVigente: string | null;
  indefinidoDesde: string | null;
};

describe.skipIf(omitirSuiteDb())("Personas · períodos del contrato CAR-409 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const tenants: string[] = [];
  const personas: string[] = [];
  const vinculos: string[] = [];
  const uid = randomUUID();
  const ejecutar = async (t: number, id: string, input: Record<string, unknown>, dryRun = false) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenants[t]!,
        actor: { tipo: "user", id: uid },
        usuario: {
          id: uid,
          nombre: "RRHH",
          email: `${uid.slice(0, 6)}@c409.test`,
          platformRole: null,
        },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        modulosActivos: [],
        medidor: { registrar: async () => undefined },
      }),
      id,
      input,
      { dryRun },
    )) as R;
  const registrar = (t: number, input: Record<string, unknown>, dryRun = false) =>
    ejecutar(t, "core.personas.periodos_registrar", { id: personas[t], ...input }, dryRun);
  const vinculoTipo = async (t: number) =>
    (await e.admin.vinculoLaboral.findUniqueOrThrow({ where: { id: vinculos[t]! } })).tipo;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    await e.admin.user.create({
      data: { id: uid, name: "RRHH", email: `${uid.slice(0, 8)}@c409.test` },
    });
    for (const [i, rut] of ["16666666-6", "15555555-5"].entries()) {
      const tenantId = (
        await e.admin.tenant.create({
          data: {
            slug: `qa-c409-${i}-${randomUUID().slice(0, 6)}`,
            nombre: "c409",
            vertical: "seguridad",
          },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId, userId: uid, rol: "owner", portales: ["erp"] },
      });
      const personaId = (
        await e.admin.persona.create({
          data: { tenantId, nombres: "Ana", apellidos: "Ficticia", rut, estado: "activa" },
        })
      ).id;
      const cargoId = (await e.admin.cargo.create({ data: { tenantId, nombre: "Guardia" } })).id;
      const v = await e.admin.vinculoLaboral.create({
        data: { tenantId, personaId, cargoId, tipo: "plazo_fijo", inicio: new Date("2026-01-01") },
      });
      tenants.push(tenantId);
      personas.push(personaId);
      vinculos.push(v.id);
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("registra tres plazos fijos, calcula el vigente y deja quién lo registró", async () => {
    const dry = await registrar(
      0,
      { tipo: "plazo_fijo", inicio: "2026-01-01", termino: "2026-03-31" },
      true,
    );
    expect(dry.ok, JSON.stringify(dry)).toBe(true);
    expect(await e.admin.contratoPeriodo.count({ where: { tenantId: tenants[0]! } })).toBe(0);
    for (const [inicio, termino] of [
      ["2026-01-01", "2026-03-31"],
      ["2026-04-01", "2026-06-30"],
      ["2026-07-01", "2026-12-31"],
    ]) {
      const r = await registrar(0, { tipo: "plazo_fijo", inicio, termino });
      expect(r.ok, JSON.stringify(r)).toBe(true);
    }
    const v = await ejecutar(0, "core.personas.laboral_ver", { id: personas[0] });
    const c = (v.data as { contrato: Contrato }).contrato;
    expect(c.periodos.map((p) => p.numero)).toEqual([1, 2, 3]);
    expect(c).toMatchObject({
      periodoVigente: 3,
      terminoVigente: "2026-12-31",
      indefinidoDesde: null,
    });
    const fila = await e.admin.contratoPeriodo.findFirstOrThrow({
      where: { vinculoId: vinculos[0]! },
    });
    expect(fila.registradoPorId).toBe(uid);
  });

  it("rechaza un cuarto plazo fijo, un traslape y un indefinido con término", async () => {
    const cuarto = await registrar(0, {
      tipo: "plazo_fijo",
      inicio: "2027-01-01",
      termino: "2027-03-31",
    });
    expect(cuarto.error?.message).toMatch(/el siguiente es indefinido/);
    const traslape = await registrar(0, { tipo: "indefinido", inicio: "2026-12-15" });
    expect(traslape.error?.message).toMatch(/después del término/);
    expect(
      (await registrar(0, { tipo: "indefinido", inicio: "2027-01-01", termino: "2027-02-01" })).ok,
    ).toBe(false);
  });

  it("el paso a indefinido cierra la historia y cambia el tipo del contrato; anularlo lo revierte", async () => {
    const r = await registrar(0, { tipo: "indefinido", inicio: "2027-01-01" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.data).toMatchObject({
      indefinidoDesde: "2027-01-01",
      periodoVigente: null,
      terminoVigente: null,
    });
    expect(await vinculoTipo(0)).toBe("indefinido");
    expect(
      (await registrar(0, { tipo: "indefinido", inicio: "2027-02-01" })).error?.message,
    ).toMatch(/ya es indefinido/);
    const c = r.data as Contrato;
    const ultimo = c.periodos.at(-1)!;
    const primero = c.periodos[0]!;
    const noUltimo = await ejecutar(0, "core.personas.periodos_anular", {
      id: personas[0],
      periodoId: primero.id,
      motivo: "error",
    });
    expect(noUltimo.error?.code).toBe("CONFLICT");
    const anular = await ejecutar(0, "core.personas.periodos_anular", {
      id: personas[0],
      periodoId: ultimo.id,
      motivo: "Se registró por error",
    });
    expect(anular.ok, JSON.stringify(anular)).toBe(true);
    expect(anular.data).toMatchObject({ indefinidoDesde: null, periodoVigente: 3 });
    expect(await vinculoTipo(0)).toBe("plazo_fijo");
    const fila = await e.admin.contratoPeriodo.findUniqueOrThrow({ where: { id: ultimo.id } });
    expect(fila).toMatchObject({ motivoAnulacion: "Se registró por error", anuladoPorId: uid });
    expect(fila.anuladoEn).not.toBeNull();
  });

  it("aísla por empresa: otra empresa no ve ni anula los períodos", async () => {
    const ajeno = (
      await e.admin.contratoPeriodo.findFirstOrThrow({
        where: { vinculoId: vinculos[0]!, anuladoEn: null },
      })
    ).id;
    const v = await ejecutar(1, "core.personas.laboral_ver", { id: personas[1] });
    expect((v.data as { contrato: Contrato }).contrato.periodos).toEqual([]);
    const otra = await ejecutar(1, "core.personas.periodos_anular", {
      id: personas[1],
      periodoId: ajeno,
      motivo: "intento",
    });
    expect(otra.error?.code).toBe("NOT_FOUND");
    const cruzada = await ejecutar(1, "core.personas.periodos_registrar", {
      id: personas[0],
      tipo: "indefinido",
      inicio: "2027-05-01",
    });
    expect(cruzada.error?.code).toBe("NOT_FOUND");
  });

  it("la base exige término en plazo fijo y lo prohíbe en indefinido", async () => {
    const base = {
      tenantId: tenants[1]!,
      personaId: personas[1]!,
      vinculoId: vinculos[1]!,
      inicio: new Date("2026-01-01"),
    };
    await expect(
      e.admin.contratoPeriodo.create({ data: { ...base, tipo: "plazo_fijo" } }),
    ).rejects.toThrow(/contrato_periodos_termino_check/);
    await expect(
      e.admin.contratoPeriodo.create({
        data: { ...base, tipo: "indefinido", termino: new Date("2026-02-01") },
      }),
    ).rejects.toThrow(/contrato_periodos_termino_check/);
  });

  it("anular el único período (indefinido) devuelve el contrato a plazo fijo; un indefinido sin historia no admite plazo fijo", async () => {
    const r = await registrar(1, { tipo: "indefinido", inicio: "2026-02-01" });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(await vinculoTipo(1)).toBe("indefinido");
    const id = (r.data as Contrato).periodos[0]!.id;
    const anular = await ejecutar(1, "core.personas.periodos_anular", {
      id: personas[1],
      periodoId: id,
      motivo: "Se registró por error",
    });
    expect(anular.ok, JSON.stringify(anular)).toBe(true);
    expect(await vinculoTipo(1)).toBe("plazo_fijo");
    await e.admin.vinculoLaboral.update({
      where: { id: vinculos[1]! },
      data: { tipo: "indefinido" },
    });
    const plazo = await registrar(1, {
      tipo: "plazo_fijo",
      inicio: "2026-03-01",
      termino: "2026-05-31",
    });
    expect(plazo.error?.message).toMatch(/ya es indefinido/);
    expect(await vinculoTipo(1)).toBe("indefinido");
  });

  it("opai_app no puede borrar períodos", async () => {
    const fila = await e.admin.contratoPeriodo.findFirstOrThrow({
      where: { vinculoId: vinculos[0]! },
    });
    await expect(
      e.forTenant(tenants[0]!).contratoPeriodo.delete({ where: { id: fila.id } }),
    ).rejects.toThrow();
    expect(await e.admin.contratoPeriodo.count({ where: { id: fila.id } })).toBe(1);
  });
});
