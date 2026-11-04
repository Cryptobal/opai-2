// F4 (CAR-166) · cobranza con Postgres real: vencimiento derivado, aging por tramo, ficha del deudor,
// «Hoy en Finanzas» y aislamiento entre empresas.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Resumen = {
  tramos: Record<string, number>;
  totalVencido: number;
  deudores: { cuentaId: string; facturasVencidas: number; saldoVencido: number; tramo: string }[];
};
type Ficha = { saldoVencido: number; facturas: { folio: number | null; tramo: string; saldo: number }[]; contactos: { email: string | null }[] };
type Hoy = {
  emitir: { borradores: { cantidad: number } };
  cobrar: { vencidas: { cantidad: number; montoClp: number } };
};

const diasAtras = (n: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

describe.skipIf(!urlPropietario)("Finanzas · cobranza (db)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
    registrarModuloFinanzas();
    const doc = (folio: number, venceHaceDias: number, extra: Record<string, unknown> = {}) =>
      s.e.admin.documentoEmitido.create({
        data: {
          tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio, estadoDte: "aceptado",
          fechaEmision: diasAtras(venceHaceDias + 30), fechaVencimiento: diasAtras(venceHaceDias),
          montoNeto: 1_000_000, montoTotal: 1_000_000, ...extra,
        },
      });
    await doc(9101, 10);
    await doc(9102, 45, { montoCobrado: 400_000 });
    await doc(9103, 90);
    await doc(9104, -15); // vence en 15 días: no está vencida
    await doc(9105, 50, { montoCobrado: 1_000_000, estadoCobro: "pagada" });
    await doc(9106, 50, { cesionEstado: "cedido" });
    await doc(9107, 50, { tipoDte: 61 });
    await doc(9108, 50, { estadoDte: "borrador", folio: null });
    await s.e.admin.contacto.create({
      data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Paula", apellidos: "Reyes", email: "pagos@cliente.cl", roles: ["facturacion"] },
    });
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("agrupa por tramo solo lo vencido, con saldo y sin lo no cobrable", async () => {
    const r = await s.dato<Resumen>("finanzas.cobranza.resumen", {});
    expect(r.tramos).toEqual({ por_vencer: 0, "1_30": 1_000_000, "31_60": 600_000, "61_mas": 1_000_000 });
    expect(r.totalVencido).toBe(2_600_000);
    expect(r.deudores).toHaveLength(1);
    expect(r.deudores[0]).toMatchObject({ cuentaId: s.cuentaId, facturasVencidas: 3, saldoVencido: 2_600_000, tramo: "61_mas" });
  });

  it("la ficha lista las facturas vencidas y los contactos de facturación", async () => {
    const f = await s.dato<Ficha>("finanzas.cobranza.deudor", { cuentaId: s.cuentaId });
    expect(f.saldoVencido).toBe(2_600_000);
    expect(f.facturas.map((x) => x.folio).sort()).toEqual([9101, 9102, 9103]);
    expect(f.contactos.map((c) => c.email)).toEqual(["pagos@cliente.cl"]);
  });

  it("«Hoy en Finanzas» cuenta borradores y vencidas", async () => {
    const h = await s.dato<Hoy>("finanzas.hoy.resumen", {});
    expect(h.emitir.borradores.cantidad).toBe(1); // el borrador 9108
    expect(h.cobrar.vencidas).toMatchObject({ cantidad: 3, montoClp: 2_600_000 });
  });

  it("otra empresa no ve nada de esta cobranza", async () => {
    const r = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.cobranza.resumen", {});
    expect(r).toMatchObject({ ok: true });
    const datos = (r as { ok: true; data: Resumen }).data;
    expect(datos.deudores.some((d) => d.cuentaId === s.cuentaId)).toBe(false);
    const x = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.cobranza.deudor", { cuentaId: s.cuentaId });
    expect(x).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
