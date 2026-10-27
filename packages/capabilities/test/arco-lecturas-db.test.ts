// NÚCLEO-H: lectura, alcance y auditoría real, con rol NOBYPASSRLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

const LISTA = "core.cumplimiento.solicitudes_listar";
const FICHA = "core.cumplimiento.solicitud_obtener";

describe.skipIf(!urlPropietario)("ARCO: revelación mínima auditada y alcance", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  let tenantA = "",
    tenantB = "",
    instA = "",
    visible = "",
    visible2 = "",
    oculta = "",
    ajena = "";
  const actorId = randomUUID();
  const ctx = (tenantId = tenantA, acotado = true, permiso = true) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: actorId },
      rol: acotado ? "supervisor" : "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      alcance: acotado ? { instalaciones: [instA] } : null,
      permisosRol: permiso ? [PERMISOS_CORE.cumplimientoRead] : [],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = (id: string, input = {}, c = ctx()) => mod.executeCapability(c, id, input);
  const auditoria = () =>
    e.admin.auditEvent.findMany({
      where: { tenantId: tenantA, capability: { in: [LISTA, FICHA] } },
      orderBy: { seq: "asc" },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID();
    tenantA = (
      await e.admin.tenant.create({
        data: { slug: `arco-h-a-${s}`, nombre: "A", vertical: "seguridad" },
      })
    ).id;
    tenantB = (
      await e.admin.tenant.create({
        data: { slug: `arco-h-b-${s}`, nombre: "B", vertical: "seguridad" },
      })
    ).id;
    const cuenta = async (nombre: string) =>
      e.admin.cuenta.create({ data: { tenantId: tenantA, nombre } });
    const a = await cuenta("A"),
      b = await cuenta("B");
    instA = (
      await e.admin.instalacion.create({ data: { tenantId: tenantA, cuentaId: a.id, nombre: "A" } })
    ).id;
    const contacto = async (cuentaId: string) =>
      e.admin.contacto.create({
        data: { tenantId: tenantA, cuentaId, nombres: "Ficticio", apellidos: "Prueba" },
      });
    const ca = await contacto(a.id),
      cb = await contacto(b.id);
    const solicitud = async (
      tenantId: string,
      titularId: string | null,
      titularTipo: string | null = "contacto",
    ) =>
      (
        await e.admin.solicitudArco.create({
          data: {
            tenantId,
            tipo: "acceso",
            titularId,
            titularTipo,
            titularNombre: "NO COPIAR NOMBRE",
            titularEmail: "no-copiar@example.test",
            resultado: "NO COPIAR RESULTADO",
          },
        })
      ).id;
    visible = await solicitud(tenantA, ca.id);
    visible2 = await solicitud(tenantA, ca.id);
    oculta = await solicitud(tenantA, cb.id);
    ajena = await solicitud(tenantB, ca.id);
    await solicitud(tenantA, randomUUID(), "persona");
    await solicitud(tenantA, null, null);
    await solicitud(tenantA, randomUUID()); // referencia inexistente: tampoco habilita acceso
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("solo revela contactos de cuentas a cargo y audita exactamente la página, no el centinela", async () => {
    const r = await ejecutar(LISTA, { limite: 1 });
    expect(r).toMatchObject({ ok: true });
    if (!r.ok) return;
    const p = r.data as { items: { id: string }[]; siguiente: string };
    expect(p.items.map((x) => x.id)).toEqual([visible2]);
    expect(p.siguiente).toBe(visible2);
    const audit = (await auditoria()).at(-1)!;
    expect(audit).toMatchObject({
      actorId,
      actorType: "user",
      tenantId: tenantA,
      capability: LISTA,
      payload: { ids: [visible2] },
    });
    expect(JSON.stringify(audit.payload)).not.toMatch(/NO COPIAR|example\.test/);
    expect(await ejecutar(LISTA, { cursor: p.siguiente, limite: 1 })).toMatchObject({
      ok: true,
      data: { items: [{ id: visible }], siguiente: null },
    });
    expect((await auditoria()).at(-1)?.payload).toEqual({ ids: [visible] });
  });

  it("fuera de alcance, otro tenant e inexistente son indistinguibles incluso como cursor", async () => {
    const antes = (await auditoria()).length;
    for (const capacidad of [FICHA, LISTA]) {
      const respuestas = await Promise.all(
        [oculta, ajena, randomUUID()].map((id) =>
          ejecutar(capacidad, capacidad === FICHA ? { id } : { cursor: id }),
        ),
      );
      for (const r of respuestas) expect(r).toEqual(respuestas[0]);
      expect(respuestas[0]).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    expect((await auditoria()).length).toBe(antes);
    expect(await ejecutar(FICHA, { id: visible }, ctx(tenantB, false))).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await ejecutar(LISTA, {}, ctx(tenantB, false))).toMatchObject({
      ok: true,
      data: { items: [{ id: ajena }] },
    });
    expect(await ejecutar(FICHA, { id: visible }, ctx(tenantA, true, false))).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN" },
    });
  });

  it("sin instalaciones no enumera; sin alcance acotado conserva todas las solicitudes del tenant", async () => {
    const sinInst = ctx();
    sinInst.alcance = { instalaciones: [] };
    expect(await ejecutar(LISTA, {}, sinInst)).toMatchObject({ ok: true, data: { items: [] } });
    expect((await auditoria()).at(-1)?.payload).toEqual({ ids: [] });
    const r = await ejecutar(LISTA, {}, ctx(tenantA, false));
    expect(r.ok && (r.data as { items: unknown[] }).items).toHaveLength(6);
  });

  it("lecturas concurrentes dejan un evento cada una y no entregan datos si falla el insert", async () => {
    const antes = (await auditoria()).length;
    const rs = await Promise.all([visible, visible2, visible].map((id) => ejecutar(FICHA, { id })));
    expect(rs.every((r) => r.ok)).toBe(true);
    const nuevos = (await auditoria()).slice(antes);
    expect(nuevos).toHaveLength(3);
    expect(nuevos.every((a) => a.hash.length === 64 && a.payload !== null)).toBe(true);
    expect(nuevos.map((a) => a.payload)).toEqual(
      expect.arrayContaining([{ ids: [visible] }, { ids: [visible2] }]),
    );
    const c = ctx();
    const registrar = c.auditoria.registrar;
    c.auditoria = {
      ...c.auditoria,
      registrar: async (tx, evento) => {
        await registrar(tx, evento);
        throw new Error("Fallo simulado después del insert");
      },
    };
    expect(await ejecutar(FICHA, { id: visible }, c)).toMatchObject({
      ok: false,
      error: { code: "INTERNAL" },
    });
    expect((await auditoria()).length).toBe(antes + 3); // rollback real, no evento huérfano
  });

  it("el permiso de gestionar no permite eludir alcance por mutaciones ni por su vista previa", async () => {
    const gestor = ctx();
    const permisos = new Set<string>([
      PERMISOS_CORE.cumplimientoRead,
      PERMISOS_CORE.cumplimientoManage,
    ]);
    gestor.autorizar = (p) => permisos.has(p);
    for (const dryRun of [true, false]) {
      for (const [capacidad, extra] of [
        ["solicitud_avanzar", {}],
        ["solicitud_resolver", { estado: "resuelta", resultado: "Resuelta" }],
        ["solicitud_exportar", {}],
      ] as const) {
        const respuestas = await Promise.all(
          [oculta, ajena, randomUUID()].map((id) =>
            mod.executeCapability(
              gestor,
              `core.cumplimiento.${capacidad}`,
              { ...extra, ...(capacidad === "solicitud_exportar" ? { solicitudId: id } : { id }) },
              { dryRun },
            ),
          ),
        );
        for (const r of respuestas) expect(r).toEqual(respuestas[0]);
        expect(respuestas[0]).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
      }
      expect(
        await mod.executeCapability(
          gestor,
          "core.cumplimiento.solicitud_crear",
          {
            tipo: "acceso",
            titularEmail: "externo@example.test",
          },
          { dryRun },
        ),
      ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const titularId = (await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: oculta } }))
        .titularId;
      expect(
        await mod.executeCapability(
          gestor,
          "core.cumplimiento.solicitud_crear",
          {
            tipo: "acceso",
            titular: { tipo: "contacto", id: titularId },
          },
          { dryRun },
        ),
      ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    expect((await e.admin.solicitudArco.findUniqueOrThrow({ where: { id: oculta } })).estado).toBe(
      "recibida",
    );
    expect(
      await mod.executeCapability(gestor, "core.cumplimiento.solicitud_avanzar", { id: visible }),
    ).toMatchObject({
      ok: true,
      data: { estado: "en_proceso" },
    });
  });
});
