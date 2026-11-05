// CAR-191 · una cesión anulada por el RPETC deja la factura cobrable y se puede ceder de nuevo.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · cesión anulada (db)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("anulada: factura vuelve a no_cedido y cobrable, emite el evento y se puede ceder otra vez", async () => {
    process.env.CESION_ADAPTADOR = "simulado";
    const borrador = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Factura a ceder", monto: 40_000 }],
    });
    await s.dato("finanzas.ventas.emitir", { documentoId: borrador.id });
    await s.dato("finanzas.ventas.enviar_sii", { documentoId: borrador.id });
    const envio = await s.e.admin.dteEnvio.findFirstOrThrow({ where: { documentoId: borrador.id } });
    const consultaSii = s.mod.obtenerTrabajo("finanzas.dte.consultar_sii");
    if (!consultaSii) throw new Error("trabajo consultar_sii");
    await consultaSii.ejecutar(s.ctx(), { envioId: envio.id });
    await s.e.admin.documentoEmitido.update({
      where: { id: borrador.id },
      data: { xmlStorageKey: `dte/${borrador.id}.xml` },
    });
    const ceder = () =>
      s.mod.executeCapability(s.ctx(), "finanzas.ventas.cesion_ceder", {
        documentoId: borrador.id,
        factorRut: "76000000-0",
      });
    const primera = await ceder();
    expect(primera.ok).toBe(true);
    const cedida = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: borrador.id } });
    expect(cedida).toMatchObject({ cesionEstado: "cedido", estadoCobro: "cedida" });

    // El RPETC la anula: el simulado anula los ids con «RECHAZO».
    await s.e.admin.cesion.updateMany({
      where: { documentoId: borrador.id },
      data: { operacionExternaId: "SIM-CES-RECHAZO" },
    });
    const trabajo = s.mod.obtenerTrabajo("finanzas.cesion.consultar_rpetc");
    if (!trabajo) throw new Error("trabajo consultar_rpetc");
    await trabajo.ejecutar(s.ctx(), { hora: "t" });

    const doc = await s.e.admin.documentoEmitido.findFirstOrThrow({ where: { id: borrador.id } });
    expect(doc).toMatchObject({
      cesionEstado: "no_cedido",
      cesionOperacionId: null,
      cesionProveedor: null,
      estadoCobro: "pendiente",
      montoCobrado: 0,
    });
    const cesiones = await s.e.admin.cesion.findMany({ where: { documentoId: borrador.id } });
    expect(cesiones.map((c) => c.estado)).toEqual(["anulada"]);
    const eventos = await s.e.admin.evento.count({
      where: { tenantId: s.tenantId, tipo: "finanzas.venta.cesion_anulada", entidadId: borrador.id },
    });
    expect(eventos).toBe(1);

    // Volver a ceder: la secuencia nueva no choca con la anulada.
    const segunda = await ceder();
    expect(segunda.ok).toBe(true);
    const todas = await s.e.admin.cesion.findMany({
      where: { documentoId: borrador.id },
      orderBy: { secuencia: "asc" },
    });
    expect(todas.map((c) => [c.secuencia, c.estado])).toEqual([
      [1, "anulada"],
      [2, "enviada"],
    ]);
  });
});
