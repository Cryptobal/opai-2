// Cartola Santander contra Postgres real (CAR-341): no importa una cartola que no cuadra, lista las
// importaciones y las deshace (bloquea si hay conciliaciones confirmadas; aísla por empresa). Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import {
  filasCartolaHistorica,
  xlsxOfficeBanking,
} from "../../domain/src/finanzas/bancos/cartola-office-banking.fixture";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { aplicados: number; duplicados: number; rechazados: number; cuadratura: { cuadra: boolean } | null };
type Cartola = { id: string; movimientos: number; conciliados: number };

describe.skipIf(omitirSuiteDb())("Finanzas · deshacer cartolas importadas (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let cuentaId = "";
  const usuarioId = randomUUID();

  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@deshacer.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = (input: Record<string, unknown>, dryRun = false) =>
    mod.executeCapability(ctx(), "finanzas.cartolas.importar", { cuentaId, formato: "santander", idempotencyKey: `c-${randomUUID()}`, ...input }, { dryRun });
  const importar = async (buf: Buffer, dryRun = false): Promise<Res> => {
    const r = await ejecutar({ contenidoBase64: buf.toString("base64") }, dryRun);
    if (!r.ok) throw new Error(`${r.error.code} ${r.error.message}`);
    return r.data as Res;
  };

  const octubre = [
    [15000, "Transf a proveedor ficticio", "30/10/2026", "123", "Santiago", "C"],
    [250000, "Abono cliente ficticio", "31/10/2026", "456", "Providencia", "A"],
  ];

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `dsh-${randomUUID().slice(0, 8)}`, nombre: "Cartola Test SpA", vertical: "seguridad" } })).id;
    const r = await mod.executeCapability(ctx(), "finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "000000000" });
    if (!r.ok) throw new Error(r.error.message);
    cuentaId = (r.data as { id: string }).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const correr = (id: string, input: Record<string, unknown>, dryRun = false, tid = tenantId) =>
    mod.executeCapability(ctx(tid), id, input, { dryRun });
  const cartolas = async () => {
    const r = await correr("finanzas.cartolas.listar", { cuentaId });
    if (!r.ok) throw new Error(r.error.message);
    return (r.data as { items: Cartola[] }).items;
  };
  const deshacer = (cartolaId: string, dryRun = false) => correr("finanzas.cartolas.deshacer", { cartolaId, motivo: "Prueba ficticia" }, dryRun);

  it("una cartola que no cuadra se ve en la vista previa y no se importa", async () => {
    const filas = filasCartolaHistorica(octubre);
    const saldos = filas[9];
    if (saldos) saldos[6] = 1234000;
    const buf = await xlsxOfficeBanking(filas);
    expect((await importar(buf, true)).cuadratura).toMatchObject({ cuadra: false });
    const r = await ejecutar({ contenidoBase64: buf.toString("base64") });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toMatch(/no cuadra/);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId } })).toBe(0);
  });

  it("deshace una importación: borra sus movimientos y permite volver a cargarla", async () => {
    const buf = await xlsxOfficeBanking(filasCartolaHistorica(octubre));
    expect(await importar(buf)).toMatchObject({ aplicados: 2, cuadratura: { cuadra: true } });
    const [c] = await cartolas();
    expect(c).toMatchObject({ movimientos: 2, conciliados: 0 });
    const vista = await deshacer(c!.id, true);
    expect(vista.ok && vista.data).toMatchObject({ movimientos: 2, deshecha: false });
    expect(await e.admin.movimientoBancario.count({ where: { tenantId } })).toBe(2);

    const mov = await e.admin.movimientoBancario.findFirstOrThrow({ where: { tenantId } });
    const conc = await e.admin.conciliacionBanco.create({
      data: { tenantId, movimientoId: mov.id, tipoEnlace: "flujo_fila", enlaceId: randomUUID(), monto: mov.monto, confirmada: true },
    });
    const bloqueada = await deshacer(c!.id);
    expect(bloqueada.ok).toBe(false);
    if (!bloqueada.ok) expect(bloqueada.error.message).toMatch(/ya está conciliado/);

    await e.admin.conciliacionBanco.update({ where: { id: conc.id }, data: { activa: false } });
    const hecha = await deshacer(c!.id);
    expect(hecha.ok && hecha.data).toMatchObject({ movimientos: 2, deshecha: true });
    expect(await e.admin.movimientoBancario.count({ where: { tenantId } })).toBe(0);
    expect(await cartolas()).toEqual([]);
    expect(await importar(buf)).toMatchObject({ aplicados: 2, duplicados: 0 });
  });

  it("otra empresa no ve ni deshace la importación", async () => {
    const [c] = await cartolas();
    const otro = (await e.admin.tenant.create({ data: { slug: `dshb-${randomUUID().slice(0, 8)}`, nombre: "Otra SpA", vertical: "seguridad" } })).id;
    const r = await correr("finanzas.cartolas.deshacer", { cartolaId: c!.id, motivo: "Prueba ficticia" }, false, otro);
    expect(r.ok).toBe(false);
    expect(await e.admin.movimientoBancario.count({ where: { tenantId } })).toBe(2);
  });
});
