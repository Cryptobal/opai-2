// CAR-240 · Configuración DTE que persiste (resolución N° 0 en certificación) y CAF pausables por ambiente.
// Datos ficticios; SII SIMULADO (no se emite nada real).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Folio = { id: string; folioDesde: number; activo: boolean; ambiente: string | null };
type Cfg = { emisionProveedor: string; ambiente: string; resolucionSiiNumero: number | null; resolucionSiiFecha: string | null };

describe.skipIf(!urlPropietario)("config DTE y CAF pausables · base real (CAR-240)", () => {
  let s: VentasDbSuite;
  beforeAll(async () => {
    s = await prepararVentasDb();
  }, 120_000);
  afterAll(async () => {
    await s?.e.cerrar();
  });

  const emitirUna = async () => {
    const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de prueba", monto: 100_000 }],
    });
    return s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: b.id });
  };

  it("SimpleAPI en certificación con resolución N° 0 y fecha: los 4 campos persisten", async () => {
    await s.dato("finanzas.dte_config.actualizar", {
      ambiente: "certificacion",
      emisionProveedor: "simpleapi",
      resolucionSiiNumero: 0,
      resolucionSiiFecha: "2024-04-22",
    });
    const cfg = await s.dato<Cfg>("finanzas.dte_config.obtener", {});
    expect(cfg).toMatchObject({
      ambiente: "certificacion",
      emisionProveedor: "simpleapi",
      resolucionSiiNumero: 0,
      resolucionSiiFecha: "2024-04-22",
    });
    const fila = await s.e.admin.dteConfig.findUniqueOrThrow({ where: { tenantId: s.tenantId } });
    expect([fila.emisionProveedor, fila.resolucionSiiNumero, fila.resolucionSiiFecha?.toISOString().slice(0, 10)]).toEqual([
      "simpleapi",
      0,
      "2024-04-22",
    ]);
    // El 0 sigue sin valer en producción (regla de la capacidad, no de la base).
    await s.dato("finanzas.dte_config.actualizar", { ambiente: "certificacion", emisionProveedor: "simulado" });
  });

  it("la emisión salta el CAF de producción y en simulado nunca gasta sus folios", async () => {
    const prod = await s.e.admin.dteFolio.create({
      data: {
        tenantId: s.tenantId,
        tipoDte: 33,
        folioDesde: 4000,
        folioHasta: 4010,
        folioActual: 4000,
        cafIdk: "300",
        cafAmbiente: "produccion",
        umbralAviso: 20,
        activo: true,
      },
    });
    const { items } = await s.dato<{ items: Folio[] }>("finanzas.folios.listar", { soloActivos: false });
    expect(items.find((f) => f.folioDesde === 4000)?.ambiente).toBe("produccion");
    expect(items.find((f) => f.folioDesde === 5000)?.ambiente).toBe("certificacion");
    const emitida = await emitirUna();
    expect(emitida.folio).toBeGreaterThanOrEqual(5000);
    expect((await s.e.admin.dteFolio.findUniqueOrThrow({ where: { id: prod.id } })).folioActual).toBe(4000);
  });

  it("pausar el CAF de certificación deja la emisión sin CAF (error claro) y reactivarlo la devuelve", async () => {
    const { items } = await s.dato<{ items: Folio[] }>("finanzas.folios.listar", { soloActivos: false });
    const cert = items.find((f) => f.folioDesde === 5000)!;
    const previa = await s.dato<Folio>("finanzas.folios.set_activo", { folioId: cert.id, activo: false }, { dryRun: true });
    expect(previa.activo).toBe(false);
    expect((await s.e.admin.dteFolio.findUniqueOrThrow({ where: { id: cert.id } })).activo).toBe(true);

    const pausado = await s.dato<Folio>("finanzas.folios.set_activo", { folioId: cert.id, activo: false });
    expect(pausado.activo).toBe(false);
    await expect(emitirUna()).rejects.toThrow(/No hay un CAF activo de certificación para el DTE 33/);
    const prod = await s.e.admin.dteFolio.findFirstOrThrow({ where: { tenantId: s.tenantId, folioDesde: 4000 } });
    expect(prod.folioActual).toBe(4000);
    const auditoria = await s.e.admin.auditEvent.findMany({
      where: { tenantId: s.tenantId, capability: "finanzas.folios.set_activo" },
    });
    expect(auditoria.length).toBeGreaterThanOrEqual(1);

    await s.dato("finanzas.folios.set_activo", { folioId: cert.id, activo: true });
    expect((await emitirUna()).folio).toBeGreaterThanOrEqual(5000);
  });
});
