// Rendiciones R2d (CAR-205) con Postgres real: el administrador que se nombra en «sin permiso» y el
// acceso al respaldo ya subido (alcance en la consulta, dos empresas).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Rol = "owner" | "admin" | "gerente" | "supervisor" | "viewer";

describe.skipIf(omitirSuiteDb())("Rendiciones · R2d (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "", c: "" };
  let instA = "";
  let rendId = "";
  let docId = "";
  const u = {
    duenaA: randomUUID(),
    duenoB: randomUUID(),
    rinde: randomUUID(),
    aprueba: randomUUID(),
    otroSup: randomUUID(),
    viewerA: randomUUID(),
    viewerC: randomUUID(),
    gerenteB: randomUUID(),
  };

  const ctx = (uid: string, rol: Rol, tid: string, alcance: readonly string[] | null) => {
    const c = mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@r2d.test`, platformRole: null },
      portal: rol === "supervisor" ? "supervisor" : "erp",
      portalesMembresia: [rol === "supervisor" ? "supervisor" : "erp"],
      rol,
      modulosActivos: ["rendiciones"],
      ...(alcance ? { alcance: { instalaciones: alcance } } : {}),
      medidor: { registrar: async () => undefined },
    });
    c.servicios.almacenamiento.urlDescarga = async () => "https://archivo.example.test/boleta";
    return c;
  };
  const como = (uid: string, rol: Rol, tid: string, alcance: readonly string[] | null = null) =>
    (id: string, input: Record<string, unknown> = {}) =>
      mod.executeCapability(ctx(uid, rol, tid, alcance), id, input);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (slug: string) =>
      e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } });
    t.a = (await mk("r2d-a")).id;
    t.b = (await mk("r2d-b")).id;
    t.c = (await mk("r2d-c")).id;
    const c = await e.admin.cuenta.create({ data: { tenantId: t.a, nombre: "Cliente R2d", rut: "76444555-6" } });
    instA = (await e.admin.instalacion.create({ data: { tenantId: t.a, cuentaId: c.id, nombre: "Planta R2d", estado: "activa", lat: -33.45, lng: -70.66 } })).id;
    for (const [id, nombre, rol, tid, portal] of [
      [u.duenaA, "Dueña Alfa", "owner", t.a, "erp"],
      [u.duenoB, "Dueño Beta", "owner", t.b, "erp"],
      [u.rinde, "Rita Rinde", "supervisor", t.a, "supervisor"],
      [u.aprueba, "Ana Aprueba", "gerente", t.a, "erp"],
      [u.otroSup, "Otra Sup", "supervisor", t.a, "supervisor"],
      [u.viewerA, "Vera Viewer", "viewer", t.a, "erp"],
      [u.viewerC, "Vico Viewer", "viewer", t.c, "erp"],
      [u.gerenteB, "Gabi Gerente", "gerente", t.b, "erp"],
    ] as const) {
      await e.admin.user.create({ data: { id, name: nombre, email: `${id.slice(0, 8)}@r2d.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: [portal] } });
    }
    docId = (await e.admin.documento.create({ data: { tenantId: t.a, nombre: "boleta.jpg", mime: "image/jpeg", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "user", creadoPorId: u.rinde } })).id;
    const r = await como(u.rinde, "supervisor", t.a, [instA])("rendiciones.rendiciones.crear", {
      descripcion: "Compra con boleta", centroCosto: "instalacion", instalacionId: instA, aprobadorId: u.aprueba,
      items: [{ fecha: "2026-11-02", proveedor: "Ferretería", folio: "D-1", descripcion: "Candados", monto: 9_000, documentoId: docId }],
    });
    if (!r.ok) throw new Error(r.error.message);
    rendId = (r.data as { id: string }).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("el administrador se nombra solo con el nombre, también para quien no tiene el permiso de rendir", async () => {
    const r = await como(u.viewerA, "viewer", t.a)("rendiciones.administrador.consultar");
    expect(r).toMatchObject({ ok: true, data: { nombre: "Dueña Alfa" } });
    expect(Object.keys((r as { data: object }).data)).toEqual(["nombre"]);
    expect(await como(u.viewerA, "viewer", t.a)("rendiciones.rendiciones.listar")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("no cruza empresas, y sin administrador identificable devuelve null", async () => {
    expect(await como(u.gerenteB, "gerente", t.b)("rendiciones.administrador.consultar")).toMatchObject({ ok: true, data: { nombre: "Dueño Beta" } });
    expect(await como(u.viewerC, "viewer", t.c)("rendiciones.administrador.consultar")).toMatchObject({ ok: true, data: { nombre: null } });
  });

  it("el respaldo lo abren quien rindió y el aprobador; un colega con alcance acotado no, ni otra empresa", async () => {
    const entrada = { rendicionId: rendId, documentoId: docId };
    const id = "rendiciones.respaldos.url_descarga";
    expect(await como(u.rinde, "supervisor", t.a, [instA])(id, entrada)).toMatchObject({ ok: true, data: { url: "https://archivo.example.test/boleta" } });
    expect(await como(u.aprueba, "gerente", t.a)(id, entrada)).toMatchObject({ ok: true });
    expect(await como(u.otroSup, "supervisor", t.a, [instA])(id, entrada)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await como(u.gerenteB, "gerente", t.b)(id, entrada)).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await como(u.viewerA, "viewer", t.a)(id, entrada)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("un documento que no es de esa rendición no se abre por esta vía", async () => {
    const ajeno = (await e.admin.documento.create({ data: { tenantId: t.a, nombre: "otro.pdf", mime: "application/pdf", tamano: 10, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "user", creadoPorId: u.rinde } })).id;
    expect(await como(u.rinde, "supervisor", t.a, [instA])("rendiciones.respaldos.url_descarga", { rendicionId: rendId, documentoId: ajeno })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("la lectura del respaldo queda auditada solo con el ID del documento", async () => {
    const filas = await e.admin.auditEvent.findMany({ where: { tenantId: t.a, capability: "rendiciones.respaldos.url_descarga" } });
    expect(filas.length).toBeGreaterThan(0);
    expect(JSON.stringify(filas)).toContain(docId);
  });
});
