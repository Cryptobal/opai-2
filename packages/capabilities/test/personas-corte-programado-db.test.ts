// CAR-385 (Estándares H-2b): terminar un vínculo con fecha futura no corta el acceso hoy; lo corta un
// trabajo programado para el cierre del día de término. Datos ficticios, empresa qa-*.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { instanteDeCorte, trabajoCortarAccesosProgramado } from "../src/core/maestros/vinculos-corte-programado";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
const FUTURO = "2099-12-31";

describe("instanteDeCorte", () => {
  const ahora = new Date("2026-11-13T15:00:00Z");
  it("hoy o pasado: corta ya", () => {
    expect(instanteDeCorte("2026-11-13", "America/Santiago", ahora)).toBeNull();
    expect(instanteDeCorte("2026-11-01", "America/Santiago", ahora)).toBeNull();
  });
  it("futuro: a las 00:00 del día siguiente en la zona de la empresa", () => {
    expect(instanteDeCorte("2026-11-30", "America/Santiago", ahora)?.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });
  it("la noche del cambio de hora de septiembre no adelanta el corte", () => {
    // Las 00:00 del 06-09-2026 no existen en Chile: el corte cae a la 01:00 (−03), no a las 23:00 del 05-09.
    expect(instanteDeCorte("2026-09-05", "America/Santiago", new Date("2026-08-13T15:00:00Z"))?.toISOString()).toBe("2026-09-06T04:00:00.000Z");
  });
});

describe.skipIf(omitirSuiteDb())("Personas · corte de acceso programado (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let cargo = "";
  const rrhh = randomUUID();
  const ctxRrhh = () =>
    mod.crearContexto({
      tenantId: tenant, actor: { tipo: "user", id: rrhh },
      usuario: { id: rrhh, nombre: "RRHH", email: `${rrhh.slice(0, 6)}@c385.test`, platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const ctxSistema = () =>
    mod.crearContexto({ tenantId: tenant, actor: { tipo: "system" }, modulosActivos: [], medidor: { registrar: async () => undefined } });
  const terminar = async (id: string, o = {}, termino = FUTURO) =>
    (await mod.executeCapability(ctxRrhh(), "core.vinculos.terminar", { id, termino, motivo: "Aviso de 30 días" }, o)) as R;
  const persona = async (rut: string) => {
    const uid = randomUUID();
    await e.admin.user.create({ data: { id: uid, name: "Usuario Ficticio", email: `${uid.slice(0, 8)}@c385.test` } });
    const m = await e.admin.membership.create({ data: { tenantId: tenant, userId: uid, rol: "trabajador", portales: ["trabajador"] } });
    const p = await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Ana", apellidos: "Ficticia", rut, estado: "activa", usuarioId: uid } });
    const v = await e.admin.vinculoLaboral.create({
      data: { tenantId: tenant, personaId: p.id, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "vigente" },
    });
    return { persona: p.id, membresia: m.id, vinculo: v.id };
  };
  const estado = async (x: { persona: string; membresia: string }) => ({
    persona: (await e.admin.persona.findUnique({ where: { id: x.persona } }))?.estado,
    membresia: (await e.admin.membership.findUnique({ where: { id: x.membresia } }))?.estado,
  });
  const trabajoDe = (vinculo: string) =>
    e.admin.trabajo.findFirst({
      where: { tenantId: tenant, claveUnica: { startsWith: `core.vinculos.cortar_accesos:${vinculo}:` } },
      orderBy: { createdAt: "desc" },
    });
  const correr = async (vinculo: string) =>
    trabajoCortarAccesosProgramado.ejecutar(ctxSistema(), (await trabajoDe(vinculo))?.payload);

  /** Lleva el término del vínculo y el de su trabajo a un día ya cumplido. */
  const llegaLaFecha = async (vinculo: string) => {
    const t = await trabajoDe(vinculo);
    await e.admin.vinculoLaboral.update({ where: { id: vinculo }, data: { termino: new Date("2026-11-01") } });
    await e.admin.trabajo.update({ where: { id: t!.id }, data: { payload: { ...(t!.payload as object), termino: "2026-11-01" } } });
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    tenant = (await e.admin.tenant.create({ data: { slug: `qa-c385-${randomUUID().slice(0, 8)}`, nombre: "c385", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: rrhh, name: "RRHH", email: `${rrhh.slice(0, 8)}@c385.test` } });
    await e.admin.membership.create({ data: { tenantId: tenant, userId: rrhh, rol: "owner", portales: ["erp"] } });
    cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa avisa la fecha del corte", async () => {
    const x = await persona("11111111-1");
    const r = await terminar(x.vinculo, { dryRun: true });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.data?.["corteProgramado"]).toBe("Se cortará el acceso al cierre del 31-12.");
    expect(await trabajoDe(x.vinculo)).toBeNull();
  });

  it("término futuro: no corta hoy y programa el corte", async () => {
    const x = await persona("22222222-2");
    const r = await terminar(x.vinculo);
    expect(r.ok, JSON.stringify(r)).toBe(true);
    expect(r.data?.["accesos"]).toMatchObject({ personaInactiva: true, membresiasSuspendidas: 1 });
    expect(await estado(x)).toEqual({ persona: "activa", membresia: "activa" });
    const t = await trabajoDe(x.vinculo);
    expect(t?.programadoPara.toISOString()).toBe(instanteDeCorte(FUTURO, "America/Santiago")?.toISOString());
  });

  it("al llegar la fecha el trabajo corta, con los mismos resguardos, y deja el hecho", async () => {
    const x = await persona("33333333-3");
    await terminar(x.vinculo);
    // Se simula que llegó la fecha: el término pasa a un día cumplido en la base y en el trabajo.
    await llegaLaFecha(x.vinculo);
    const r = await correr(x.vinculo);
    expect(r).toMatchObject({ personaInactiva: true, membresiasSuspendidas: 1 });
    expect(await estado(x)).toEqual({ persona: "inactiva", membresia: "suspendida" });
    const ev = await e.admin.evento.findFirst({ where: { tenantId: tenant, tipo: "core.vinculo.accesos_cortados", entidadId: x.vinculo } });
    expect(ev).not.toBeNull();
  });

  it("si antes de la fecha la persona tiene otro vínculo vigente, no corta nada", async () => {
    const x = await persona("44444444-4");
    await terminar(x.vinculo);
    await e.admin.vinculoLaboral.create({
      data: { tenantId: tenant, personaId: x.persona, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-12-01"), estado: "vigente" },
    });
    await llegaLaFecha(x.vinculo);
    expect(await correr(x.vinculo)).toMatchObject({ personaInactiva: false });
    expect(await estado(x)).toEqual({ persona: "activa", membresia: "activa" });
  });

  it("un vínculo reactivado y vuelto a terminar no lo corta el trabajo viejo", async () => {
    const x = await persona("55555555-5");
    await terminar(x.vinculo);
    const viejo = await trabajoDe(x.vinculo);
    await e.admin.vinculoLaboral.update({ where: { id: x.vinculo }, data: { estado: "vigente", termino: null, motivoTermino: null } });
    expect((await terminar(x.vinculo, {}, "2099-06-30")).ok).toBe(true);
    expect(await trabajoCortarAccesosProgramado.ejecutar(ctxSistema(), viejo?.payload)).toEqual({ omitido: true });
    expect((await trabajoDe(x.vinculo))?.id).not.toBe(viejo?.id);
    expect(await estado(x)).toEqual({ persona: "activa", membresia: "activa" });
  });

  it("con otro vínculo terminado más tarde, el corte espera al término más lejano", async () => {
    const x = await persona("66666666-6");
    await e.admin.vinculoLaboral.create({
      data: { tenantId: tenant, personaId: x.persona, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01"), estado: "terminado", termino: new Date(`${FUTURO}T00:00:00Z`) },
    });
    const r = await terminar(x.vinculo, {}, "2099-06-30");
    expect(r.data?.["corteProgramado"]).toBe("Se cortará el acceso al cierre del 31-12.");
    expect((await trabajoDe(x.vinculo))?.programadoPara.toISOString()).toBe(instanteDeCorte(FUTURO, "America/Santiago")?.toISOString());
  });
});
