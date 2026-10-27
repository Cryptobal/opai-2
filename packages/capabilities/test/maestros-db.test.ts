// Maestros contra Postgres real (si hay DATABASE_URL_TEST): las mismas capacidades que usan UI, API
// y MCP, con RLS (rol de prueba sin BYPASSRLS), triggers de mismo tenant y transacciones reales.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("maestros en base real", () => {
  let e: Entorno;
  let tenantId = "";
  let mod: Capacidades;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const t = await e.admin.tenant.create({
      data: { slug: `maes-${randomUUID().slice(0, 8)}`, nombre: "M", vertical: "seguridad" },
    });
    tenantId = t.id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = () =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  async function dato<T>(id: string, input: unknown, opciones = {}): Promise<T> {
    const r = await mod.executeCapability(ctx(), id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  it("cuenta → instalación → puesto → persona con vínculo → estructura efectiva", async () => {
    const cuenta = await dato<{ id: string }>("core.cuentas.create", {
      nombre: "Andina",
      rut: "76.543.210-3",
    });
    const dup = await mod.executeCapability(ctx(), "core.cuentas.create", {
      nombre: "Bodega",
      rut: "76543210-3",
    });
    expect(dup).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    const cargo = await dato<{ id: string }>("core.cargos.create", { nombre: "Guardia" });
    const inst = await dato<{ id: string }>("core.instalaciones.create", {
      cuentaId: cuenta.id,
      nombre: "Planta",
      lat: -33.4,
      lng: -70.7,
    });
    await dato("core.puestos.create", {
      instalacionId: inst.id,
      cargoId: cargo.id,
      nombre: "Noche",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "20:00",
      horaFin: "08:00",
    });
    const persona = await dato<{ id: string }>("core.personas.create", {
      nombres: "Ana",
      apellidos: "Rojas",
      rut: "19.876.543-0",
      vinculo: { cargoId: cargo.id, tipo: "indefinido", inicio: "2026-01-05" },
    });
    await dato("core.estructuras.create", {
      nivel: "cargo",
      cargoId: cargo.id,
      sueldoBase: 560_000,
      vigenteDesde: "2026-01-01",
    });
    await dato("core.estructuras.create", {
      nivel: "cargo",
      cargoId: cargo.id,
      sueldoBase: 600_000,
      vigenteDesde: "2026-07-01",
    });
    const ef = await dato<{ aplica: string; niveles: { cargo: { sueldoBase: number } } }>(
      "core.estructuras.efectiva",
      { personaId: persona.id, fecha: "2026-08-01" },
    );
    expect(ef).toMatchObject({ aplica: null, niveles: { cargo: null }, estado: "sin_capa" });
    const lista = await dato<{ items: { vinculoVigente: { cargo: string } }[] }>(
      "core.personas.list",
      { q: "roj" },
    );
    expect(lista.items[0]?.vinculoVigente.cargo).toBe("Guardia");
    expect(await dato<{ personas: unknown[] }>("core.buscar", { q: "Andina" })).toMatchObject({
      cuentas: [expect.anything()],
    });
    const eventos = await e.admin.evento.findMany({ where: { tenantId }, select: { tipo: true } });
    expect(new Set(eventos.map((x) => x.tipo))).toEqual(
      new Set([
        "core.cuenta.creada",
        "core.cargo.creado",
        "core.instalacion.creada",
        "core.puesto.creado",
        "core.persona.creada",
        "core.vinculo.creado",
        "core.estructura.creada",
      ]),
    );
  });

  it("la idempotencia evita duplicar una escritura real", async () => {
    const o = { idempotencyKey: `k-${randomUUID()}` };
    const a = await dato<{ id: string }>("core.cuentas.create", { nombre: "Idempotente" }, o);
    const b = await dato<{ id: string }>("core.cuentas.create", { nombre: "Idempotente" }, o);
    expect(b.id).toBe(a.id);
    expect(await e.admin.cuenta.count({ where: { tenantId, nombre: "Idempotente" } })).toBe(1);
  });
});
