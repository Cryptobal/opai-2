// CAR-413: cambiar la fila, la frecuencia o el día de un gasto recurrente desde una fecha. Datos sintéticos;
// Postgres real con un rol sin BYPASSRLS.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades } from "../../../modules/finanzas/capacidades";
import { hoyIso } from "../../../modules/finanzas/capacidades/util";
import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const mas = (iso: string, dias: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);
type Rec = { id: string; filaId: string; frecuencia: string; diaDelMes: number | null; inicio: string; fin: string | null; repeticiones: number | null; anteriorId: string | null };
type Cambio = { anterior: Rec | null; nuevo: Rec; cuotas: { antes: string[]; despues: string[] } };

describe.skipIf(omitirSuiteDb())("flujo · gasto recurrente que cambia desde una fecha (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let otro = "";
  let fila = "";
  let fila2 = "";
  const usuario = randomUUID();
  const hoy = hoyIso();

  const ctx = (t = tenantId) =>
    mod.crearContexto({
      tenantId: t, actor: { tipo: "user", id: usuario },
      usuario: { id: usuario, nombre: "u", email: "u@tramo.test", platformRole: null },
      portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: ["finanzas"], medidor: { registrar: async () => undefined },
    });
  const run = (id: string, input: unknown, opts?: { dryRun?: boolean }, t = tenantId) => mod.executeCapability(ctx(t), id, input, opts);
  async function ok<T>(id: string, input: unknown, opts?: { dryRun?: boolean }, t = tenantId): Promise<T> {
    const r = await run(id, input, opts, t);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const crear = (concepto: string, inicio: string, extra: object = {}) =>
    ok<Rec>("finanzas.recurrentes.crear", { filaId: fila, concepto, monto: 900_000, frecuencia: "mensual", diaDelMes: 5, inicio, ...extra });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(capacidades);
    const s = randomUUID().slice(0, 8);
    tenantId = (await e.admin.tenant.create({ data: { slug: `tramo-${s}`, nombre: "T", vertical: "seguridad" } })).id;
    otro = (await e.admin.tenant.create({ data: { slug: `tramo-b-${s}`, nombre: "B", vertical: "seguridad" } })).id;
    await e.admin.user.create({ data: { id: usuario, email: `u-${s}@tramo.test`, name: "u" } });
    fila = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo" })).id;
    fila2 = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Arriendo bodega" })).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("parte el gasto en la fecha: el tramo anterior termina el día antes y el nuevo queda enlazado", async () => {
    const r = await crear("Arriendo oficina", mas(hoy, -200), { repeticiones: 24 });
    const desde = mas(hoy, 10);
    const vista = await ok<Cambio>("finanzas.recurrentes.cambiar_desde", { id: r.id, desde, frecuencia: "quincenal", filaId: fila2 }, { dryRun: true });
    expect(vista.anterior?.fin).toBe(mas(desde, -1));
    expect(vista.cuotas.despues[0]).toBe(desde);
    expect(vista.cuotas.antes.every((f) => f >= desde)).toBe(true);
    // La vista previa no escribe.
    expect((await ok<Rec[]>("finanzas.recurrentes.listar", {})).filter((x) => x.anteriorId === r.id)).toHaveLength(0);

    const hecho = await ok<Cambio>("finanzas.recurrentes.cambiar_desde", { id: r.id, desde, frecuencia: "quincenal", filaId: fila2 });
    expect(hecho.anterior).toMatchObject({ id: r.id, fin: mas(desde, -1), filaId: fila, frecuencia: "mensual" });
    expect(hecho.nuevo).toMatchObject({ anteriorId: r.id, inicio: desde, filaId: fila2, frecuencia: "quincenal", diaDelMes: null });
    // El tope se reparte: 24 menos las cuotas ya hechas antes de la fecha.
    expect((hecho.nuevo.repeticiones ?? 0) + 7).toBeLessThanOrEqual(24);

    // La lista muestra solo el tramo vigente; con el historial, los dos.
    const vigentes = (await ok<Rec[]>("finanzas.recurrentes.listar", {})).map((x) => x.id);
    expect(vigentes).toContain(hecho.nuevo.id);
    expect(vigentes).not.toContain(r.id);
    expect((await ok<Rec[]>("finanzas.recurrentes.listar", { incluirTramosAnteriores: true })).map((x) => x.id)).toEqual(expect.arrayContaining([r.id, hecho.nuevo.id]));

    // El tramo reemplazado no se vuelve a cambiar ni a editar.
    const otraVez = await run("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(desde, 30), frecuencia: "semanal" });
    expect(otraVez.ok).toBe(false);
    expect((await run("finanzas.recurrentes.actualizar", { id: r.id, monto: 1 })).ok).toBe(false);
  });

  it("si el gasto aún no empieza, cambia el mismo gasto sin partirlo", async () => {
    const r = await crear("Bodega nueva", mas(hoy, 40));
    const hecho = await ok<Cambio>("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(hoy, 20), diaDelMes: 15 });
    expect(hecho.anterior).toBeNull();
    expect(hecho.nuevo).toMatchObject({ id: r.id, inicio: mas(hoy, 20), diaDelMes: 15, anteriorId: null });
  });

  it("rechaza fechas pasadas, cambios vacíos y filas archivadas", async () => {
    const r = await crear("Honorarios", mas(hoy, -60));
    expect((await run("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(hoy, -1), frecuencia: "semanal" })).ok).toBe(false);
    expect((await run("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(hoy, 5) })).ok).toBe(false);
    const archivada = (await ok<{ id: string }>("finanzas.filas.crear", { seccion: "egreso", etiqueta: "Archivada" })).id;
    await e.admin.flujoFila.update({ where: { id: archivada }, data: { activa: false } });
    expect((await run("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(hoy, 5), filaId: archivada })).ok).toBe(false);
  });

  it("otra empresa no ve ni cambia el gasto", async () => {
    const r = await crear("Seguro", mas(hoy, -30));
    const ajeno = await run("finanzas.recurrentes.cambiar_desde", { id: r.id, desde: mas(hoy, 5), frecuencia: "semanal" }, undefined, otro);
    expect(ajeno.ok).toBe(false);
    const propio = await e.admin.flujoRecurrente.findFirst({ where: { id: r.id } });
    expect(propio?.fin).toBeNull();
  });
});
