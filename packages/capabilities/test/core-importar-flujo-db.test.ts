// CAR-349 bloque 3 · Importadores del flujo de caja: filas (categorías de egreso) y gastos recurrentes. Simulan sin
// escribir, no duplican al reimportar, quedan aislados por empresa y el lote se revierte. Datos sintéticos.
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { urlPropietario } from "../../db/test/entorno";

import { entornoImportar, type Salida } from "./importar-entorno";

const FILAS = "Nombre de la fila;Sección;Orden\nArriendo oficina;GAV;10\nRetiro socio A;egreso;20\nVentas;INGRESOS;1\n";
// Columnas con los nombres de OPAI 1 (rowName, currency, amount, frequency, dayOfMonth, startDate, ufPolicy).
const RECURRENTES = [
  "rowName;concepto;currency;amount;frequency;dayOfMonth;startDate;endDate;ufPolicy;ufCustomDay",
  "Arriendo oficina;Arriendo Las Condes;UF;12,5;MONTHLY;5;01-01-2027;;LAST_DAY_PREV_MONTH;",
  "Retiro socio A;Retiro mensual;% ventas;5;MONTHLY;10;01-01-2027;;;",
  "Retiro socio A;Contador;CLP;$ 1.200.000;MONTHLY;15;01-01-2027;;;",
  "Fila inexistente;Algo;CLP;1000;MONTHLY;1;01-01-2027;;;",
  "Arriendo oficina;Honorarios;CLP;500000;WEEKLY;5;01-01-2027;;;",
  "Arriendo oficina;Seguro;CLP;80.000;MONTHLY;-1;01-01-2027;31-12-2026;;",
].join("\n");

describe.skipIf(!urlPropietario)("core · importadores del flujo de caja (CAR-349)", () => {
  let x: Awaited<ReturnType<typeof entornoImportar>>;
  beforeAll(async () => {
    x = await entornoImportar();
  });
  afterAll(async () => {
    await x?.e.cerrar();
  });
  const modulos = ["comercial", "finanzas"];
  const ejecutar = async (importador: string, texto: string, dryRun = false, t = x.t1) => {
    const r = await x.run<Salida>(t, "core.importar.ejecutar", { importador, archivo: x.csv(texto) }, { dryRun, modulos });
    if (!r.ok) throw new Error(`${r.error.code}: ${r.error.message}`);
    return r.data;
  };

  it("sin el módulo Finanzas activo no se puede importar", async () => {
    const r = await x.run(x.t1, "core.importar.ejecutar", { importador: "flujo_filas", archivo: x.csv(FILAS) }, { dryRun: true });
    expect(r.ok).toBe(false);
  });

  it("filas: simula sin escribir, rechaza ingresos y crea solo egresos; reimportar no duplica", async () => {
    const sim = await ejecutar("flujo_filas", FILAS, true);
    expect(sim.conteos).toMatchObject({ crear: 2, error: 1 });
    expect(sim.filas.find((f) => f.accion === "error")?.mensajes[0]).toMatch(/ingresos no se importan/);
    expect(await x.e.admin.flujoFila.count({ where: { tenantId: x.t1 } })).toBe(0);
    expect((await ejecutar("flujo_filas", FILAS)).conteos).toMatchObject({ crear: 2 });
    const filas = await x.e.admin.flujoFila.findMany({ where: { tenantId: x.t1 }, orderBy: { orden: "asc" } });
    expect(filas.map((f) => [f.etiqueta, f.seccion, f.orden, f.activa])).toEqual([["Arriendo oficina", "egreso", 10, true], ["Retiro socio A", "egreso", 20, true]]);
    expect((await ejecutar("flujo_filas", FILAS)).conteos).toMatchObject({ crear: 0, error: 1 });
  });

  it("recurrentes: convierte UF y % a la escala entera, valida y explica cada error por fila", async () => {
    const sim = await ejecutar("flujo_recurrentes", RECURRENTES, true);
    expect(sim.conteos).toMatchObject({ crear: 3, error: 3 });
    const errores = sim.filas.filter((f) => f.accion === "error").map((f) => f.mensajes[0]);
    expect(errores).toEqual([
      expect.stringMatching(/Importa primero las filas/),
      expect.stringMatching(/día del mes solo aplica a la frecuencia mensual/),
      expect.stringMatching(/término es anterior/),
    ]);
    expect((await ejecutar("flujo_recurrentes", RECURRENTES)).conteos).toMatchObject({ crear: 3 });
    const rs = await x.e.admin.flujoRecurrente.findMany({ where: { tenantId: x.t1 }, orderBy: { concepto: "asc" } });
    expect(rs.map((r) => [r.concepto, r.unidad, Number(r.monto), r.politicaUf, r.diaDelMes])).toEqual([
      ["Arriendo Las Condes", "uf", 125_000, "fin_mes_anterior", 5],
      ["Contador", "clp", 1_200_000, "dia_cuota", 15],
      ["Retiro mensual", "pct_ventas", 50_000, "dia_cuota", 10],
    ]);
    expect((await ejecutar("flujo_recurrentes", RECURRENTES)).conteos).toMatchObject({ crear: 0 });
    // Otro monto para uno existente: no se cambia y se avisa.
    const otro = await ejecutar("flujo_recurrentes", "rowName;concepto;currency;amount;frequency;dayOfMonth;startDate\nRetiro socio A;Contador;CLP;1.300.000;MONTHLY;15;01-01-2027\n", true);
    expect(otro.filas[0]?.mensajes[0]).toMatch(/no los cambia/);
  });

  it("otra empresa no ve las filas: sus recurrentes no encuentran la fila", async () => {
    const r = await x.run<Salida>(x.t2, "core.importar.ejecutar", { importador: "flujo_recurrentes", archivo: x.csv(RECURRENTES) }, { dryRun: true, modulos });
    expect(r.ok && r.data.conteos).toMatchObject({ crear: 0 });
  });

  it("revertir: primero los recurrentes; las filas con recurrentes quedan bloqueadas hasta entonces", async () => {
    const lote = (importador: string) =>
      x.e.admin.importacion.findFirstOrThrow({ where: { tenantId: x.t1, conteos: { path: ["importador"], equals: importador } }, orderBy: { createdAt: "asc" } });
    const filas = await lote("flujo_filas");
    const bloqueado = await x.run<{ revertido: boolean; bloqueadas: { motivo: string }[] }>(x.t1, "core.importar.revertir", { importacionId: filas.id }, { modulos });
    expect(bloqueado.ok && bloqueado.data.revertido).toBe(false);
    expect(bloqueado.ok && bloqueado.data.bloqueadas[0]?.motivo).toMatch(/gastos recurrentes/);
    const rec = await lote("flujo_recurrentes");
    const r1 = await x.run<{ revertido: boolean }>(x.t1, "core.importar.revertir", { importacionId: rec.id }, { modulos });
    expect(r1.ok && r1.data.revertido).toBe(true);
    const r2 = await x.run<{ revertido: boolean }>(x.t1, "core.importar.revertir", { importacionId: filas.id }, { modulos });
    expect(r2.ok && r2.data.revertido).toBe(true);
    expect(await x.e.admin.flujoFila.count({ where: { tenantId: x.t1 } })).toBe(0);
  });
});
