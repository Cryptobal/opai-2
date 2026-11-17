import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";

/** CAR-608: contactos en instalación con RLS y trigger de cuenta. */
describe.skipIf(!urlPropietario)("instalaciones.contactos (CAR-608, dos empresas)", () => {
  let e: Entorno;
  let tenantA = "";
  let tenantB = "";
  let instalacionA = "";
  let contactoA = "";

  const ctxOwner = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      usuario: {
        id: randomUUID(),
        email: "owner@test",
        nombre: "Owner",
        platformRole: null,
      },
      rol: "owner",
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });

  async function ok<T>(c: ReturnType<typeof ctxOwner>, id: string, input: unknown): Promise<T> {
    const r = await mod.executeCapability(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    for (const n of [0, 1]) {
      const t = await e.admin.tenant.create({
        data: { slug: `car608-${randomUUID()}`, nombre: `T${n}`, vertical: "seguridad" },
      });
      if (n === 0) tenantA = t.id;
      else tenantB = t.id;
    }
    const owner = ctxOwner(tenantA);
    const cuenta = await ok<{ id: string }>(owner, "core.cuentas.create", { nombre: "Retail" });
    instalacionA = (
      await ok<{ id: string }>(owner, "core.instalaciones.create", {
        cuentaId: cuenta.id,
        nombre: "Local 1",
      })
    ).id;
    contactoA = (
      await ok<{ id: string }>(owner, "core.contactos.create", {
        cuentaId: cuenta.id,
        nombres: "Ana",
        apellidos: "López",
        email: `ana-${randomUUID()}@test.cl`,
      })
    ).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("vincula, lista y aísla por tenant", async () => {
    const owner = ctxOwner(tenantA);
    const { vinculoId } = await ok<{ vinculoId: string }>(owner, "core.instalacion_contactos.vincular", {
      instalacionId: instalacionA,
      contactoId: contactoA,
      roles: ["jefe_sitio", "emergencia"],
    });
    const lista = await ok<{ vinculados: { vinculoId: string }[] }>(
      owner,
      "core.instalacion_contactos.list",
      { instalacionId: instalacionA },
    );
    expect(lista.vinculados.map((v) => v.vinculoId)).toContain(vinculoId);

    const otro = ctxOwner(tenantB);
    const r = await mod.executeCapability(otro, "core.instalacion_contactos.list", {
      instalacionId: instalacionA,
    });
    expect(r.ok).toBe(false);
  });

  it("rechaza contacto sin vínculo a la cuenta de la instalación", async () => {
    const ownerB = ctxOwner(tenantB);
    const cuentaB = await ok<{ id: string }>(ownerB, "core.cuentas.create", { nombre: "Otra" });
    const instB = await ok<{ id: string }>(ownerB, "core.instalaciones.create", {
      cuentaId: cuentaB.id,
      nombre: "Sitio B",
    });
    const contactoB = await ok<{ id: string }>(ownerB, "core.contactos.create", {
      cuentaId: cuentaB.id,
      nombres: "Pedro",
      apellidos: "Ríos",
    });
    const ownerA = ctxOwner(tenantA);
    const r = await mod.executeCapability(ownerA, "core.instalacion_contactos.vincular", {
      instalacionId: instalacionA,
      contactoId: contactoB,
      roles: ["jefe_sitio"],
    });
    expect(r.ok).toBe(false);
    void instB;
    void contactoB;
  });
});