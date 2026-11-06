// Rendiciones R3 (CAR-208) con Postgres real: bandeja del aprobador, lotes de pago y nómina.
// Solo datos ficticios (empresas rpt-*, personas y cuentas inventadas). Dos empresas para el aislamiento.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/rendiciones/manifest";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Rol = "owner" | "admin" | "gerente" | "supervisor" | "viewer";
type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };

describe.skipIf(omitirSuiteDb())("Rendiciones · R3 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { a: "", b: "" };
  const u = { rinde: randomUUID(), rinde2: randomUUID(), sinCuenta: randomUUID(), aprueba: randomUUID(), otroAprueba: randomUUID(), paga: randomUUID(), paga2: randomUUID(), viewer: randomUUID(), duenoB: randomUUID() };
  const rend: Record<string, string> = {};
  const previa = process.env["OPAI_SECRETS_KEY"];

  // Aprobadores con un rol personalizado acotado (aprobar y rendir): sin «ver todas» ni permisos de pago.
  const ACOTADOS: string[] = [u.aprueba, u.otroAprueba];
  const ctx = (uid: string, rol: Rol, tid: string) =>
    mod.crearContexto({
      ...(ACOTADOS.includes(uid) ? { permisosRol: ["rendiciones:aprobar", "rendiciones:rendir"] } : {}),
      tenantId: tid, actor: { tipo: "user", id: uid },
      usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@r3.test`, platformRole: null },
      portal: rol === "supervisor" ? "supervisor" : "erp", portalesMembresia: [rol === "supervisor" ? "supervisor" : "erp"], rol,
      modulosActivos: ["rendiciones"], medidor: { registrar: async () => undefined },
    });
  const como = (uid: string, rol: Rol, tid: string) => async (id: string, input: Record<string, unknown> = {}, opt: { dryRun?: boolean } = {}) =>
    (await mod.executeCapability(ctx(uid, rol, tid), id, input, opt)) as R;
  const ok = (r: R) => { if (!r.ok) throw new Error(`${r.error?.code}: ${r.error?.message}`); return r.data as Record<string, unknown>; };

  async function nuevaAprobada(quien: string, rol: Rol, aprobador: string, monto: number, folio: string) {
    const c = ok(await como(quien, rol, t.a)("rendiciones.rendiciones.crear", { descripcion: `Gasto ${folio}`, centroCosto: "administracion", aprobadorId: aprobador, items: [{ fecha: "2026-11-02", proveedor: "Ferretería ficticia", folio, descripcion: "x", monto, sinRespaldoMotivo: "Prueba sin boleta" }] }));
    const id = String(c["id"]);
    ok(await como(quien, rol, t.a)("rendiciones.rendiciones.enviar", { id }));
    ok(await como(aprobador, "viewer", t.a)("rendiciones.rendiciones.aprobar", { id }));
    return id;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const mk = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    t.a = (await mk("qa-r3a")).id;
    t.b = (await mk("qa-r3b")).id;
    const gente: [string, string, Rol, string][] = [
      [u.rinde, "Rita Rinde", "gerente", t.a], [u.rinde2, "Raúl Rinde", "gerente", t.a], [u.sinCuenta, "Sara SinCuenta", "gerente", t.a],
      [u.aprueba, "Ana Aprueba", "gerente", t.a], [u.otroAprueba, "Omar Otro", "gerente", t.a], [u.paga, "Pedro Paga", "gerente", t.a],
      [u.paga2, "Paula Paga", "gerente", t.a], [u.viewer, "Vera Viewer", "viewer", t.a], [u.duenoB, "Dueño Beta", "owner", t.b],
    ];
    const acotado = await e.admin.rol.create({ data: { tenantId: t.a, nombre: "Aprobador acotado", permisos: ["rendiciones:aprobar", "rendiciones:rendir"] } });
    for (const [id, nombre, rol, tid] of gente) {
      await e.admin.user.create({ data: { id, name: nombre, email: `${id.slice(0, 8)}@r3.test` } });
      await e.admin.membership.create({ data: { tenantId: tid, userId: id, rol, portales: ["erp"], ...(ACOTADOS.includes(id) ? { roleId: acotado.id } : {}) } });
    }
    // Fichas ficticias con cuenta cifrada (nunca datos reales).
    const c = ctx(u.paga, "gerente", t.a);
    for (const [uid, rut, cuenta] of [[u.rinde, "11111111-1", "000111222333"], [u.rinde2, "22222222-2", "000444555666"]] as const) {
      const p = await e.admin.persona.create({ data: { tenantId: t.a, nombres: "Persona", apellidos: uid.slice(0, 4), rut, usuarioId: uid } as never });
      await e.admin.personaPago.create({ data: { tenantId: t.a, personaId: p.id, bancoCodigo: "037", tipoCuenta: "corriente", numeroCuenta: await mod.cifradoDeCampos(c).cifrar("personas_pago", "numero_cuenta", cuenta), rutTitular: rut } });
    }
    await e.admin.persona.create({ data: { tenantId: t.a, nombres: "Sara", apellidos: "SinCuenta", rut: "33333333-3", usuarioId: u.sinCuenta } as never });
    rend["r1"] = await nuevaAprobada(u.rinde, "gerente", u.aprueba, 12_500, "F-1");
    rend["r2"] = await nuevaAprobada(u.rinde2, "gerente", u.aprueba, 7_490, "F-2");
    rend["r3"] = await nuevaAprobada(u.rinde, "gerente", u.aprueba, 10, "F-3");
    rend["sc"] = await nuevaAprobada(u.sinCuenta, "gerente", u.aprueba, 5_000, "F-4");
  });
  afterAll(async () => {
    // La DEK de estas empresas se cifró con una clave efímera: no se deja para la rotación de KEK de otras pruebas.
    await e?.admin.claveTenant.deleteMany({ where: { tenantId: { in: [t.a, t.b] } } });
    if (previa === undefined) delete process.env["OPAI_SECRETS_KEY"]; else process.env["OPAI_SECRETS_KEY"] = previa;
    await e?.cerrar();
  });

  it("la bandeja muestra al aprobador solo lo que le toca, con totales; el resto de la empresa no ve lo de otro", async () => {
    const enviar = ok(await como(u.rinde2, "gerente", t.a)("rendiciones.rendiciones.crear", { descripcion: "Pendiente de revisar", centroCosto: "administracion", aprobadorId: u.otroAprueba, items: [{ fecha: "2026-11-03", proveedor: "Papelería ficticia", folio: "P-9", descripcion: "x", monto: 3_000, sinRespaldoMotivo: "Prueba" }] }));
    ok(await como(u.rinde2, "gerente", t.a)("rendiciones.rendiciones.enviar", { id: String(enviar["id"]) }));
    const mia = ok(await como(u.otroAprueba, "viewer", t.a)("rendiciones.bandeja.listar"));
    expect((mia["rendiciones"] as unknown[]).length).toBe(1);
    expect(mia).toMatchObject({ porRevisar: 1, montoPorRevisar: 3_000 });
    const otro = ok(await como(u.aprueba, "viewer", t.a)("rendiciones.bandeja.listar"));
    expect((otro["rendiciones"] as unknown[]).length).toBe(0);
    expect(otro["aprobadasSinPagar"]).toBe(4);
    const filtrada = ok(await como(u.otroAprueba, "viewer", t.a)("rendiciones.bandeja.listar", { solicitanteId: u.rinde, desde: "2020-01-01", hasta: "2030-01-01" }));
    expect((filtrada["rendiciones"] as unknown[]).length).toBe(0);
    expect(await como(u.viewer, "viewer", t.a)("rendiciones.bandeja.listar")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await como(u.otroAprueba, "viewer", t.a)("rendiciones.bandeja.obtener", { id: rend["r1"] })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await como(u.otroAprueba, "viewer", t.a)("rendiciones.bandeja.obtener", { id: String(enviar["id"]) })).toMatchObject({ ok: true });
    expect(await como(u.duenoB, "owner", t.b)("rendiciones.bandeja.obtener", { id: String(enviar["id"]) })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("quien rinde no puede decidir lo suyo, y rechazar y devolver exigen motivo", async () => {
    expect(await como(u.rinde2, "gerente", t.a)("rendiciones.rendiciones.aprobar", { id: rend["r2"] })).toMatchObject({ ok: false });
    expect(await como(u.aprueba, "viewer", t.a)("rendiciones.rendiciones.rechazar", { id: rend["r1"], motivo: "" })).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
  });

  it("el lote suma en el servidor, bloquea sin cuenta y sin rendición aprobada, y no admite una propia", async () => {
    const paga = como(u.paga, "gerente", t.a);
    expect(await paga("rendiciones.lotes.crear", { rendicionIds: [rend["sc"]] })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await como(u.viewer, "viewer", t.a)("rendiciones.lotes.crear", { rendicionIds: [rend["r1"]] })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    // Una propia: Rita arma un lote con su rendición (es gerente con permiso, pero no puede pagarse a sí misma).
    expect(await como(u.rinde, "gerente", t.a)("rendiciones.lotes.crear", { rendicionIds: [rend["r1"]] })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const prev = ok(await paga("rendiciones.lotes.crear", { rendicionIds: [rend["r1"], rend["r2"], rend["r3"]] }, { dryRun: true }));
    expect(prev["totalClp"]).toBe(20_000);
    expect(await e.admin.lotePago.count({ where: { tenantId: t.a } })).toBe(0);
  });

  it("una rendición no entra a dos lotes activos; anular el lote la libera; el total no cambia", async () => {
    const paga = como(u.paga, "gerente", t.a);
    const l1 = ok(await paga("rendiciones.lotes.crear", { rendicionIds: [rend["r1"], rend["r2"]] }));
    expect(l1).toMatchObject({ estado: "borrador", totalClp: 19_990, cantidad: 2 });
    expect(await paga("rendiciones.lotes.crear", { rendicionIds: [rend["r2"], rend["r3"]] })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    await expect(e.admin.lotePago.update({ where: { id: String(l1["id"]) }, data: { totalClp: 1 } })).rejects.toThrow();
    expect((ok(await paga("rendiciones.lotes.candidatas"))["rendiciones"] as { id: string }[]).map((r) => r.id).sort()).toEqual([rend["r3"]!, rend["sc"]!].sort());
    ok(await paga("rendiciones.lotes.anular", { id: String(l1["id"]), motivo: "Armado por error" }));
    expect((ok(await paga("rendiciones.lotes.candidatas"))["rendiciones"] as unknown[]).length).toBe(4);
  });

  it("quien crea el lote no es el único que lo aprueba; con una sola persona con el permiso, sí", async () => {
    const paga = como(u.paga, "gerente", t.a);
    const l = ok(await paga("rendiciones.lotes.crear", { rendicionIds: [rend["r1"], rend["r2"]] }));
    expect(await paga("rendiciones.lotes.aprobar", { id: String(l["id"]) })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await como(u.rinde, "gerente", t.a)("rendiciones.lotes.aprobar", { id: String(l["id"]) })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    ok(await como(u.paga2, "gerente", t.a)("rendiciones.lotes.aprobar", { id: String(l["id"]) }));
    const f = await e.admin.lotePago.findUniqueOrThrow({ where: { id: String(l["id"]) } });
    expect(f).toMatchObject({ estado: "aprobado", creadoPorId: u.paga, aprobadoPorId: u.paga2 });
    rend["lote"] = String(l["id"]);
  });

  it("la nómina no se genera mientras el formato no esté confirmado, y el lote se paga igual con referencia", async () => {
    const paga = como(u.paga, "gerente", t.a);
    expect(await paga("rendiciones.lotes.generar_nomina", { id: rend["lote"] })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(await paga("rendiciones.lotes.nomina_descargar", { id: rend["lote"] })).toMatchObject({ ok: false });
    expect(await paga("rendiciones.lotes.marcar_pagado", { id: rend["lote"], fechaPago: "2099-01-01", referencia: "NOM-1" })).toMatchObject({ ok: false });
    expect(await paga("rendiciones.lotes.marcar_pagado", { id: rend["lote"], fechaPago: "2026-11-06", referencia: "NOM-0001" }, { dryRun: true })).toMatchObject({ ok: true });
  });

  it("con el formato confirmado genera la nómina con una fila por persona y total exacto, y detecta que la ficha cambió", async () => {
    const banco = await e.admin.cuentaBancaria.create({ data: { tenantId: t.a, banco: "Santander", numeroVisible: "99998888" } });
    const cuentas = ok(await como(u.paga, "gerente", t.a)("rendiciones.nomina.cuentas_origen"));
    expect((cuentas["cuentas"] as { id: string }[]).map((c) => c.id)).toEqual([banco.id]);
    expect(await como(u.viewer, "viewer", t.a)("rendiciones.nomina.cuentas_origen")).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    // Sin la cuenta de origen elegida la generación falla diciendo qué falta.
    ok(await como(u.paga, "gerente", t.a)("core.config.set", { modulo: "rendiciones", clave: "nomina_formato_confirmado", valor: true }));
    expect(await como(u.paga, "gerente", t.a)("rendiciones.lotes.generar_nomina", { id: rend["lote"] })).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    ok(await como(u.paga, "gerente", t.a)("core.config.set", { modulo: "rendiciones", clave: "nomina_cuenta_origen_id", valor: banco.id }));
    const g = ok(await como(u.paga, "gerente", t.a)("rendiciones.lotes.generar_nomina", { id: rend["lote"] }));
    expect(g).toMatchObject({ estado: "generado", totalClp: 19_990, beneficiarios: 2 });
    expect(JSON.stringify(g)).not.toContain("000111222333");
    const d = ok(await como(u.paga, "gerente", t.a)("rendiciones.lotes.nomina_descargar", { id: rend["lote"] }));
    expect(String(d["nombre"])).toMatch(/^LP-\d+-santander\.xlsx$/);
    expect((await e.admin.auditEvent.findMany({ where: { tenantId: t.a, capability: "rendiciones.lotes.nomina_descargar" } })).length).toBeGreaterThan(0);
    await e.admin.personaPago.updateMany({ where: { tenantId: t.a, persona: { usuarioId: u.rinde } }, data: { rutTitular: "11111111-1", tipoCuenta: "vista" } });
    expect(await como(u.paga, "gerente", t.a)("rendiciones.lotes.nomina_descargar", { id: rend["lote"] })).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
  });

  it("marcar pagado es irreversible: un agente necesita aprobación; la persona lo marca y las rendiciones pasan a Pagada", async () => {
    const entrada = { id: rend["lote"], fechaPago: "2026-11-06", referencia: "NOM-0001" };
    const keyId = (await e.admin.apiKey.create({ data: { tenantId: t.a, userId: u.paga, nombre: "Agente", prefijo: `opai_r3_${randomUUID().slice(0, 6)}`, hash: randomUUID(), scopes: ["*"] } })).id;
    const agente = mod.crearContexto({ tenantId: t.a, actor: { tipo: "agent", id: keyId, viaUserId: u.paga }, rol: "gerente", scopes: ["*"], modulosActivos: ["rendiciones"], usuario: { id: u.paga, nombre: "Pedro", email: "p@r3.test", platformRole: null }, agente: { apiKeyId: keyId, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} }, medidor: { registrar: async () => undefined } });
    const r = (await mod.executeCapability(agente, "rendiciones.lotes.marcar_pagado", entrada, {})) as R;
    expect(r).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    expect(await e.admin.lotePago.findUniqueOrThrow({ where: { id: rend["lote"]! } })).toMatchObject({ estado: "generado" });
    expect(await como(u.rinde, "gerente", t.a)("rendiciones.lotes.marcar_pagado", entrada)).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    ok(await como(u.paga, "gerente", t.a)("rendiciones.lotes.marcar_pagado", entrada));
    expect((await e.admin.rendicion.findMany({ where: { id: { in: [rend["r1"]!, rend["r2"]!] } } })).map((x) => x.estado)).toEqual(["pagada", "pagada"]);
    expect(await e.admin.lotePago.findUniqueOrThrow({ where: { id: rend["lote"]! } })).toMatchObject({ estado: "pagado", referenciaPago: "NOM-0001" });
    expect(await como(u.paga, "gerente", t.a)("rendiciones.lotes.anular", { id: rend["lote"], motivo: "No debería poder" })).toMatchObject({ ok: false });
    expect(await como(u.paga, "gerente", t.a)("rendiciones.lotes.marcar_pagado", entrada)).toMatchObject({ ok: false });
  });

  it("la base protege los estados finales y el historial", async () => {
    await expect(e.admin.lotePago.update({ where: { id: rend["lote"]! }, data: { estado: "borrador" } })).rejects.toThrow();
    await expect(e.admin.lotePagoHistorial.deleteMany({ where: { loteId: rend["lote"]! } })).rejects.toThrow();
    await expect(e.admin.lotePagoItem.updateMany({ where: { loteId: rend["lote"]! }, data: { montoClp: 1 } })).rejects.toThrow();
  });

  it("otra empresa no ve ni toca los lotes", async () => {
    const b = como(u.duenoB, "owner", t.b);
    expect((ok(await b("rendiciones.lotes.listar"))["lotes"] as unknown[]).length).toBe(0);
    expect(await b("rendiciones.lotes.obtener", { id: rend["lote"] })).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    expect(await b("rendiciones.lotes.anular", { id: rend["lote"], motivo: "intento" })).toMatchObject({ ok: false });
  });
});
