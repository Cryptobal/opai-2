// QA sintético del circuito de caja (CAR-221): emitir → proyectar cobro → conciliar con el banco → deshacer → NC,
// con dos empresas ficticias y roles reales. Todo con el adaptador simulado: ningún DTE real, ningún correo,
// ningún dato de Gard. Corre contra Postgres real con un rol sin BYPASSRLS (pnpm test:db).
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { cafXmlSintetico } from "./finanzas-caf-fixture";

type Item = { documentoEmitidoId: string; monto: number };
type Rol = "owner" | "admin" | "gerente" | "supervisor" | "viewer";

describe.skipIf(omitirSuiteDb())("Finanzas · circuito de caja sintético · dos empresas y roles", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let clienteA = "";
  let cuentaBanco = "";
  let facturaId = "";
  const usuario = randomUUID();

  const ctx = (tid: string, rol: Rol = "owner") =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "QA", email: "qa@circuito.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol,
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const run = (tid: string, id: string, input: unknown, rol: Rol = "owner") =>
    mod.executeCapability(ctx(tid, rol), id, input);
  async function ok<T>(tid: string, id: string, input: unknown, rol: Rol = "owner"): Promise<T> {
    const r = await run(tid, id, input, rol);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const pendientes = async (tid: string) =>
    (await ok<{ items: Item[] }>(tid, "finanzas.ventas.proyeccion_flujo", { semanas: 20 })).items;

  beforeAll(async () => {
    process.env.SII_ADAPTADOR = "simulado";
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "99";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantA = (await e.admin.tenant.create({ data: { slug: `circ-a-${randomUUID().slice(0, 8)}`, nombre: "Empresa A (ficticia)", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `circ-b-${randomUUID().slice(0, 8)}`, nombre: "Empresa B (ficticia)", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `qa-${randomUUID().slice(0, 8)}@circuito.test`, name: "QA" } });
    clienteA = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cliente Ficticio Ltda.", rut: "77234567-8" } })).id;
    await ok(tenantA, "finanzas.dte_config.actualizar", { ambiente: "certificacion", rutEmisor: "76111222-8" });
    await ok(tenantA, "finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ folioDesde: 9000, folioHasta: 9020 }) });
    await ok(tenantA, "finanzas.folios.cargar_caf", { cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 9100, folioHasta: 9120 }) });
    cuentaBanco = (await ok<{ id: string }>(tenantA, "finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "5550001" })).id;
  }, 120_000);

  afterAll(async () => {
    const where = { tenantId: { in: [tenantA, tenantB].filter(Boolean) } };
    await e?.admin.secreto.deleteMany({ where }).catch(() => undefined);
    await e?.admin.claveTenant.deleteMany({ where }).catch(() => undefined);
    await e?.cerrar();
  });

  it("emite una factura con IVA exacto y queda como cobro pendiente en la proyección de caja", async () => {
    const borrador = await ok<{ id: string }>(tenantA, "finanzas.ventas.crear_borrador", {
      cuentaId: clienteA, tipoDte: 33, lineas: [{ glosa: "Servicio de guardias", monto: 100_000 }],
    });
    facturaId = borrador.id;
    await ok(tenantA, "finanzas.ventas.emitir", { documentoId: facturaId });
    const doc = await e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: facturaId } });
    expect([doc.montoNeto, doc.montoIva, doc.montoTotal]).toEqual([100_000, 19_000, 119_000]);
    expect(doc.folio).toBeGreaterThanOrEqual(9000);
    expect((await pendientes(tenantA)).find((i) => i.documentoEmitidoId === facturaId)?.monto).toBe(119_000);
  });

  it("conciliar el pago saca el cobro de la proyección y deshacer lo devuelve", async () => {
    const mov = await e.admin.movimientoBancario.create({
      data: { tenantId: tenantA, cuentaId: cuentaBanco, fecha: new Date(), monto: 119_000n, glosa: "Transferencia cliente ficticio", claveDedupe: randomUUID(), estado: "pendiente", origen: "cartola" },
    });
    await ok(tenantA, "finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [{ tipo: "documento_emitido", id: facturaId, monto: 119_000 }] });
    const pagada = await e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: facturaId } });
    expect([pagada.montoCobrado, pagada.estadoCobro]).toEqual([119_000, "pagada"]);
    expect((await pendientes(tenantA)).some((i) => i.documentoEmitidoId === facturaId)).toBe(false);
    await ok(tenantA, "finanzas.conciliaciones.deshacer", { movimientoId: mov.id, motivo: "QA: reversión del circuito" });
    expect((await pendientes(tenantA)).find((i) => i.documentoEmitidoId === facturaId)?.monto).toBe(119_000);
  });

  it("una nota de crédito parcial baja el cobro pendiente en la proyección", async () => {
    await ok(tenantA, "finanzas.ventas.emitir_nota_credito", { documentoReferenciaId: facturaId, monto: 19_000, motivo: "QA: corrige montos", codigoReferencia: 3 });
    expect((await pendientes(tenantA)).find((i) => i.documentoEmitidoId === facturaId)?.monto).toBe(100_000);
  });

  it("roles: owner y admin operan; gerente, supervisor y viewer no pueden emitir ni conciliar", async () => {
    const borrador = await ok<{ id: string }>(tenantA, "finanzas.ventas.crear_borrador", { cuentaId: clienteA, tipoDte: 33, lineas: [{ glosa: "Rol admin", monto: 10_000 }] }, "admin");
    expect(borrador.id).toBeTruthy();
    for (const rol of ["gerente", "supervisor", "viewer"] as const) {
      expect(await run(tenantA, "finanzas.ventas.emitir", { documentoId: borrador.id }, rol), rol).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      expect(await run(tenantA, "finanzas.conciliaciones.confirmar", { movimientoId: randomUUID(), enlaces: [] }, rol), rol).toMatchObject({ ok: false });
    }
  });

  it("aislamiento: la empresa B no ve la factura, su proyección está vacía y no puede conciliarla", async () => {
    expect(await run(tenantB, "finanzas.ventas.obtener", { documentoId: facturaId })).toMatchObject({ ok: false });
    expect(await pendientes(tenantB)).toEqual([]);
    const mov = await e.admin.movimientoBancario.create({
      data: { tenantId: tenantA, cuentaId: cuentaBanco, fecha: new Date(), monto: 1_000n, glosa: "Pago ajeno", claveDedupe: randomUUID(), estado: "pendiente", origen: "cartola" },
    });
    expect(await run(tenantB, "finanzas.conciliaciones.confirmar", { movimientoId: mov.id, enlaces: [{ tipo: "documento_emitido", id: facturaId, monto: 1_000 }] })).toMatchObject({ ok: false });
    expect(await e.admin.conciliacionBanco.count({ where: { movimientoId: mov.id } })).toBe(0);
  });
});
