// CAR-25 (B1) · La migración de la forma real de 1.0 rechaza lo incoherente y aísla por empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "./entorno";

describe.skipIf(!urlPropietario)("Programación recurrente con la forma de 1.0 (CAR-25)", () => {
  let e: Entorno;
  const sufijo = randomUUID().slice(0, 8);
  let idA = "";
  let idB = "";
  let cuentaA = "";

  const base = (tenantId: string, extra: Record<string, unknown> = {}) => ({
    tenantId,
    nombre: "Programación de prueba",
    tipoDte: 33,
    diaGeneracion: 1,
    facturaTiming: "AL_EMITIR",
    facturaMesRelativo: "MES_SIGUIENTE",
    ...extra,
  });

  beforeAll(async () => {
    e = await prepararEntorno();
    idA = (await e.admin.tenant.create({ data: { slug: `vp-a-${sufijo}`, nombre: "A", vertical: "seguridad" } })).id;
    idB = (await e.admin.tenant.create({ data: { slug: `vp-b-${sufijo}`, nombre: "B", vertical: "seguridad" } })).id;
    cuentaA = (await e.admin.cuenta.create({ data: { tenantId: idA, nombre: "Cuenta A" } })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("rechaza una programación sin cuenta y sin RUT del receptor", async () => {
    await expect(e.admin.ventasProgramacion.create({ data: base(idA) })).rejects.toThrow(/cuenta_o_receptor/);
    const ok = await e.admin.ventasProgramacion.create({
      data: base(idA, { receptorRut: "11111111-1", receptorRazonSocial: "Receptor Ficticio" }),
    });
    expect(ok.cuentaId).toBeNull();
  });

  it("acepta tipos 56/61, día -1 y frecuencias de 1.0; rechaza valores fuera de rango", async () => {
    for (const tipoDte of [33, 34, 56, 61]) {
      await e.admin.ventasProgramacion.create({
        data: base(idA, { cuentaId: cuentaA, tipoDte, diaGeneracion: -1, frecuencia: "quincenal" }),
      });
    }
    await expect(
      e.admin.ventasProgramacion.create({ data: base(idA, { cuentaId: cuentaA, tipoDte: 39 }) }),
    ).rejects.toThrow(/tipo_dte/);
    await expect(
      e.admin.ventasProgramacion.create({ data: base(idA, { cuentaId: cuentaA, diaGeneracion: 0 }) }),
    ).rejects.toThrow(/dia_generacion/);
    await expect(
      e.admin.ventasProgramacion.create({ data: base(idA, { cuentaId: cuentaA, frecuencia: "diaria" }) }),
    ).rejects.toThrow(/frecuencia/);
  });

  it("exige exactamente un precio y que coincida con la moneda", async () => {
    const clp = await e.admin.ventasProgramacion.create({ data: base(idA, { cuentaId: cuentaA }) });
    const uf = await e.admin.ventasProgramacion.create({
      data: base(idA, { cuentaId: cuentaA, moneda: "UF" }),
    });
    const linea = (programacionId: string, extra: Record<string, unknown>) =>
      e.admin.ventasProgramacionLinea.create({
        data: { tenantId: idA, programacionId, glosa: "Servicio", ...extra },
      });
    await linea(clp.id, { precioUnitarioClp: 1000n });
    await linea(uf.id, { precioUnitarioUf: 12_5000n, cantidad: "2.5", descuentoPct: 1550 });
    await expect(linea(clp.id, { precioUnitarioClp: 1000n, precioUnitarioUf: 1n })).rejects.toThrow(/un_precio/);
    await expect(linea(clp.id, {})).rejects.toThrow(/requiere precio|un_precio/);
    await expect(linea(clp.id, { precioUnitarioUf: 1n })).rejects.toThrow(/CLP/);
    await expect(linea(uf.id, { precioUnitarioClp: 1000n })).rejects.toThrow(/UF/);
  });

  it("una corrida por programación y período, aislada por empresa", async () => {
    const p = await e.admin.ventasProgramacion.create({ data: base(idA, { cuentaId: cuentaA }) });
    await e.admin.ventasProgramacionCorrida.create({
      data: { tenantId: idA, programacionId: p.id, periodo: "2026-11" },
    });
    await expect(
      e.admin.ventasProgramacionCorrida.create({
        data: { tenantId: idA, programacionId: p.id, periodo: "2026-11" },
      }),
    ).rejects.toThrow();
    const desdeB = await e.forTenant(idB).ventasProgramacionCorrida.findMany({});
    expect(desdeB).toHaveLength(0);
    const desdeA = await e.forTenant(idA).ventasProgramacionCorrida.findMany({});
    expect(desdeA.length).toBeGreaterThanOrEqual(1);
    await expect(
      e.forTenant(idB).ventasProgramacionCorrida.create({
        data: { tenantId: idB, programacionId: p.id, periodo: "2026-12" },
      }),
    ).rejects.toThrow();
  });
});
