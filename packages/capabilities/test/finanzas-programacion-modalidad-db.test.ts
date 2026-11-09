// Modalidad de la programación (CAR-221 B): proforma y estado de pago antes de facturar. Solo la marca;
// no genera documentos tributarios ni envía correos. Contra Postgres real.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const urlPropietario = process.env.DATABASE_URL_TEST;
const mesActual = new Date().toISOString().slice(0, 7);

type Marcas = { id: string; autoEnvioProforma: boolean; autoEnvioEstadoPago: boolean };

describe.skipIf(!urlPropietario)("programación · modalidad proforma / estado de pago", () => {
  let s: VentasDbSuite;
  const base = () => ({
    nombre: "Servicio con proforma",
    cuentaId: s.cuentaId,
    tipoDte: 33,
    frecuencia: "mensual",
    diaGeneracion: 1,
    plazoPagoDias: 30,
    fechaInicio: `${mesActual}-01`,
    lineas: [{ glosa: "Servicio", cantidad: "1", precioUnitario: 100_000, descuentoPct: 0 }],
  });

  beforeAll(async () => {
    s = await prepararVentasDb();
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("sin marcar queda en falso y se puede activar cada modalidad", async () => {
    const lisa = await s.dato<Marcas>("finanzas.ventas_programacion.crear", base());
    const a = await s.dato<Marcas>("finanzas.ventas_programacion.obtener", {
      programacionId: lisa.id,
    });
    expect(a.autoEnvioProforma).toBe(false);
    expect(a.autoEnvioEstadoPago).toBe(false);

    const marcada = await s.dato<Marcas>("finanzas.ventas_programacion.crear", {
      ...base(),
      autoEnvioProforma: true,
      autoEnvioEstadoPago: true,
    });
    const b = await s.dato<Marcas>("finanzas.ventas_programacion.obtener", {
      programacionId: marcada.id,
    });
    expect([b.autoEnvioProforma, b.autoEnvioEstadoPago]).toEqual([true, true]);
  });

  it("actualizar apaga una modalidad y deja la otra", async () => {
    const c = await s.dato<Marcas>("finanzas.ventas_programacion.crear", {
      ...base(),
      autoEnvioProforma: true,
      autoEnvioEstadoPago: true,
    });
    await s.dato("finanzas.ventas_programacion.actualizar", {
      ...base(),
      programacionId: c.id,
      autoEnvioProforma: false,
      autoEnvioEstadoPago: true,
    });
    const d = await s.dato<Marcas>("finanzas.ventas_programacion.obtener", {
      programacionId: c.id,
    });
    expect([d.autoEnvioProforma, d.autoEnvioEstadoPago]).toEqual([false, true]);
  });
});
