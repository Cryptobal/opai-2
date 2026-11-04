// F8 (CAR-170) · Ventas: «dos empresas». A nunca ve, abre, emite, anula ni cede un documento de B.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

describe.skipIf(!urlPropietario)("Finanzas · ventas · aislamiento entre empresas (db)", () => {
  let s: VentasDbSuite;

  beforeAll(async () => {
    s = await prepararVentasDb();
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  const comoA = (id: string, input: Record<string, unknown>) => s.mod.executeCapability(s.ctx(), id, input);

  it("el libro y la búsqueda de A no incluyen el documento de B", async () => {
    const libro = await s.dato<{ items: { id: string }[] }>("finanzas.ventas.listar", {});
    expect(libro.items.map((d) => d.id)).not.toContain(s.documentoB);
    const buscar = await s.dato<{ items: { id: string }[] }>("finanzas.ventas.buscar", { folio: 1 });
    expect(buscar.items.map((d) => d.id)).not.toContain(s.documentoB);
  });

  it.each([
    ["finanzas.ventas.obtener"],
    ["finanzas.ventas.envios"],
    ["finanzas.ventas.pdf"],
    ["finanzas.ventas.enviar_sii"],
    ["finanzas.ventas.enviar_cliente"],
    ["finanzas.ventas.emitir"],
    ["finanzas.ventas.cesion_simular"],
  ])("A recibe «no existe» en %s sobre un documento de B", async (id) => {
    const r = await comoA(id, { documentoId: s.documentoB, factorRut: "76000000-0", tasaBps: 250 });
    expect(r).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });

  it("el preflight sobre un documento de B no devuelve datos de B", async () => {
    const r = await comoA("finanzas.ventas.preflight_emision", { documentoId: s.documentoB });
    expect(JSON.stringify(r)).not.toContain("Cliente B");
    expect(JSON.stringify(r)).not.toContain("77999999");
  });

  it("A no puede emitir una nota de crédito ni ceder el documento de B", async () => {
    const nc = await comoA("finanzas.ventas.emitir_nota_credito", { documentoId: s.documentoB, motivo: "anula" });
    expect(nc.ok).toBe(false);
    const ceder = await comoA("finanzas.ventas.cesion_ceder", {
      documentoId: s.documentoB,
      factorRut: "76000000-0",
      tasaBps: 250,
    });
    expect(ceder.ok).toBe(false);
    const doc = await s.e.admin.documentoEmitido.findUniqueOrThrow({ where: { id: s.documentoB } });
    expect(doc.estadoDte).toBe("aceptado");
    expect(doc.cesionEstado).not.toBe("cedido");
  });

  it("A no crea un borrador contra una cuenta cliente de B", async () => {
    const cuentaB = await s.e.admin.cuenta.findFirstOrThrow({ where: { tenantId: s.tenantB } });
    const r = await comoA("finanzas.ventas.crear_borrador", {
      cuentaId: cuentaB.id,
      tipoDte: 33,
      lineas: [{ glosa: "Cruce", monto: 1000 }],
    });
    expect(r.ok).toBe(false);
  });
});
