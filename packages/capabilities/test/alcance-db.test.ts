// Brief 07c · B3: alcance del supervisor por instalación contra Postgres real (si hay
// DATABASE_URL_TEST). El filtro va en la consulta de cada capacidad (UI, API y MCP), nunca en la UI:
// aquí se prueba con el mismo registro de capacidades, resolviendo el alcance desde la base.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import type { Alcance } from "../src/types";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("alcance del supervisor en base real (B3)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantId = "";
  let cuentaA = "";
  let cuentaB = "";
  let instA = "";
  let instB = "";
  let instA2 = "";
  let membershipSup = "";
  let docA = "";
  let docFuera = "";
  let docEmpresa = "";
  let personaId = "";
  const userSupId = randomUUID();

  const medidor = { registrar: async () => undefined };
  const servicios = { almacenamiento: almacenamientoEnMemoria().almacenamiento };
  const ctxOwner = () =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", medidor });
  const ctxSup = (alcance: Alcance | null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userSupId },
      rol: "supervisor",
      alcance,
      medidor,
      servicios,
    });
  const ctxKeySup = (alcance: Alcance | null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "agent", id: randomUUID(), viaUserId: userSupId },
      rol: "supervisor",
      principal: { tipo: "usuario", id: userSupId },
      alcance,
      medidor,
    });

  async function dato<T>(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown, o = {}) {
    const r = await mod.executeCapability(ctx, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  /** Alcance resuelto desde la base, como lo haría el borde una vez por contexto. */
  async function alcanceDesdeDb(): Promise<Alcance> {
    const filas = await e.admin.supervisorInstalacion.findMany({ where: { membershipId: membershipSup } });
    return { instalaciones: filas.map((f) => f.instalacionId) };
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const t = await e.admin.tenant.create({
      data: { slug: `alc-${randomUUID().slice(0, 8)}`, nombre: "Alc", vertical: "seguridad" },
    });
    tenantId = t.id;
    const o = ctxOwner();
    cuentaA = (await dato<{ id: string }>(o, "core.cuentas.create", { nombre: "Alfa Seguridad" })).id;
    cuentaB = (await dato<{ id: string }>(o, "core.cuentas.create", { nombre: "Beta Seguridad" })).id;
    const cargo = (await dato<{ id: string }>(o, "core.cargos.create", { nombre: "Guardia" })).id;
    instA = (await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId: cuentaA, nombre: "Planta Alfa" })).id;
    instB = (await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId: cuentaB, nombre: "Planta Beta" })).id;
    // Segunda instalación de la cuenta Alfa que NO se asigna al supervisor (prueba de fuga en la ficha).
    instA2 = (await dato<{ id: string }>(o, "core.instalaciones.create", { cuentaId: cuentaA, nombre: "Bodega Alfa" })).id;
    const puesto = (inst: string, nombre: string) =>
      dato(o, "core.puestos.create", {
        instalacionId: inst,
        cargoId: cargo,
        nombre,
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      });
    await puesto(instA, "Día Alfa");
    await puesto(instB, "Día Beta");
    const u = await e.admin.user.create({
      data: { id: userSupId, name: "Supervisor", email: `sup-${randomUUID().slice(0, 8)}@prueba.cl` },
    });
    membershipSup = (
      await e.admin.membership.create({
        data: { tenantId, userId: u.id, rol: "supervisor", portales: ["supervisor"] },
      })
    ).id;
    // Documentos para probar que la lectura no se fuga por id (url_descarga/disponible/actividad):
    // uno de la instalación a cargo, uno de una instalación ajena y uno de empresa (nivel tenant).
    const doc = async (nombre: string) =>
      (
        await e.admin.documento.create({
          data: {
            tenantId,
            nombre,
            mime: "application/pdf",
            tamano: 1_000,
            storageKey: `k-${randomUUID()}`,
            estado: "disponible",
            creadoPorTipo: "user",
          },
        })
      ).id;
    docA = await doc("docA.pdf");
    docFuera = await doc("docFuera.pdf");
    docEmpresa = await doc("docEmpresa.pdf");
    await e.admin.documentoVinculo.createMany({
      data: [
        { tenantId, documentoId: docA, entidadTipo: "instalacion", entidadId: instA, rol: "propietario" },
        { tenantId, documentoId: docFuera, entidadTipo: "instalacion", entidadId: instB, rol: "propietario" },
        { tenantId, documentoId: docEmpresa, entidadTipo: "tenant", entidadId: tenantId, rol: "propietario" },
      ],
    });
    // Un evento de actividad por documento, para distinguir "sin acceso" de "sin actividad".
    await e.admin.auditEvent.createMany({
      data: [
        { tenantId, actorType: "user", actorId: userSupId, capability: "core.documentos.update", entityType: "documento", entityId: docA },
        { tenantId, actorType: "user", actorId: userSupId, capability: "core.documentos.update", entityType: "documento", entityId: docFuera },
      ],
    });
    // Una persona del tenant: sin relación real persona ↔ instalación, el supervisor no la ve (CA-B3 parcial).
    personaId = (
      await dato<{ id: string }>(o, "core.personas.create", {
        nombres: "Pedro",
        apellidos: "Soto",
        rut: "19.876.543-0",
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el owner ve todas las cuentas e instalaciones (sin alcance acotado)", async () => {
    const inst = await dato<{ items: unknown[] }>(ctxOwner(), "core.instalaciones.list", {});
    expect(inst.items).toHaveLength(3);
    const cuentas = await dato<{ items: unknown[] }>(ctxOwner(), "core.cuentas.list", {});
    expect(cuentas.items).toHaveLength(2);
  });

  it("asignar instalaciones a un supervisor: dryRun no persiste, real sí, idempotente", async () => {
    const o = ctxOwner();
    const prev = await dato<{ instalaciones: unknown[] }>(
      o,
      "core.supervisores.asignar",
      { membershipId: membershipSup, instalacionIds: [instA] },
      { dryRun: true },
    );
    expect(prev.instalaciones).toHaveLength(1);
    expect(await e.admin.supervisorInstalacion.count({ where: { membershipId: membershipSup } })).toBe(0);
    await dato(o, "core.supervisores.asignar", { membershipId: membershipSup, instalacionIds: [instA] });
    // Repetir no duplica (createMany skipDuplicates + índice único).
    await dato(o, "core.supervisores.asignar", { membershipId: membershipSup, instalacionIds: [instA] });
    const lista = await dato<{ instalaciones: { id: string }[] }>(o, "core.supervisores.list", {
      membershipId: membershipSup,
    });
    expect(lista.instalaciones.map((i) => i.id)).toEqual([instA]);
  });

  it("el supervisor solo ve su instalación, su cuenta y sus puestos; nada fuera de alcance", async () => {
    const a = await alcanceDesdeDb();
    const ctx = ctxSup(a);
    const inst = await dato<{ items: { id: string }[] }>(ctx, "core.instalaciones.list", {});
    expect(inst.items.map((i) => i.id)).toEqual([instA]);
    const cuentas = await dato<{ items: { id: string; instalaciones: number }[] }>(ctx, "core.cuentas.list", {});
    expect(cuentas.items.map((c) => c.id)).toEqual([cuentaA]);
    // La dotación de la cuenta cuenta solo la instalación a cargo (instA), no instA2.
    expect(cuentas.items[0]?.instalaciones).toBe(1);
    // La ficha de la cuenta lista solo la instalación a cargo, no la otra de la misma cuenta.
    const fichaA = await dato<{ instalaciones: { id: string }[] }>(ctx, "core.cuentas.get", { id: cuentaA });
    expect(fichaA.instalaciones.map((i) => i.id)).toEqual([instA]);
    // Y no puede abrir la otra instalación de su cuenta, que no tiene a cargo.
    const otra = await mod.executeCapability(ctxSup(a), "core.instalaciones.get", { id: instA2 });
    expect(otra).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    // La ficha de una instalación fuera de alcance no existe para el supervisor.
    const fuera = await mod.executeCapability(ctxSup(a), "core.instalaciones.get", { id: instB });
    expect(fuera).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const puestosB = await mod.executeCapability(ctxSup(a), "core.puestos.list", { instalacionId: instB });
    expect(puestosB).toMatchObject({ ok: true, data: [] });
    const contadores = await dato<{ cuentas: number; instalaciones: number; personas: number }>(
      ctx,
      "core.resumen.contadores",
      {},
    );
    expect(contadores).toMatchObject({ cuentas: 1, instalaciones: 1, personas: 0 });
    const busq = await dato<{ instalaciones: { id: string }[] }>(ctx, "core.buscar", { q: "Planta" });
    expect(busq.instalaciones.map((i) => i.id)).toEqual([instA]);
  });

  it("una API key del supervisor hereda el mismo alcance (ADR-033)", async () => {
    const inst = await dato<{ items: { id: string }[] }>(ctxKeySup(await alcanceDesdeDb()), "core.instalaciones.list", {});
    expect(inst.items.map((i) => i.id)).toEqual([instA]);
  });

  it("reasignar quita o agrega visibilidad al instante (el filtro vive en la consulta)", async () => {
    const o = ctxOwner();
    await dato(o, "core.supervisores.asignar", { membershipId: membershipSup, instalacionIds: [instB] });
    let ctx = ctxSup(await alcanceDesdeDb());
    expect((await dato<{ items: unknown[] }>(ctx, "core.instalaciones.list", {})).items).toHaveLength(2);
    await dato(o, "core.supervisores.quitar", { membershipId: membershipSup, instalacionIds: [instB] });
    ctx = ctxSup(await alcanceDesdeDb());
    const inst = await dato<{ items: { id: string }[] }>(ctx, "core.instalaciones.list", {});
    expect(inst.items.map((i) => i.id)).toEqual([instA]);
  });

  it("un supervisor sin instalaciones asignadas ve listas vacías (denegar por defecto)", async () => {
    const ctx = ctxSup({ instalaciones: [] });
    expect((await dato<{ items: unknown[] }>(ctx, "core.instalaciones.list", {})).items).toHaveLength(0);
    expect((await dato<{ items: unknown[] }>(ctx, "core.cuentas.list", {})).items).toHaveLength(0);
    expect((await dato<{ items: unknown[] }>(ctx, "core.personas.list", {})).items).toHaveLength(0);
  });

  it("una API key no puede fijar el alcance de un supervisor (soloPersonas)", async () => {
    const r = await mod.executeCapability(ctxKeySup(await alcanceDesdeDb()), "core.supervisores.asignar", {
      membershipId: membershipSup,
      instalacionIds: [instA],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("la lectura de un documento no se fuga por id: solo los de su alcance (url y actividad)", async () => {
    const ctx = ctxSup({ instalaciones: [instA] });
    // Dentro de alcance: URL firmada y actividad visibles.
    const url = await dato<{ url: string }>(ctx, "core.documentos.url_descarga", { id: docA });
    expect(url.url).toBeTruthy();
    const actA = await dato<{ items: unknown[] }>(ctxSup({ instalaciones: [instA] }), "core.actividad.list", {
      entidad: { tipo: "documento", id: docA },
    });
    expect(actA.items).toHaveLength(1);
    // Documento de una instalación ajena: NOT_FOUND en la URL y actividad vacía (no la del otro doc).
    const urlFuera = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.documentos.url_descarga", { id: docFuera });
    expect(urlFuera).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const actFuera = await dato<{ items: unknown[] }>(ctxSup({ instalaciones: [instA] }), "core.actividad.list", {
      entidad: { tipo: "documento", id: docFuera },
    });
    expect(actFuera.items).toHaveLength(0);
    // Documento de empresa (nivel tenant, sin instalación ni persona): el supervisor no lo ve.
    const urlEmpresa = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.documentos.url_descarga", { id: docEmpresa });
    expect(urlEmpresa).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const actEmpresa = await dato<{ items: unknown[] }>(ctxSup({ instalaciones: [instA] }), "core.actividad.list", {
      entidad: { tipo: "documento", id: docEmpresa },
    });
    expect(actEmpresa.items).toHaveLength(0);
  });

  it("CA-B3 parcial: el supervisor no ve personas (sin relación real persona ↔ instalación)", async () => {
    const ctx = ctxSup({ instalaciones: [instA] });
    const personas = await dato<{ items: unknown[] }>(ctx, "core.personas.list", {});
    expect(personas.items).toHaveLength(0);
    const ficha = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.personas.get", { id: personaId });
    expect(ficha).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const act = await dato<{ items: unknown[] }>(ctxSup({ instalaciones: [instA] }), "core.actividad.list", {
      entidad: { tipo: "persona", id: personaId },
    });
    expect(act.items).toHaveLength(0);
  });

  it("solo owner o admin fijan el alcance: un gerente con users.manage no puede (escalada)", async () => {
    const ctxGerente = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      rol: "gerente",
      excepciones: [{ permiso: PERMISOS_CORE.usersManage, conceder: true }],
      medidor,
    });
    const r = await mod.executeCapability(ctxGerente, "core.supervisores.asignar", {
      membershipId: membershipSup,
      instalacionIds: [instA],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("nadie se asigna alcance a sí mismo", async () => {
    const ctxSelf = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userSupId },
      usuario: { id: userSupId, nombre: "Supervisor", email: "sup@prueba.cl", platformRole: null },
      rol: "admin",
      medidor,
    });
    const r = await mod.executeCapability(ctxSelf, "core.supervisores.asignar", {
      membershipId: membershipSup,
      instalacionIds: [instA],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("nadie da más alcance que el propio", async () => {
    const ctxAcotado = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      rol: "admin",
      alcance: { instalaciones: [instA] },
      medidor,
    });
    const r = await mod.executeCapability(ctxAcotado, "core.supervisores.asignar", {
      membershipId: membershipSup,
      instalacionIds: [instB],
    });
    expect(r).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
