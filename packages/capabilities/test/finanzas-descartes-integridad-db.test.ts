// CAR-412: solo Postgres de pruebas, con cuenta y movimientos ficticios nuevos.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";
import type * as Modulo from "../src";

describe.skipIf(omitirSuiteDb())("Descartes: rollback y paginación reales", () => {
  let e: Entorno;
  let mod: typeof Modulo;
  let tenantId: string;
  let cuentaId: string;
  const usuarioId = randomUUID();
  const ctx = () => mod.crearContexto({
    tenantId, actor: { tipo: "user", id: usuarioId },
    usuario: { id: usuarioId, nombre: "QA ficticio", email: "qa@descartes.test", platformRole: null },
    portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"],
    medidor: { registrar: async () => undefined },
  });
  async function dato<T>(id: string, input: Record<string, unknown>): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input, { dryRun: false });
    if (!r.ok) throw new Error(r.error.message);
    return r.data as T;
  }
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    tenantId = (await e.admin.tenant.create({ data: {
      slug: `descartes-${randomUUID().slice(0, 8)}`, nombre: "Descartes ficticios", vertical: "seguridad",
    } })).id;
    cuentaId = (await dato<{ id: string }>("finanzas.bancos.guardar", {
      banco: "Santander", numeroVisible: "000000000",
    })).id;
  });
  afterAll(async () => { await e?.cerrar(); });

  it("un conflicto revierte el reclamo y conserva íntegra la copia", async () => {
    await dato("finanzas.bancos.sincronizar", {
      numeroCuenta: "000000000", idempotencyKey: randomUUID(),
      movimientos: [1000, 2000].map((monto) => ({
        fecha: "2026-11-01", monto, glosa: "Movimiento ficticio", idExterno: randomUUID(),
      })),
    });
    const originales = await e.admin.movimientoBancario.findMany({ where: { cuentaId } });
    expect(originales).toHaveLength(2);
    const { descarteId } = await dato<{ descarteId: string }>("finanzas.movimientos_bancarios.borrar_rango", {
      cuentaId, desde: "2026-11-01", hasta: "2026-11-01", origen: "web4leads", motivo: "Prueba ficticia",
    });
    const antes = await e.admin.movimientoBancarioDescarte.findUniqueOrThrow({ where: { id: descarteId } });
    // Un vivo coincide por id con la primera copia y por id externo con la segunda.
    await e.admin.movimientoBancario.create({ data: { ...originales[0]!, idExterno: originales[1]!.idExterno } });
    const r = await mod.executeCapability(ctx(), "finanzas.descartes_bancarios.restaurar", { descarteId }, { dryRun: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("identificadores contradictorios");
    const despues = await e.admin.movimientoBancarioDescarte.findUniqueOrThrow({ where: { id: descarteId } });
    expect(despues.restauradoEn).toBeNull();
    expect(despues.restauradoPor).toBeNull();
    expect(despues.movimientos).toEqual(antes.movimientos);
    expect(await e.admin.movimientoBancario.count({ where: { cuentaId } })).toBe(1);
  });

  it("el cursor alcanza el descarte 21 sin repetir filas ni mezclar cuentas", async () => {
    const cuenta = (await dato<{ id: string }>("finanzas.bancos.guardar", {
      banco: "Santander", numeroVisible: "000000001",
    })).id;
    const ids = Array.from({ length: 21 }, () => randomUUID());
    await e.admin.movimientoBancarioDescarte.createMany({ data: ids.map((id) => ({
      id, tenantId, cuentaId: cuenta, desde: new Date("2026-11-01"), hasta: new Date("2026-11-01"),
      origen: "manual", motivo: "Paginación ficticia", cantidad: 0, movimientos: [],
    })) });
    type Pagina = { items: { id: string }[]; siguiente: string | null };
    const primera = await dato<Pagina>("finanzas.descartes_bancarios.list", { cuentaId: cuenta, limite: 20 });
    expect(primera.items).toHaveLength(20);
    expect(primera.siguiente).toBe(primera.items.at(-1)!.id);
    const segunda = await dato<Pagina>("finanzas.descartes_bancarios.list", {
      cuentaId: cuenta, limite: 20, cursor: primera.siguiente,
    });
    expect(segunda.items).toHaveLength(1);
    expect(segunda.siguiente).toBeNull();
    expect([...primera.items, ...segunda.items].map((x) => x.id).sort()).toEqual([...ids].sort());
  });
});
