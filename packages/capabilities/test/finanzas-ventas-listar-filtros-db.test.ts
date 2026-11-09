// CAR-221 · A3b-2b · filtros de `finanzas.ventas.listar` para elegir el documento a corregir al emitir una NC o una ND:
// por cliente, por tipo y solo emitidos (sin borradores). Con Postgres real y dos empresas.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";

import { prepararVentasDb, type VentasDbSuite } from "./finanzas-ventas-db-helpers";

type Fila = { id: string; tipoDte: number; estadoDte: string; cuentaId: string };
type Lista = { items: Fila[] };

describe.skipIf(!urlPropietario)("Finanzas · listar ventas con filtros de cliente, tipo y emitidos (db)", () => {
  let s: VentasDbSuite;
  let emitidoId = "";
  let borradorId = "";

  beforeAll(async () => {
    s = await prepararVentasDb({
      almacenamiento: almacenamientoEnMemoria().almacenamiento,
      correo: { nombre: "prueba", enviar: async () => undefined },
      urlBase: "https://test.opai.cl",
    });
    const crear = () =>
      s.dato<{ id: string }>("finanzas.ventas.crear_borrador", {
        cuentaId: s.cuentaId,
        tipoDte: 33,
        lineas: [{ glosa: "Servicio mensual", monto: 50_000 }],
      });
    borradorId = (await crear()).id;
    emitidoId = (await crear()).id;
    await s.dato("finanzas.ventas.emitir", { documentoId: emitidoId });
  });

  afterAll(async () => {
    await s?.e.cerrar();
  });

  it("soloEmitidos deja fuera los borradores", async () => {
    const todos = await s.dato<Lista>("finanzas.ventas.listar", {});
    expect(todos.items.map((f) => f.id)).toEqual(expect.arrayContaining([emitidoId, borradorId]));
    const emitidos = await s.dato<Lista>("finanzas.ventas.listar", { soloEmitidos: true });
    expect(emitidos.items.map((f) => f.id)).toContain(emitidoId);
    expect(emitidos.items.map((f) => f.id)).not.toContain(borradorId);
  });

  it("filtra por cliente y por tipo", async () => {
    const delCliente = await s.dato<Lista>("finanzas.ventas.listar", { cuentaId: s.cuentaId, tipoDte: 33, soloEmitidos: true });
    expect(delCliente.items.length).toBeGreaterThan(0);
    expect(delCliente.items.every((f) => f.cuentaId === s.cuentaId && f.tipoDte === 33)).toBe(true);
    const notas = await s.dato<Lista>("finanzas.ventas.listar", { cuentaId: s.cuentaId, tipoDte: 61 });
    expect(notas.items).toEqual([]);
  });

  it("el filtro de cliente no cruza empresas", async () => {
    const r = await s.mod.executeCapability(s.ctx(s.tenantB), "finanzas.ventas.listar", { cuentaId: s.cuentaId });
    expect(r).toMatchObject({ ok: true, data: { items: [] } });
  });
});
