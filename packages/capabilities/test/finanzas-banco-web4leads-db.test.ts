// Banco en línea por Web4Leads (db): firma, idempotencia, dedupe contra cartola, RLS y vista previa.
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const SECRETO = "secreto-web4leads-de-prueba-123";
const firmar = (cuerpo: string, ts: string, secreto = SECRETO) =>
  createHmac("sha256", secreto).update(cuerpo + ts).digest("hex");

describe.skipIf(omitirSuiteDb())("Finanzas · banco Web4Leads (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantA = "";
  let tenantB = "";
  let cuentaA = "";
  let cuentaB = "";
  const usuarioId = randomUUID();
  const medidor = { registrar: async () => undefined };

  const ctx = (tid: string, sistema = false) =>
    mod.crearContexto({
      tenantId: tid,
      actor: sistema ? { tipo: "system" } : { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@w4l.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });
  const run = (tid: string, id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }, sistema = false) =>
    mod.executeCapability(ctx(tid, sistema), id, input, opts);

  const payload = (movs: Record<string, unknown>[], extra: Record<string, unknown> = {}) =>
    JSON.stringify({ accountNumber: "94-541.158", movements: movs, ...extra });
  const mov = (id: string, monto: number, balance: number | null = null) => ({
    externalId: id, transactionDate: "2026-11-02", description: "Pago proveedor", amount: monto, balance,
  });
  const recibir = (tid: string, cuerpo: string, secreto = SECRETO) => {
    const ts = String(Math.floor(Date.now() / 1000));
    return run(tid, "finanzas.bancos.recibir_web4leads", { cuerpo, timestamp: ts, firma: firmar(cuerpo, ts, secreto) }, undefined, true);
  };
  const cuenta = async (tid: string, numero: string) =>
    (await run(tid, "finanzas.bancos.guardar", { banco: "Santander", numeroVisible: numero })) as { ok: true; data: { id: string } };

  beforeAll(async () => {
    process.env.OPAI_SECRETS_KEY = randomBytes(32).toString("base64");
    process.env.OPAI_SECRETS_KEY_VERSION = "98";
    delete process.env.OPAI_SECRETS_KEY_ANTERIOR;
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantA = (await e.admin.tenant.create({ data: { slug: `w4a-${randomUUID().slice(0, 8)}`, nombre: "W4L A", vertical: "seguridad" } })).id;
    tenantB = (await e.admin.tenant.create({ data: { slug: `w4b-${randomUUID().slice(0, 8)}`, nombre: "W4L B", vertical: "seguridad" } })).id;
    for (const t of [tenantA, tenantB]) {
      await run(t, "core.integraciones.configurar", { proveedor: "web4leads", modalidad: "propia" });
      await run(t, "core.integraciones.set_secreto", { proveedor: "web4leads", nombre: "api_key", valor: SECRETO });
    }
    cuentaA = (await cuenta(tenantA, "94541158")).data.id;
    cuentaB = (await cuenta(tenantB, "94541158")).data.id;
  });

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("firma inválida: no importa nada, responde UNAUTHENTICATED y no deja rastro en la auditoría", async () => {
    const antes = await e.admin.auditEvent.count({ where: { tenantId: tenantA } });
    const r = await recibir(tenantA, payload([mov("x1", -1000)]), "otro-secreto-cualquiera");
    expect(!r.ok && r.error.code).toBe("UNAUTHENTICATED");
    expect(await e.admin.auditEvent.count({ where: { tenantId: tenantA } })).toBe(antes);
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } })).toBe(0);
  });

  it("importa, es idempotente por id externo y no toca a otra empresa con el mismo número", async () => {
    const cuerpo = payload([mov("a1", -50_000, 900_000), mov("a2", 120_000, 1_020_000)], {
      accountBalance: { current: 1_020_000, asOf: "2026-11-02T10:00:00Z" },
    });
    const r1 = await recibir(tenantA, cuerpo);
    expect(r1.ok && r1.data).toMatchObject({ firmaValida: true, reconocida: true, nuevos: 2, duplicados: 0 });
    const r2 = await recibir(tenantA, cuerpo);
    expect(r2.ok && r2.data).toMatchObject({ nuevos: 0, duplicados: 2 });
    const filas = await e.admin.movimientoBancario.findMany({ where: { cuentaId: cuentaA } });
    expect(filas).toHaveLength(2);
    expect(filas.every((f) => f.origen === "web4leads" && f.estado === "pendiente")).toBe(true);
    const c = await e.admin.cuentaBancaria.findUniqueOrThrow({ where: { id: cuentaA } });
    expect(c.saldoBanco).toBe(1_020_000n);
    expect(c.ultimaSyncEn).not.toBeNull();
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaB } })).toBe(0);
  });

  it("una entrega repetida con saldo antiguo no pisa el saldo vigente y dos entregas simultáneas no pierden operaciones", async () => {
    const nueva = payload([mov("a3", -1_000, 1_019_000)], { accountBalance: { current: 1_019_000, asOf: "2026-11-02T11:00:00Z" } });
    await recibir(tenantA, nueva);
    const vieja = payload([mov("a1", -50_000, 900_000)], { accountBalance: { current: 900_000, asOf: "2026-11-02T09:00:00Z" } });
    await recibir(tenantA, vieja);
    const c = await e.admin.cuentaBancaria.findUniqueOrThrow({ where: { id: cuentaA } });
    expect(c.saldoBanco).toBe(1_019_000n);
    // Misma fecha, monto y glosa con ids y saldos distintos, entregadas a la vez: ambas deben quedar.
    const antes = await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } });
    await Promise.all([
      recibir(tenantA, payload([mov("q1", -3_333, 500_000)])),
      recibir(tenantA, payload([mov("q2", -3_333, 496_667)])),
    ]);
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } })).toBe(antes + 2);
  });

  it("misma operación que ya vino por cartola (misma huella y saldo) se descarta", async () => {
    await e.admin.movimientoBancario.create({
      data: {
        tenantId: tenantA, cuentaId: cuentaA, fecha: new Date("2026-11-03T00:00:00Z"), monto: -7_000n,
        glosa: "Compra comercio", saldoDespues: 500_000n, claveDedupe: "2026-11-03|-7000|COMPRA COMERCIO", estado: "pendiente", origen: "cartola",
      },
    });
    const cuerpo = payload([{ externalId: "c1", transactionDate: "2026-11-03", description: "Compra  comercio", amount: -7_000, balance: 500_000 }]);
    const r = await recibir(tenantA, cuerpo);
    expect(r.ok && r.data).toMatchObject({ nuevos: 0, duplicados: 1 });
  });

  it("misma huella sin saldo se inserta y queda como sospechosa; cuenta desconocida se ignora", async () => {
    const cuerpo = payload([mov("s1", -50_000)]);
    const r = await recibir(tenantA, cuerpo);
    expect(r.ok && r.data).toMatchObject({ nuevos: 1, sospechosos: 1 });
    const otra = await recibir(tenantA, JSON.stringify({ accountNumber: "00000001", movements: [mov("z", -1)] }));
    expect(otra.ok && otra.data).toMatchObject({ firmaValida: true, reconocida: false });
  });

  it("la remuneración queda por autorizar y una vista previa no escribe", async () => {
    await recibir(tenantA, payload([{ externalId: "r1", transactionDate: "2026-11-04", description: "Pago remuneración noviembre", amount: -2_000_000 }]));
    const rem = await e.admin.movimientoBancario.findFirstOrThrow({ where: { cuentaId: cuentaA, idExterno: "r1" } });
    expect(rem.estado).toBe("por_autorizar");
    const antes = await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } });
    const v = await run(tenantA, "finanzas.bancos.sincronizar", {
      numeroCuenta: "94541158", idempotencyKey: "vista-previa-0001",
      movimientos: [{ idExterno: "p1", fecha: "2026-11-05", glosa: "Prueba", monto: 100 }],
    }, { dryRun: true });
    expect(v.ok && v.data).toMatchObject({ reconocida: true, nuevos: 1 });
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } })).toBe(antes);
  });
});
