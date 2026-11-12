// Reglas del banco con destino (CAR-328, ADR-074) contra Postgres real: concilian solas solo con monto y
// referencia exactos, sugieren en los demás calces, el filtro por tipo y la conciliación contra una fila
// del flujo con su cuenta contable. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Mov = { id: string; monto: number; glosa: string; estado: string; clasificacion?: string | null; regla?: string | null };

describe.skipIf(omitirSuiteDb())("Finanzas · reglas del banco (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let tenantB = "";
  let cuentaId = "";
  let filaEgreso = "";
  let filaIngreso = "";
  let filaAjena = "";
  let cuentaGasto = "";
  const usuarioId = randomUUID();

  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin", email: "admin@reglas.test", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor: { registrar: async () => undefined },
    });
  const correr = (id: string, input: Record<string, unknown>, dryRun = false) =>
    mod.executeCapability(ctx(), id, input, { dryRun });
  const dato = async <T>(id: string, input: Record<string, unknown>, dryRun = false): Promise<T> => {
    const r = await correr(id, input, dryRun);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  const importar = (csv: string) =>
    dato<{ aplicados: number; reglas?: { conciliados: number; sugeridos: number } }>("finanzas.cartolas.importar", {
      cuentaId,
      formato: "generico",
      contenidoBase64: Buffer.from(csv, "utf8").toString("base64"),
      mapeoColumnas: { fecha: "fecha", monto: "monto", glosa: "glosa", referencia: "referencia" },
      idempotencyKey: `r-${randomUUID()}`,
    });
  const listar = (input: Record<string, unknown> = {}) =>
    dato<{ items: Mov[] }>("finanzas.movimientos_bancarios.listar", { cuentaId, limite: 200, ...input }).then((r) => r.items);
  const regla = (p: Record<string, unknown>) =>
    dato<{ id: string }>("finanzas.reglas_banco.guardar", { modo: "todas", flujoFilaId: filaEgreso, ...p });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas, ...capacidades]);
    const t = (s: string) => e.admin.tenant.create({ data: { slug: `${s}-${randomUUID().slice(0, 8)}`, nombre: s, vertical: "seguridad" } });
    tenantId = (await t("rgl")).id;
    tenantB = (await t("rglb")).id;
    const fila = (tid: string, seccion: string, etiqueta: string) =>
      e.admin.flujoFila.create({ data: { tenantId: tid, seccion, etiqueta, arrastre: false, orden: 0, activa: true } });
    filaEgreso = (await fila(tenantId, "egreso", "Sistemas")).id;
    filaIngreso = (await fila(tenantId, "ingreso", "Otros ingresos ficticios")).id;
    filaAjena = (await fila(tenantB, "egreso", "Sistemas B")).id;
    cuentaGasto = (
      await e.admin.cuentaContable.create({
        data: { tenantId, codigo: "6.1.01", nombre: "Gastos de sistemas", tipo: "gasto", naturaleza: "deudora" },
      })
    ).id;
    cuentaId = (await dato<{ id: string }>("finanzas.bancos.guardar", { banco: "Santander", numeroVisible: "000000001" })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("valida el destino: sección según el alcance y fila del mismo tenant", async () => {
    const def = { alcance: "cargos", condiciones: [{ campo: "glosa", operador: "contiene", valor: "x" }] };
    const r1 = await correr("finanzas.reglas_banco.guardar", { nombre: "Mal", definicion: def, flujoFilaId: filaIngreso });
    expect(r1.ok ? null : r1.error.message).toMatch(/egresos/);
    const r2 = await correr("finanzas.reglas_banco.guardar", { nombre: "Ajena", definicion: def, flujoFilaId: filaAjena });
    expect(r2.ok).toBe(false);
    const r3 = await correr("finanzas.reglas_banco.guardar", {
      nombre: "Operador",
      definicion: { alcance: "cargos", condiciones: [{ campo: "rut", operador: "contiene", valor: "1" }] },
      flujoFilaId: filaEgreso,
    });
    expect(r3.ok).toBe(false);
  });

  it("al importar, la regla exacta concilia sola y la de glosa deja sugerido", async () => {
    await regla({
      nombre: "Hosting exacto",
      prioridad: 10,
      definicion: {
        alcance: "cargos",
        condiciones: [
          { campo: "monto", operador: "exacto", valor: "20174" },
          { campo: "referencia", operador: "igual", valor: "HOST-1" },
        ],
      },
      cuentaContableId: cuentaGasto,
    });
    await regla({ nombre: "Compras correo", definicion: { alcance: "cargos", condiciones: [{ campo: "glosa", operador: "contiene", valor: "correo ficticio" }] } });
    const csv = "fecha,monto,glosa,referencia\n03/11/2026,-20174,Compra hosting ficticio,HOST-1\n04/11/2026,-9000,Compra CORREO FICTICIO,Z9\n05/11/2026,150000,Abono cliente ficticio,A1\n";
    const r = await importar(csv);
    expect(r.reglas).toEqual({ conciliados: 1, sugeridos: 1 });
    const movs = await listar();
    const host = movs.find((m) => m.glosa.includes("hosting"))!;
    expect(host).toMatchObject({ estado: "conciliado", clasificacion: "Sistemas", regla: "Hosting exacto" });
    const con = await e.admin.conciliacionBanco.findFirst({ where: { movimientoId: host.id } });
    expect(con).toMatchObject({ tipoEnlace: "flujo_fila", enlaceId: filaEgreso, cuentaContableId: cuentaGasto, confirmada: true });
    expect(movs.find((m) => m.glosa.includes("CORREO"))!.estado).toBe("sugerido");
  });

  it("filtra por tipo y concilia a mano contra la fila sugerida por la regla", async () => {
    expect((await listar({ tipo: "ingresos" })).every((m) => m.monto > 0)).toBe(true);
    expect((await listar({ tipo: "egresos" })).every((m) => m.monto < 0)).toBe(true);
    const correo = (await listar({ estado: "sugerido" })).find((m) => m.glosa.includes("CORREO"))!;
    const sug = await dato<{ reglas: { nombre: string; flujoFilaId: string }[] }>("finanzas.conciliaciones.sugerir", { movimientoId: correo.id });
    expect(sug.reglas.map((x) => x.nombre)).toEqual(["Compras correo"]);
    const enlace = { tipo: "flujo_fila", id: filaIngreso, monto: 9000 };
    const malo = await correr("finanzas.conciliaciones.confirmar", { movimientoId: correo.id, enlaces: [enlace] }, true);
    expect(malo.ok ? null : malo.error.message).toMatch(/egresos/);
    await dato("finanzas.conciliaciones.confirmar", {
      movimientoId: correo.id,
      enlaces: [{ ...enlace, id: filaEgreso, cuentaContableId: cuentaGasto }],
    });
    expect((await listar()).find((m) => m.id === correo.id)).toMatchObject({ estado: "conciliado", clasificacion: "Sistemas", regla: null });
  });

  it("aplicar: la vista previa no escribe y la real deja sugerido lo que ya estaba pendiente", async () => {
    await regla({ nombre: "Abonos ficticios", flujoFilaId: filaIngreso, definicion: { alcance: "abonos", condiciones: [{ campo: "glosa", operador: "empieza", valor: "abono cliente" }] } });
    const previa = await dato<{ conciliados: number; sugeridos: number }>("finanzas.reglas_banco.aplicar", { cuentaId }, true);
    expect(previa).toEqual({ conciliados: 0, sugeridos: 1 });
    expect((await listar()).find((m) => m.glosa.startsWith("Abono"))!.estado).toBe("pendiente");
    expect(await dato("finanzas.reglas_banco.aplicar", { cuentaId })).toEqual({ conciliados: 0, sugeridos: 1 });
    expect((await listar()).find((m) => m.glosa.startsWith("Abono"))!.estado).toBe("sugerido");
  });

  it("probar cuenta lo que calzaría sin cambiar nada", async () => {
    const r = await dato<{ total: number; sinConciliar: number }>("finanzas.reglas_banco.probar", {
      definicion: { alcance: "cargos", condiciones: [{ campo: "glosa", operador: "contiene", valor: "ficticio" }] },
    });
    expect(r).toMatchObject({ total: 2, sinConciliar: 0 });
  });
});
