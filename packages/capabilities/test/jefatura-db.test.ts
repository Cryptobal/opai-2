import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { anonimizarPersona } from "../src/core/cumplimiento/retencion-anonimizar";
import { codigo, dato } from "./maestros-ayuda";

// Jefatura por cargo (CAR-314, ADR-094) contra Postgres real, con RLS sin BYPASSRLS. Dos empresas y
// dos jefes con el mismo cargo: cada jefe ve solo a su gente y el jefe del jefe ve toda la línea.
describe.skipIf(!urlPropietario)("jefatura por cargo contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let usuaria = "";
  const sufijo = randomUUID().slice(0, 8);
  const cargo: Record<string, string> = {};
  const persona: Record<string, string> = {};
  const SET = "core.cargos.set_jefatura";
  const ASIGNAR = "core.personas.asignar_jefe";
  const A_CARGO = "core.personas.list_a_cargo";
  type Equipo = {
    jefePersonaId: string | null;
    personas: { id: string; directa: boolean; cargoId: string | null }[];
  };
  let n = 0;

  const ctx = (tenantId: string, extra: { alcance?: { instalaciones: string[] } } = {}) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: usuaria },
      usuario: { id: usuaria, nombre: "Gema", email: `g-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: [],
      alcance: extra.alcance ?? null,
    });
  const ids = (r: Equipo) => r.personas.map((p) => p.id).sort();

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const empresa = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } }).then((t) => t.id);
    a = await empresa(`jef-a-${sufijo}`);
    b = await empresa(`jef-b-${sufijo}`);
    usuaria = (
      await e.admin.user.create({
        data: { name: "Gema", email: `g-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    for (const tenantId of [a, b]) {
      await e.admin.membership.create({
        data: { tenantId, userId: usuaria, rol: "owner", portales: ["erp"] },
      });
    }
    const crearCargo = async (tenantId: string, clave: string) => {
      cargo[clave] = (await e.admin.cargo.create({ data: { tenantId, nombre: clave } })).id;
    };
    const crearPersona = async (tenantId: string, clave: string, cargoClave: string, usuarioId?: string) => {
      n += 1;
      const p = await e.admin.persona.create({
        data: {
          tenantId,
          nombres: clave,
          apellidos: "Prueba",
          rut: `${10_000_000 + n}-${sufijo.slice(0, 1)}`,
          ...(usuarioId ? { usuarioId } : {}),
        },
      });
      persona[clave] = p.id;
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId,
          personaId: p.id,
          cargoId: cargo[cargoClave] ?? "",
          tipo: "indefinido",
          inicio: new Date("2026-01-01"),
        },
      });
    };
    for (const c of ["gerente", "jefe_ventas", "vendedor"]) await crearCargo(a, c);
    await crearCargo(b, "gerente_b");
    await crearPersona(a, "gema", "gerente", usuaria);
    await crearPersona(a, "julia", "jefe_ventas");
    await crearPersona(a, "jorge", "jefe_ventas");
    await crearPersona(a, "vera", "vendedor");
    await crearPersona(a, "victor", "vendedor");
    await crearPersona(b, "berta", "gerente_b");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("define la jefatura de cada cargo, la deja en la auditoría y rechaza ciclos y cargos ajenos", async () => {
    const previa = await dato<{ jefaturaCargoId: string | null }>(
      ctx(a),
      SET,
      { id: cargo.vendedor, jefaturaCargoId: cargo.jefe_ventas },
      { dryRun: true },
    );
    expect(previa.jefaturaCargoId).toBe(cargo.jefe_ventas);
    const antes = await e.admin.cargo.findUnique({ where: { id: cargo.vendedor ?? "" } });
    expect(antes?.jefaturaCargoId).toBeNull();

    await dato(ctx(a), SET, { id: cargo.vendedor, jefaturaCargoId: cargo.jefe_ventas });
    await dato(ctx(a), SET, {
      id: cargo.jefe_ventas,
      jefaturaCargoId: cargo.gerente,
      jefaturaVe: "equipo",
    });
    const ciclo = { id: cargo.gerente, jefaturaCargoId: cargo.vendedor };
    expect(await codigo(ctx(a), SET, ciclo)).toBe("UNPROCESSABLE");
    const ajeno = { id: cargo.vendedor, jefaturaCargoId: cargo.gerente_b };
    expect(await codigo(ctx(a), SET, ajeno)).toBe("NOT_FOUND");
    const auditados = await e.admin.auditEvent.count({ where: { tenantId: a, capability: SET } });
    expect(auditados).toBe(2);
  });

  it("asigna el jefe directo solo si tiene el cargo que es jefatura", async () => {
    await dato(ctx(a), ASIGNAR, { personaIds: [persona.vera], jefePersonaId: persona.julia });
    await dato(ctx(a), ASIGNAR, { personaIds: [persona.victor], jefePersonaId: persona.jorge });
    const mal = { personaIds: [persona.vera], jefePersonaId: persona.gema };
    expect(await codigo(ctx(a), ASIGNAR, mal)).toBe("UNPROCESSABLE");
    const deOtraEmpresa = { personaIds: [persona.vera], jefePersonaId: persona.berta };
    expect(await codigo(ctx(a), ASIGNAR, deOtraEmpresa)).toBe("UNPROCESSABLE");
    const desdeB = { personaIds: [persona.vera], jefePersonaId: null };
    expect(await codigo(ctx(b), ASIGNAR, desdeB)).toBe("NOT_FOUND");
  });

  it("la base impide un jefe o una jefatura de otra empresa aunque se salte la capacidad", async () => {
    await expect(
      e.admin.persona.update({
        where: { id: persona.vera ?? "" },
        data: { jefePersonaId: persona.berta ?? "" },
      }),
    ).rejects.toThrow();
    await expect(
      e.admin.cargo.update({
        where: { id: cargo.vendedor ?? "" },
        data: { jefaturaCargoId: cargo.gerente_b ?? "" },
      }),
    ).rejects.toThrow();
  });

  it("dos jefes con el mismo cargo ven cada uno solo a su gente; el jefe del jefe, toda la línea", async () => {
    const julia = await dato<Equipo>(ctx(a), A_CARGO, { personaId: persona.julia });
    expect(ids(julia)).toEqual([persona.vera]);
    const jorge = await dato<Equipo>(ctx(a), A_CARGO, { personaId: persona.jorge });
    expect(ids(jorge)).toEqual([persona.victor]);
    // Sin indicar a quién: la Persona vinculada al usuario que consulta (Gema, gerente).
    const gema = await dato<Equipo>(ctx(a), A_CARGO, {});
    expect(gema.jefePersonaId).toBe(persona.gema);
    expect(ids(gema)).toEqual(
      [persona.julia, persona.jorge, persona.vera, persona.victor].map(String).sort(),
    );
    const directas = gema.personas.filter((p) => p.directa).map((p) => p.id).sort();
    expect(directas).toEqual([persona.julia, persona.jorge].map(String).sort());
  });

  it("quien no tiene jefe asignado no queda invisible: sube al nivel de arriba", async () => {
    n += 1;
    const valeria = await e.admin.persona.create({
      data: { tenantId: a, nombres: "valeria", apellidos: "Prueba", rut: `${10_000_000 + n}-k` },
    });
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId: a,
        personaId: valeria.id,
        cargoId: cargo.vendedor ?? "",
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
      },
    });
    const julia = await dato<Equipo>(ctx(a), A_CARGO, { personaId: persona.julia });
    expect(ids(julia)).toEqual([persona.vera]);
    const gema = await dato<Equipo>(ctx(a), A_CARGO, {});
    const fila = gema.personas.find((p) => p.id === valeria.id);
    expect(fila).toMatchObject({ directa: false, cargoId: cargo.vendedor });
    await e.admin.vinculoLaboral.deleteMany({ where: { personaId: valeria.id } });
    await e.admin.persona.delete({ where: { id: valeria.id } });
  });

  it("anonimizar a una persona borra su jefe y la quita como jefa de otros", async () => {
    const crear = async (nombres: string, jefePersonaId?: string) => {
      n += 1;
      const p = await e.admin.persona.create({
        data: {
          tenantId: a,
          nombres,
          apellidos: "Prueba",
          rut: `${10_000_000 + n}-k`,
          ...(jefePersonaId ? { jefePersonaId } : {}),
        },
      });
      return p.id;
    };
    const exjefa = await crear("exjefa", persona.julia);
    const sub = await crear("sub", exjefa);
    const cambio = await ctx(a).transaccion((tx) => anonimizarPersona(tx, exjefa, new Date(), null));
    expect(cambio).toBe(true);
    const filas = await e.admin.persona.findMany({
      where: { id: { in: [exjefa, sub] } },
      select: { jefePersonaId: true },
    });
    expect(filas.map((f) => f.jefePersonaId)).toEqual([null, null]);
    const mal = { personaIds: [exjefa], jefePersonaId: null };
    expect(await codigo(ctx(a), ASIGNAR, mal)).toBe("UNPROCESSABLE");
  });

  it("desde otra empresa no se ve nada, y con alcance por filas solo el equipo propio", async () => {
    expect(await codigo(ctx(b), A_CARGO, { personaId: persona.julia })).toBe("NOT_FOUND");
    const acotado = ctx(a, { alcance: { instalaciones: [] } });
    expect(await codigo(acotado, A_CARGO, { personaId: persona.julia })).toBe("FORBIDDEN");
    // La jefatura no amplía el alcance: sin instalaciones a cargo no ve a nadie, aunque sea jefa.
    const propio = await dato<Equipo>(acotado, A_CARGO, {});
    expect(propio.jefePersonaId).toBe(persona.gema);
    expect(propio.personas).toEqual([]);
  });
});
