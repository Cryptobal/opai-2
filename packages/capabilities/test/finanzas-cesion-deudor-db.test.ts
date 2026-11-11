// CAR-267 · correo del deudor para ceder con Octava: casilla DTE, destinatario PARA o contacto de facturación.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { correoDeudorCesion, exigirCorreoDeudor } from "../src/finanzas/ventas-cesion-deudor";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe("correo del deudor al ceder (CAR-267)", () => {
  it("Octava sin correo avisa qué completar; el simulado no lo exige", () => {
    expect(() => exigirCorreoDeudor("octava", null)).toThrow(/contacto con rol facturación/);
    expect(() => exigirCorreoDeudor("simulado", null)).not.toThrow();
    expect(() => exigirCorreoDeudor("octava", "a@b.cl")).not.toThrow();
  });
});

describe.skipIf(!urlPropietario)("correo del deudor al ceder · base (CAR-267)", () => {
  let s: VentasDbSuite;
  beforeAll(async () => {
    s = await prepararVentasDb();
  });
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("sin casilla DTE usa el contacto de facturación activo de la cuenta", async () => {
    const doc = { id: "00000000-0000-7000-8000-000000000001", cuentaId: s.cuentaId };
    expect(await correoDeudorCesion(s.ctx(), doc, null)).toBeNull();
    await s.e.admin.contacto.create({
      data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Prueba", email: "facturas@cliente.test", roles: ["facturacion"] },
    });
    expect(await correoDeudorCesion(s.ctx(), doc, null)).toBe("facturas@cliente.test");
    expect(await correoDeudorCesion(s.ctx(), doc, " dte@cliente.test ")).toBe("dte@cliente.test");
  });
});
