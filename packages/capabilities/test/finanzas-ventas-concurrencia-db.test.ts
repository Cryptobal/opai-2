// C1 / C4 / N15 · concurrencia y folios con Postgres real (CAR-137, review #204).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · ventas DTE · concurrencia (db)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("C1 · dos emisiones concurrentes del mismo borrador: solo una asigna folio", async () => {
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Concurrencia emisión", monto: 15_000 }],
    });
    const emitir = () => s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", { documentoId: borrador.id });
    const r = await Promise.allSettled([emitir(), emitir()]);
    const ok = r.filter((x) => x.status === "fulfilled" && x.value.ok);
    const mal = r.filter((x) => x.status === "fulfilled" && !x.value.ok);
    expect(ok).toHaveLength(1);
    expect(mal).toHaveLength(1);
    expect(mal[0]?.status === "fulfilled" && mal[0].value).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
  });

  it("C4 · dos NC parciales concurrentes: juntas superan el tope, solo una pasa", async () => {
    await s.dato("finanzas.folios.cargar_caf", {
      tipoDte: 61,
      folioDesde: 9000,
      folioHasta: 9010,
      cafVenceEn: "2027-12-31",
    });
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Base NC concurrente", monto: 100_000 }],
    });
    const facturaId = borrador.id;
    await s.dato("finanzas.ventas.emitir", { documentoId: facturaId });
    await s.dato("finanzas.ventas.enviar_sii", { documentoId: facturaId });
    const ncInput = {
      documentoReferenciaId: facturaId,
      monto: 70_000,
      motivo: "Corrección parcial concurrente",
      codigoReferencia: 3,
    };
    const emitirNc = () => s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir_nota_credito", ncInput);
    const r = await Promise.allSettled([emitirNc(), emitirNc()]);
    const ok = r.filter((x) => x.status === "fulfilled" && x.value.ok);
    const mal = r.filter((x) => x.status === "fulfilled" && !x.value.ok);
    expect(ok).toHaveLength(1);
    expect(mal).toHaveLength(1);
    expect(mal[0]?.status === "fulfilled" && mal[0].value).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    const ncs = await s.e.admin.documentoEmitido.count({
      where: { tenantId: s.tenantId, documentoReferenciaId: facturaId, tipoDte: 61 },
    });
    expect(ncs).toBe(1);
  });

  it("N15 · un rango con CAF vencido no bloquea si hay otro rango vigente", async () => {
    await s.e.admin.dteFolio.updateMany({ where: { tenantId: s.tenantId, tipoDte: 33 }, data: { activo: false } });
    await s.e.admin.dteFolio.create({
      data: {
        tenantId: s.tenantId,
        tipoDte: 33,
        folioDesde: 1,
        folioHasta: 100,
        folioActual: 50,
        cafVenceEn: new Date("2020-01-01T00:00:00.000Z"),
        activo: true,
      },
    });
    await s.dato("finanzas.folios.cargar_caf", {
      tipoDte: 33,
      folioDesde: 8000,
      folioHasta: 8002,
      cafVenceEn: "2027-12-31",
    });
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Salta CAF viejo", monto: 12_000 }],
    });
    const emitida = await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: borrador.id });
    expect(emitida.folio).toBe(8000);
  });

  it("C2 · dos cesiones concurrentes del mismo documento: solo una reserva", async () => {
    process.env.CESION_ADAPTADOR = "simulado";
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Base cesión", monto: 40_000 }],
    });
    await s.dato("finanzas.ventas.emitir", { documentoId: borrador.id });
    await s.dato("finanzas.ventas.enviar_sii", { documentoId: borrador.id });
    const envio = await s.e.admin.dteEnvio.findFirstOrThrow({ where: { documentoId: borrador.id } });
    const consulta = s.mod.obtenerTrabajo("finanzas.dte.consultar_sii");
    if (!consulta) throw new Error("trabajo consultar_sii");
    await consulta.ejecutar(s.ctx(), { envioId: envio.id });
    await s.e.admin.documentoEmitido.update({
      where: { id: borrador.id },
      data: { xmlStorageKey: `dte/${borrador.id}.xml` },
    });
    const ceder = () =>
      s.mod.executeCapability(s.ctx(), "finanzas.ventas.cesion_ceder", {
        documentoId: borrador.id,
        factorRut: "76000000-0",
      });
    const r = await Promise.allSettled([ceder(), ceder()]);
    const ok = r.filter((x) => x.status === "fulfilled" && x.value.ok);
    const mal = r.filter((x) => x.status === "fulfilled" && !x.value.ok);
    expect(ok).toHaveLength(1);
    expect(mal).toHaveLength(1);
    expect(mal[0]?.status === "fulfilled" && mal[0].value).toMatchObject({
      ok: false,
      error: { code: "CONFLICT" },
    });
    const doc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: borrador.id } });
    expect(doc).toMatchObject({ cesionEstado: "cedido", estadoCobro: "cedida" });
  });
});
