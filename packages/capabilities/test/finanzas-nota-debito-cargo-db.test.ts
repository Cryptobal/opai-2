// CAR-234 · Nota de débito (56) de cargo sobre una factura emitida: borrador, vista previa y emisión con el flujo de la
// factura. Postgres local aislado, tenants ficticios y SII simulado (un espía sobre `firmar`): ningún DTE real.
import {
  adaptadorSiiSimulado,
  type AdaptadorSii,
  type PayloadEmisionDte,
} from "@opai/integrations";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { cafXmlSintetico } from "./finanzas-caf-fixture";
import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

const firmas = vi.hoisted(() => [] as PayloadEmisionDte[]);
vi.mock("../src/finanzas/adaptador-sii", () => ({
  adaptadorSiiDe: async (): Promise<AdaptadorSii> => {
    const sim = adaptadorSiiSimulado();
    return { ...sim, firmar: (p) => (firmas.push(p), sim.firmar(p)) };
  },
}));

type Vista = {
  id: string;
  folio: number | null;
  estadoDte: string;
  tipoDte: number;
  montoNeto: number;
  montoIva: number;
  montoExento: number;
  montoTotal: number;
  montoPendiente?: number;
  documentoReferenciaId: string | null;
};
const motivo = "Intereses por pago fuera de plazo";

describe.skipIf(!urlPropietario)(
  "Finanzas · nota de débito de cargo sobre una factura (CAR-234)",
  () => {
    let s: VentasDbSuite;
    const factura = async (tipoDte: 33 | 34, monto = 100_000) => {
      const b = await s.dato<Vista>("finanzas.ventas.crear_borrador", {
        cuentaId: s.cuentaId,
        tipoDte,
        lineas: [{ glosa: "Servicio", monto }],
      });
      return s.dato<Vista>("finanzas.ventas.emitir", { documentoId: b.id });
    };
    const fallo = async (input: Record<string, unknown>) => {
      const r = await s.mod.executeCapability(
        s.ctx(),
        "finanzas.ventas.crear_borrador_nota_debito",
        input,
      );
      return r.ok ? null : r.error;
    };

    beforeAll(async () => {
      s = await prepararVentasDb();
    registrarModuloFinanzas(); // ajustes del módulo que usa «Hoy en Finanzas»
      await s.dato("finanzas.folios.cargar_caf", {
        cafXml: cafXmlSintetico({ tipoDte: 34, folioDesde: 9300, folioHasta: 9320 }),
      });
      await s.dato("finanzas.folios.cargar_caf", {
        cafXml: cafXmlSintetico({ tipoDte: 56, folioDesde: 9400, folioHasta: 9420 }),
      });
      await s.dato("finanzas.folios.cargar_caf", {
        cafXml: cafXmlSintetico({ tipoDte: 61, folioDesde: 9500, folioHasta: 9520 }),
      });
    }, 120_000);
    afterAll(async () => {
      await s?.e.cerrar();
    });

    it("borrador con vista previa, emisión con folio del CAF 56 y referencia CodRef 3 a la factura", async () => {
      const f = await factura(33);
      const input = {
        facturaId: f.id,
        motivo,
        lineas: [{ glosa: "Intereses octubre", monto: 10_000 }],
      };
      const previa = await s.dato<Vista>("finanzas.ventas.crear_borrador_nota_debito", input, {
        dryRun: true,
      });
      expect(previa).toMatchObject({
        tipoDte: 56,
        estadoDte: "borrador",
        montoNeto: 10_000,
        montoIva: 1_900,
        montoTotal: 11_900,
        folio: null,
      });
      expect(
        await s.e.admin.documentoEmitido.count({ where: { tenantId: s.tenantId, tipoDte: 56 } }),
      ).toBe(0);

      const b = await s.dato<Vista>("finanzas.ventas.crear_borrador_nota_debito", input);
      expect(b).toMatchObject({
        tipoDte: 56,
        estadoDte: "borrador",
        documentoReferenciaId: f.id,
        montoTotal: 11_900,
      });
      const refs = await s.e.admin.documentoEmitidoReferencia.findMany({
        where: { documentoId: b.id },
      });
      expect(refs).toEqual([
        expect.objectContaining({
          tipoDteRef: 33,
          folioRef: f.folio,
          codigoRef: 3,
          razonRef: motivo,
        }),
      ]);

      firmas.length = 0;
      const vistaEmision = await s.dato<Vista>(
        "finanzas.ventas.emitir",
        { documentoId: b.id },
        { dryRun: true },
      );
      expect(vistaEmision.folio).toBe(9400);
      expect(firmas).toHaveLength(0); // la vista previa no firma

      const nd = await s.dato<Vista>("finanzas.ventas.emitir", { documentoId: b.id });
      expect(nd).toMatchObject({
        tipoDte: 56,
        folio: 9400,
        estadoDte: "enviado",
        montoTotal: 11_900,
      });
      expect(firmas).toHaveLength(1);
      expect(firmas[0]).toMatchObject({
        tipoDte: 56,
        folio: 9400,
        referencias: [expect.objectContaining({ tipoDte: 33, folio: f.folio, codigo: 3 })],
      });
      const caf56 = await s.e.admin.dteFolio.findFirstOrThrow({
        where: { tenantId: s.tenantId, tipoDte: 56 },
      });
      expect(caf56.folioActual).toBe(9401);
      // La factura no cambia: la ND no suma deuda (ADR-068) hasta que Carlos decida (D1 del PR).
      expect(
        (await s.dato<Vista>("finanzas.ventas.obtener", { documentoId: f.id })).montoPendiente,
      ).toBe(f.montoTotal);
    });

    it("«Hoy» cuenta el borrador de nota de débito entre lo que hay que emitir", async () => {
    type Hoy = { emitir: { borradores: { cantidad: number; montoClp: number } } };
    const f = await factura(33);
    const antes = (await s.dato<Hoy>("finanzas.hoy.resumen", {})).emitir.borradores;
    await s.dato("finanzas.ventas.crear_borrador_nota_debito", { facturaId: f.id, motivo, lineas: [{ glosa: "Cargo", monto: 1_000 }] });
    const despues = (await s.dato<Hoy>("finanzas.hoy.resumen", {})).emitir.borradores;
    expect(despues.cantidad).toBe(antes.cantidad + 1);
    expect(despues.montoClp).toBe(antes.montoClp + 1_190);
  });

  it("sobre una factura exenta (34) la nota de débito también es exenta", async () => {
      const f = await factura(34, 50_000);
      const b = await s.dato<Vista>("finanzas.ventas.crear_borrador_nota_debito", {
        facturaId: f.id,
        motivo,
        lineas: [{ glosa: "Reajuste", monto: 5_000 }],
      });
      expect(b).toMatchObject({ montoNeto: 0, montoIva: 0, montoExento: 5_000, montoTotal: 5_000 });
    });

    it("rechaza un origen que no es una factura emitida y vigente, y la factura de otra empresa", async () => {
      const borrador = await s.dato<Vista>("finanzas.ventas.crear_borrador", {
        cuentaId: s.cuentaId,
        tipoDte: 33,
        lineas: [{ glosa: "X", monto: 1_000 }],
      });
      const linea = [{ glosa: "Cargo", monto: 1_000 }];
      expect(await fallo({ facturaId: borrador.id, motivo, lineas: linea })).toMatchObject({
        code: "UNPROCESSABLE",
        message: expect.stringMatching(/emitida y vigente/),
      });
      const f = await factura(33);
      await s.dato("finanzas.ventas.emitir_nota_credito", {
        documentoReferenciaId: f.id,
        monto: f.montoTotal,
        motivo: "Anula",
        codigoReferencia: 1,
      });
      const nc = await s.e.admin.documentoEmitido.findFirstOrThrow({
        where: { documentoReferenciaId: f.id, tipoDte: 61 },
      });
      expect(await fallo({ facturaId: nc.id, motivo, lineas: linea })).toMatchObject({
        code: "UNPROCESSABLE",
        message: expect.stringMatching(/sobre una factura/),
      });
      expect(await fallo({ facturaId: f.id, motivo, lineas: linea })).toMatchObject({
        message: expect.stringMatching(/emitida y vigente/),
      }); // anulada por la NC
      expect(await fallo({ facturaId: s.documentoB, motivo, lineas: linea })).toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("si la factura se anula después de crear el borrador, la emisión se rechaza y no usa folio", async () => {
      const f = await factura(33);
      const b = await s.dato<Vista>("finanzas.ventas.crear_borrador_nota_debito", {
        facturaId: f.id,
        motivo,
        lineas: [{ glosa: "Cargo", monto: 2_000 }],
      });
      await s.dato("finanzas.ventas.emitir_nota_credito", {
        documentoReferenciaId: f.id,
        monto: f.montoTotal,
        motivo: "Anula",
        codigoReferencia: 1,
      });
      const antes = (
        await s.e.admin.dteFolio.findFirstOrThrow({ where: { tenantId: s.tenantId, tipoDte: 56 } })
      ).folioActual;
      const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.emitir", {
        documentoId: b.id,
      });
      expect(r.ok ? null : r.error).toMatchObject({
        code: "UNPROCESSABLE",
        message: expect.stringMatching(/emitida y vigente/),
      });
      expect(
        (
          await s.e.admin.dteFolio.findFirstOrThrow({
            where: { tenantId: s.tenantId, tipoDte: 56 },
          })
        ).folioActual,
      ).toBe(antes);
      expect(
        (await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: b.id } })).estadoDte,
      ).toBe("borrador");
    });
  },
);
