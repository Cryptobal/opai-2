// CAR-137 · Finanzas ventas DTE PR 1: emisión con SII simulado, folios y aislamiento RLS.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · ventas DTE (PR 1)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("crea borrador, emite con folio y envía al SII simulado hasta aceptado", async () => {
    const borrador = await s.dato<{ id: string; estadoDte: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio de guardias", monto: 200_000 }],
    });
    expect(borrador.estadoDte).toBe("borrador");
    await s.dato("finanzas.ventas.emitir", { documentoId: borrador.id }, { dryRun: true });
    const emitida = await s.dato<{ folio: number; estadoDte: string; montoTotal: number }>("finanzas.ventas.emitir", {
      documentoId: borrador.id,
    });
    expect(emitida).toMatchObject({ folio: 5000, estadoDte: "enviado", montoTotal: 238_000 });
    const enviada = await s.dato<{ estadoDte: string; trackIdSii: string | null }>("finanzas.ventas.enviar_sii", {
      documentoId: borrador.id,
    });
    expect(enviada.trackIdSii).toMatch(/^SIM-/);
    const envio = await s.e.admin.dteEnvio.findFirstOrThrow({ where: { documentoId: borrador.id } });
    const consulta = s.mod.obtenerTrabajo("finanzas.dte.consultar_sii");
    if (!consulta) throw new Error("trabajo consultar_sii");
    await consulta.ejecutar(s.ctx(), { envioId: envio.id });
    const finalDoc = await s.dato<{ estadoDte: string }>("finanzas.ventas.obtener", { documentoId: borrador.id });
    expect(finalDoc.estadoDte).toBe("aceptado");
    const pdf = await s.dato<{ mime: string; base64: string }>("finanzas.ventas.pdf", { documentoId: borrador.id });
    expect(pdf.mime).toBe("application/pdf");
    expect(pdf.base64.length).toBeGreaterThan(100);
  });

  it("consumirFolio asigna folios distintos en emisiones sucesivas", async () => {
    const b1 = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "A", monto: 10_000 }],
    });
    const b2 = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "B", monto: 10_000 }],
    });
    const e1 = await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: b1.id });
    const e2 = await s.dato<{ folio: number }>("finanzas.ventas.emitir", { documentoId: b2.id });
    expect(e2.folio).toBe(e1.folio! + 1);
  });

  it("emisión usa el giro tributario de la cuenta en el timbre simulado", async () => {
    await s.e.admin.cuenta.update({
      where: { id: s.cuentaId },
      data: {
        razonSocial: "Cliente Facturación SpA",
        giro: "Servicios de seguridad",
        calle: "Av. Apoquindo 100",
        comuna: "Las Condes",
        ciudad: "Santiago",
        emailDte: "dte@cliente.cl",
      },
    });
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio", monto: 50_000 }],
    });
    await s.dato("finanzas.ventas.emitir", { documentoId: borrador.id });
    const doc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: borrador.id } });
    expect(doc.timbrePdf417).toContain("Servicios de seguridad");
  });

  it("tenant A no obtiene documentos del tenant B (RLS)", async () => {
    const r = await s.mod.executeCapability(s.ctx(s.tenantId), "finanzas.ventas.obtener", {
      documentoId: s.documentoB,
    });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const lista = await s.mod.executeCapability(s.ctx(s.tenantId), "finanzas.ventas.listar", {});
    expect(lista.ok).toBe(true);
    if (!lista.ok) throw new Error("listar ventas");
    const ids = (lista.data as { items: { id: string }[] }).items.map((i) => i.id);
    expect(ids).not.toContain(s.documentoB);
  });
});
