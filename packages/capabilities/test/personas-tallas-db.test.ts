// CAR-408: tallas por prenda del uniforme de la empresa, con Postgres real y rol sin BYPASSRLS. Datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };
type Talla = { prenda: string; nombre: string; talla: string | null; enKit: boolean };

describe.skipIf(omitirSuiteDb())("Personas · tallas por prenda CAR-408 (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const tenants: string[] = [];
  const personas: string[] = [];
  const uid = randomUUID();
  const ctx = (t: number) =>
    mod.crearContexto({
      tenantId: tenants[t]!,
      actor: { tipo: "user", id: uid },
      usuario: {
        id: uid,
        nombre: "RRHH",
        email: `${uid.slice(0, 6)}@c408.test`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: [],
      medidor: { registrar: async () => undefined },
    });
  const ejecutar = async (t: number, id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(ctx(t), id, input, {})) as R;
  const tallasDe = async (t: number) =>
    (
      (await ejecutar(t, "core.personas.laboral_ver", { id: personas[t] })).data as {
        tallas: Talla[];
      }
    ).tallas;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    await e.admin.user.create({
      data: { id: uid, name: "RRHH", email: `${uid.slice(0, 8)}@c408.test` },
    });
    for (const [i, [vertical, rut]] of [
      ["seguridad", "14444444-4"],
      ["aseo", "13333333-3"],
    ].entries()) {
      const tenantId = (
        await e.admin.tenant.create({
          data: {
            slug: `qa-c408-${i}-${randomUUID().slice(0, 6)}`,
            nombre: "c408",
            vertical: vertical!,
          },
        })
      ).id;
      await e.admin.membership.create({
        data: { tenantId, userId: uid, rol: "owner", portales: ["erp"] },
      });
      personas.push(
        (
          await e.admin.persona.create({
            data: { tenantId, nombres: "Ana", apellidos: "Ficticia", rut: rut!, estado: "activa" },
          })
        ).id,
      );
      tenants.push(tenantId);
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("cada empresa ve las prendas de su rubro, sin talla al comienzo", async () => {
    expect((await tallasDe(0)).map((t) => t.prenda)).toEqual([
      "camisa",
      "pantalon",
      "chaqueta",
      "polera",
      "geologo",
      "polar",
      "calzado",
    ]);
    expect((await tallasDe(1))[0]).toEqual({
      prenda: "cotona",
      nombre: "Cotona",
      talla: null,
      enKit: true,
    });
  });

  it("guarda, cambia y borra la talla de una prenda del kit", async () => {
    let r = await ejecutar(0, "core.personas.laboral_actualizar", {
      id: personas[0],
      uniforme: { tallas: { camisa: "M", calzado: "42" } },
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    r = await ejecutar(0, "core.personas.laboral_actualizar", {
      id: personas[0],
      uniforme: { tallas: { camisa: "L", calzado: null } },
    });
    expect(r.ok, JSON.stringify(r)).toBe(true);
    const t = await tallasDe(0);
    expect(t.find((x) => x.prenda === "camisa")?.talla).toBe("L");
    expect(t.find((x) => x.prenda === "calzado")?.talla).toBeNull();
    expect(await e.admin.personaTalla.count({ where: { personaId: personas[0]! } })).toBe(1);
  });

  it("rechaza una prenda que no está en el uniforme de la empresa", async () => {
    const r = await ejecutar(1, "core.personas.laboral_actualizar", {
      id: personas[1],
      uniforme: { tallas: { geologo: "M" } },
    });
    expect(r.error?.message).toMatch(/no están en el uniforme/);
    expect(await e.admin.personaTalla.count({ where: { personaId: personas[1]! } })).toBe(0);
  });

  it("con prendas propias de la empresa, una talla antigua queda marcada como fuera del kit", async () => {
    const set = await ejecutar(0, "core.config.set", {
      modulo: "core",
      clave: "personas_prendas_uniforme",
      valor: [{ nombre: "Camisa" }, { nombre: "Guantes" }],
    });
    expect(set.ok, JSON.stringify(set)).toBe(true);
    await e.admin.personaTalla.create({
      data: { tenantId: tenants[0]!, personaId: personas[0]!, prenda: "polar", talla: "XL" },
    });
    const t = await tallasDe(0);
    expect(t.map((x) => [x.prenda, x.enKit])).toEqual([
      ["camisa", true],
      ["guantes", true],
      ["polar", false],
    ]);
  });

  it("aísla por empresa: otra empresa no ve ni escribe tallas ajenas", async () => {
    const r = await ejecutar(1, "core.personas.laboral_actualizar", {
      id: personas[0],
      uniforme: { tallas: { cotona: "M" } },
    });
    expect(r.error?.code).toBe("NOT_FOUND");
    expect(await e.forTenant(tenants[1]!).personaTalla.count()).toBe(0);
  });
});
