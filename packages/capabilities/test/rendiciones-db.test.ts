// Rendiciones R1 (CAR-175) con Postgres real: flujo borrador → enviada → decidida, que nadie decide la
// suya, aprobador asignado, códigos REN-n sin repetirse, duplicados, respaldo y aislamiento entre empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Item = Record<string, unknown>;

describe.skipIf(omitirSuiteDb())("Rendiciones · R1 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let instA = "";
  let instB = "";
  const rinde = randomUUID();
  const aprueba = randomUUID();
  const otroAprobador = randomUUID();
  const ajeno = randomUUID();

  type Rol = "supervisor" | "gerente";
  const ctx = (uid: string, rol: Rol, tid = tenantA) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@rend.test`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["rendiciones"],
      medidor: { registrar: async () => undefined },
    });
  const como = (uid: string, rol: Rol, tid?: string) => (id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }) =>
    mod.executeCapability(ctx(uid, rol, tid), id, input, opts);
  const yo = como(rinde, "supervisor");
  const jefe = como(aprueba, "gerente");
  const dato = async <T>(r: Awaited<ReturnType<typeof yo>>): Promise<T> => {
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data as T;
  };
  const item = (extra: Item = {}): Item => ({
    fecha: "2026-11-02", proveedor: "Ferretería Sur", folio: "A-100", descripcion: "Candados", monto: 12_000,
    sinRespaldoMotivo: "La boleta se mojó", ...extra,
  });
  const cuerpo = (extra: Item = {}): Item => ({
    descripcion: "Compras de la semana", centroCosto: "instalacion", instalacionId: instA, aprobadorId: aprueba, items: [item()], ...extra,
  });
  const crear = (extra: Item = {}) => yo("rendiciones.rendiciones.crear", cuerpo(extra)).then((r) => dato<{ id: string; codigoVisible: string; montoTotal: number; advertencias: string[] }>(r));

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]); // los ajustes del módulo (respaldo, aprobador por defecto)
    const t = (slug: string) => e.admin.tenant.create({ data: { slug: `${slug}-${randomUUID().slice(0, 8)}`, nombre: slug, vertical: "seguridad" } });
    tenantA = (await t("rend-a")).id;
    tenantB = (await t("rend-b")).id;
    const inst = async (tid: string, nombre: string) => {
      const c = await e.admin.cuenta.create({ data: { tenantId: tid, nombre: `Cliente ${nombre}`, rut: "76333444-5" } });
      return (await e.admin.instalacion.create({ data: { tenantId: tid, cuentaId: c.id, nombre, estado: "activa" } })).id;
    };
    instA = await inst(tenantA, "Planta A");
    instB = await inst(tenantB, "Planta B");
    for (const [id, rol, tid] of [[rinde, "supervisor", tenantA], [aprueba, "gerente", tenantA], [otroAprobador, "gerente", tenantA], [ajeno, "gerente", tenantB]] as const) {
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@rend.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"] } });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("flujo completo: crear, enviar y aprobar; el código REN-n es correlativo por empresa", async () => {
    const a = await crear();
    const b = await crear({ descripcion: "Otra compra" });
    expect(Number(b.codigoVisible.slice(4))).toBe(Number(a.codigoVisible.slice(4)) + 1);
    expect(a.montoTotal).toBe(12_000);
    expect(await dato(await yo("rendiciones.rendiciones.enviar", { id: a.id }))).toMatchObject({ estado: "enviada" });
    expect(await dato<{ rendiciones: { id: string }[] }>(await jefe("rendiciones.rendiciones.listar", { alcance: "por_aprobar" })).then((r) => r.rendiciones.map((x) => x.id))).toContain(a.id);
    expect(await dato(await jefe("rendiciones.rendiciones.aprobar", { id: a.id }))).toMatchObject({ estado: "aprobada" });
    const { rendicion } = await dato<{ rendicion: { estado: string; items: unknown[] } }>(await yo("rendiciones.rendiciones.obtener", { id: a.id }));
    expect(rendicion.estado).toBe("aprobada");
    expect(rendicion.items).toHaveLength(1);
    const pasos = await e.admin.rendicionHistorial.findMany({ where: { rendicionId: a.id }, orderBy: { createdAt: "asc" } });
    expect(pasos.map((p) => p.tipo)).toEqual(["creada", "enviada", "aprobada"]);
  });

  it("nadie decide la suya ni lo que no tiene asignado; el aprobador debe poder aprobar", async () => {
    const r = await crear();
    await dato(await yo("rendiciones.rendiciones.enviar", { id: r.id }));
    const propia = await como(rinde, "gerente")("rendiciones.rendiciones.aprobar", { id: r.id });
    expect(propia).toMatchObject({ ok: false });
    const otro = await como(otroAprobador, "gerente")("rendiciones.rendiciones.aprobar", { id: r.id });
    expect(otro).toMatchObject({ ok: false });
    const sinPermiso = await yo("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: rinde }));
    expect(sinPermiso).toMatchObject({ ok: false });
    const aprobadorSinRol = await yo("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: randomUUID() }));
    expect(aprobadorSinRol).toMatchObject({ ok: false });
  });

  it("devolver deja corregir y reenviar; rechazar es definitivo; lo enviado no se edita", async () => {
    const r = await crear();
    await dato(await yo("rendiciones.rendiciones.enviar", { id: r.id }));
    expect(await yo("rendiciones.rendiciones.actualizar", { id: r.id, ...cuerpo() })).toMatchObject({ ok: false });
    expect(await jefe("rendiciones.rendiciones.devolver", { id: r.id, motivo: "Falta la boleta del segundo gasto" })).toMatchObject({ ok: true });
    expect(await yo("rendiciones.rendiciones.actualizar", { id: r.id, ...cuerpo({ items: [item({ monto: 20_000 }), item({ folio: "A-101", monto: 5_000 })] }) })).toMatchObject({ ok: true, data: { montoTotal: 25_000 } });
    await dato(await yo("rendiciones.rendiciones.enviar", { id: r.id }));
    expect(await jefe("rendiciones.rendiciones.rechazar", { id: r.id, motivo: "No corresponde a la empresa" })).toMatchObject({ ok: true });
    expect(await yo("rendiciones.rendiciones.enviar", { id: r.id })).toMatchObject({ ok: false });
    expect(await jefe("rendiciones.rendiciones.aprobar", { id: r.id })).toMatchObject({ ok: false });
  });

  it("avisa la boleta repetida, exige respaldo o motivo y rechaza fechas futuras o instalaciones ajenas", async () => {
    await crear({ items: [item({ folio: "DUP-1", monto: 7_777 })] });
    const otra = await crear({ items: [item({ proveedor: "ferreteria sur", folio: "DUP-1", monto: 7_777 })] });
    expect(otra.advertencias).toHaveLength(1);
    const sinNada = item();
    delete sinNada.sinRespaldoMotivo;
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ items: [sinNada] }))).toMatchObject({ ok: false });
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ items: [item({ fecha: "2999-01-01" })] }))).toMatchObject({ ok: false });
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ instalacionId: instB }))).toMatchObject({ ok: false });
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ centroCosto: "administracion", instalacionId: undefined }))).toMatchObject({ ok: true });
  });

  it("el aviso de duplicado no revela rendiciones que quien consulta no puede ver", async () => {
    await crear({ items: [item({ folio: "DUP-2", monto: 8_888 })] });
    const ajeno = como(otroAprobador, "supervisor");
    const vista = await ajeno("rendiciones.rendiciones.crear", cuerpo({ items: [item({ folio: "DUP-2", monto: 8_888 })] }), { dryRun: true });
    expect((await dato<{ advertencias: string[] }>(vista)).advertencias).toEqual([]);
    expect(JSON.stringify(vista)).not.toMatch(/REN-[1-9]/);
    const r = await ajeno("rendiciones.rendiciones.crear", cuerpo({ items: [item({ folio: "DUP-2", monto: 8_888 })] }));
    expect((await dato<{ advertencias: string[] }>(r)).advertencias).toEqual([]);
    const conPermiso = await jefe("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: undefined, items: [item({ folio: "DUP-2", monto: 8_888 })] }));
    expect((await dato<{ advertencias: string[] }>(conPermiso)).advertencias).toHaveLength(2); // ve ambas
  });

  it("el aprobador se valida con sus permisos efectivos: una excepción concede o deniega sobre el rol", async () => {
    const miembro = async (rol: Rol, conceder: boolean) => {
      const id = randomUUID();
      await e.admin.user.create({ data: { id, name: rol, email: `${id.slice(0, 8)}@rend.test` } });
      const m = await e.admin.membership.create({ data: { tenantId: tenantA, userId: id, rol, portales: ["erp"] } });
      await e.admin.permisoExcepcion.create({ data: { tenantId: tenantA, membershipId: m.id, permiso: "rendiciones:aprobar", conceder } });
      return id;
    };
    const supervisorConcedido = await miembro("supervisor", true);
    const gerenteDenegado = await miembro("gerente", false);
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: supervisorConcedido }))).toMatchObject({ ok: true });
    expect(await yo("rendiciones.rendiciones.crear", cuerpo({ aprobadorId: gerenteDenegado }))).toMatchObject({ ok: false });
  });

  it("el respaldo debe ser un documento ya subido y confirmado, no uno pendiente", async () => {
    const doc = (estado: string, por = rinde) =>
      e.admin.documento.create({
        data: { tenantId: tenantA, nombre: "boleta.pdf", mime: "application/pdf", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado, creadoPorTipo: "user", creadoPorId: por },
      }).then((d) => d.id);
    const conDoc = (documentoId: string) => cuerpo({ items: [item({ documentoId, sinRespaldoMotivo: undefined, folio: `R-${documentoId.slice(0, 6)}` })] });
    expect(await yo("rendiciones.rendiciones.crear", conDoc(await doc("pendiente")))).toMatchObject({ ok: false });
    expect(await yo("rendiciones.rendiciones.crear", conDoc(await doc("disponible")))).toMatchObject({ ok: true });
  });

  it("un supervisor no adjunta respaldos que subió otra persona", async () => {
    const ajenoDoc = await e.admin.documento
      .create({ data: { tenantId: tenantA, nombre: "ajena.pdf", mime: "application/pdf", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "user", creadoPorId: otroAprobador } })
      .then((d) => d.id);
    const r = await yo("rendiciones.rendiciones.crear", cuerpo({ items: [item({ documentoId: ajenoDoc, sinRespaldoMotivo: undefined, folio: "R-ajeno" })] }));
    expect(r).toMatchObject({ ok: false });
  });

  it("el respaldo subido por una key de agente cuenta como propio de su responsable, no de otro", async () => {
    const porKey = (via: string) =>
      e.admin.documento
        .create({ data: { tenantId: tenantA, nombre: "key.pdf", mime: "application/pdf", tamano: 1_000, storageKey: `k-${randomUUID()}`, estado: "disponible", creadoPorTipo: "agent", creadoPorId: randomUUID(), viaUserId: via } })
        .then((d) => d.id);
    const con = (documentoId: string) => cuerpo({ items: [item({ documentoId, sinRespaldoMotivo: undefined, folio: `K-${documentoId.slice(0, 6)}` })] });
    expect(await yo("rendiciones.rendiciones.crear", con(await porKey(otroAprobador)))).toMatchObject({ ok: false });
    expect(await yo("rendiciones.rendiciones.crear", con(await porKey(rinde)))).toMatchObject({ ok: true });
  });

  it("la vista previa no escribe nada", async () => {
    const antes = await e.admin.rendicion.count({ where: { tenantId: tenantA } });
    expect(await yo("rendiciones.rendiciones.crear", cuerpo(), { dryRun: true })).toMatchObject({ ok: true });
    expect(await e.admin.rendicion.count({ where: { tenantId: tenantA } })).toBe(antes);
  });

  it("aislamiento: otra empresa no ve ni toca las rendiciones, y el contador es propio", async () => {
    const r = await crear();
    const deB = como(ajeno, "gerente", tenantB);
    expect(await deB("rendiciones.rendiciones.obtener", { id: r.id })).toMatchObject({ ok: false });
    expect(await deB("rendiciones.rendiciones.aprobar", { id: r.id })).toMatchObject({ ok: false });
    const lista = await dato<{ rendiciones: unknown[] }>(await deB("rendiciones.rendiciones.listar", { alcance: "todas" }));
    expect(lista.rendiciones).toHaveLength(0);
    const propia = await deB("rendiciones.rendiciones.crear", cuerpo({ instalacionId: instB, aprobadorId: undefined, items: [item()] }));
    expect(propia).toMatchObject({ ok: true, data: { codigoVisible: "REN-1" } });
  });

  it("quien no es parte ni ve todas no encuentra la rendición", async () => {
    const r = await crear();
    const tercero = como(otroAprobador, "supervisor");
    expect(await tercero("rendiciones.rendiciones.obtener", { id: r.id })).toMatchObject({ ok: false });
  });
});
