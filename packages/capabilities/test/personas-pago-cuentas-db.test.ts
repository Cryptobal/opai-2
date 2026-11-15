// CAR-275: varias cuentas bancarias por persona con Postgres real. Datos ficticios, empresa qa-*.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, omitirSuiteDb, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string; message: string } };

describe.skipIf(omitirSuiteDb())("Personas · varias cuentas bancarias (db)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let personaId = "";
  const u = { pide: randomUUID(), aprueba: randomUUID() };
  const previa = process.env["OPAI_SECRETS_KEY"];
  const como = (uid: string) => async (id: string, input: Record<string, unknown>) =>
    (await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant, actor: { tipo: "user", id: uid },
        usuario: { id: uid, nombre: "Prueba", email: `${uid.slice(0, 6)}@c275.test`, platformRole: null },
        portal: "erp", portalesMembresia: ["erp"], rol: "owner", modulosActivos: [],
        medidor: { registrar: async () => undefined },
      }),
      id, input, {},
    )) as R;
  const pide = (i: Record<string, unknown>) => como(u.pide)("core.personas.pago_solicitar_cambio", { id: personaId, ...i });
  const aprueba = () => como(u.aprueba)("core.personas.pago_aprobar_cambio", { id: personaId });
  const cuentas = async () => (await e.admin.personaPago.findMany({ where: { personaId }, orderBy: { createdAt: "asc" } }));
  const cta = (n: string, banco = "037") => ({ bancoCodigo: banco, tipoCuenta: "corriente", numeroCuenta: n });

  beforeAll(async () => {
    e = await prepararEntorno();
    process.env["OPAI_SECRETS_KEY"] = randomBytes(32).toString("base64");
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    tenant = (await e.admin.tenant.create({ data: { slug: `qa-c275-${randomUUID().slice(0, 8)}`, nombre: "c275", vertical: "seguridad" } })).id;
    for (const id of Object.values(u)) {
      await e.admin.user.create({ data: { id, name: "Prueba", email: `${id.slice(0, 8)}@c275.test` } });
      await e.admin.membership.create({ data: { tenantId: tenant, userId: id, rol: "owner", portales: ["erp"] } });
    }
    personaId = (await e.admin.persona.create({ data: { tenantId: tenant, nombres: "Persona", apellidos: "Ficticia", rut: "44444444-4" } as never })).id;
  });
  afterAll(async () => {
    await e?.admin.claveTenant.deleteMany({ where: { tenantId: tenant } });
    if (previa === undefined) delete process.env["OPAI_SECRETS_KEY"]; else process.env["OPAI_SECRETS_KEY"] = previa;
    await e?.cerrar();
  });

  it("la primera cuenta queda por defecto; agregar suma otra sin cambiar la por defecto", async () => {
    expect((await pide({ tipo: "agregar", ...cta("000111222") })).ok).toBe(true);
    expect((await aprueba()).ok).toBe(true);
    expect((await pide({ tipo: "agregar", ...cta("000333444", "012"), titularNombre: "Titular Ficticio" })).ok).toBe(true);
    expect((await aprueba()).ok).toBe(true);
    const c = await cuentas();
    expect(c.map((x) => x.porDefecto)).toEqual([true, false]);
    expect(c[0]?.numeroCuenta).not.toContain("000111222");
  });

  it("marcar por defecto cambia la cuenta por defecto y deja solo una", async () => {
    const segunda = (await cuentas())[1]!;
    expect((await pide({ tipo: "marcar_defecto", cuentaId: segunda.id })).ok).toBe(true);
    expect((await aprueba()).ok).toBe(true);
    const c = await cuentas();
    expect(c.filter((x) => x.porDefecto).map((x) => x.id)).toEqual([segunda.id]);
  });

  it("reemplazar cambia la cuenta por defecto sin crear otra", async () => {
    expect((await pide({ tipo: "reemplazar", ...cta("000999888") })).ok).toBe(true);
    expect((await aprueba()).ok).toBe(true);
    const c = await cuentas();
    expect(c).toHaveLength(2);
    expect(c.find((x) => x.porDefecto)?.bancoCodigo).toBe("037");
  });

  it("no se puede quitar la cuenta por defecto; la otra sí", async () => {
    const c = await cuentas();
    const defecto = c.find((x) => x.porDefecto)!;
    const otra = c.find((x) => !x.porDefecto)!;
    expect((await pide({ tipo: "quitar", cuentaId: defecto.id })).ok).toBe(true);
    const r = await aprueba();
    expect(r.ok).toBe(false);
    await e.admin.personaPagoSolicitud.updateMany({ where: { personaId, estado: "pendiente" }, data: { estado: "rechazada" } });
    expect((await pide({ tipo: "quitar", cuentaId: otra.id })).ok).toBe(true);
    expect((await aprueba()).ok).toBe(true);
    expect(await cuentas()).toHaveLength(1);
  });

  it("agregar o reemplazar exigen los datos de la cuenta", async () => {
    expect((await pide({ tipo: "agregar" })).ok).toBe(false);
    expect((await pide({ tipo: "marcar_defecto" })).ok).toBe(false);
  });
});
