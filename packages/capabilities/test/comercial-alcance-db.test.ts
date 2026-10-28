// Brief 07 · PR 1: comercial.contactos.list respeta el alcance por instalaciones (ADR-022) contra
// Postgres real (si hay DATABASE_URL_TEST). Un supervisor al que una excepción le concede Comercial
// no ve los contactos de cuentas ajenas a sus instalaciones.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Alcance } from "../src/types";

describe.skipIf(!urlPropietario)("comercial · alcance de contactos en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenantId = "";
  let instA = "";
  const medidor = { registrar: async () => undefined };

  const ctxOwner = () =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", medidor });
  // Supervisor (ya lee Cuentas) al que una excepción le concede Comercial; alcance por instalaciones.
  const ctxAcotado = (alcance: Alcance | null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "supervisor",
      excepciones: [{ permiso: "comercial:negocios.read", conceder: true }],
      modulosActivos: ["comercial"],
      alcance,
      medidor,
    });

  async function dato<T>(ctx: ReturnType<typeof ctxOwner>, id: string, input: unknown) {
    const r = await mod.executeCapability(ctx, id, input, {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    const t = await e.admin.tenant.create({
      data: { slug: `com-alc-${randomUUID().slice(0, 8)}`, nombre: "Com", vertical: "seguridad" },
    });
    tenantId = t.id;
    const o = ctxOwner();
    const cuenta = async (nombre: string) =>
      (await dato<{ id: string }>(o, "core.cuentas.create", { nombre })).id;
    const cuentaA = await cuenta("Alfa");
    const cuentaB = await cuenta("Beta");
    instA = (
      await dato<{ id: string }>(o, "core.instalaciones.create", {
        cuentaId: cuentaA,
        nombre: "Planta Alfa",
      })
    ).id;
    for (const [cuentaId, nombres] of [
      [cuentaA, "Ana"],
      [cuentaB, "Beto"],
    ] as const) {
      await e.admin.contacto.create({ data: { tenantId, cuentaId, nombres, apellidos: "Prueba" } });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("acotado a la instalación de Alfa ve solo el contacto de Alfa", async () => {
    type Lista = { items: { nombre: string }[] };
    const r = await dato<Lista>(
      ctxAcotado({ instalaciones: [instA] }),
      "comercial.contactos.list",
      {},
    );
    expect(r.items.map((c) => c.nombre)).toEqual(["Ana Prueba"]);
    const nada = await dato<Lista>(
      ctxAcotado({ instalaciones: [] }),
      "comercial.contactos.list",
      {},
    );
    expect(nada.items).toHaveLength(0);
    const todo = await dato<Lista>(ctxAcotado(null), "comercial.contactos.list", {});
    expect(todo.items).toHaveLength(2);
  });
});
