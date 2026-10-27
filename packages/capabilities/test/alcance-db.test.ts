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
  let docPersonaExtra = "";
  let docEmpresaExtra = "";
  let docConAjeno = "";
  let docV1 = "";
  let docV2 = "";
  let personaId = "";
  const userSupId = randomUUID();

  const medidor = { registrar: async () => undefined };
  const servicios = { almacenamiento: almacenamientoEnMemoria().almacenamiento };
  const ctxOwner = () =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", medidor });
  // Escenario de alcance por filas: rol supervisor CON ERP, ejecutando capacidades ERP.
  // El portal Supervisor sin ERP tiene cobertura separada en portal-sesion(-db).test.ts.
  const ctxSup = (alcance: Alcance | null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: userSupId },
      portal: "erp",
      portalesMembresia: ["erp", "supervisor"],
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
    mod.limpiarConsumidores();
    mod.registrarConsumidores(mod.consumidoresDelNucleo);
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
        data: { tenantId, userId: u.id, rol: "supervisor", portales: ["erp", "supervisor"] },
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
    // B-A (revisión 5659548788): fugas por tipo de dueño y por vínculos ajenos. El supervisor solo
    // ve un documento si su DUEÑO (vínculo `propietario`) está a cargo; un vínculo extra a una
    // instalación a cargo no debe hacer visible un documento de persona o de empresa.
    docPersonaExtra = await doc("docPersonaExtra.pdf");
    docEmpresaExtra = await doc("docEmpresaExtra.pdf");
    docConAjeno = await doc("docConAjeno.pdf");
    await e.admin.documentoVinculo.createMany({
      data: [
        // Dueño persona (fuera de alcance) + vínculo extra a instA (a cargo): sigue invisible.
        { tenantId, documentoId: docPersonaExtra, entidadTipo: "persona", entidadId: personaId, rol: "propietario" },
        { tenantId, documentoId: docPersonaExtra, entidadTipo: "instalacion", entidadId: instA, rol: "referencia" },
        // Dueño empresa (tenant) + vínculo extra a instA: sigue invisible.
        { tenantId, documentoId: docEmpresaExtra, entidadTipo: "tenant", entidadId: tenantId, rol: "propietario" },
        { tenantId, documentoId: docEmpresaExtra, entidadTipo: "instalacion", entidadId: instA, rol: "referencia" },
        // Dueño instA (a cargo) + vínculo extra a la persona (ajena): el documento se ve, el vínculo no.
        { tenantId, documentoId: docConAjeno, entidadTipo: "instalacion", entidadId: instA, rol: "propietario" },
        { tenantId, documentoId: docConAjeno, entidadTipo: "persona", entidadId: personaId, rol: "referencia" },
      ],
    });
    // Cadena de versiones de un documento a cargo (dueño instA): las versiones NO se filtran.
    const docVersion = async (nombre: string, version: number, estado: string, reemplazaAId: string | null) =>
      (
        await e.admin.documento.create({
          data: {
            tenantId,
            nombre,
            mime: "application/pdf",
            tamano: 1_000,
            storageKey: `k-${randomUUID()}`,
            estado,
            version,
            reemplazaAId,
            creadoPorTipo: "user",
          },
        })
      ).id;
    docV1 = await docVersion("docV1.pdf", 1, "reemplazado", null);
    docV2 = await docVersion("docV2.pdf", 2, "disponible", docV1);
    await e.admin.documentoVinculo.createMany({
      data: [
        { tenantId, documentoId: docV1, entidadTipo: "instalacion", entidadId: instA, rol: "propietario" },
        { tenantId, documentoId: docV2, entidadTipo: "instalacion", entidadId: instA, rol: "propietario" },
      ],
    });
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

  // Revisión del PR #49 (autorrevisión, punto 1 del encargo): `core.patrones.list/get` contaban
  // TODOS los puestos activos del patrón, sin aplicar el alcance del supervisor (B3). Un patrón
  // usado en una instalación a cargo y otra ajena debe contar solo la primera.
  it("el conteo de puestosActivos en patrones respeta el alcance del supervisor (B3)", async () => {
    const o = ctxOwner();
    const sufijo = randomUUID().slice(0, 8);
    const cargo = (await dato<{ id: string }>(o, "core.cargos.create", { nombre: `Alcance ${sufijo}` }))
      .id;
    const patron = await dato<{ id: string }>(o, "core.patrones.create", {
      nombre: `Alcance ${sufijo}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const puesto = (inst: string, nombre: string) =>
      dato(o, "core.puestos.create", {
        instalacionId: inst,
        cargoId: cargo,
        patronId: patron.id,
        nombre,
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      });
    await puesto(instA, `Alcance Alfa ${sufijo}`);
    await puesto(instB, `Alcance Beta ${sufijo}`);
    // El owner (sin alcance acotado) ve las dos posiciones.
    const comoOwner = await dato<{ puestosActivos: number }>(o, "core.patrones.get", { id: patron.id });
    expect(comoOwner.puestosActivos).toBe(2);
    // El supervisor solo tiene instA a cargo: el conteo cuenta solo esa, nunca la de instB (fuga).
    const ctx = ctxSup({ instalaciones: [instA] });
    const comoSup = await dato<{ puestosActivos: number }>(ctx, "core.patrones.get", { id: patron.id });
    expect(comoSup.puestosActivos).toBe(1);
    const lista = await dato<{ puestosActivos: number; id: string }[]>(ctx, "core.patrones.list", {});
    expect(lista.find((p) => p.id === patron.id)?.puestosActivos).toBe(1);
    // Sin instalaciones a cargo: fail-closed, cero (nunca el total del tenant por error).
    const sinAlcance = await dato<{ puestosActivos: number }>(
      ctxSup({ instalaciones: [] }),
      "core.patrones.get",
      { id: patron.id },
    );
    expect(sinAlcance.puestosActivos).toBe(0);
  });

  // Mismo hallazgo (revisión de esta autorrevisión): `core.funciones.list/get` tenía la misma fuga.
  it("el conteo de puestosActivos en funciones respeta el alcance del supervisor (B3)", async () => {
    const o = ctxOwner();
    const sufijo = randomUUID().slice(0, 8);
    const cargo = (await dato<{ id: string }>(o, "core.cargos.create", { nombre: `AlcFun ${sufijo}` }))
      .id;
    const funcion = await dato<{ id: string }>(o, "core.funciones.create", {
      nombre: `Alcance ${sufijo}`,
    });
    const puesto = (inst: string, nombre: string) =>
      dato(o, "core.puestos.create", {
        instalacionId: inst,
        cargoId: cargo,
        funcionId: funcion.id,
        nombre,
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      });
    await puesto(instA, `Func Alfa ${sufijo}`);
    await puesto(instB, `Func Beta ${sufijo}`);
    const comoOwner = await dato<{ puestosActivos: number }>(o, "core.funciones.get", {
      id: funcion.id,
    });
    expect(comoOwner.puestosActivos).toBe(2);
    const ctx = ctxSup({ instalaciones: [instA] });
    const comoSup = await dato<{ puestosActivos: number }>(ctx, "core.funciones.get", {
      id: funcion.id,
    });
    expect(comoSup.puestosActivos).toBe(1);
    const lista = await dato<{ puestosActivos: number; id: string }[]>(ctx, "core.funciones.list", {});
    expect(lista.find((f) => f.id === funcion.id)?.puestosActivos).toBe(1);
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

  it("B-A: un documento de persona o de empresa no se ve aunque tenga un vínculo a una instalación a cargo", async () => {
    const persona = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.documentos.get", {
      id: docPersonaExtra,
    });
    expect(persona).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const empresa = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.documentos.get", {
      id: docEmpresaExtra,
    });
    expect(empresa).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    // Tampoco entran en la lista agregada por alcance (sin entidad), ni en la URL de descarga.
    const lista = await dato<{ items: { id: string }[] }>(ctxSup({ instalaciones: [instA] }), "core.documentos.list", {});
    const ids = lista.items.map((d) => d.id);
    expect(ids).not.toContain(docPersonaExtra);
    expect(ids).not.toContain(docEmpresaExtra);
    const url = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.documentos.url_descarga", {
      id: docPersonaExtra,
    });
    expect(url).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("B-A: la lista por entidad de una instalación a cargo no incluye documentos ajenos vinculados por referencia", async () => {
    // La lista filtrada por {entidad: instA} cruza por dueño (ADR-022): los documentos de persona o
    // de empresa que solo tienen un vínculo de referencia con instA no aparecen; los propios sí.
    const lista = await dato<{ items: { id: string }[] }>(ctxSup({ instalaciones: [instA] }), "core.documentos.list", {
      entidad: { tipo: "instalacion", id: instA },
    });
    const ids = lista.items.map((d) => d.id);
    expect(ids).toContain(docA); // dueño instA: visible
    expect(ids).toContain(docConAjeno); // dueño instA (con vínculo de referencia a una persona): visible
    expect(ids).not.toContain(docPersonaExtra); // dueño persona, solo referencia a instA: no
    expect(ids).not.toContain(docEmpresaExtra); // dueño empresa, solo referencia a instA: no
    // El owner (sin alcance acotado) sí ve los vinculados por referencia a la instalación.
    const listaOwner = await dato<{ items: { id: string }[] }>(ctxOwner(), "core.documentos.list", {
      entidad: { tipo: "instalacion", id: instA },
    });
    const idsOwner = listaOwner.items.map((d) => d.id);
    expect(idsOwner).toContain(docPersonaExtra);
    expect(idsOwner).toContain(docEmpresaExtra);
  });

  it("B-A: la ficha de un documento a cargo no expone vínculos ajenos y no filtra sus versiones", async () => {
    const conAjeno = await dato<{ vinculos: { entidadTipo: string; entidadId: string; rol: string }[] }>(
      ctxSup({ instalaciones: [instA] }),
      "core.documentos.get",
      { id: docConAjeno },
    );
    // Solo el vínculo propietario a instA; el de la persona ajena no se devuelve (no se filtran ids ajenos).
    expect(conAjeno.vinculos).toEqual([{ entidadTipo: "instalacion", entidadId: instA, rol: "propietario" }]);
    expect(conAjeno.vinculos.some((v) => v.entidadTipo === "persona")).toBe(false);
    // Las versiones del mismo dueño (a cargo) NO se filtran: la ficha de la vigente trae la anterior.
    const conVersiones = await dato<{ versiones: { id: string }[] }>(
      ctxSup({ instalaciones: [instA] }),
      "core.documentos.get",
      { id: docV2 },
    );
    expect(conVersiones.versiones.map((v) => v.id)).toEqual([docV1]);
  });

  it("CA-B3 parcial: el supervisor no ve personas (sin relación real persona ↔ instalación)", async () => {
    const ctx = ctxSup({ instalaciones: [instA] });
    const personas = await dato<{ items: unknown[]; total: number }>(ctx, "core.personas.list", {});
    expect(personas.items).toHaveLength(0);
    expect(personas.total).toBe(0); // El count optimizado aplica el mismo alcance que la página.
    const ficha = await mod.executeCapability(ctxSup({ instalaciones: [instA] }), "core.personas.get", { id: personaId });
    expect(ficha).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const act = await dato<{ items: unknown[] }>(ctxSup({ instalaciones: [instA] }), "core.actividad.list", {
      entidad: { tipo: "persona", id: personaId },
    });
    expect(act.items).toHaveLength(0);
  });

  it("B-B: el aviso de un documento llega solo a los supervisores que lo tienen en su alcance", async () => {
    const o = ctxOwner();
    // El supervisor del alcance queda asignado a instA (dueño de docA); un segundo supervisor, no.
    await dato(o, "core.supervisores.asignar", { membershipId: membershipSup, instalacionIds: [instA] });
    const sufijo = randomUUID().slice(0, 8);
    const user2 = await e.admin.user.create({
      data: { name: "Supervisor 2", email: `sup2-${sufijo}@prueba.cl` },
    });
    await e.admin.membership.create({
      data: { tenantId, userId: user2.id, rol: "supervisor", portales: ["supervisor"] },
    });
    // Regla: avisar a los supervisores por la bandeja (inapp) cuando un documento esté por vencer.
    await dato(o, "core.notificacion_reglas.set", {
      evento: "core.documento.por_vencer",
      canal: "inapp",
      roles: ["supervisor"],
      usuarios: [],
      activa: true,
    });
    // Evento del outbox para docA (dueño: instA).
    const ev = await e.admin.evento.create({
      data: {
        tenantId,
        tipo: "core.documento.por_vencer",
        entidadTipo: "documento",
        entidadId: docA,
        actorTipo: "system",
        payload: { venceEn: "2026-12-31", dias: 7, tipoId: null },
      },
    });
    await mod.despacharPendientes(ctxOwner());
    const delSup = await e.admin.notificacion.findFirst({
      where: { eventoId: ev.id, usuarioId: userSupId },
    });
    const delOtro = await e.admin.notificacion.findFirst({
      where: { eventoId: ev.id, usuarioId: user2.id },
    });
    expect(delSup).not.toBeNull(); // supervisor con docA en su alcance: recibe el aviso
    expect(delOtro).toBeNull(); // supervisor sin instA: no lo recibe

    // B-B: un supervisor fuera de alcance no se cuela por estar en los usuarios explícitos de la
    // regla. Se aplica `supervisoresPermitidos` a todo supervisor, venga del rol o de los usuarios.
    await dato(o, "core.notificacion_reglas.set", {
      evento: "core.documento.por_vencer",
      canal: "inapp",
      roles: [],
      usuarios: [user2.id, userSupId],
      activa: true,
    });
    const ev2 = await e.admin.evento.create({
      data: {
        tenantId,
        tipo: "core.documento.por_vencer",
        entidadTipo: "documento",
        entidadId: docA,
        actorTipo: "system",
        payload: { venceEn: "2026-12-31", dias: 7, tipoId: null },
      },
    });
    await mod.despacharPendientes(ctxOwner());
    const explicitoEnAlcance = await e.admin.notificacion.findFirst({
      where: { eventoId: ev2.id, usuarioId: userSupId },
    });
    const explicitoFuera = await e.admin.notificacion.findFirst({
      where: { eventoId: ev2.id, usuarioId: user2.id },
    });
    expect(explicitoEnAlcance).not.toBeNull(); // supervisor explícito con docA a cargo: recibe
    expect(explicitoFuera).toBeNull(); // supervisor explícito pero sin instA: no se cuela
  });

  it("solo owner o admin fijan el alcance: un gerente con users.manage no puede (escalada)", async () => {
    const ctxGerente = mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
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
      portal: "erp",
      portalesMembresia: ["erp"],
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
      portal: "erp",
      portalesMembresia: ["erp"],
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
