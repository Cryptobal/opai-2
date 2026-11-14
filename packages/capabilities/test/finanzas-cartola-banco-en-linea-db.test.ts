// CAR-450: una cartola reconoce lo que ya llegó por el banco en línea aunque la glosa sea distinta, si el monto y la
// fecha cercana (±3 días) lo identifican sin ambigüedad. Datos sintéticos contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { filasCartolaHistorica, xlsxOfficeBanking } from "../../domain/src/finanzas/bancos/cartola-office-banking.fixture";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { aplicados: number; duplicados: number; fechasAjustadas: number; sobrantesEnLinea: { id: string }[]; sobrantesQuitados: number };

describe.skipIf(omitirSuiteDb())("Finanzas · cartola frente al banco en línea (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  const usuarioId = randomUUID();

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@enlinea.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });

  const nuevaCuenta = async (numero: string) => {
    const r = await mod.executeCapability(ctx(), "finanzas.bancos.guardar", { banco: "Santander", numeroVisible: numero });
    if (!r.ok) throw new Error(r.error.message);
    return (r.data as { id: string }).id;
  };
  const enLinea = (cuentaId: string, fecha: string, monto: number, glosa: string) =>
    e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: new Date(`${fecha}T00:00:00Z`), monto: BigInt(monto), glosa, claveDedupe: `w-${randomUUID()}`, idExterno: randomUUID(), origen: "web4leads" },
    });
  // Las filas de cada cartola suman 235.000, lo que la cabecera sintética declara entre saldo inicial y final.
  const importar = async (cuentaId: string, filas: (string | number)[][], dryRun = false, extra: Record<string, unknown> = {}): Promise<Res> => {
    const buf = await xlsxOfficeBanking(filasCartolaHistorica(filas));
    const input = { cuentaId, formato: "santander", contenidoBase64: buf.toString("base64"), idempotencyKey: `c-${randomUUID()}`, ...extra };
    const r = await mod.executeCapability(ctx(), "finanzas.cartolas.importar", input, { dryRun });
    if (!r.ok) throw new Error(`${r.error.code} ${r.error.message}`);
    return r.data as Res;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: { slug: `enl-${randomUUID().slice(0, 8)}`, nombre: "En Línea Test SpA", vertical: "seguridad" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("glosa distinta y único candidato: no se duplica y queda con la fecha de la cartola", async () => {
    const cuentaId = await nuevaCuenta("000000001");
    const w = await enLinea(cuentaId, "2026-11-03", -42_000, "TEF PROVEEDOR FICT");
    const r = await importar(cuentaId, [
      [42000, "Pago proveedores 0099", "05/11/2026", "1", "Santiago", "C"],
      [277000, "Abono cliente ficticio", "06/11/2026", "2", "Santiago", "A"],
    ]);
    expect(r).toMatchObject({ aplicados: 1, duplicados: 1, fechasAjustadas: 1 });
    const movs = await e.admin.movimientoBancario.findMany({ where: { tenantId, cuentaId }, orderBy: { fecha: "asc" } });
    expect(movs.map((m) => Number(m.monto))).toEqual([-42_000, 277_000]);
    expect(movs[0]).toMatchObject({ id: w.id, origen: "web4leads" });
    expect(movs[0]!.fecha.toISOString().slice(0, 10)).toBe("2026-11-05");
  });

  it("dos movimientos del banco en línea con el mismo monto en la ventana: no adivina y la fila entra como nueva", async () => {
    const cuentaId = await nuevaCuenta("000000002");
    await enLinea(cuentaId, "2026-11-10", -10_000, "TEF A");
    await enLinea(cuentaId, "2026-11-11", -10_000, "TEF B");
    const r = await importar(cuentaId, [
      [10000, "Cargo 77", "11/11/2026", "3", "Santiago", "C"],
      [245000, "Abono dos ficticio", "12/11/2026", "4", "Santiago", "A"],
    ]);
    expect(r).toMatchObject({ aplicados: 2, duplicados: 0 });
    expect(await e.admin.movimientoBancario.count({ where: { tenantId, cuentaId } })).toBe(4);
  });

  it("un registro manual con el mismo monto y otra glosa no se empareja por monto: sigue exigiendo glosa parecida", async () => {
    const cuentaId = await nuevaCuenta("000000003");
    await e.admin.movimientoBancario.create({
      data: { tenantId, cuentaId, fecha: new Date("2026-11-03T00:00:00Z"), monto: -42_000n, glosa: "Registro a mano", claveDedupe: `m-${randomUUID()}`, origen: "manual" },
    });
    const r = await importar(cuentaId, [
      [42000, "Pago proveedores 0099", "05/11/2026", "1", "Santiago", "C"],
      [277000, "Abono cliente ficticio", "06/11/2026", "2", "Santiago", "A"],
    ]);
    expect(r).toMatchObject({ aplicados: 2, duplicados: 0 });
  });

  it("los sobrantes del banco en línea del período se listan y se quitan como descarte restaurable", async () => {
    const cuentaId = await nuevaCuenta("000000004");
    await enLinea(cuentaId, "2026-10-03", -42_000, "TEF PROVEEDOR FICT");
    const sobrante = await enLinea(cuentaId, "2026-10-10", -7_777, "TEF QUE LA CARTOLA NO TRAE");
    await enLinea(cuentaId, "2026-11-20", -9_999, "FUERA DEL PERIODO");
    const filas = [
      [42000, "Pago proveedores 0099", "05/10/2026", "1", "Santiago", "C"],
      [277000, "Abono cliente ficticio", "06/10/2026", "2", "Santiago", "A"],
    ];
    const vista = await importar(cuentaId, filas, true);
    expect(vista.sobrantesEnLinea.map((x) => x.id)).toEqual([sobrante.id]);

    const r = await importar(cuentaId, filas, false, { quitarSobrantesEnLinea: true });
    expect(r).toMatchObject({ aplicados: 1, duplicados: 1, sobrantesQuitados: 1 });
    expect(await e.admin.movimientoBancario.count({ where: { id: sobrante.id } })).toBe(0);
    const descarte = await e.admin.movimientoBancarioDescarte.findFirstOrThrow({ where: { tenantId, cuentaId } });
    expect(descarte).toMatchObject({ cantidad: 1, origen: "web4leads" });

    const rest = await mod.executeCapability(ctx(), "finanzas.descartes_bancarios.restaurar", { descarteId: descarte.id }, { dryRun: false });
    expect(rest.ok).toBe(true);
    expect(await e.admin.movimientoBancario.count({ where: { id: sobrante.id } })).toBe(1);
  });

  it("conserva los conciliados, quita sin fallar uno con conciliación deshecha y sin la casilla no toca nada", async () => {
    const cuentaId = await nuevaCuenta("000000005");
    const conc = (movimientoId: string, activa: boolean) =>
      e.admin.conciliacionBanco.create({ data: { tenantId, movimientoId, tipoEnlace: "flujo_fila", enlaceId: randomUUID(), monto: -1n, activa, confirmada: true } });
    const conciliado = await enLinea(cuentaId, "2026-10-08", -5_555, "TEF CONCILIADA");
    await conc(conciliado.id, true);
    const deshecho = await enLinea(cuentaId, "2026-10-09", -6_666, "TEF CONCILIACION DESHECHA");
    await conc(deshecho.id, false);
    const filas = [
      [42000, "Pago proveedores 0099", "05/10/2026", "1", "Santiago", "C"],
      [277000, "Abono cliente ficticio", "06/10/2026", "2", "Santiago", "A"],
    ];
    const vista = await importar(cuentaId, filas, true);
    expect(vista.sobrantesEnLinea.map((x) => x.id)).toEqual([deshecho.id]);

    const sinQuitar = await importar(cuentaId, filas, false);
    expect(sinQuitar.sobrantesQuitados).toBe(0);
    expect(await e.admin.movimientoBancario.count({ where: { id: deshecho.id } })).toBe(1);
  });

  it("con la casilla, el movimiento con una conciliación deshecha se quita sin abortar la importación (CAR-453)", async () => {
    const cuentaId = await nuevaCuenta("000000006");
    const deshecho = await enLinea(cuentaId, "2026-10-09", -6_666, "TEF CONCILIACION DESHECHA");
    await e.admin.conciliacionBanco.create({
      data: { tenantId, movimientoId: deshecho.id, tipoEnlace: "flujo_fila", enlaceId: randomUUID(), monto: -1n, activa: false, confirmada: true },
    });
    const filas = [
      [42000, "Pago proveedores 0099", "05/10/2026", "1", "Santiago", "C"],
      [277000, "Abono cliente ficticio", "06/10/2026", "2", "Santiago", "A"],
    ];
    const r = await importar(cuentaId, filas, false, { quitarSobrantesEnLinea: true });
    expect(r).toMatchObject({ aplicados: 2, sobrantesQuitados: 1 });
    expect(await e.admin.movimientoBancario.count({ where: { id: deshecho.id } })).toBe(0);
  });
});
