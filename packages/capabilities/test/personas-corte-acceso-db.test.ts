// CAR-355 parte 2: terminar el último vínculo con fecha de hoy o pasada corta el acceso en el mismo acto
// (el término futuro lo cubre personas-corte-programado-db.test.ts, CAR-385). Datos ficticios, empresa qa-*.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };

describe.skipIf(omitirSuiteDb())("Personas · corte de acceso al terminar el vínculo (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let cargo = "";
  const rrhh = randomUUID();
  const terminar = async (id: string, o = {}) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant, actor: { tipo: "user", id: rrhh },
        usuario: { id: rrhh, nombre: "RRHH", email: `${rrhh.slice(0, 6)}@c355b.test`, platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: [],
        medidor: { registrar: async () => undefined },
      }),
      "core.vinculos.terminar", { id, termino: "2026-11-01", motivo: "Término de prueba" }, o,
    )) as R;
  /** Persona con usuario y membresía en la empresa, y un vínculo vigente (o dos). */
  const personaConUsuario = async (rut: string, rol: string, vinculos = 1, usuario?: string) => {
    const uid = usuario ?? randomUUID();
    if (!usuario) await e.admin.user.create({ data: { id: uid, name: "Usuario Ficticio", email: `${uid.slice(0, 8)}@c355b.test` } });
    const m = usuario
      ? (await e.admin.membership.findFirst({ where: { tenantId: tenant, userId: uid } }))!
      : await e.admin.membership.create({ data: { tenantId: tenant, userId: uid, rol, portales: ["trabajador"] } });
    const p = await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Ficticia", rut, estado: "activa", usuarioId: uid } });
    const vs = [];
    for (let i = 0; i < vinculos; i++)
      vs.push(await e.admin.vinculoLaboral.create({
        data: { tenantId: tenant, personaId: p.id, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: i === 0 ? "vigente" : "terminado", termino: i === 0 ? null : new Date("2025-12-01") },
      }));
    return { persona: p.id, membresia: m.id, vinculo: vs[0]!.id };
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    tenant = (await e.admin.tenant.create({ data: { slug: `qa-c355b-${randomUUID().slice(0, 8)}`, nombre: "c355b", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: rrhh, name: "RRHH", email: `${rrhh.slice(0, 8)}@c355b.test` } });
    await e.admin.membership.create({ data: { tenantId: tenant, userId: rrhh, rol: "owner", portales: ["erp"] } });
    cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa informa el corte sin escribir nada", async () => {
    const x = await personaConUsuario("11111111-1", "trabajador");
    const r = await terminar(x.vinculo, { dryRun: true });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.data?.["accesos"]).toEqual({ personaInactiva: true, membresiasSuspendidas: 1, ownerConservado: false, sinSuspender: 0 });
    expect(r.data?.["corteProgramado"]).toBeNull();
    expect((await e.admin.membership.findUnique({ where: { id: x.membresia } }))?.estado).toBe("activa");
    expect((await e.admin.persona.findUnique({ where: { id: x.persona } }))?.estado).toBe("activa");
  });

  it("terminar el último vínculo deja a la persona inactiva y suspende su usuario en el mismo acto", async () => {
    const x = await personaConUsuario("22222222-2", "trabajador");
    const r = await terminar(x.vinculo);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect((await e.admin.membership.findUnique({ where: { id: x.membresia } }))?.estado).toBe("suspendida");
    expect((await e.admin.persona.findUnique({ where: { id: x.persona } }))?.estado).toBe("inactiva");
    const ev = await e.admin.evento.findFirst({ where: { tenantId: tenant, tipo: "core.vinculo.terminado", entidadId: x.vinculo } });
    expect((ev?.payload as { accesos?: { membresiasSuspendidas?: number } } | null)?.accesos?.membresiasSuspendidas).toBe(1);
  });

  it("un owner no se suspende solo: queda informado", async () => {
    const x = await personaConUsuario("33333333-3", "owner");
    const r = await terminar(x.vinculo);
    expect(r.data?.["accesos"]).toEqual({ personaInactiva: true, membresiasSuspendidas: 0, ownerConservado: true, sinSuspender: 1 });
    expect((await e.admin.membership.findUnique({ where: { id: x.membresia } }))?.estado).toBe("activa");
  });

  it("la membresía del mismo usuario en otra empresa no se toca", async () => {
    const x = await personaConUsuario("44444444-4", "trabajador");
    const otraEmpresa = (await e.admin.tenant.create({ data: { slug: `qa-c355c-${randomUUID().slice(0, 8)}`, nombre: "c355c", vertical: "seguridad" } })).id;
    const persona = await e.admin.persona.findUnique({ where: { id: x.persona } });
    const ajena = await e.admin.membership.create({ data: { tenantId: otraEmpresa, userId: persona!.usuarioId!, rol: "trabajador", portales: ["trabajador"] } });
    const r = await terminar(x.vinculo);
    expect(r.data?.["accesos"]).toMatchObject({ membresiasSuspendidas: 1 });
    expect((await e.admin.membership.findUnique({ where: { id: ajena.id } }))?.estado).toBe("activa");
  });

  it("quien termina no se suspende a sí mismo: queda informado", async () => {
    const x = await personaConUsuario("55555555-5", "admin", 1, rrhh);
    const r = await terminar(x.vinculo);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect((r.data?.["accesos"] as { sinSuspender: number }).sinSuspender).toBe(1);
    expect((await e.admin.membership.findUnique({ where: { id: x.membresia } }))?.estado).toBe("activa");
  });
});
