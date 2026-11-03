// F2 (CAR-155) · envío del documento al cliente con Postgres real: contactos con rol facturación,
// copia al resto, historial, reenvío con confirmación y aislamiento entre empresas.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Correo } from "@opai/integrations";

import { urlPropietario } from "../../db/test/entorno";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Envio = { estado: string; para: string; cc: string[]; adjuntos: string[] };

describe.skipIf(!urlPropietario)("Finanzas · ventas · envío al cliente (db)", () => {
  let s: VentasDbSuite;
  let docId: string;
  const enviados: Correo[] = [];

  beforeAll(async () => {
    s = await prepararVentasDb({
      almacenamiento: almacenamientoEnMemoria().almacenamiento,
      correo: { nombre: "prueba", enviar: async (c) => void enviados.push(c) },
      urlBase: "https://test.opai.cl",
    });
    const nuevo = (extra: Record<string, unknown>) =>
      s.e.admin.contacto.create({
        data: { tenantId: s.tenantId, cuentaId: s.cuentaId, nombres: "Ana", apellidos: "Pérez", ...extra },
      });
    await nuevo({ email: "Facturas@cliente.cl", roles: ["facturacion"], esPrincipal: true });
    await nuevo({ email: "contabilidad@cliente.cl", roles: ["facturacion"] });
    await nuevo({ email: "gerente@cliente.cl", roles: ["comercial"] });
    const b = await s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
      cuentaId: s.cuentaId,
      tipoDte: 33,
      lineas: [{ glosa: "Servicio mensual", monto: 50_000 }],
    });
    docId = b.id;
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("un borrador no se envía", async () => {
    const r = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.enviar_cliente", { documentoId: docId });
    expect(r.ok).toBe(false);
  });

  it("envía al contacto principal con copia a los demás de facturación, sin el comercial", async () => {
    await s.dato("finanzas.ventas.emitir", { documentoId: docId });
    const vista = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: docId }, { dryRun: true });
    expect(vista.estado).toBe("vista_previa");
    const r = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: docId });
    expect(r).toMatchObject({ estado: "enviado", para: "facturas@cliente.cl", cc: ["contabilidad@cliente.cl"] });
    expect(r.adjuntos).toEqual(["pdf", "xml"]);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]?.para).toBe("facturas@cliente.cl");
    expect(enviados[0]?.cc).toEqual(["contabilidad@cliente.cl"]);
    expect(enviados[0]?.adjuntos?.map((a) => a.mime)).toEqual(["application/pdf", "application/xml"]);
    const { envios } = await s.dato<{ envios: { estado: string }[] }>("finanzas.ventas.envios", { documentoId: docId });
    expect(envios).toHaveLength(1);
  });

  it("un segundo envío exige confirmar el reenvío", async () => {
    const sin = await s.mod.executeCapability(s.ctx(), "finanzas.ventas.enviar_cliente", { documentoId: docId });
    expect(sin.ok).toBe(false);
    const con = await s.dato<Envio>("finanzas.ventas.enviar_cliente", { documentoId: docId, reenviar: true });
    expect(con.estado).toBe("enviado");
    const { envios } = await s.dato<{ envios: unknown[] }>("finanzas.ventas.envios", { documentoId: docId });
    expect(envios).toHaveLength(2);
  });

  it("otra empresa no ve ni envía el documento", async () => {
    const e = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.envios", { documentoId: docId });
    expect(e).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const x = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.enviar_cliente", { documentoId: docId });
    expect(x).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
