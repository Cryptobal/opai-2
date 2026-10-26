// Brief 11 · Puestos PR 1 (revisión 5658390255) contra Postgres real: las capacidades de puestos
// rechazan el patrón o la función de otro tenant (bajo RLS no existen) y un patrón en uso no cambia
// su ciclo por la capacidad ni saltándose la capacidad.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

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
    t.funcionB = (await e.admin.funcionPuesto.create({ data: { tenantId: t.b, nombre: "Guardia" } }))
      .id;
    const cuenta = await dato<{ id: string }>("core.cuentas.create", { nombre: "Andina" });
    t.inst = (
      await dato<{ id: string }>("core.instalaciones.create", { cuentaId: cuenta.id, nombre: "Planta" })
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
    expect(await codigo("core.puestos.create", puesto({ funcionId: t.funcionB }))).toBe("NOT_FOUND");
    const p = await dato<{ id: string }>("core.puestos.create", puesto({}));
    expect(await codigo("core.puestos.update", { id: p.id, patronId: t.patronB })).toBe("NOT_FOUND");
    expect(await codigo("core.puestos.update", { id: p.id, funcionId: t.funcionB })).toBe("NOT_FOUND");
    expect(await codigo("core.patrones.get", { id: t.patronB })).toBe("NOT_FOUND");
  });

  it("un patrón en uso no cambia su ciclo, ni por la capacidad ni directo en la base", async () => {
    const p = await dato<{ diasTrabajo: number }>("core.puestos.create", puesto({ patronId: t.patronA }));
    expect(p.diasTrabajo).toBe(4);
    expect(await codigo("core.patrones.update", { id: t.patronA, diasDescanso: 3 })).toBe(
      "UNPROCESSABLE",
    );
    await expect(
      e.forTenant(t.a).patronTurno.update({ where: { id: t.patronA }, data: { diasDescanso: 3 } }),
    ).rejects.toThrow(/en uso/);
  });
});
