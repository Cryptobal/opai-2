// Banco en línea por Web4Leads (db): firma, idempotencia, dedupe contra cartola, RLS y vista previa.
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { aplicarSincronizacion } from "../../../modules/finanzas/capacidades/bancos/sincronizar-aplicar";
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
      // El receptor público corre como sistema, sin usuario ni rol: así se prueba lo que pasa en producción.
      ...(sistema
        ? {}
        : {
            usuario: { id: usuarioId, nombre: "Admin", email: "admin@w4l.test", platformRole: null },
            portal: "erp" as const,
            portalesMembresia: ["erp" as const],
            rol: "owner" as const,
          }),
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
    expect(c.saldoBancoEn).not.toBeNull(); // la fecha del saldo se guarda junto con el saldo
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
    expect(c.saldoBancoEn?.toISOString()).toBe("2026-11-02T11:00:00.000Z"); // la fecha es la que informa el banco; la entrega vieja no la pisa
    // Misma fecha, monto y glosa con ids y saldos distintos, entregadas a la vez: ambas deben quedar.
    const antes = await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } });
    await Promise.all([
      recibir(tenantA, payload([mov("q1", -3_333, 500_000)])),
      recibir(tenantA, payload([mov("q2", -3_333, 496_667)])),
    ]);
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId: cuentaA } })).toBe(antes + 2);
  });

  it("CAR-345: el saldo de la cuenta llega solo, sin movimientos, y solo uno más reciente reemplaza al vigente", async () => {
    const t = (await e.admin.tenant.create({ data: { slug: `w4s-${randomUUID().slice(0, 8)}`, nombre: "W4L S", vertical: "seguridad" } })).id;
    await run(t, "core.integraciones.configurar", { proveedor: "web4leads", modalidad: "propia" });
    await run(t, "core.integraciones.set_secreto", { proveedor: "web4leads", nombre: "api_key", valor: SECRETO });
    const id = (await cuenta(t, "94541158")).data.id;
    const saldo = async () => e.admin.cuentaBancaria.findUniqueOrThrow({ where: { id } });
    const soloSaldo = (current: number, asOf: string) => payload([], { accountBalance: { current, asOf } });

    // Con movimientos y saldo: queda el saldo informado.
    await recibir(t, payload([mov("s1", 10_000, 2_010_000)], { accountBalance: { current: 2_010_000, asOf: "2026-11-12T12:00:00-03:00" } }));
    // Solo el saldo, más reciente, sin movimientos nuevos: reemplaza al vigente (antes se ignoraba).
    const r = await recibir(t, soloSaldo(1_750_000, "2026-11-12T17:30:00-03:00"));
    expect(r.ok && (r.data as { nuevos: number }).nuevos).toBe(0);
    expect((await saldo()).saldoBanco).toBe(1_750_000n);
    expect((await saldo()).saldoBancoEn?.toISOString()).toBe("2026-11-12T20:30:00.000Z");
    // Un saldo más antiguo que llega tarde no pisa el vigente.
    await recibir(t, soloSaldo(9_999_999, "2026-11-12T15:00:00-03:00"));
    expect((await saldo()).saldoBanco).toBe(1_750_000n);
    // Ni aunque traiga un movimiento nuevo: manda la fecha del saldo informado.
    await recibir(t, payload([mov("s2", -5_000, null)], { accountBalance: { current: 8_888_888, asOf: "2026-11-12T16:00:00-03:00" } }));
    expect((await saldo()).saldoBanco).toBe(1_750_000n);
    // El mismo saldo con la misma hora (reenvío) se acepta sin cambios.
    await recibir(t, soloSaldo(1_750_000, "2026-11-12T17:30:00-03:00"));
    expect((await saldo()).saldoBanco).toBe(1_750_000n);
    // La otra empresa con el mismo número de cuenta no se toca.
    expect((await e.admin.cuentaBancaria.findUniqueOrThrow({ where: { id: cuentaB } })).saldoBanco).toBeNull();
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

  // Fechas pasadas: el receptor descarta las futuras.
  it("CAR-450: lo que ya vino por cartola con otra glosa se reconoce por monto único; con dos iguales no adivina", async () => {
    const cartola = (fecha: string, monto: bigint, glosa: string) =>
      e.admin.movimientoBancario.create({
        data: { tenantId: tenantA, cuentaId: cuentaA, fecha: new Date(`${fecha}T00:00:00Z`), monto, glosa, claveDedupe: `k-${randomUUID()}`, origen: "cartola" },
      });
    const unico = await cartola("2026-11-07", -43_210n, "PAGO PROVEEDORES 0099");
    const r1 = await recibir(tenantA, payload([{ externalId: "m450", transactionDate: "2026-11-05", description: "TEF PROVEEDOR FICT", amount: -43_210 }]));
    expect(r1.ok && r1.data).toMatchObject({ nuevos: 0, duplicados: 1 });
    expect((await e.admin.movimientoBancario.findUniqueOrThrow({ where: { id: unico.id } })).idExterno).toBe("m450");

    await cartola("2026-11-09", -12_340n, "CARGO A");
    await cartola("2026-11-10", -12_340n, "CARGO B");
    const r2 = await recibir(tenantA, payload([{ externalId: "m451", transactionDate: "2026-11-09", description: "TEF OTRA", amount: -12_340 }]));
    expect(r2.ok && r2.data).toMatchObject({ nuevos: 1 });
  });

  it("CAR-488: si otra entrega ya vinculó el movimiento de cartola, el entrante se inserta en vez de perderse", async () => {
    const tomado = await e.admin.movimientoBancario.create({
      data: { tenantId: tenantA, cuentaId: cuentaA, fecha: new Date("2026-11-06T00:00:00Z"), monto: -65_432n, glosa: "Cargo", claveDedupe: `t-${randomUUID()}`, idExterno: "otra-entrega", origen: "cartola" },
    });
    const movimiento = { idExterno: "m488", fecha: "2026-11-06", monto: -65_432, glosa: "TEF X", referencia: null, saldoDespues: null, claveDedupe: `n-${randomUUID()}` };
    const vinculos = [{ existenteId: tomado.id, idExterno: "m488", indice: 0, movimiento }];
    const n = await aplicarSincronizacion(ctx(tenantA, true), { cuentaId: cuentaA, nuevos: [], vinculos, duplicados: 1, sospechosos: 0, saldoBanco: null, saldoBancoEn: null });
    expect(n).toBe(1);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId: tenantA, idExterno: "m488" } })).toBe(1);
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
