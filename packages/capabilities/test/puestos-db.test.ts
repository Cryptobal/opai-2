// Brief 11 · Puestos PR 1 (revisión 5658390255) contra Postgres real: las capacidades de puestos
// rechazan el patrón o la función de otro tenant (bajo RLS no existen) y un patrón en uso no cambia
// su ciclo por la capacidad ni saltándose la capacidad.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enTransaccion } from "@opai/db";
import { horasSemanalesSugeridas } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("puestos y catálogos en base real", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "", inst: "", cargo: "", patronA: "", patronB: "", funcionB: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = (slug: string) =>
      e.admin.tenant.create({ data: { slug, nombre: slug, vertical: "seguridad" } });
    const s = randomUUID().slice(0, 8);
    t.a = (await nuevo(`pdb-a-${s}`)).id;
    t.b = (await nuevo(`pdb-b-${s}`)).id;
    t.patronB = (
      await e.admin.patronTurno.create({
        data: { tenantId: t.b, nombre: "4×4", diasTrabajo: 4, diasDescanso: 4 },
      })
    ).id;
    t.funcionB = (
      await e.admin.funcionPuesto.create({ data: { tenantId: t.b, nombre: "Guardia" } })
    ).id;
    const cuenta = await dato<{ id: string }>("core.cuentas.create", { nombre: "Andina" });
    t.inst = (
      await dato<{ id: string }>("core.instalaciones.create", {
        cuentaId: cuenta.id,
        nombre: "Planta",
      })
    ).id;
    t.cargo = (await dato<{ id: string }>("core.cargos.create", { nombre: "Guardia" })).id;
    t.patronA = (
      await dato<{ id: string }>("core.patrones.create", {
        nombre: "4×4",
        diasTrabajo: 4,
        diasDescanso: 4,
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId: t.a,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  async function dato<T>(id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const codigo = async (id: string, input: unknown) => {
    const r = await mod.executeCapability(ctx(), id, input);
    return r.ok ? "OK" : r.error.code;
  };
  const puesto = (extra: Record<string, unknown>) => ({
    instalacionId: t.inst,
    cargoId: t.cargo,
    nombre: `P ${randomUUID().slice(0, 6)}`,
    diasTrabajo: 5,
    diasDescanso: 2,
    horaInicio: "08:00",
    horaFin: "20:00",
    ...extra,
  });

  it("rechaza como no encontrado el patrón o la función de otro tenant (crear y editar)", async () => {
    expect(await codigo("core.puestos.create", puesto({ patronId: t.patronB }))).toBe("NOT_FOUND");
    expect(await codigo("core.puestos.create", puesto({ funcionId: t.funcionB }))).toBe(
      "NOT_FOUND",
    );
    const p = await dato<{ id: string }>("core.puestos.create", puesto({}));
    expect(await codigo("core.puestos.update", { id: p.id, patronId: t.patronB })).toBe(
      "NOT_FOUND",
    );
    expect(await codigo("core.puestos.update", { id: p.id, funcionId: t.funcionB })).toBe(
      "NOT_FOUND",
    );
    // Otro tenant no ve ni edita los catálogos: bajo RLS el patrón/función del tenant B no existe.
    expect(await codigo("core.patrones.get", { id: t.patronB })).toBe("NOT_FOUND");
    expect(await codigo("core.funciones.get", { id: t.funcionB })).toBe("NOT_FOUND");
    expect(await codigo("core.patrones.update", { id: t.patronB, nombre: "Ajeno" })).toBe(
      "NOT_FOUND",
    );
    expect(await codigo("core.funciones.update", { id: t.funcionB, nombre: "Ajeno" })).toBe(
      "NOT_FOUND",
    );
    expect(await codigo("core.patrones.set_activo", { id: t.patronB, activo: false })).toBe(
      "NOT_FOUND",
    );
    expect(await codigo("core.funciones.set_activo", { id: t.funcionB, activo: false })).toBe(
      "NOT_FOUND",
    );
  });

  it("un patrón en uso no cambia su ciclo, ni por la capacidad ni directo en la base", async () => {
    const p = await dato<{ diasTrabajo: number }>(
      "core.puestos.create",
      puesto({ patronId: t.patronA }),
    );
    expect(p.diasTrabajo).toBe(4);
    expect(await codigo("core.patrones.update", { id: t.patronA, diasDescanso: 3 })).toBe(
      "UNPROCESSABLE",
    );
    await expect(
      e.forTenant(t.a).patronTurno.update({ where: { id: t.patronA }, data: { diasDescanso: 3 } }),
    ).rejects.toThrow(/en uso/);
  });

  it("el conteo de puestosActivos de un patrón no cruza tenants (RLS)", async () => {
    // t.patronA ya tiene al menos un puesto (prueba anterior). Desde el tenant B, patronB es un
    // patrón distinto sin ningún puesto: su conteo no se contamina con los puestos de A.
    const propio = await dato<{ puestosActivos: number }>("core.patrones.get", { id: t.patronA });
    expect(propio.puestosActivos).toBeGreaterThanOrEqual(1);
    const ctxB = mod.crearContexto({
      tenantId: t.b,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
    const r = await mod.executeCapability(ctxB, "core.patrones.get", { id: t.patronB });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect((r.data as { puestosActivos: number }).puestosActivos).toBe(0);
  });

  /** Promesa controlable a mano: para forzar un orden exacto entre dos transacciones concurrentes. */
  function compuerta(): { lista: Promise<void>; abrir: () => void } {
    let abrir: () => void = () => undefined;
    const lista = new Promise<void>((resolve) => (abrir = resolve));
    return { lista, abrir };
  }

  it("dos escrituras concurrentes recalculan las horas con el horario final", async () => {
    const patron = await dato<{ id: string }>("core.patrones.create", {
      nombre: `Horario ${randomUUID().slice(0, 6)}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const p = await dato<{ id: string }>("core.puestos.create", puesto({ patronId: patron.id }));
    const listo = compuerta();
    const liberar = compuerta();
    const bloqueo = enTransaccion(t.a, async (tx) => {
      await tx.$queryRaw`SELECT id FROM core.puestos WHERE id = ${p.id}::uuid AND tenant_id = ${t.a}::uuid FOR UPDATE`;
      listo.abrir();
      await liberar.lista;
    });
    await listo.lista;
    const cambios = [
      dato("core.puestos.update", { id: p.id, horaInicio: "09:00" }),
      dato("core.puestos.update", { id: p.id, horaFin: "18:00" }),
    ];
    await new Promise((r) => setTimeout(r, 100));
    liberar.abrir();
    await bloqueo;
    await Promise.all(cambios);
    const final = await e.forTenant(t.a).puesto.findFirstOrThrow({ where: { id: p.id } });
    expect([final.horaInicio, final.horaFin]).toEqual(["09:00", "18:00"]);
    const esperado = horasSemanalesSugeridas({
      patron: { nombre: "x", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4, diasSemana: [] },
      tramos: [{ horaInicio: final.horaInicio, horaFin: final.horaFin }],
      colacionMin: 0,
      colacionFuera: false,
    });
    expect(Number(final.horasSemanales)).toBe(esperado);
  });

  it("concurrencia: desactivar un patrón mientras se elige en un puesto nuevo no deja un puesto con un patrón ya inactivo (autorrevisión PR #49, punto 2)", async () => {
    const patron = await dato<{ id: string }>("core.patrones.create", {
      nombre: `Carrera ${randomUUID().slice(0, 6)}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const avisoListo = compuerta();
    const puedeComitear = compuerta();
    // T1: desactiva el patrón (toma el mismo advisory lock que `patronBloqueadoParaHoras`) y mantiene la
    // transacción abierta —sin comitear— hasta la señal.
    const t1 = enTransaccion(t.a, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${patron.id}, 1))`;
      await tx.patronTurno.update({ where: { id: patron.id }, data: { activo: false } });
      avisoListo.abrir();
      await puedeComitear.lista;
    });
    await avisoListo.lista; // T1 ya desactivó el patrón, pero aún no comitea: sigue "activo" para quien no tiene el lock.
    const t2 = mod.executeCapability(ctx(), "core.puestos.create", puesto({ patronId: patron.id }));
    await new Promise((r) => setTimeout(r, 100)); // le da tiempo a T2 de quedar esperando el mismo lock.
    puedeComitear.abrir(); // libera T1: comitea la desactivación.
    await t1;
    const r2 = await t2;
    // Sin el bloqueo, T2 vería "activo" (lectura sin lock antes de la transacción) y crearía el
    // puesto igual; con el bloqueo, su propia transacción espera a T1 y relee ya desactivado.
    expect(r2).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
    expect(!r2.ok && r2.error.message).toMatch(/desactivado/);
    expect(await e.admin.puesto.count({ where: { patronId: patron.id } })).toBe(0);
  });

  it("concurrencia: cambiar la estructura de un patrón mientras se elige en un puesto nuevo no deja una forma a medio camino", async () => {
    const patron = await dato<{ id: string }>("core.patrones.create", {
      nombre: `Estructura ${randomUUID().slice(0, 6)}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const avisoListo = compuerta();
    const puedeComitear = compuerta();
    // T1: cambia la estructura directo en la base (sin puestos todavía, así que no es "en uso") y
    // mantiene la transacción abierta —sin comitear— hasta la señal. El puesto que la elige al mismo
    // tiempo (T2) la lee con `FOR SHARE` (trigger `puesto_ciclo_del_patron`): espera a T1 por el lock
    // de la misma fila de `patrones_turno`, sin que haga falta el advisory lock de la prueba anterior.
    const t1 = enTransaccion(t.a, async (tx) => {
      await tx.patronTurno.update({
        where: { id: patron.id },
        data: { diasTrabajo: 6, diasDescanso: 1 },
      });
      avisoListo.abrir();
      await puedeComitear.lista;
    });
    await avisoListo.lista;
    const t2 = dato<{ diasTrabajo: number; diasDescanso: number }>(
      "core.puestos.create",
      puesto({ patronId: patron.id }),
    );
    await new Promise((r) => setTimeout(r, 100));
    puedeComitear.abrir();
    await t1;
    const creado = await t2;
    // El puesto nunca queda con una mezcla de la forma vieja y la nueva: hereda la nueva por completo.
    expect([creado.diasTrabajo, creado.diasDescanso]).toEqual([6, 1]);
  });

  it("concurrencia: core.patrones.update cambiando la forma mientras se crea un puesto deja las horas del ciclo final, no del leído antes de la transacción (review 5662449808, punto 1)", async () => {
    const patron = await dato<{ id: string }>("core.patrones.create", {
      nombre: `Horas crear ${randomUUID().slice(0, 6)}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const avisoListo = compuerta();
    const puedeComitear = compuerta();
    // T1: simula `core.patrones.update` cambiando la forma (toma el mismo advisory lock que
    // `bloquearPatron`/`patronBloqueadoParaHoras`, como hace ahora la capacidad real) y mantiene la
    // transacción abierta —sin comitear— hasta la señal.
    const t1 = enTransaccion(t.a, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${patron.id}, 1))`;
      await tx.patronTurno.update({
        where: { id: patron.id },
        data: { diasTrabajo: 6, diasDescanso: 1 },
      });
      avisoListo.abrir();
      await puedeComitear.lista;
    });
    await avisoListo.lista; // T1 ya cambió la forma, pero no comitea: `componer` (sin lock) seguiría viendo 4×4.
    const t2 = dato<{ diasTrabajo: number; diasDescanso: number; horasSemanales: number | null }>(
      "core.puestos.create",
      puesto({ patronId: patron.id }),
    );
    await new Promise((r) => setTimeout(r, 100)); // le da tiempo a T2 de quedar esperando el mismo lock.
    puedeComitear.abrir(); // libera T1: comitea el cambio de forma.
    await t1;
    const creado = await t2;
    const horasEsperadas = horasSemanalesSugeridas({
      patron: { nombre: "x", clase: "ciclico", diasTrabajo: 6, diasDescanso: 1, diasSemana: [] },
      tramos: [{ horaInicio: "08:00", horaFin: "20:00" }],
      colacionMin: 0,
      colacionFuera: false,
    });
    // Sin el bloqueo, las horas se habrían calculado con el ciclo viejo (4×4) leído antes de abrir
    // la transacción, aunque el ciclo persistido (corregido por el trigger) ya fuera 6×1.
    expect([creado.diasTrabajo, creado.diasDescanso]).toEqual([6, 1]);
    expect(creado.horasSemanales).toBe(horasEsperadas);
  });

  it("concurrencia: core.patrones.update cambiando la forma mientras se elige el patrón al editar un puesto también deja las horas del ciclo final", async () => {
    const patron = await dato<{ id: string }>("core.patrones.create", {
      nombre: `Horas editar ${randomUUID().slice(0, 6)}`,
      diasTrabajo: 4,
      diasDescanso: 4,
    });
    const existente = await dato<{ id: string }>("core.puestos.create", puesto({}));
    const avisoListo = compuerta();
    const puedeComitear = compuerta();
    const t1 = enTransaccion(t.a, async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${patron.id}, 1))`;
      await tx.patronTurno.update({
        where: { id: patron.id },
        data: { diasTrabajo: 3, diasDescanso: 2 },
      });
      avisoListo.abrir();
      await puedeComitear.lista;
    });
    await avisoListo.lista;
    const t2 = dato<{ diasTrabajo: number; diasDescanso: number; horasSemanales: number | null }>(
      "core.puestos.update",
      { id: existente.id, patronId: patron.id },
    );
    await new Promise((r) => setTimeout(r, 100));
    puedeComitear.abrir();
    await t1;
    const editado = await t2;
    const horasEsperadas = horasSemanalesSugeridas({
      patron: { nombre: "x", clase: "ciclico", diasTrabajo: 3, diasDescanso: 2, diasSemana: [] },
      tramos: [{ horaInicio: "08:00", horaFin: "20:00" }],
      colacionMin: 0,
      colacionFuera: false,
    });
    expect([editado.diasTrabajo, editado.diasDescanso]).toEqual([3, 2]);
    expect(editado.horasSemanales).toBe(horasEsperadas);
  });
});
