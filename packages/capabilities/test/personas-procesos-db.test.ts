// CAR-355: listas de ingreso y salida con Postgres real. Datos ficticios, empresas qa-*.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
type Ev = { tipo: string; entidadId: string; payload?: unknown; actorId?: string | null };

describe.skipIf(omitirSuiteDb())("Personas · listas de ingreso y salida (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const rrhh = randomUUID();
  const otro = randomUUID();
  let cargo = "";
  const ctx = (tenantId: string, uid: string | null = rrhh) =>
    mod.crearContexto({
      tenantId, actor: uid ? { tipo: "user", id: uid } : { tipo: "system" },
      ...(uid ? { usuario: { id: uid, nombre: "RRHH", email: `${uid.slice(0, 6)}@c355.test`, platformRole: null } } : {}),
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = async (id: string, input: Record<string, unknown>, tenantId = t.A, o = {}) =>
    (await mod.executeCapability(ctx(tenantId), id, input, o)) as R;
  const consumir = async (ev: Ev, tenantId = t.A) => {
    const c = mod.consumidoresDelNucleo.find((x) => x.id === "core.personas.procesos")!;
    await c.handler(ctx(tenantId, null), {
      id: randomUUID(), entidadTipo: "vinculo", payload: null, actorTipo: "user", actorId: rrhh,
      viaUserId: null, createdAt: new Date(), ...ev,
    });
  };
  const persona = async (tenantId: string, rut: string) =>
    (await e.admin.persona.create({ data: { tenantId, nombres: "Ana", apellidos: "Ficticia", rut, estado: "activa" } })).id;
  const vinculo = (tenantId: string, personaId: string, d: Record<string, unknown> = {}) =>
    e.admin.vinculoLaboral.create({
      data: { tenantId, personaId, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-11-01"), estado: "vigente", ...d },
    });
  const procesos = (personaId: string) =>
    e.admin.procesoPersona.findMany({ where: { personaId }, include: { pasos: { orderBy: { orden: "asc" } } } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    for (const k of ["A", "B"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `qa-c355-${k.toLowerCase()}-${randomUUID().slice(0, 8)}`, nombre: k, vertical: "seguridad" } })).id;
    for (const id of [rrhh, otro]) {
      await e.admin.user.create({ data: { id, name: id === rrhh ? "RRHH Ficticio" : "Otro Ficticio", email: `${id.slice(0, 8)}@c355.test` } });
      await e.admin.membership.create({ data: { tenantId: t.A, userId: id, rol: "owner", portales: ["erp"] } });
    }
    cargo = (await e.admin.cargo.create({ data: { tenantId: t.A, nombre: "Guardia" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("crear un vínculo abre el ingreso de la vertical, con una tarea por paso para quien lo registró", async () => {
    const p = await persona(t.A, "11111111-1");
    const v = await vinculo(t.A, p);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id });
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id }); // idempotente
    const [ingreso, ...resto] = await procesos(p);
    expect(resto).toHaveLength(0);
    expect(ingreso?.tipo).toBe("ingreso");
    expect(ingreso?.pasos.some((x) => x.titulo.includes("OS-10"))).toBe(true);
    expect(ingreso?.pasos.every((x) => x.responsableId === rrhh && x.actividadId)).toBe(true);
    const tarea = await e.admin.actividad.findUnique({ where: { id: ingreso!.pasos[0]!.actividadId! } });
    expect(tarea?.titulo).toContain("Ingreso de Ana Ficticia");
    expect(tarea?.vencimiento?.toISOString().slice(0, 10)).toBe("2026-11-16");
  });

  it("un contrato importado o un traslado no abren ingreso", async () => {
    const p = await persona(t.A, "22222222-2");
    const v = await vinculo(t.A, p);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id, payload: { origen: "importacion" } });
    await vinculo(t.A, p, { estado: "terminado", inicio: new Date("2026-01-01"), termino: new Date("2026-10-31") });
    const v2 = await vinculo(t.A, await persona(t.A, "33333333-3"));
    await e.admin.vinculoLaboral.update({ where: { id: v.id }, data: { estado: "terminado", termino: new Date("2026-11-20") } });
    const v3 = await vinculo(t.A, p, { inicio: new Date("2026-11-21") });
    await consumir({ tipo: "core.vinculo.creado", entidadId: v3.id });
    expect(await procesos(p)).toHaveLength(0);
    expect(v2.id).toBeTruthy();
  });

  it("marcar la tarea hecha cierra el paso; la lista se cierra cuando no queda nada por hacer", async () => {
    const p = await persona(t.A, "44444444-4");
    const v = await vinculo(t.A, p);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id });
    const [pr] = await procesos(p);
    const [primero, ...demas] = pr!.pasos;
    await e.admin.actividad.update({ where: { id: primero!.actividadId! }, data: { estado: "hecha", completadaEn: new Date() } });
    await consumir({ tipo: "core.actividad.tarea_completada", entidadId: primero!.actividadId! });
    for (const x of demas) {
      const r = await ejecutar("core.procesos_persona.paso_actualizar", { id: x.id, estado: "omitido", motivo: "No aplica." });
      expect(r.ok, JSON.stringify(r)).toBe(true);
    }
    // Reasignar un paso ya hecho no cancela su tarea completada.
    expect((await ejecutar("core.procesos_persona.paso_actualizar", { id: primero!.id, responsableId: otro })).ok).toBe(true);
    expect((await e.admin.actividad.findUnique({ where: { id: primero!.actividadId! } }))?.estado).toBe("hecha");
    const [cerrado] = await procesos(p);
    expect(cerrado?.pasos[0]?.estado).toBe("hecho");
    expect(cerrado?.estado).toBe("cerrado");
    const tarea = await e.admin.actividad.findUnique({ where: { id: demas[0]!.actividadId! } });
    expect(tarea?.estado).toBe("cancelada");
    // Reabrir un paso reabre la lista y la tarea.
    expect((await ejecutar("core.procesos_persona.paso_actualizar", { id: demas[0]!.id, estado: "por_hacer" })).ok).toBe(true);
    expect((await procesos(p))[0]?.estado).toBe("abierto");
    expect((await e.admin.actividad.findUnique({ where: { id: demas[0]!.actividadId! } }))?.estado).toBe("pendiente");
  });

  it("reasignar cancela la tarea anterior y crea una para el nuevo responsable; omitir exige nota", async () => {
    const p = await persona(t.A, "55555555-5");
    const v = await vinculo(t.A, p);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id });
    const paso = (await procesos(p))[0]!.pasos[0]!;
    const sinNota = await ejecutar("core.procesos_persona.paso_actualizar", { id: paso.id, estado: "omitido" });
    expect(sinNota.ok).toBe(false);
    const prev = await ejecutar("core.procesos_persona.paso_actualizar", { id: paso.id, responsableId: otro }, t.A, { dryRun: true });
    expect(prev.data?.["responsable"]).toBe("Otro Ficticio");
    expect((await ejecutar("core.procesos_persona.paso_actualizar", { id: paso.id, responsableId: otro })).ok).toBe(true);
    const nuevo = (await procesos(p))[0]!.pasos[0]!;
    expect(nuevo.actividadId).not.toBe(paso.actividadId);
    expect((await e.admin.actividad.findUnique({ where: { id: paso.actividadId! } }))?.estado).toBe("cancelada");
    const resp = await e.admin.actividadResponsable.findMany({ where: { actividadId: nuevo.actividadId! } });
    expect(resp.map((x) => x.usuarioId)).toEqual([otro]);
  });

  it("terminar el último vínculo abre la salida; listar devuelve ambas", async () => {
    const p = await persona(t.A, "66666666-6");
    const v = await vinculo(t.A, p, { estado: "terminado", termino: new Date("2026-11-30") });
    await consumir({ tipo: "core.vinculo.terminado", entidadId: v.id });
    const r = await ejecutar("core.procesos_persona.listar", { personaId: p });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const lista = (r.data as { procesos: { tipo: string; pasos: { titulo: string; vence: string }[] }[] }).procesos;
    expect(lista.map((x) => x.tipo)).toEqual(["salida"]);
    expect(lista[0]?.pasos.find((x) => x.titulo.includes("finiquito"))?.vence).toBe("2026-12-10");
  });

  it("aislamiento: otra empresa no ve ni toca las listas", async () => {
    const p = await persona(t.A, "77777777-7");
    const v = await vinculo(t.A, p);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id });
    const paso = (await procesos(p))[0]!.pasos[0]!;
    expect((await ejecutar("core.procesos_persona.listar", { personaId: p }, t.B)).ok).toBe(false);
    expect((await ejecutar("core.procesos_persona.paso_actualizar", { id: paso.id, estado: "hecho" }, t.B)).ok).toBe(false);
    await consumir({ tipo: "core.vinculo.creado", entidadId: v.id }, t.B);
    expect(await procesos(p)).toHaveLength(1);
  });
});
