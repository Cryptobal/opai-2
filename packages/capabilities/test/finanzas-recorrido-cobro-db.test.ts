// CAR-489 · Recorrido de cobro de punta a punta, con las capacidades reales contra Postgres y datos ficticios:
// una factura vence y entra a cobranza, se recuerda al cliente, llega el abono al banco, OPAI sugiere la factura y
// conciliarla la deja pagada y fuera de cobranza. Es el criterio de cierre del proyecto 13 · Cobrar.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { urlPropietario } from "../../db/test/entorno";

import { registrarModuloFinanzas } from "./finanzas-modulo";
import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

type Resumen = { totalVencido: number; deudores: { cuentaId: string; facturasVencidas: number }[] };
type Sugerencias = { sugerencias: { documentoId: string; tipo: string; montoPendiente: number }[] };

const diasAtras = (n: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

describe.skipIf(!urlPropietario)("Finanzas · recorrido de cobro (db)", () => {
  let s: VentasDbSuite;
  let facturaId = "";
  let movimientoId = "";
  const enviados: Correo[] = [];
  const MONTO = 1_190_000;

  beforeAll(async () => {
    s = await prepararVentasDb({
      almacenamiento: almacenamientoEnMemoria().almacenamiento,
      correo: { nombre: "prueba", enviar: async (c) => void enviados.push(c) },
      urlBase: "https://test.opai.cl",
    });
    s.mod.limpiarRegistro();
    s.mod.registrarCapacidades([...s.mod.capacidadesDelNucleo, ...s.mod.capacidadesFinanzas, ...capacidades]);
    registrarModuloFinanzas();
    // Factura aceptada, emitida hace 45 días a 30 días: vencida hace 15 días.
    facturaId = (
      await s.e.admin.documentoEmitido.create({
        data: {
          tenantId: s.tenantId, cuentaId: s.cuentaId, tipoDte: 33, folio: 9401, estadoDte: "aceptado", timbrePdf417: "<TED>prueba</TED>",
          fechaEmision: diasAtras(45), fechaVencimiento: diasAtras(15), montoNeto: 1_000_000, montoIva: 190_000, montoTotal: MONTO,
        },
      })
    ).id;
    await s.e.admin.contacto.create({
      data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Pérez", email: "pagos@cliente.cl", roles: ["facturacion"], esPrincipal: true },
    });
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("1 · la factura vencida aparece en cobranza", async () => {
    const r = await s.dato<Resumen>("finanzas.cobranza.resumen", {});
    expect(r.totalVencido).toBe(MONTO);
    expect(r.deudores).toMatchObject([{ cuentaId: s.cuentaId, facturasVencidas: 1 }]);
  });

  it("2 · el recordatorio llega al contacto de facturación y queda en el historial", async () => {
    const r = await s.dato<{ estado: string; para: string | null }>("finanzas.cobranza.recordar", { documentoId: facturaId });
    expect(r).toMatchObject({ estado: "enviado", para: "pagos@cliente.cl" });
    expect(enviados).toHaveLength(1);
    expect(await s.e.admin.cobranzaGestion.count({ where: { documentoId: facturaId, resultado: "enviado" } })).toBe(1);
  });

  it("3 · llega el abono al banco y OPAI sugiere la factura", async () => {
    const cuenta = await s.dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "555666777" });
    movimientoId = (
      await s.e.admin.movimientoBancario.create({
        data: {
          tenantId: s.tenantId, cuentaId: cuenta.id, fecha: diasAtras(0), monto: BigInt(MONTO), glosa: "Transferencia de cliente ficticio",
          claveDedupe: `r-${randomUUID()}`, origen: "cartola",
        },
      })
    ).id;
    const r = await s.dato<Sugerencias>("finanzas.conciliaciones.sugerir", { movimientoId });
    expect(r.sugerencias[0]).toMatchObject({ documentoId: facturaId, tipo: "documento_emitido", montoPendiente: MONTO });
  });

  it("4 · conciliar deja la factura pagada y fuera de cobranza", async () => {
    const enlaces = [{ tipo: "documento_emitido", id: facturaId, monto: MONTO }];
    const r = await s.dato<{ conciliado: boolean; estadoCobro: string | null }>("finanzas.conciliaciones.confirmar", { movimientoId, enlaces });
    expect(r).toMatchObject({ conciliado: true, estadoCobro: "pagada" });
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: facturaId } });
    expect(doc).toMatchObject({ estadoCobro: "pagada", montoCobrado: MONTO });
    expect((await s.dato<Resumen>("finanzas.cobranza.resumen", {})).totalVencido).toBe(0);
  });
});
